/**
 * Result processor for token-efficient email summarization
 */

import { EmailSummary } from '../types/index.js';
import { logger } from './logger.js';

export class ResultProcessor {
  /**
   * Process Graph API message into token-efficient summary
   */
  static processEmailToSummary(message: any): EmailSummary {
    const from =
      message.from?.emailAddress?.name || message.from?.emailAddress?.address || 'Unknown';

    return {
      messageId: message.id,
      receivedDateTime: message.receivedDateTime,
      subject: message.subject || '(No subject)',
      from: from,
      snippet: this.createSnippet(message),
      hasAttachments: message.hasAttachments || false,
      importance: message.importance || 'normal',
    };
  }

  /**
   * Create a concise snippet from email content
   * Limits to ~100 characters to minimize tokens
   */
  private static createSnippet(message: any): string {
    // Try bodyPreview first (already a summary from Graph API)
    if (message.bodyPreview) {
      return this.truncateText(message.bodyPreview, 100);
    }

    // Fall back to body content if available
    if (message.body?.content) {
      // Remove HTML tags if present
      const text = this.stripHtml(message.body.content);
      return this.truncateText(text, 100);
    }

    return '';
  }

  /**
   * Strip HTML tags from text
   */
  private static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Truncate text to specified length, adding ellipsis
   */
  private static truncateText(text: string, maxLength: number): string {
    if (!text) return '';

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    if (text.length <= maxLength) {
      return text;
    }

    // Truncate at word boundary
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > 0) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  /**
   * Process array of messages to summaries
   */
  static processEmails(messages: any[]): EmailSummary[] {
    return messages.map(msg => this.processEmailToSummary(msg));
  }

  /**
   * Sort emails by date (most recent first)
   */
  static sortByDate(emails: EmailSummary[]): EmailSummary[] {
    return emails.sort((a, b) => {
      const dateA = new Date(a.receivedDateTime).getTime();
      const dateB = new Date(b.receivedDateTime).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }

  /**
   * Limit results to max count
   */
  static limitResults(emails: EmailSummary[], maxCount: number): EmailSummary[] {
    return emails.slice(0, maxCount);
  }

  /**
   * Get the latest date from a list of emails
   */
  static getLatestDate(emails: EmailSummary[]): string | undefined {
    if (emails.length === 0) {
      return undefined;
    }

    const sorted = this.sortByDate(emails);
    return sorted[0].receivedDateTime;
  }

  /**
   * Process full email details (when user requests specific email)
   */
  static processFullEmail(message: any): any {
    const summary = this.processEmailToSummary(message);

    return {
      ...summary,
      to:
        message.toRecipients?.map((r: any) => ({
          name: r.emailAddress.name,
          address: r.emailAddress.address,
        })) || [],
      cc:
        message.ccRecipients?.map((r: any) => ({
          name: r.emailAddress.name,
          address: r.emailAddress.address,
        })) || [],
      body: message.body?.content || '',
      bodyType: message.body?.contentType || 'text',
    };
  }

  /**
   * Calculate estimated token count for result
   * Rough estimate: 1 token ≈ 4 characters
   */
  static estimateTokens(result: any): number {
    const jsonString = JSON.stringify(result);
    return Math.ceil(jsonString.length / 4);
  }

  /**
   * Log result statistics
   */
  static logResultStats(result: any, label: string = 'Result'): void {
    const tokens = this.estimateTokens(result);
    logger.debug(`${label}: ~${tokens} tokens`);
  }
}
