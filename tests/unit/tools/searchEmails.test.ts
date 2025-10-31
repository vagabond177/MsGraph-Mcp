/**
 * Unit tests for SearchEmails tool
 * Tests email search functionality with KQL queries
 */

import { SearchEmails } from '../../../src/tools/mail/searchEmails.js';
import { GraphClient } from '../../../src/utils/graphClient.js';
import { ResultProcessor } from '../../../src/utils/resultProcessor.js';
import { createMockMessages } from '../../helpers/mockFactories.js';

// Mock dependencies
jest.mock('../../../src/utils/graphClient.js');
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SearchEmails', () => {
  let searchEmails: SearchEmails;
  let mockGraphClient: jest.Mocked<GraphClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphClient = {
      searchMessages: jest.fn(),
    } as any;

    searchEmails = new SearchEmails(mockGraphClient);
  });

  describe('execute', () => {
    it('should search emails with query', async () => {
      const mockMessages = createMockMessages(5);
      mockGraphClient.searchMessages.mockResolvedValue({ value: mockMessages });

      const result = await searchEmails.execute({
        query: 'subject:test',
      });

      expect(mockGraphClient.searchMessages).toHaveBeenCalledWith('subject:test', 25, undefined);
      expect(result).toHaveLength(5);
      expect(result[0]).toHaveProperty('messageId');
      expect(result[0]).toHaveProperty('subject');
    });

    it('should use custom maxResults', async () => {
      const mockMessages = createMockMessages(10);
      mockGraphClient.searchMessages.mockResolvedValue({ value: mockMessages });

      const result = await searchEmails.execute({
        query: 'from:john@example.com',
        maxResults: 10,
      });

      expect(mockGraphClient.searchMessages).toHaveBeenCalledWith('from:john@example.com', 10, undefined);
      expect(result).toHaveLength(10);
    });

    it('should handle empty results', async () => {
      mockGraphClient.searchMessages.mockResolvedValue({ value: [] });

      const result = await searchEmails.execute({
        query: 'subject:nonexistent',
      });

      expect(result).toEqual([]);
    });

    it('should handle null value in response', async () => {
      mockGraphClient.searchMessages.mockResolvedValue({});

      const result = await searchEmails.execute({
        query: 'test',
      });

      expect(result).toEqual([]);
    });

    it('should sort results by date (newest first)', async () => {
      const mockMessages = [
        {
          id: '1',
          subject: 'Old',
          receivedDateTime: '2025-10-20T10:00:00Z',
          from: { emailAddress: { name: 'Test' } },
          bodyPreview: 'old',
        },
        {
          id: '2',
          subject: 'New',
          receivedDateTime: '2025-10-31T10:00:00Z',
          from: { emailAddress: { name: 'Test' } },
          bodyPreview: 'new',
        },
      ];

      mockGraphClient.searchMessages.mockResolvedValue({ value: mockMessages });

      const result = await searchEmails.execute({
        query: 'test',
      });

      expect(result[0].messageId).toBe('2'); // Newest first
      expect(result[1].messageId).toBe('1');
    });

    it('should process emails to token-efficient summaries', async () => {
      const mockMessages = createMockMessages(3);
      mockGraphClient.searchMessages.mockResolvedValue({ value: mockMessages });

      const result = await searchEmails.execute({
        query: 'test',
      });

      // Verify token efficiency
      result.forEach(email => {
        expect(email).toHaveProperty('messageId');
        expect(email).toHaveProperty('subject');
        expect(email).toHaveProperty('from');
        expect(email).toHaveProperty('snippet');
        expect(email).toHaveProperty('hasAttachments');
        expect(email).toHaveProperty('importance');

        // Should not include full body
        expect(email).not.toHaveProperty('body');
      });
    });

    it('should handle search errors', async () => {
      mockGraphClient.searchMessages.mockRejectedValue(new Error('Search failed'));

      await expect(
        searchEmails.execute({
          query: 'test',
        })
      ).rejects.toThrow('Search failed');
    });

    it('should support complex KQL queries', async () => {
      const complexQuery = 'from:john@example.com AND subject:urgent AND received>=2025-10-01';
      mockGraphClient.searchMessages.mockResolvedValue({ value: [] });

      await searchEmails.execute({
        query: complexQuery,
      });

      expect(mockGraphClient.searchMessages).toHaveBeenCalledWith(complexQuery, 25, undefined);
    });

    it('should estimate and log token usage', async () => {
      const mockMessages = createMockMessages(10);
      mockGraphClient.searchMessages.mockResolvedValue({ value: mockMessages });

      const result = await searchEmails.execute({
        query: 'test',
      });

      // Verify token efficiency for 10 emails
      const estimatedTokens = ResultProcessor.estimateTokens(result);

      // 10 summaries should be significantly less than 10 full emails
      // Target: ~50-100 tokens per summary = 500-1000 total
      expect(estimatedTokens).toBeLessThan(1500);
    });
  });

  describe('input validation', () => {
    it('should handle missing query gracefully', async () => {
      mockGraphClient.searchMessages.mockResolvedValue({ value: [] });

      const result = await searchEmails.execute({
        query: '',
      });

      expect(mockGraphClient.searchMessages).toHaveBeenCalledWith('', 25, undefined);
      expect(result).toEqual([]);
    });

    it('should handle negative maxResults', async () => {
      mockGraphClient.searchMessages.mockResolvedValue({ value: [] });

      await searchEmails.execute({
        query: 'test',
        maxResults: -1,
      });

      expect(mockGraphClient.searchMessages).toHaveBeenCalledWith('test', -1, undefined);
    });

    it('should handle very large maxResults', async () => {
      mockGraphClient.searchMessages.mockResolvedValue({ value: [] });

      await searchEmails.execute({
        query: 'test',
        maxResults: 10000,
      });

      expect(mockGraphClient.searchMessages).toHaveBeenCalledWith('test', 10000, undefined);
    });
  });

  describe('multi-mailbox support', () => {
    it('should pass mailbox parameter to graphClient when specified', async () => {
      mockGraphClient.searchMessages.mockResolvedValue({ value: [] });

      await searchEmails.execute({
        query: 'test',
        mailbox: 'shared@example.com',
      });

      expect(mockGraphClient.searchMessages).toHaveBeenCalledWith('test', 25, 'shared@example.com');
    });

    it('should not pass mailbox parameter when not specified', async () => {
      mockGraphClient.searchMessages.mockResolvedValue({ value: [] });

      await searchEmails.execute({
        query: 'test',
      });

      expect(mockGraphClient.searchMessages).toHaveBeenCalledWith('test', 25, undefined);
    });

    it('should support mailbox with custom maxResults', async () => {
      mockGraphClient.searchMessages.mockResolvedValue({ value: [] });

      await searchEmails.execute({
        query: 'urgent',
        maxResults: 50,
        mailbox: 'delegate@example.com',
      });

      expect(mockGraphClient.searchMessages).toHaveBeenCalledWith('urgent', 50, 'delegate@example.com');
    });
  });
});
