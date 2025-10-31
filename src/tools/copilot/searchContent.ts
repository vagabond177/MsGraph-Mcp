/**
 * Copilot-powered content search across M365 tenant
 * Searches SharePoint, OneDrive, and external items using natural language
 */

import {
  CopilotSearchInput,
  CopilotSearchResult,
  CopilotRetrievalRequest,
} from '../../types/index.js';
import { GraphClient } from '../../utils/graphClient.js';
import { logger } from '../../utils/logger.js';

export class SearchContent {
  private graphClient: GraphClient;

  constructor(graphClient: GraphClient) {
    this.graphClient = graphClient;
  }

  /**
   * Search M365 content using Copilot Retrieval API
   */
  async execute(input: CopilotSearchInput): Promise<CopilotSearchResult[]> {
    const {
      query,
      dataSource = 'sharePoint',
      filterExpression,
      maxResults = 10,
      includeMetadata = false,
    } = input;

    logger.info(`Copilot search: "${query}" on ${dataSource}`);

    // Build request
    const request: CopilotRetrievalRequest = {
      queryString: query,
      dataSource: dataSource,
      maximumNumberOfResults: Math.min(maxResults, 25), // API max is 25
    };

    // Add optional parameters
    if (filterExpression) {
      request.filterExpression = filterExpression;
    }

    if (includeMetadata) {
      request.resourceMetadata = [
        'title',
        'author',
        'lastModifiedDateTime',
        'createdDateTime',
        'fileExtension',
        'size',
      ];
    }

    try {
      const response = await this.graphClient.copilotRetrieval(request);

      logger.info(`Found ${response.retrievalHits.length} results`);

      // Transform to simplified results
      const results: CopilotSearchResult[] = response.retrievalHits.map((hit) => {
        // Combine all extracts into a single excerpt, prioritizing by relevance
        const sortedExtracts = [...hit.extracts].sort(
          (a, b) => b.relevanceScore - a.relevanceScore
        );
        const excerpt = sortedExtracts.map((e) => e.text).join('\n\n');

        // Get the highest relevance score
        const relevance =
          hit.extracts.length > 0
            ? Math.max(...hit.extracts.map((e) => e.relevanceScore))
            : 0;

        return {
          source: dataSource,
          url: hit.webUrl,
          relevance: relevance,
          excerpt: excerpt,
          resourceType: hit.resourceType,
          metadata: includeMetadata ? hit.resourceMetadata : undefined,
          sensitivityLabel: hit.sensitivityLabel?.name,
        };
      });

      // Sort by relevance (highest first)
      results.sort((a, b) => b.relevance - a.relevance);

      // Log statistics
      this.logResultStats(results, query);

      return results;
    } catch (error) {
      logger.error('Copilot search failed:', error);
      throw error;
    }
  }

  /**
   * Log search result statistics
   */
  private logResultStats(results: CopilotSearchResult[], query: string): void {
    if (results.length === 0) {
      logger.info(`No results found for: "${query}"`);
      return;
    }

    const avgRelevance =
      results.reduce((sum, r) => sum + r.relevance, 0) / results.length;
    const resourceTypes = [...new Set(results.map((r) => r.resourceType))];
    const withSensitivity = results.filter((r) => r.sensitivityLabel).length;

    logger.info(`Copilot search stats: ${results.length} results, avg relevance ${avgRelevance.toFixed(2)}, types: ${resourceTypes.join(', ')}, ${withSensitivity} with sensitivity labels`);
  }
}
