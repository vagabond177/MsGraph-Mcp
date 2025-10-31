#!/usr/bin/env node
/**
 * MsGraph-Mcp Server - Microsoft Graph MCP server for token-efficient M365 integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getConfig } from './utils/config.js';
import { logger } from './utils/logger.js';
import { GraphAuthenticator } from './auth/graphAuth.js';
import { GraphClient } from './utils/graphClient.js';
import { ResultCache } from './utils/resultCache.js';
import {
  SearchByEntities,
  SearchEmails,
  GetEmail,
  GetAttachments,
  DownloadAttachment,
  ListMailFolders,
} from './tools/mail/index.js';
import { SearchContent } from './tools/copilot/index.js';

// Main server class
class MsGraphMcpServer {
  private server: Server;
  private authenticator: GraphAuthenticator;
  private graphClient: GraphClient;
  private resultCache: ResultCache;
  private tools: {
    searchByEntities: SearchByEntities;
    searchEmails: SearchEmails;
    getEmail: GetEmail;
    getAttachments: GetAttachments;
    downloadAttachment: DownloadAttachment;
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
          resources: {},
        },
      }
    );

    // Initialize result cache
    this.resultCache = new ResultCache();

    // Initialize (will be done async in start())
    this.authenticator = null as any;
    this.graphClient = null as any;
    this.tools = null as any;

    this.setupHandlers();
    this.setupResourceHandlers();
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
      getAttachments: new GetAttachments(this.graphClient, this.resultCache),
      downloadAttachment: new DownloadAttachment(this.graphClient),
      listMailFolders: new ListMailFolders(this.graphClient),
      searchContent: new SearchContent(this.graphClient, this.resultCache),
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
                mailbox: {
                  type: 'string',
                  description:
                    'Optional: Email address (UPN) or user ID of shared/delegated mailbox to search. ' +
                    "If not specified, searches the authenticated user's own mailbox.",
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
                mailbox: {
                  type: 'string',
                  description:
                    'Optional: Email address (UPN) or user ID of shared/delegated mailbox to search. ' +
                    "If not specified, searches the authenticated user's own mailbox.",
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
                mailbox: {
                  type: 'string',
                  description:
                    'Optional: Email address (UPN) or user ID of shared/delegated mailbox. ' +
                    "If not specified, retrieves from the authenticated user's own mailbox.",
                },
              },
              required: ['messageId'],
            },
          },
          {
            name: 'mcp__msgraph__get_attachments',
            description:
              'Get attachments for a specific email by message ID. Returns token-efficient ' +
              'metadata by default (name, size, type). Use includeContent=true to cache ' +
              'attachments and get MCP Resource URIs for accessing full content without token limits. ' +
              'Use the resource URI with MCP ReadResource to download the actual file.',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: {
                  type: 'string',
                  description: 'The message ID to get attachments for',
                },
                includeContent: {
                  type: 'boolean',
                  description:
                    'Cache attachment content and return resource URIs (default: false). ' +
                    'Set to true when you need to download files. Content is available via ' +
                    'MCP Resources without consuming tokens in the tool response.',
                  default: false,
                },
                mailbox: {
                  type: 'string',
                  description:
                    'Optional: Email address (UPN) or user ID of shared/delegated mailbox. ' +
                    "If not specified, retrieves from the authenticated user's own mailbox.",
                },
              },
              required: ['messageId'],
            },
          },
          {
            name: 'mcp__msgraph__download_attachment',
            description:
              'Download email attachment directly to a file. This is the most token-efficient way ' +
              'to download attachments - the file is written directly to disk and only the file path ' +
              'is returned (~10 tokens). No content flows through Claude\'s context.',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: {
                  type: 'string',
                  description: 'The message ID containing the attachment',
                },
                attachmentId: {
                  type: 'string',
                  description: 'The attachment ID to download (from get_attachments)',
                },
                outputPath: {
                  type: 'string',
                  description: 'Where to save the file (absolute or relative path)',
                },
                mailbox: {
                  type: 'string',
                  description:
                    'Optional: Email address (UPN) or user ID of shared/delegated mailbox. ' +
                    "If not specified, downloads from the authenticated user's own mailbox.",
                },
              },
              required: ['messageId', 'attachmentId', 'outputPath'],
            },
          },
          {
            name: 'mcp__msgraph__list_mail_folders',
            description:
              'List all mail folders in the mailbox. Returns folder structure with item counts. ' +
              'Useful for understanding mailbox organization or targeting specific folders.',
            inputSchema: {
              type: 'object',
              properties: {
                mailbox: {
                  type: 'string',
                  description:
                    'Optional: Email address (UPN) or user ID of shared/delegated mailbox. ' +
                    "If not specified, lists folders from the authenticated user's own mailbox.",
                },
              },
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
                  description:
                    'Natural language search query (max 1500 chars, single sentence preferred)',
                },
                dataSource: {
                  type: 'string',
                  enum: ['sharePoint', 'oneDriveBusiness', 'externalItem'],
                  description: 'Where to search (default: sharePoint)',
                  default: 'sharePoint',
                },
                filterExpression: {
                  type: 'string',
                  description:
                    'Optional KQL filter (e.g., "FileExtension:pdf" or "LastModifiedTime>=2025-01-01")',
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum results to return (1-25, default: 10)',
                  default: 10,
                },
                includeMetadata: {
                  type: 'boolean',
                  description:
                    'Include file metadata (title, author, dates, etc. - default: false)',
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
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
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

          case 'mcp__msgraph__get_attachments': {
            const result = await this.tools.getAttachments.execute(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'mcp__msgraph__download_attachment': {
            const result = await this.tools.downloadAttachment.execute(args as any);
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
            const input = args as any;
            const result = await this.tools.listMailFolders.execute(input?.mailbox);
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
   * Setup MCP Resource handlers for cached search results and attachments
   */
  private setupResourceHandlers(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources: any[] = [];

      // List all cached search results as resources
      for (const searchId of this.resultCache.listSearchIds()) {
        const results = this.resultCache.getSearchResults(searchId);

        if (results) {
          for (let i = 0; i < results.length; i++) {
            const hit = results[i];
            resources.push({
              uri: `copilot://search-${searchId}/result-${i}`,
              name: `Search result ${i + 1} from ${searchId}`,
              description: `Full text extracts for ${hit.webUrl}`,
              mimeType: 'application/json',
            });
          }
        }
      }

      // List all cached attachments as resources
      for (const attachmentId of this.resultCache.listAttachmentIds()) {
        const attachment = this.resultCache.getAttachment(attachmentId);

        if (attachment) {
          resources.push({
            uri: `attachment://${attachmentId}`,
            name: attachment.name,
            description: `Email attachment: ${attachment.name} (${attachment.contentType}, ${this.formatBytes(attachment.size)})`,
            mimeType: attachment.contentType || 'application/octet-stream',
          });
        }
      }

      logger.debug(`Listing ${resources.length} cached resources`);
      return { resources };
    });

    // Read a specific resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async request => {
      const uri = request.params.uri;

      logger.debug(`Reading resource: ${uri}`);

      // Check if it's a Copilot search result
      const copilotMatch = uri.match(/^copilot:\/\/search-([^/]+)\/result-(\d+)$/);
      if (copilotMatch) {
        const searchId = copilotMatch[1];
        const resultIndex = parseInt(copilotMatch[2], 10);

        // Get the cached result
        const hit = this.resultCache.getResult(searchId, resultIndex);

        if (!hit) {
          throw new Error(`Resource not found: ${uri} (may have expired from cache)`);
        }

        // Return full details with all extracts
        const content = {
          url: hit.webUrl,
          resourceType: hit.resourceType,
          sensitivityLabel: hit.sensitivityLabel,
          metadata: hit.resourceMetadata,
          extracts: hit.extracts.map(extract => ({
            text: extract.text,
            relevanceScore: extract.relevanceScore,
          })),
          totalExtracts: hit.extracts.length,
        };

        logger.debug(`Returning ${hit.extracts.length} extracts for ${hit.webUrl}`);

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(content, null, 2),
            },
          ],
        };
      }

      // Check if it's an attachment
      const attachmentMatch = uri.match(/^attachment:\/\/(.+)$/);
      if (attachmentMatch) {
        const attachmentId = attachmentMatch[1];

        // Get the cached attachment
        const attachment = this.resultCache.getAttachment(attachmentId);

        if (!attachment) {
          throw new Error(`Attachment not found: ${uri} (may have expired from cache)`);
        }

        logger.debug(`Returning attachment ${attachment.name} (${this.formatBytes(attachment.size)})`);

        // Return attachment with full content
        return {
          contents: [
            {
              uri,
              mimeType: attachment.contentType || 'application/octet-stream',
              blob: attachment.contentBytes, // Base64 blob
            },
          ],
        };
      }

      throw new Error(`Invalid resource URI: ${uri}`);
    });
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers(): void {
    this.server.onerror = error => {
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
server.start().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
