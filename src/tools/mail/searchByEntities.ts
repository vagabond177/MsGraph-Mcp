/**
 * Email search by entities (batch search for multiple companies/entities)
 */

import {
  SearchEmailsByEntitiesInput,
  BatchEmailSearchResult,
  GraphBatchRequest,
} from '../../types/index.js';
import { GraphClient } from '../../utils/graphClient.js';
import { ResultProcessor } from '../../utils/resultProcessor.js';
import { logger } from '../../utils/logger.js';

export class SearchByEntities {
  private graphClient: GraphClient;

  constructor(graphClient: GraphClient) {
    this.graphClient = graphClient;
  }

  /**
   * Search emails for multiple entities in batch
   */
  async execute(input: SearchEmailsByEntitiesInput): Promise<BatchEmailSearchResult> {
    const {
      entities,
      keywords = [],
      dateFrom,
      dateTo,
      maxResultsPerEntity = 5,
    } = input;

    logger.info(`Searching emails for ${entities.length} entities`);

    // Build batch requests
    const batchRequests: GraphBatchRequest[] = entities.map((entity, index) => ({
      id: index.toString(),
      method: 'GET',
      url: this.buildSearchUrl(entity, keywords, dateFrom, dateTo, maxResultsPerEntity),
    }));

    // Execute batch
    const batchResult = await this.graphClient.executeBatch(batchRequests);

    // Process results
    const results: BatchEmailSearchResult = {};

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const response = batchResult.responses.find((r) => r.id === i.toString());

      if (!response) {
        results[entity] = {
          matchCount: 0,
          emails: [],
          error: 'No response from server',
        };
        continue;
      }

      if (response.status !== 200) {
        results[entity] = {
          matchCount: 0,
          emails: [],
          error: `Error ${response.status}: ${this.getErrorMessage(response.body)}`,
        };
        continue;
      }

      // Process successful response
      const messages = (response.body as any)?.value || [];
      const emailSummaries = ResultProcessor.processEmails(messages);
      const sortedEmails = ResultProcessor.sortByDate(emailSummaries);
      const limitedEmails = ResultProcessor.limitResults(sortedEmails, maxResultsPerEntity);

      results[entity] = {
        matchCount: messages.length,
        latestDate: ResultProcessor.getLatestDate(sortedEmails),
        emails: limitedEmails,
      };
    }

    // Log statistics
    ResultProcessor.logResultStats(results, 'Batch search results');

    return results;
  }

  /**
   * Build KQL search URL for entity
   */
  private buildSearchUrl(
    entity: string,
    keywords: string[],
    dateFrom?: string,
    dateTo?: string,
    maxResults: number = 5
  ): string {
    // Build KQL query
    const kqlParts: string[] = [];

    // Search for entity in from/subject/body
    kqlParts.push(`(from:${this.escapeKql(entity)} OR subject:${this.escapeKql(entity)})`);

    // Add keywords if provided
    if (keywords.length > 0) {
      const keywordQuery = keywords.map((kw) => this.escapeKql(kw)).join(' OR ');
      kqlParts.push(`(${keywordQuery})`);
    }

    // Add date filters
    if (dateFrom) {
      kqlParts.push(`received>=${dateFrom}`);
    }
    if (dateTo) {
      kqlParts.push(`received<=${dateTo}`);
    }

    const kqlQuery = kqlParts.join(' AND ');

    // Build URL
    const select = 'id,subject,from,receivedDateTime,bodyPreview,hasAttachments,importance';
    return `/me/messages?$search="${kqlQuery}"&$top=${maxResults}&$select=${select}`;
  }

  /**
   * Escape special characters in KQL query
   */
  private escapeKql(text: string): string {
    // Replace special characters that need escaping in KQL
    return text.replace(/[\\:"()]/g, '\\$&');
  }

  /**
   * Extract error message from response body
   */
  private getErrorMessage(body: any): string {
    if (body?.error?.message) {
      return body.error.message;
    }
    return 'Unknown error';
  }
}
