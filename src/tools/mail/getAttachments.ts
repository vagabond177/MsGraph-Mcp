/**
 * Get email attachments by message ID
 */

import { GetAttachmentsInput, AttachmentDetail } from '../../types/index.js';
import { GraphClient } from '../../utils/graphClient.js';
import { logger } from '../../utils/logger.js';

export class GetAttachments {
  private graphClient: GraphClient;

  constructor(graphClient: GraphClient) {
    this.graphClient = graphClient;
  }

  /**
   * Get attachments for a specific email
   */
  async execute(input: GetAttachmentsInput): Promise<AttachmentDetail[]> {
    const { messageId, includeContent = false, mailbox } = input;

    const mailboxInfo = mailbox ? ` from mailbox ${mailbox}` : '';
    logger.info(`Fetching attachments for email: ${messageId}${mailboxInfo}`);

    try {
      const attachments = await this.graphClient.getAttachments(messageId, includeContent, mailbox);

      // Process attachments to token-efficient format
      const processedAttachments = this.processAttachments(attachments, includeContent);

      logger.info(`Found ${processedAttachments.length} attachment(s) for email ${messageId}`);

      // Log token efficiency info
      if (!includeContent && processedAttachments.length > 0) {
        const totalSize = processedAttachments.reduce((sum, att) => sum + att.size, 0);
        logger.debug(`Returning metadata only (${processedAttachments.length} attachments, ${this.formatBytes(totalSize)} total)`);
      } else if (includeContent && processedAttachments.length > 0) {
        logger.warn('Returning full content - may consume many tokens for large attachments');
      }

      return processedAttachments;
    } catch (error) {
      logger.error('Failed to get attachments:', error);
      throw error;
    }
  }

  /**
   * Process Graph API attachments to token-efficient format
   */
  private processAttachments(attachments: any[], includeContent: boolean): AttachmentDetail[] {
    return attachments.map(att => {
      const detail: AttachmentDetail = {
        id: att.id,
        name: att.name,
        contentType: att.contentType,
        size: att.size,
        isInline: att.isInline || false,
        lastModifiedDateTime: att.lastModifiedDateTime,
      };

      // Only include content if explicitly requested (token efficiency)
      if (includeContent && att.contentBytes) {
        detail.contentBytes = att.contentBytes;
      }

      return detail;
    });
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
