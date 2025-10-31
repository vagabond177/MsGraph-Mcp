/**
 * Download email attachment directly to file
 * Token-efficient: Returns only file path, no content ingestion
 */

import { DownloadAttachmentInput } from '../../types/index.js';
import { GraphClient } from '../../utils/graphClient.js';
import { logger } from '../../utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';

export class DownloadAttachment {
  private graphClient: GraphClient;

  constructor(graphClient: GraphClient) {
    this.graphClient = graphClient;
  }

  /**
   * Download attachment directly to file without ingesting content as tokens
   */
  async execute(input: DownloadAttachmentInput): Promise<{
    success: boolean;
    filePath: string;
    fileName: string;
    size: number;
    message?: string;
  }> {
    const { messageId, attachmentId, outputPath, mailbox } = input;

    const mailboxInfo = mailbox ? ` from mailbox ${mailbox}` : '';
    logger.info(`Downloading attachment ${attachmentId} from email ${messageId}${mailboxInfo}`);

    try {
      // Get the specific attachment (includeContent=true to get contentBytes)
      const attachments = await this.graphClient.getAttachments(messageId, true, mailbox);

      // Find the specific attachment
      const attachment = attachments.find((att: any) => att.id === attachmentId);

      if (!attachment) {
        throw new Error(`Attachment ${attachmentId} not found in message ${messageId}`);
      }

      if (!attachment.contentBytes) {
        throw new Error(`Attachment ${attachmentId} has no content`);
      }

      // Resolve output path
      const resolvedPath = path.resolve(outputPath);
      const dir = path.dirname(resolvedPath);

      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.debug(`Created directory: ${dir}`);
      }

      // Decode base64 and write to file
      const buffer = Buffer.from(attachment.contentBytes, 'base64');
      fs.writeFileSync(resolvedPath, buffer);

      const fileSizeBytes = buffer.length;

      logger.info(
        `Downloaded ${attachment.name} (${this.formatBytes(fileSizeBytes)}) to ${resolvedPath}`
      );

      return {
        success: true,
        filePath: resolvedPath,
        fileName: attachment.name,
        size: fileSizeBytes,
        message: `Successfully downloaded ${attachment.name} (${this.formatBytes(fileSizeBytes)})`,
      };
    } catch (error) {
      logger.error('Failed to download attachment:', error);
      throw error;
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}
