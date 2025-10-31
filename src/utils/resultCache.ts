/**
 * Result cache for Copilot search results
 * Stores full retrieval hits so brief summaries can be returned to Claude,
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

export class ResultCache {
  private cache: Map<string, CachedSearch> = new Map();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(ttlMs: number = 86400000, maxEntries: number = 100) {
    // Default: 24 hours TTL, max 100 searches
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
   * Store search results
   */
  set(searchId: string, query: string, results: CopilotRetrievalHit[]): void {
    // Check if we need to evict old entries (LRU)
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    this.cache.set(searchId, {
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
    const cached = this.cache.get(searchId);

    if (!cached) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttlMs) {
      this.cache.delete(searchId);
      logger.debug(`Search ${searchId} expired, removed from cache`);
      return undefined;
    }

    return cached;
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
    return Array.from(this.cache.keys());
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
    return this.cache.delete(searchId);
  }

  /**
   * Clear all cached searches
   */
  clearAll(): void {
    this.cache.clear();
    logger.info('Cleared all cached search results');
  }

  /**
   * Get cache statistics
   */
  getStats(): { entries: number; totalResults: number } {
    let totalResults = 0;
    for (const cached of this.cache.values()) {
      totalResults += cached.results.length;
    }

    return {
      entries: this.cache.size,
      totalResults,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let removed = 0;

    for (const [searchId, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.ttlMs) {
        this.cache.delete(searchId);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug(`Cleaned up ${removed} expired search results`);
    }
  }

  /**
   * Evict oldest entry (LRU)
   */
  private evictOldest(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [searchId, cached] of this.cache.entries()) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
        oldestId = searchId;
      }
    }

    if (oldestId) {
      this.cache.delete(oldestId);
      logger.debug(`Evicted oldest search ${oldestId} (LRU)`);
    }
  }
}
