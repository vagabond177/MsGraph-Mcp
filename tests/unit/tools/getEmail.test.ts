/**
 * Unit tests for GetEmail tool
 * Tests fetching specific email by ID
 */

import { GetEmail } from '../../../src/tools/mail/getEmail.js';
import { GraphClient } from '../../../src/utils/graphClient.js';
import { createMockMessage } from '../../helpers/mockFactories.js';

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

describe('GetEmail', () => {
  let getEmail: GetEmail;
  let mockGraphClient: jest.Mocked<GraphClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphClient = {
      getMessage: jest.fn(),
    } as any;

    getEmail = new GetEmail(mockGraphClient);
  });

  describe('execute', () => {
    it('should fetch email summary by default', async () => {
      const mockMessage = createMockMessage();
      mockGraphClient.getMessage.mockResolvedValue(mockMessage);

      const result = await getEmail.execute({
        messageId: 'msg-123',
      });

      expect(mockGraphClient.getMessage).toHaveBeenCalledWith('msg-123', false);
      expect(result).toMatchObject({
        messageId: mockMessage.id,
        subject: mockMessage.subject,
        from: 'John Doe',
        snippet: expect.any(String),
      });

      // Should not include full body
      expect(result).not.toHaveProperty('body');
    });

    it('should fetch full email when includeBody is true', async () => {
      const mockMessage = createMockMessage();
      mockGraphClient.getMessage.mockResolvedValue(mockMessage);

      const result = await getEmail.execute({
        messageId: 'msg-123',
        includeBody: true,
      });

      expect(mockGraphClient.getMessage).toHaveBeenCalledWith('msg-123', true);
      expect(result).toMatchObject({
        messageId: mockMessage.id,
        subject: mockMessage.subject,
        from: 'John Doe',
        body: expect.any(String),
        bodyType: 'html',
        to: expect.any(Array),
        cc: expect.any(Array),
      });
    });

    it('should include recipient details in full email', async () => {
      const mockMessage = createMockMessage({
        toRecipients: [
          {
            emailAddress: {
              name: 'Jane Doe',
              address: 'jane@example.com',
            },
          },
        ],
        ccRecipients: [
          {
            emailAddress: {
              name: 'Bob Smith',
              address: 'bob@example.com',
            },
          },
        ],
      });

      mockGraphClient.getMessage.mockResolvedValue(mockMessage);

      const result = await getEmail.execute({
        messageId: 'msg-123',
        includeBody: true,
      });

      expect(result.to).toEqual([
        {
          name: 'Jane Doe',
          address: 'jane@example.com',
        },
      ]);
      expect(result.cc).toEqual([
        {
          name: 'Bob Smith',
          address: 'bob@example.com',
        },
      ]);
    });

    it('should handle message not found', async () => {
      mockGraphClient.getMessage.mockRejectedValue(new Error('Message not found'));

      await expect(
        getEmail.execute({
          messageId: 'nonexistent',
        })
      ).rejects.toThrow('Message not found');
    });

    it('should handle API errors', async () => {
      mockGraphClient.getMessage.mockRejectedValue(new Error('API error'));

      await expect(
        getEmail.execute({
          messageId: 'msg-123',
        })
      ).rejects.toThrow('API error');
    });

    it('should process email to token-efficient summary by default', async () => {
      const mockMessage = createMockMessage({
        body: {
          content: 'a'.repeat(10000), // Very long body
        },
      });

      mockGraphClient.getMessage.mockResolvedValue(mockMessage);

      const result = await getEmail.execute({
        messageId: 'msg-123',
        includeBody: false,
      });

      // Summary should be much smaller than full email
      const resultString = JSON.stringify(result);
      expect(resultString.length).toBeLessThan(1000);
    });

    it('should handle missing message fields', async () => {
      const incompleteMessage = {
        id: 'msg-123',
        subject: null,
        from: null,
        receivedDateTime: '2025-10-31T10:00:00Z',
      };

      mockGraphClient.getMessage.mockResolvedValue(incompleteMessage);

      const result = await getEmail.execute({
        messageId: 'msg-123',
      });

      expect(result.subject).toBe('(No subject)');
      expect(result.from).toBe('Unknown');
    });
  });

  describe('includeBody flag', () => {
    it('should default to false when not specified', async () => {
      const mockMessage = createMockMessage();
      mockGraphClient.getMessage.mockResolvedValue(mockMessage);

      await getEmail.execute({
        messageId: 'msg-123',
      });

      expect(mockGraphClient.getMessage).toHaveBeenCalledWith('msg-123', false);
    });

    it('should pass includeBody=true to graph client', async () => {
      const mockMessage = createMockMessage();
      mockGraphClient.getMessage.mockResolvedValue(mockMessage);

      await getEmail.execute({
        messageId: 'msg-123',
        includeBody: true,
      });

      expect(mockGraphClient.getMessage).toHaveBeenCalledWith('msg-123', true);
    });

    it('should pass includeBody=false explicitly', async () => {
      const mockMessage = createMockMessage();
      mockGraphClient.getMessage.mockResolvedValue(mockMessage);

      await getEmail.execute({
        messageId: 'msg-123',
        includeBody: false,
      });

      expect(mockGraphClient.getMessage).toHaveBeenCalledWith('msg-123', false);
    });
  });

  describe('token efficiency', () => {
    it('should create token-efficient summary', async () => {
      const mockMessage = createMockMessage();
      mockGraphClient.getMessage.mockResolvedValue(mockMessage);

      const summary = await getEmail.execute({
        messageId: 'msg-123',
        includeBody: false,
      });

      // Estimate tokens (roughly 1 token per 4 characters)
      const summaryString = JSON.stringify(summary);
      const estimatedTokens = Math.ceil(summaryString.length / 4);

      // Should be under 150 tokens for summary
      expect(estimatedTokens).toBeLessThan(150);
    });

    it('should allow full body when explicitly requested', async () => {
      const mockMessage = createMockMessage({
        body: {
          content: 'A'.repeat(5000),
        },
      });

      mockGraphClient.getMessage.mockResolvedValue(mockMessage);

      const fullEmail = await getEmail.execute({
        messageId: 'msg-123',
        includeBody: true,
      });

      // Full email should include body
      expect(fullEmail.body.length).toBeGreaterThan(4000);
    });
  });
});
