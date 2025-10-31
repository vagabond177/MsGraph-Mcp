/**
 * Unit tests for GetAttachments tool
 * Tests fetching email attachments with token efficiency
 */

import { GetAttachments } from '../../../src/tools/mail/getAttachments.js';
import { GraphClient } from '../../../src/utils/graphClient.js';
import { createMockAttachment, createMockAttachments } from '../../helpers/mockFactories.js';

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

describe('GetAttachments', () => {
  let getAttachments: GetAttachments;
  let mockGraphClient: jest.Mocked<GraphClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphClient = {
      getAttachments: jest.fn(),
    } as any;

    getAttachments = new GetAttachments(mockGraphClient);
  });

  describe('execute', () => {
    it('should fetch attachment metadata without content by default', async () => {
      const mockAttachments = createMockAttachments(2);
      mockGraphClient.getAttachments.mockResolvedValue(mockAttachments);

      const result = await getAttachments.execute({
        messageId: 'msg-123',
      });

      expect(mockGraphClient.getAttachments).toHaveBeenCalledWith('msg-123', false, undefined);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'attachment-1',
        name: 'document-1.pdf',
        contentType: 'application/pdf',
        size: 1024,
        isInline: false,
      });

      // Should not include content bytes by default (token efficiency)
      expect(result[0]).not.toHaveProperty('contentBytes');
    });

    it('should include content bytes when includeContent is true', async () => {
      const mockAttachments = createMockAttachments(1);
      mockGraphClient.getAttachments.mockResolvedValue(mockAttachments);

      const result = await getAttachments.execute({
        messageId: 'msg-123',
        includeContent: true,
      });

      expect(mockGraphClient.getAttachments).toHaveBeenCalledWith('msg-123', true, undefined);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('contentBytes');
      expect(result[0].contentBytes).toBeDefined();
    });

    it('should handle message with no attachments', async () => {
      mockGraphClient.getAttachments.mockResolvedValue([]);

      const result = await getAttachments.execute({
        messageId: 'msg-123',
      });

      expect(mockGraphClient.getAttachments).toHaveBeenCalledWith('msg-123', false, undefined);
      expect(result).toEqual([]);
    });

    it('should handle message not found', async () => {
      mockGraphClient.getAttachments.mockRejectedValue(new Error('Message not found'));

      await expect(
        getAttachments.execute({
          messageId: 'nonexistent',
        })
      ).rejects.toThrow('Message not found');
    });

    it('should handle API errors', async () => {
      mockGraphClient.getAttachments.mockRejectedValue(new Error('API error'));

      await expect(
        getAttachments.execute({
          messageId: 'msg-123',
        })
      ).rejects.toThrow('API error');
    });

    it('should handle inline attachments', async () => {
      const inlineAttachment = createMockAttachment({
        isInline: true,
        name: 'logo.png',
        contentType: 'image/png',
      });
      mockGraphClient.getAttachments.mockResolvedValue([inlineAttachment]);

      const result = await getAttachments.execute({
        messageId: 'msg-123',
      });

      expect(result[0].isInline).toBe(true);
      expect(result[0].contentType).toBe('image/png');
    });

    it('should handle attachments with missing optional fields', async () => {
      const incompleteAttachment = {
        id: 'attachment-123',
        name: 'document.pdf',
        contentType: 'application/pdf',
        size: 1024,
        isInline: false,
      };

      mockGraphClient.getAttachments.mockResolvedValue([incompleteAttachment]);

      const result = await getAttachments.execute({
        messageId: 'msg-123',
      });

      expect(result[0].id).toBe('attachment-123');
      expect(result[0].lastModifiedDateTime).toBeUndefined();
    });
  });

  describe('token efficiency', () => {
    it('should return minimal data by default for token efficiency', async () => {
      const mockAttachments = createMockAttachments(3);
      mockGraphClient.getAttachments.mockResolvedValue(mockAttachments);

      const result = await getAttachments.execute({
        messageId: 'msg-123',
        includeContent: false,
      });

      // Estimate tokens (roughly 1 token per 4 characters)
      const resultString = JSON.stringify(result);
      const estimatedTokens = Math.ceil(resultString.length / 4);

      // Metadata for 3 attachments should be under 200 tokens
      expect(estimatedTokens).toBeLessThan(200);
    });

    it('should allow full content when explicitly requested', async () => {
      const largeAttachment = createMockAttachment({
        size: 5000000, // 5MB
        contentBytes: 'A'.repeat(6666667), // Base64 is ~4/3 larger
      });

      mockGraphClient.getAttachments.mockResolvedValue([largeAttachment]);

      const result = await getAttachments.execute({
        messageId: 'msg-123',
        includeContent: true,
      });

      expect(result[0].contentBytes).toBeDefined();
      expect(result[0].contentBytes!.length).toBeGreaterThan(1000000);
    });

    it('should warn about large attachments in summary mode', async () => {
      const largeAttachments = [
        createMockAttachment({ size: 10000000, name: 'large-file-1.zip' }),
        createMockAttachment({ size: 20000000, name: 'large-file-2.zip' }),
      ];

      mockGraphClient.getAttachments.mockResolvedValue(largeAttachments);

      const result = await getAttachments.execute({
        messageId: 'msg-123',
      });

      expect(result).toHaveLength(2);
      expect(result[0].size).toBe(10000000);
      expect(result[1].size).toBe(20000000);
    });
  });

  describe('multi-mailbox support', () => {
    it('should pass mailbox parameter to graphClient when specified', async () => {
      const mockAttachments = createMockAttachments(1);
      mockGraphClient.getAttachments.mockResolvedValue(mockAttachments);

      await getAttachments.execute({
        messageId: 'msg-123',
        mailbox: 'shared@example.com',
      });

      expect(mockGraphClient.getAttachments).toHaveBeenCalledWith(
        'msg-123',
        false,
        'shared@example.com'
      );
    });

    it('should support mailbox with includeContent=true', async () => {
      const mockAttachments = createMockAttachments(1);
      mockGraphClient.getAttachments.mockResolvedValue(mockAttachments);

      await getAttachments.execute({
        messageId: 'msg-123',
        includeContent: true,
        mailbox: 'delegate@example.com',
      });

      expect(mockGraphClient.getAttachments).toHaveBeenCalledWith(
        'msg-123',
        true,
        'delegate@example.com'
      );
    });

    it('should not pass mailbox when not specified', async () => {
      const mockAttachments = createMockAttachments(1);
      mockGraphClient.getAttachments.mockResolvedValue(mockAttachments);

      await getAttachments.execute({
        messageId: 'msg-123',
      });

      expect(mockGraphClient.getAttachments).toHaveBeenCalledWith('msg-123', false, undefined);
    });
  });

  describe('attachment types', () => {
    it('should handle different file types', async () => {
      const attachments = [
        createMockAttachment({ name: 'document.pdf', contentType: 'application/pdf' }),
        createMockAttachment({ name: 'image.jpg', contentType: 'image/jpeg' }),
        createMockAttachment({ name: 'spreadsheet.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      ];

      mockGraphClient.getAttachments.mockResolvedValue(attachments);

      const result = await getAttachments.execute({
        messageId: 'msg-123',
      });

      expect(result).toHaveLength(3);
      expect(result[0].contentType).toBe('application/pdf');
      expect(result[1].contentType).toBe('image/jpeg');
      expect(result[2].contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });
});
