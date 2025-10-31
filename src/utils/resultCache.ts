/**
 * Result cache for Copilot search results and email attachments
 * Stores full retrieval hits and attachment content so brief summaries can be returned to Claude,
 * with full details available via MCP Resources
 */

import { CopilotRetrievalHit } from '../types/index.js';
import { logger } from './logger.js';

interface CachedSearch {
  searchId: string;
  query: string;
  timestamp: number;
  results: CopilotRetrievalHit[];
}

interface CachedAttachment {
  attachmentId: string;
  messageId: string;
  timestamp: number;
  attachment: any; // Full attachment data including contentBytes
}

export class ResultCache {
  private searchCache: Map<string, CachedSearch> = new Map();
  private attachmentCache: Map<string, CachedAttachment> = new Map();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(ttlMs: number = 86400000, maxEntries: number = 100) {
    // Default: 24 hours TTL, max 100 entries per cache
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;

    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanupExpired(), 300000);
  }

  /**
   * Generate a unique search ID
   */
  generateSearchId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate a unique attachment cache ID
   */
  generateAttachmentId(messageId: string, attachmentId: string): string {
    return `${messageId}:${attachmentId}`;
  }

  /**
   * Store search results
   */
  set(searchId: string, query: string, results: CopilotRetrievalHit[]): void {
    // Check if we need to evict old entries (LRU)
    if (this.searchCache.size >= this.maxEntries) {
      this.evictOldestSearch();
    }

    this.searchCache.set(searchId, {
      searchId,
      query,
      timestamp: Date.now(),
      results,
    });

    logger.debug(`Cached search ${searchId} with ${results.length} results`);
  }

  /**
   * Get cached search results
   */
  get(searchId: string): CachedSearch | undefined {
    const cached = this.searchCache.get(searchId);

    if (!cached) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttlMs) {
      this.searchCache.delete(searchId);
      logger.debug(`Search ${searchId} expired, removed from cache`);
      return undefined;
    }

    return cached;
  }

  /**
   * Store an attachment with full content
   */
  setAttachment(messageId: string, attachmentId: string, attachment: any): string {
    // Check if we need to evict old entries (LRU)
    if (this.attachmentCache.size >= this.maxEntries) {
      this.evictOldestAttachment();
    }

    const cacheId = this.generateAttachmentId(messageId, attachmentId);

    this.attachmentCache.set(cacheId, {
      attachmentId: cacheId,
      messageId,
      timestamp: Date.now(),
      attachment,
    });

    logger.debug(`Cached attachment ${cacheId} (${attachment.name})`);
    return cacheId;
  }

  /**
   * Get cached attachment
   */
  getAttachment(cacheId: string): any | undefined {
    const cached = this.attachmentCache.get(cacheId);

    if (!cached) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttlMs) {
      this.attachmentCache.delete(cacheId);
      logger.debug(`Attachment ${cacheId} expired, removed from cache`);
      return undefined;
    }

    return cached.attachment;
  }

  /**
   * List all cached attachment IDs
   */
  listAttachmentIds(): string[] {
    return Array.from(this.attachmentCache.keys());
  }

  /**
   * Get a specific result by index
   */
  getResult(searchId: string, resultIndex: number): CopilotRetrievalHit | undefined {
    const cached = this.get(searchId);

    if (!cached) {
      return undefined;
    }

    if (resultIndex < 0 || resultIndex >= cached.results.length) {
      return undefined;
    }

    return cached.results[resultIndex];
  }

  /**
   * List all cached search IDs
   */
  listSearchIds(): string[] {
    return Array.from(this.searchCache.keys());
  }

  /**
   * Get all results for a search (for listing resources)
   */
  getSearchResults(searchId: string): CopilotRetrievalHit[] | undefined {
    const cached = this.get(searchId);
    return cached?.results;
  }

  /**
   * Clear specific search from cache
   */
  clear(searchId: string): boolean {
    return this.searchCache.delete(searchId);
  }

  /**
   * Clear specific attachment from cache
   */
  clearAttachment(cacheId: string): boolean {
    return this.attachmentCache.delete(cacheId);
  }

  /**
   * Clear all cached searches and attachments
   */
  clearAll(): void {
    this.searchCache.clear();
    this.attachmentCache.clear();
    logger.info('Cleared all cached results');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    searchEntries: number;
    totalSearchResults: number;
    attachmentEntries: number;
  } {
    let totalResults = 0;
    for (const cached of this.searchCache.values()) {
      totalResults += cached.results.length;
    }

    return {
      searchEntries: this.searchCache.size,
      totalSearchResults: totalResults,
      attachmentEntries: this.attachmentCache.size,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let removedSearches = 0;
    let removedAttachments = 0;

    for (const [searchId, cached] of this.searchCache.entries()) {
      if (now - cached.timestamp > this.ttlMs) {
        this.searchCache.delete(searchId);
        removedSearches++;
      }
    }

    for (const [attachmentId, cached] of this.attachmentCache.entries()) {
      if (now - cached.timestamp > this.ttlMs) {
        this.attachmentCache.delete(attachmentId);
        removedAttachments++;
      }
    }

    if (removedSearches > 0 || removedAttachments > 0) {
      logger.debug(`Cleaned up ${removedSearches} searches and ${removedAttachments} attachments`);
    }
  }

  /**
   * Evict oldest search entry (LRU)
   */
  private evictOldestSearch(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [searchId, cached] of this.searchCache.entries()) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
        oldestId = searchId;
      }
    }

    if (oldestId) {
      this.searchCache.delete(oldestId);
      logger.debug(`Evicted oldest search ${oldestId} (LRU)`);
    }
  }

  /**
   * Evict oldest attachment entry (LRU)
   */
  private evictOldestAttachment(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [attachmentId, cached] of this.attachmentCache.entries()) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
        oldestId = attachmentId;
      }
    }

    if (oldestId) {
      this.attachmentCache.delete(oldestId);
      logger.debug(`Evicted oldest attachment ${oldestId} (LRU)`);
    }
  }
}
