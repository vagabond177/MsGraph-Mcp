/**
 * Microsoft Graph API client with batching, rate limiting, and retry logic
 */

import { Client } from '@microsoft/microsoft-graph-client';
import {
  GraphBatchRequest,
  GraphBatchResult,
  GraphError,
  CopilotRetrievalRequest,
  CopilotRetrievalResponse,
} from '../types/index.js';
import { GraphAuthenticator } from '../auth/graphAuth.js';
import { logger } from './logger.js';

export class GraphClient {
  private client?: Client;
  private authenticator: GraphAuthenticator;
  private maxRetries = 3;
  private baseRetryDelay = 1000; // 1 second

  constructor(authenticator: GraphAuthenticator) {
    this.authenticator = authenticator;
  }

  /**
   * Initialize the Graph client
   */
  async initialize(): Promise<void> {
    this.client = Client.init({
      authProvider: async done => {
        try {
          const token = await this.authenticator.getAccessToken();
          done(null, token);
        } catch (error) {
          done(error as Error, null);
        }
      },
    });

    logger.info('Graph client initialized');
  }

  /**
   * Execute a single Graph API request with retry logic
   */
  async executeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    if (!this.client) {
      throw new GraphError('Client not initialized');
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const request = this.client.api(endpoint);

        if (method === 'POST') {
          return await request.post(body);
        } else if (method === 'PATCH') {
          return await request.patch(body);
        } else if (method === 'DELETE') {
          return await request.delete();
        } else {
          return await request.get();
        }
      } catch (error: any) {
        lastError = error;

        // Check for rate limiting (429)
        if (error.statusCode === 429) {
          const retryAfter = this.getRetryAfter(error);
          logger.warn(`Rate limited. Retrying after ${retryAfter}s`);
          await this.sleep(retryAfter * 1000);
          continue;
        }

        // Check for auth errors (401) - try to refresh token
        if (error.statusCode === 401 && attempt === 0) {
          logger.warn('Auth error, refreshing token...');
          await this.authenticator.getAccessToken();
          await this.initialize();
          continue;
        }

        // Check for server errors (500, 502, 503, 504) - retry with backoff
        if (error.statusCode >= 500 && error.statusCode < 600) {
          const delay = this.calculateBackoff(attempt);
          logger.warn(`Server error (${error.statusCode}). Retrying in ${delay}ms`);
          await this.sleep(delay);
          continue;
        }

        // Other errors - don't retry
        throw new GraphError(`Graph API request failed: ${error.message}`, error.statusCode, error);
      }
    }

    throw new GraphError(
      `Failed after ${this.maxRetries} retries: ${lastError?.message}`,
      undefined,
      lastError
    );
  }

  /**
   * Execute a batch of Graph API requests
   * Automatically chunks into batches of 20 (Graph API limit)
   */
  async executeBatch(requests: GraphBatchRequest[]): Promise<GraphBatchResult> {
    if (!this.client) {
      throw new GraphError('Client not initialized');
    }

    if (requests.length === 0) {
      return { responses: [] };
    }

    // Split into chunks of 20 (Graph API batch limit)
    const chunks = this.chunkArray(requests, 20);
    const allResponses: GraphBatchResult['responses'] = [];

    // Process chunks sequentially to respect rate limits
    for (const chunk of chunks) {
      try {
        const batchRequest = { requests: chunk };

        logger.debug(`Executing batch with ${chunk.length} requests`);

        const result = await this.executeRequest<GraphBatchResult>('/$batch', 'POST', batchRequest);

        allResponses.push(...result.responses);
      } catch (error) {
        logger.error('Batch request failed:', error);

        // Return partial results with errors
        chunk.forEach(req => {
          allResponses.push({
            id: req.id,
            status: 500,
            body: {
              error: {
                message: `Batch request failed: ${error}`,
              },
            },
          });
        });
      }
    }

    return { responses: allResponses };
  }

  /**
   * Search for messages using KQL query
   */
  async searchMessages(query: string, maxResults: number = 25): Promise<any> {
    const endpoint = `/me/messages?$search="${query}"&$top=${maxResults}&$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,importance`;
    return this.executeRequest(endpoint);
  }

  /**
   * Get a specific message by ID
   */
  async getMessage(messageId: string, includeBody: boolean = false): Promise<any> {
    let select =
      'id,subject,from,receivedDateTime,bodyPreview,hasAttachments,importance,toRecipients,ccRecipients';

    if (includeBody) {
      select += ',body';
    }

    const endpoint = `/me/messages/${messageId}?$select=${select}`;
    return this.executeRequest(endpoint);
  }

  /**
   * List mail folders
   */
  async listMailFolders(): Promise<any> {
    const endpoint =
      '/me/mailFolders?$select=id,displayName,parentFolderId,childFolderCount,unreadItemCount,totalItemCount';
    return this.executeRequest(endpoint);
  }

  /**
   * Execute Copilot Retrieval API request
   * Search across SharePoint, OneDrive, and external items using natural language
   */
  async copilotRetrieval(request: CopilotRetrievalRequest): Promise<CopilotRetrievalResponse> {
    logger.info(`Copilot retrieval: "${request.queryString}" on ${request.dataSource}`);

    // Microsoft Graph client automatically adds /v1.0 prefix
    const endpoint = '/copilot/retrieval';

    try {
      const response = await this.executeRequest<CopilotRetrievalResponse>(
        endpoint,
        'POST',
        request
      );

      logger.info(`Found ${response.retrievalHits?.length || 0} retrieval hits`);
      return response;
    } catch (error: any) {
      logger.error('Copilot retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Get retry-after value from rate limit error
   */
  private getRetryAfter(error: any): number {
    // Check Retry-After header
    if (error.headers?.['retry-after']) {
      return parseInt(error.headers['retry-after'], 10);
    }

    // Check error body
    if (error.body?.error?.['retry-after']) {
      return parseInt(error.body.error['retry-after'], 10);
    }

    // Default to 5 seconds
    return 5;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    return this.baseRetryDelay * Math.pow(2, attempt);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
