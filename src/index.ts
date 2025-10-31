#!/usr/bin/env node
/**
 * MsGraph-Mcp Server - Microsoft Graph MCP server for token-efficient M365 integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getConfig } from './utils/config.js';
import { logger } from './utils/logger.js';
import { GraphAuthenticator } from './auth/graphAuth.js';
import { GraphClient } from './utils/graphClient.js';
import {
  SearchByEntities,
  SearchEmails,
  GetEmail,
  ListMailFolders,
} from './tools/mail/index.js';
import { SearchContent } from './tools/copilot/index.js';

// Main server class
class MsGraphMcpServer {
  private server: Server;
  private authenticator: GraphAuthenticator;
  private graphClient: GraphClient;
  private tools: {
    searchByEntities: SearchByEntities;
    searchEmails: SearchEmails;
    getEmail: GetEmail;
    listMailFolders: ListMailFolders;
    searchContent: SearchContent;
  };

  constructor() {
    this.server = new Server(
      {
        name: 'msgraph-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize (will be done async in start())
    this.authenticator = null as any;
    this.graphClient = null as any;
    this.tools = null as any;

    this.setupHandlers();
    this.setupErrorHandlers();
  }

  /**
   * Initialize authentication and Graph client
   */
  async initialize(): Promise<void> {
    logger.info('Initializing MsGraph-Mcp server...');

    // Load configuration
    const config = getConfig();
    logger.setLevel(config.logLevel);

    logger.info(`Environment: ${config.environment}`);
    logger.info(`Tenant ID: ${config.auth.tenantId}`);

    // Initialize authentication
    this.authenticator = new GraphAuthenticator(config.auth);
    await this.authenticator.initialize();

    // Initialize Graph client
    this.graphClient = new GraphClient(this.authenticator);
    await this.graphClient.initialize();

    // Initialize tools
    this.tools = {
      searchByEntities: new SearchByEntities(this.graphClient),
      searchEmails: new SearchEmails(this.graphClient),
      getEmail: new GetEmail(this.graphClient),
      listMailFolders: new ListMailFolders(this.graphClient),
      searchContent: new SearchContent(this.graphClient),
    };

    logger.info('Server initialized successfully');
  }

  /**
   * Setup MCP protocol handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'mcp__msgraph__search_emails_by_entities',
            description:
              'Batch search emails for multiple entities (companies/people) with optional keywords. ' +
              'Returns token-efficient summaries grouped by entity. Use this for checking multiple ' +
              'companies at once (e.g., "search for cancellation signals in these 50 companies").',
            inputSchema: {
              type: 'object',
              properties: {
                entities: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of entities (companies, people) to search for',
                },
                keywords: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional keywords to filter results (e.g., ["cancel", "churn"])',
                },
                dateFrom: {
                  type: 'string',
                  description: 'Optional start date (ISO 8601 format)',
                },
                dateTo: {
                  type: 'string',
                  description: 'Optional end date (ISO 8601 format)',
                },
                maxResultsPerEntity: {
                  type: 'number',
                  description: 'Max results per entity (default: 5)',
                  default: 5,
                },
              },
              required: ['entities'],
            },
          },
          {
            name: 'mcp__msgraph__search_emails',
            description:
              'Search emails with a custom KQL (Keyword Query Language) query. ' +
              'Use this for complex searches or when you need full control over the query. ' +
              'Returns token-efficient email summaries.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'KQL search query (e.g., "from:john subject:urgent")',
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum results to return (default: 25)',
                  default: 25,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'mcp__msgraph__get_email',
            description:
              'Get full details for a specific email by message ID. Use this to drill down ' +
              'into a specific email after finding it via search. Can optionally include full body.',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: {
                  type: 'string',
                  description: 'The message ID to retrieve',
                },
                includeBody: {
                  type: 'boolean',
                  description: 'Include full email body (increases tokens, default: false)',
                  default: false,
                },
              },
              required: ['messageId'],
            },
          },
          {
            name: 'mcp__msgraph__list_mail_folders',
            description:
              'List all mail folders in the mailbox. Returns folder structure with item counts. ' +
              'Useful for understanding mailbox organization or targeting specific folders.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'mcp__msgraph__search_content',
            description:
              'Search across M365 content (SharePoint, OneDrive) using Microsoft Copilot Retrieval API. ' +
              'Uses natural language queries to find relevant content scattered across your tenant. ' +
              'Returns text excerpts with relevance scores. Ideal for finding documents, files, and ' +
              'information when you don\'t know exact locations (e.g., "vendor sponsorship agreements").',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Natural language search query (max 1500 chars, single sentence preferred)',
                },
                dataSource: {
                  type: 'string',
                  enum: ['sharePoint', 'oneDriveBusiness', 'externalItem'],
                  description: 'Where to search (default: sharePoint)',
                  default: 'sharePoint',
                },
                filterExpression: {
                  type: 'string',
                  description: 'Optional KQL filter (e.g., "FileExtension:pdf" or "LastModifiedTime>=2025-01-01")',
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum results to return (1-25, default: 10)',
                  default: 10,
                },
                includeMetadata: {
                  type: 'boolean',
                  description: 'Include file metadata (title, author, dates, etc. - default: false)',
                  default: false,
                },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'mcp__msgraph__search_emails_by_entities': {
            const result = await this.tools.searchByEntities.execute(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'mcp__msgraph__search_emails': {
            const result = await this.tools.searchEmails.execute(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'mcp__msgraph__get_email': {
            const result = await this.tools.getEmail.execute(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'mcp__msgraph__list_mail_folders': {
            const result = await this.tools.listMailFolders.execute();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'mcp__msgraph__search_content': {
            const result = await this.tools.searchContent.execute(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        logger.error(`Error executing tool ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.message || 'Unknown error',
                details: error.toString(),
              }),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers(): void {
    this.server.onerror = (error) => {
      logger.error('Server error:', error);
    };

    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      await this.initialize();

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('MsGraph-Mcp server running on stdio');
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new MsGraphMcpServer();
server.start().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
