/**
 * Unit tests for ResultCache
 * Tests caching for search results and attachments
 */

import { ResultCache } from '../../../src/utils/resultCache.js';
import { createMockAttachment } from '../../helpers/mockFactories.js';

describe('ResultCache', () => {
  let cache: ResultCache;

  beforeEach(() => {
    cache = new ResultCache(1000, 5); // 1 second TTL, max 5 entries for testing
  });

  describe('attachment caching', () => {
    it('should cache attachment and return cache ID', () => {
      const attachment = createMockAttachment({
        id: 'att-123',
        name: 'test.pdf',
      });

      const cacheId = cache.setAttachment('msg-123', 'att-123', attachment);

      expect(cacheId).toBe('msg-123:att-123');
    });

    it('should retrieve cached attachment', () => {
      const attachment = createMockAttachment({
        id: 'att-123',
        name: 'test.pdf',
      });

      const cacheId = cache.setAttachment('msg-123', 'att-123', attachment);
      const retrieved = cache.getAttachment(cacheId);

      expect(retrieved).toEqual(attachment);
    });

    it('should return undefined for non-existent attachment', () => {
      const retrieved = cache.getAttachment('nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should list all cached attachment IDs', () => {
      cache.setAttachment('msg-1', 'att-1', createMockAttachment());
      cache.setAttachment('msg-2', 'att-2', createMockAttachment());

      const ids = cache.listAttachmentIds();

      expect(ids).toHaveLength(2);
      expect(ids).toContain('msg-1:att-1');
      expect(ids).toContain('msg-2:att-2');
    });

    it('should clear specific attachment', () => {
      const cacheId = cache.setAttachment('msg-1', 'att-1', createMockAttachment());

      const cleared = cache.clearAttachment(cacheId);
      expect(cleared).toBe(true);

      const retrieved = cache.getAttachment(cacheId);
      expect(retrieved).toBeUndefined();
    });

    it('should return false when clearing non-existent attachment', () => {
      const cleared = cache.clearAttachment('nonexistent');
      expect(cleared).toBe(false);
    });
  });

  describe('cache statistics', () => {
    it('should return stats with attachment counts', () => {
      cache.setAttachment('msg-1', 'att-1', createMockAttachment());
      cache.setAttachment('msg-2', 'att-2', createMockAttachment());

      const stats = cache.getStats();

      expect(stats.attachmentEntries).toBe(2);
      expect(stats.searchEntries).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('should clear all cached attachments', () => {
      cache.setAttachment('msg-1', 'att-1', createMockAttachment());
      cache.setAttachment('msg-2', 'att-2', createMockAttachment());

      cache.clearAll();

      const ids = cache.listAttachmentIds();
      expect(ids).toHaveLength(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest attachment when cache is full', () => {
      // Cache max is 5 entries
      for (let i = 0; i < 5; i++) {
        cache.setAttachment(`msg-${i}`, `att-${i}`, createMockAttachment());
      }

      // Add 6th entry - should evict first one
      cache.setAttachment('msg-5', 'att-5', createMockAttachment());

      const ids = cache.listAttachmentIds();
      expect(ids).toHaveLength(5);
      expect(ids).not.toContain('msg-0:att-0'); // First entry evicted
      expect(ids).toContain('msg-5:att-5'); // New entry added
    });
  });

  describe('generateAttachmentId', () => {
    it('should generate consistent attachment IDs', () => {
      const id1 = cache.generateAttachmentId('msg-123', 'att-456');
      const id2 = cache.generateAttachmentId('msg-123', 'att-456');

      expect(id1).toBe('msg-123:att-456');
      expect(id2).toBe('msg-123:att-456');
      expect(id1).toBe(id2);
    });
  });
});
