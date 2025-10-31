/**
 * General email search with KQL query
 */

import { SearchEmailsInput, EmailSummary } from '../../types/index.js';
import { GraphClient } from '../../utils/graphClient.js';
import { ResultProcessor } from '../../utils/resultProcessor.js';
import { logger } from '../../utils/logger.js';

export class SearchEmails {
  private graphClient: GraphClient;

  constructor(graphClient: GraphClient) {
    this.graphClient = graphClient;
  }

  /**
   * Search emails with custom KQL query
   */
  async execute(input: SearchEmailsInput): Promise<EmailSummary[]> {
    const { query, maxResults = 25, mailbox } = input;

    const mailboxInfo = mailbox ? ` in mailbox ${mailbox}` : '';
    logger.info(`Searching emails with query: ${query}${mailboxInfo}`);

    try {
      const result = await this.graphClient.searchMessages(query, maxResults, mailbox);
      const messages = result?.value || [];

      logger.info(`Found ${messages.length} emails`);

      // Process to summaries
      const emailSummaries = ResultProcessor.processEmails(messages);
      const sortedEmails = ResultProcessor.sortByDate(emailSummaries);

      // Log statistics
      ResultProcessor.logResultStats(sortedEmails, 'Search results');

      return sortedEmails;
    } catch (error) {
      logger.error('Email search failed:', error);
      throw error;
    }
  }
}
