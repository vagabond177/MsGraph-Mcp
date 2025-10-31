/**
 * Unit tests for DownloadAttachment tool
 * Tests direct file download with token efficiency
 */

import { DownloadAttachment } from '../../../src/tools/mail/downloadAttachment.js';
import { GraphClient } from '../../../src/utils/graphClient.js';
import { createMockAttachment } from '../../helpers/mockFactories.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

describe('DownloadAttachment', () => {
  let downloadAttachment: DownloadAttachment;
  let mockGraphClient: jest.Mocked<GraphClient>;
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphClient = {
      getAttachments: jest.fn(),
    } as any;

    downloadAttachment = new DownloadAttachment(mockGraphClient);

    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'download-attachment-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('execute', () => {
    it('should download attachment to specified file', async () => {
      const mockAttachment = createMockAttachment({
        id: 'att-123',
        name: 'test.pdf',
        contentBytes: Buffer.from('test content').toString('base64'),
      });

      mockGraphClient.getAttachments.mockResolvedValue([mockAttachment]);

      const outputPath = path.join(tempDir, 'downloaded.pdf');

      const result = await downloadAttachment.execute({
        messageId: 'msg-123',
        attachmentId: 'att-123',
        outputPath,
      });

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(outputPath);
      expect(result.fileName).toBe('test.pdf');
      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toBe('test content');
    });

    it('should create directories if they do not exist', async () => {
      const mockAttachment = createMockAttachment({
        id: 'att-123',
        contentBytes: Buffer.from('test').toString('base64'),
      });

      mockGraphClient.getAttachments.mockResolvedValue([mockAttachment]);

      const nestedPath = path.join(tempDir, 'nested', 'dir', 'file.pdf');

      const result = await downloadAttachment.execute({
        messageId: 'msg-123',
        attachmentId: 'att-123',
        outputPath: nestedPath,
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(nestedPath)).toBe(true);
    });

    it('should handle attachment not found', async () => {
      mockGraphClient.getAttachments.mockResolvedValue([
        createMockAttachment({ id: 'different-id' }),
      ]);

      await expect(
        downloadAttachment.execute({
          messageId: 'msg-123',
          attachmentId: 'att-123',
          outputPath: path.join(tempDir, 'file.pdf'),
        })
      ).rejects.toThrow('Attachment att-123 not found');
    });

    it('should handle attachment with no content', async () => {
      const mockAttachment = createMockAttachment({
        id: 'att-123',
        contentBytes: undefined,
      });

      mockGraphClient.getAttachments.mockResolvedValue([mockAttachment]);

      await expect(
        downloadAttachment.execute({
          messageId: 'msg-123',
          attachmentId: 'att-123',
          outputPath: path.join(tempDir, 'file.pdf'),
        })
      ).rejects.toThrow('Attachment att-123 has no content');
    });

    it('should pass mailbox parameter to graphClient', async () => {
      const mockAttachment = createMockAttachment({
        id: 'att-123',
        contentBytes: Buffer.from('test').toString('base64'),
      });

      mockGraphClient.getAttachments.mockResolvedValue([mockAttachment]);

      await downloadAttachment.execute({
        messageId: 'msg-123',
        attachmentId: 'att-123',
        outputPath: path.join(tempDir, 'file.pdf'),
        mailbox: 'shared@example.com',
      });

      expect(mockGraphClient.getAttachments).toHaveBeenCalledWith(
        'msg-123',
        true,
        'shared@example.com'
      );
    });

    it('should return file size in response', async () => {
      const content = 'a'.repeat(1000);
      const mockAttachment = createMockAttachment({
        id: 'att-123',
        contentBytes: Buffer.from(content).toString('base64'),
      });

      mockGraphClient.getAttachments.mockResolvedValue([mockAttachment]);

      const result = await downloadAttachment.execute({
        messageId: 'msg-123',
        attachmentId: 'att-123',
        outputPath: path.join(tempDir, 'file.pdf'),
      });

      expect(result.size).toBe(1000);
    });
  });

  describe('token efficiency', () => {
    it('should return minimal token response', async () => {
      const largeContent = 'a'.repeat(1000000); // 1MB
      const mockAttachment = createMockAttachment({
        id: 'att-123',
        name: 'large-file.pdf',
        contentBytes: Buffer.from(largeContent).toString('base64'),
      });

      mockGraphClient.getAttachments.mockResolvedValue([mockAttachment]);

      const result = await downloadAttachment.execute({
        messageId: 'msg-123',
        attachmentId: 'att-123',
        outputPath: path.join(tempDir, 'large-file.pdf'),
      });

      // Response should be token-efficient despite large file
      const resultString = JSON.stringify(result);
      const estimatedTokens = Math.ceil(resultString.length / 4);

      expect(estimatedTokens).toBeLessThan(100);
    });
  });

  describe('file handling', () => {
    it('should handle binary files correctly', async () => {
      // Create a small binary file (simulated PDF header)
      const binaryContent = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
      const mockAttachment = createMockAttachment({
        id: 'att-123',
        name: 'binary.pdf',
        contentBytes: binaryContent.toString('base64'),
      });

      mockGraphClient.getAttachments.mockResolvedValue([mockAttachment]);

      const outputPath = path.join(tempDir, 'binary.pdf');

      await downloadAttachment.execute({
        messageId: 'msg-123',
        attachmentId: 'att-123',
        outputPath,
      });

      const savedContent = fs.readFileSync(outputPath);
      expect(savedContent).toEqual(binaryContent);
    });

    it('should overwrite existing files', async () => {
      const outputPath = path.join(tempDir, 'existing.txt');

      // Create existing file
      fs.writeFileSync(outputPath, 'old content');

      const mockAttachment = createMockAttachment({
        id: 'att-123',
        contentBytes: Buffer.from('new content').toString('base64'),
      });

      mockGraphClient.getAttachments.mockResolvedValue([mockAttachment]);

      await downloadAttachment.execute({
        messageId: 'msg-123',
        attachmentId: 'att-123',
        outputPath,
      });

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toBe('new content');
    });
  });
});
