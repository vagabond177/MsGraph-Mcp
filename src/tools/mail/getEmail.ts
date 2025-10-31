/**
 * Get specific email by ID
 */

import { GetEmailInput } from '../../types/index.js';
import { GraphClient } from '../../utils/graphClient.js';
import { ResultProcessor } from '../../utils/resultProcessor.js';
import { logger } from '../../utils/logger.js';

export class GetEmail {
  private graphClient: GraphClient;

  constructor(graphClient: GraphClient) {
    this.graphClient = graphClient;
  }

  /**
   * Get email details by message ID
   */
  async execute(input: GetEmailInput): Promise<any> {
    const { messageId, includeBody = false, mailbox } = input;

    const mailboxInfo = mailbox ? ` from mailbox ${mailbox}` : '';
    logger.info(`Fetching email: ${messageId}${mailboxInfo}`);

    try {
      const message = await this.graphClient.getMessage(messageId, includeBody, mailbox);

      if (includeBody) {
        // Return full email details
        const fullEmail = ResultProcessor.processFullEmail(message);
        ResultProcessor.logResultStats(fullEmail, 'Full email');
        return fullEmail;
      } else {
        // Return summary only
        const summary = ResultProcessor.processEmailToSummary(message);
        ResultProcessor.logResultStats(summary, 'Email summary');
        return summary;
      }
    } catch (error) {
      logger.error('Failed to get email:', error);
      throw error;
    }
  }
}
