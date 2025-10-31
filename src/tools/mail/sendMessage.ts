/**
 * Send email messages or create drafts
 * Supports configurable mailbox and "send as" functionality
 */

import { SendMessageInput, SendMessageResult, MessageAttachment } from '../../types/index.js';
import { GraphClient } from '../../utils/graphClient.js';
import { logger } from '../../utils/logger.js';

export class SendMessage {
  private graphClient: GraphClient;

  constructor(graphClient: GraphClient) {
    this.graphClient = graphClient;
  }

  /**
   * Send an email or create a draft
   * Defaults to creating a draft (sendImmediately=false)
   */
  async execute(input: SendMessageInput): Promise<SendMessageResult> {
    const {
      to,
      cc,
      bcc,
      subject,
      body,
      bodyType = 'text',
      importance = 'normal',
      sendImmediately = false,
      mailbox,
      from,
      attachments,
    } = input;

    const mailboxInfo = mailbox ? ` from mailbox ${mailbox}` : '';
    const action = sendImmediately ? 'Sending' : 'Creating draft';
    logger.info(`${action} message: "${subject}"${mailboxInfo}`);

    try {
      // Build message payload for Graph API
      const messagePayload: any = {
        subject,
        body: {
          contentType: bodyType,
          content: body,
        },
        toRecipients: this.buildRecipients(to),
        importance,
      };

      // Add CC recipients if provided
      if (cc && cc.length > 0) {
        messagePayload.ccRecipients = this.buildRecipients(cc);
      }

      // Add BCC recipients if provided
      if (bcc && bcc.length > 0) {
        messagePayload.bccRecipients = this.buildRecipients(bcc);
      }

      // Add "from" address if specified (requires "Send as" permission)
      if (from) {
        messagePayload.from = {
          emailAddress: {
            address: from,
          },
        };
      }

      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        messagePayload.attachments = this.buildAttachments(attachments);
      }

      // Create the draft message
      const draftMessage = await this.graphClient.createDraftMessage(messagePayload, mailbox);

      logger.info(`Draft created with ID: ${draftMessage.id}`);

      // Send immediately if requested
      if (sendImmediately) {
        await this.graphClient.sendDraftMessage(draftMessage.id, mailbox);
        logger.info(`Message sent: ${draftMessage.id}`);
      }

      // Return token-efficient result
      const result: SendMessageResult = {
        messageId: draftMessage.id,
        status: sendImmediately ? 'sent' : 'draft',
        subject,
        recipients: {
          to,
          ...(cc && cc.length > 0 ? { cc } : {}),
          ...(bcc && bcc.length > 0 ? { bcc } : {}),
        },
      };

      return result;
    } catch (error) {
      logger.error('Failed to send/create message:', error);
      throw error;
    }
  }

  /**
   * Build recipients array in Graph API format
   */
  private buildRecipients(emails: string[]): any[] {
    return emails.map(email => ({
      emailAddress: {
        address: email,
      },
    }));
  }

  /**
   * Build attachments array in Graph API format
   */
  private buildAttachments(attachments: MessageAttachment[]): any[] {
    return attachments.map(attachment => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: attachment.name,
      contentType: attachment.contentType,
      contentBytes: attachment.contentBytes,
    }));
  }
}
