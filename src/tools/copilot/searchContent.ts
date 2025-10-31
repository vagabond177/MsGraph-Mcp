/**
 * Copilot-powered content search across M365 tenant
 * Searches SharePoint, OneDrive, and external items using natural language
 *
 * Returns brief summaries to Claude, caches full results as MCP Resources
 */

import {
  CopilotSearchInput,
  CopilotSearchResponse,
  CopilotSearchResultBrief,
  CopilotRetrievalRequest,
} from '../../types/index.js';
import { GraphClient } from '../../utils/graphClient.js';
import { ResultCache } from '../../utils/resultCache.js';
import { logger } from '../../utils/logger.js';

export class SearchContent {
  private graphClient: GraphClient;
  private resultCache: ResultCache;

  constructor(graphClient: GraphClient, resultCache: ResultCache) {
    this.graphClient = graphClient;
    this.resultCache = resultCache;
  }

  /**
   * Search M365 content using Copilot Retrieval API
   * Returns brief summaries, caches full results for later retrieval
   */
  async execute(input: CopilotSearchInput): Promise<CopilotSearchResponse> {
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

      // Generate search ID and cache full results
      const searchId = this.resultCache.generateSearchId();
      this.resultCache.set(searchId, query, response.retrievalHits);

      logger.debug(`Cached search ${searchId} with ${response.retrievalHits.length} results`);

      // Create brief summaries for each result
      const briefResults: CopilotSearchResultBrief[] = response.retrievalHits.map((hit, index) => {
        // Extract title from metadata or URL
        const title = this.extractTitle(hit, includeMetadata);

        // Get highest relevance score
        const relevance =
          hit.extracts.length > 0
            ? Math.max(...hit.extracts.map((e) => e.relevanceScore))
            : 0;

        // Create brief excerpt from top extract
        const briefExcerpt = this.createBriefExcerpt(hit.extracts);

        return {
          resultId: `result-${index}`,
          title,
          url: hit.webUrl,
          relevance,
          briefExcerpt,
          resourceType: hit.resourceType,
          sensitivityLabel: hit.sensitivityLabel?.name,
          resourceUri: `copilot://search-${searchId}/result-${index}`,
          metadata: includeMetadata
            ? {
                fileExtension: hit.resourceMetadata?.fileExtension as string,
                lastModifiedDateTime: hit.resourceMetadata?.lastModifiedDateTime as string,
              }
            : undefined,
        };
      });

      // Sort by relevance (highest first)
      briefResults.sort((a, b) => b.relevance - a.relevance);

      // Log statistics
      this.logResultStats(briefResults, query);

      return {
        searchId,
        query,
        dataSource,
        totalResults: briefResults.length,
        results: briefResults,
        instruction:
          'These are brief summaries. To see full text extracts for any result, read the MCP Resource at resourceUri.',
      };
    } catch (error) {
      logger.error('Copilot search failed:', error);
      throw error;
    }
  }

  /**
   * Extract title from result metadata or URL
   */
  private extractTitle(hit: any, hasMetadata: boolean): string {
    // Try title from metadata
    if (hasMetadata && hit.resourceMetadata?.title) {
      return hit.resourceMetadata.title as string;
    }

    // Fall back to extracting from URL
    const url = hit.webUrl;
    const parts = url.split('/');
    const filename = parts[parts.length - 1];

    // Decode URL encoding and remove file extension
    const decoded = decodeURIComponent(filename);
    const withoutExt = decoded.replace(/\.[^.]+$/, '');

    return withoutExt || 'Untitled Document';
  }

  /**
   * Create brief excerpt from extracts
   * Takes top extract by relevance, truncates to ~150 chars
   */
  private createBriefExcerpt(extracts: any[]): string {
    if (!extracts || extracts.length === 0) {
      return '';
    }

    // Get top extract by relevance
    const topExtract = extracts.reduce((prev, curr) =>
      curr.relevanceScore > prev.relevanceScore ? curr : prev
    );

    const text = topExtract.text;

    // Truncate to ~150 chars at word boundary
    const maxChars = 150;
    if (text.length <= maxChars) {
      return text;
    }

    const truncated = text.substring(0, maxChars);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > 0) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  /**
   * Log search result statistics
   */
  private logResultStats(results: CopilotSearchResultBrief[], query: string): void {
    if (results.length === 0) {
      logger.info(`No results found for: "${query}"`);
      return;
    }

    const avgRelevance =
      results.reduce((sum, r) => sum + r.relevance, 0) / results.length;
    const resourceTypes = [...new Set(results.map((r) => r.resourceType))];
    const withSensitivity = results.filter((r) => r.sensitivityLabel).length;

    // Estimate tokens (rough): 100 tokens per brief result
    const estimatedTokens = results.length * 100;

    logger.info(
      `Copilot search: ${results.length} results, avg relevance ${avgRelevance.toFixed(2)}, ` +
        `types: ${resourceTypes.join(', ')}, ${withSensitivity} with sensitivity labels, ` +
        `~${estimatedTokens} tokens`
    );
  }
}
