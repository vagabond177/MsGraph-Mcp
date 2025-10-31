/**
 * Unit tests for ResultProcessor
 * Tests token-efficient email summarization and result processing
 */

import { ResultProcessor } from '../../../src/utils/resultProcessor.js';
import { createMockMessage, createMockMessages } from '../../helpers/mockFactories.js';

describe('ResultProcessor', () => {
  describe('processEmailToSummary', () => {
    it('should process a complete email message into a summary', () => {
      const message = createMockMessage();
      const summary = ResultProcessor.processEmailToSummary(message);

      expect(summary).toEqual({
        messageId: message.id,
        receivedDateTime: message.receivedDateTime,
        subject: message.subject,
        from: 'John Doe',
        snippet: expect.any(String),
        hasAttachments: false,
        importance: 'normal',
      });
    });

    it('should handle missing sender name and use email address', () => {
      const message = createMockMessage({
        from: {
          emailAddress: {
            address: 'sender@example.com',
          },
        },
      });

      const summary = ResultProcessor.processEmailToSummary(message);
      expect(summary.from).toBe('sender@example.com');
    });

    it('should handle completely missing sender', () => {
      const message = createMockMessage({
        from: null,
      });

      const summary = ResultProcessor.processEmailToSummary(message);
      expect(summary.from).toBe('Unknown');
    });

    it('should handle missing subject', () => {
      const message = createMockMessage({
        subject: null,
      });

      const summary = ResultProcessor.processEmailToSummary(message);
      expect(summary.subject).toBe('(No subject)');
    });

    it('should use bodyPreview for snippet', () => {
      const message = createMockMessage({
        bodyPreview: 'This is a preview',
      });

      const summary = ResultProcessor.processEmailToSummary(message);
      expect(summary.snippet).toBe('This is a preview');
    });

    it('should fallback to body content if bodyPreview is missing', () => {
      const message = createMockMessage({
        bodyPreview: '',
        body: {
          content: '<html><body>HTML content here</body></html>',
        },
      });

      const summary = ResultProcessor.processEmailToSummary(message);
      expect(summary.snippet).toBe('HTML content here');
    });

    it('should truncate long snippets to ~100 characters', () => {
      const longText = 'a'.repeat(200);
      const message = createMockMessage({
        bodyPreview: longText,
      });

      const summary = ResultProcessor.processEmailToSummary(message);
      expect(summary.snippet.length).toBeLessThanOrEqual(104); // 100 + '...'
      expect(summary.snippet).toMatch(/\.\.\.$/);
    });

    it('should handle attachments flag', () => {
      const message = createMockMessage({
        hasAttachments: true,
      });

      const summary = ResultProcessor.processEmailToSummary(message);
      expect(summary.hasAttachments).toBe(true);
    });

    it('should handle different importance levels', () => {
      const highImportance = createMockMessage({ importance: 'high' });
      const summary = ResultProcessor.processEmailToSummary(highImportance);
      expect(summary.importance).toBe('high');
    });
  });

  describe('processEmails', () => {
    it('should process multiple emails into summaries', () => {
      const messages = createMockMessages(3);
      const summaries = ResultProcessor.processEmails(messages);

      expect(summaries).toHaveLength(3);
      summaries.forEach((summary, index) => {
        expect(summary.messageId).toBe(`message-${index + 1}`);
      });
    });

    it('should handle empty array', () => {
      const summaries = ResultProcessor.processEmails([]);
      expect(summaries).toEqual([]);
    });
  });

  describe('sortByDate', () => {
    it('should sort emails by date descending (newest first)', () => {
      const messages = [
        createMockMessage({
          id: '1',
          receivedDateTime: '2025-10-29T10:00:00Z',
        }),
        createMockMessage({
          id: '2',
          receivedDateTime: '2025-10-31T10:00:00Z',
        }),
        createMockMessage({
          id: '3',
          receivedDateTime: '2025-10-30T10:00:00Z',
        }),
      ];

      const summaries = ResultProcessor.processEmails(messages);
      const sorted = ResultProcessor.sortByDate(summaries);

      expect(sorted[0].messageId).toBe('2'); // Oct 31 (newest)
      expect(sorted[1].messageId).toBe('3'); // Oct 30
      expect(sorted[2].messageId).toBe('1'); // Oct 29
    });

    it('should handle empty array', () => {
      const sorted = ResultProcessor.sortByDate([]);
      expect(sorted).toEqual([]);
    });
  });

  describe('limitResults', () => {
    it('should limit results to specified count', () => {
      const messages = createMockMessages(10);
      const summaries = ResultProcessor.processEmails(messages);
      const limited = ResultProcessor.limitResults(summaries, 5);

      expect(limited).toHaveLength(5);
    });

    it('should return all results if limit is greater than count', () => {
      const messages = createMockMessages(3);
      const summaries = ResultProcessor.processEmails(messages);
      const limited = ResultProcessor.limitResults(summaries, 10);

      expect(limited).toHaveLength(3);
    });

    it('should handle empty array', () => {
      const limited = ResultProcessor.limitResults([], 5);
      expect(limited).toEqual([]);
    });
  });

  describe('getLatestDate', () => {
    it('should return the latest date from emails', () => {
      const messages = [
        createMockMessage({
          receivedDateTime: '2025-10-29T10:00:00Z',
        }),
        createMockMessage({
          receivedDateTime: '2025-10-31T10:00:00Z',
        }),
        createMockMessage({
          receivedDateTime: '2025-10-30T10:00:00Z',
        }),
      ];

      const summaries = ResultProcessor.processEmails(messages);
      const latestDate = ResultProcessor.getLatestDate(summaries);

      expect(latestDate).toBe('2025-10-31T10:00:00Z');
    });

    it('should return undefined for empty array', () => {
      const latestDate = ResultProcessor.getLatestDate([]);
      expect(latestDate).toBeUndefined();
    });
  });

  describe('processFullEmail', () => {
    it('should process full email details including body', () => {
      const message = createMockMessage();
      const fullEmail = ResultProcessor.processFullEmail(message);

      expect(fullEmail).toMatchObject({
        messageId: message.id,
        subject: message.subject,
        from: 'John Doe',
        body: message.body.content,
        bodyType: 'html',
        to: [
          {
            name: 'Jane Smith',
            address: 'jane.smith@example.com',
          },
        ],
        cc: [],
      });
    });

    it('should handle missing recipients', () => {
      const message = createMockMessage({
        toRecipients: null,
        ccRecipients: null,
      });

      const fullEmail = ResultProcessor.processFullEmail(message);
      expect(fullEmail.to).toEqual([]);
      expect(fullEmail.cc).toEqual([]);
    });

    it('should handle multiple recipients', () => {
      const message = createMockMessage({
        toRecipients: [
          {
            emailAddress: {
              name: 'Person 1',
              address: 'person1@example.com',
            },
          },
          {
            emailAddress: {
              name: 'Person 2',
              address: 'person2@example.com',
            },
          },
        ],
      });

      const fullEmail = ResultProcessor.processFullEmail(message);
      expect(fullEmail.to).toHaveLength(2);
    });
  });

  describe('stripHtml', () => {
    it('should remove HTML tags from text', () => {
      const message = createMockMessage({
        bodyPreview: '',
        body: {
          content: '<html><body><p>Hello <strong>World</strong></p></body></html>',
        },
      });

      const summary = ResultProcessor.processEmailToSummary(message);
      expect(summary.snippet).not.toContain('<');
      expect(summary.snippet).not.toContain('>');
      expect(summary.snippet).toContain('Hello');
      expect(summary.snippet).toContain('World');
    });
  });

  describe('truncateText', () => {
    it('should truncate at word boundary when possible', () => {
      const longText =
        'This is a very long text that needs to be truncated at a word boundary not in the middle of a word and keeps going on and on and on for many many characters';
      const message = createMockMessage({
        bodyPreview: longText,
      });

      const summary = ResultProcessor.processEmailToSummary(message);
      expect(summary.snippet).toMatch(/\.\.\.$/); // Should end with ellipsis when truncated
      expect(summary.snippet.length).toBeLessThanOrEqual(104); // Max length
    });

    it('should normalize whitespace', () => {
      const message = createMockMessage({
        bodyPreview: 'Text   with    multiple     spaces\n\nand\nnewlines',
      });

      const summary = ResultProcessor.processEmailToSummary(message);
      expect(summary.snippet).not.toContain('  ');
      expect(summary.snippet).not.toContain('\n');
    });
  });

  describe('estimateTokens', () => {
    it('should estimate token count for result', () => {
      const result = {
        messageId: '123',
        subject: 'Test',
        from: 'test@example.com',
      };

      const tokens = ResultProcessor.estimateTokens(result);
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should return higher count for larger objects', () => {
      const small = { id: '1' };
      const large = {
        id: '1',
        subject: 'A very long subject line',
        body: 'A very long body with lots of content that should result in more tokens',
      };

      const smallTokens = ResultProcessor.estimateTokens(small);
      const largeTokens = ResultProcessor.estimateTokens(large);

      expect(largeTokens).toBeGreaterThan(smallTokens);
    });
  });

  describe('token efficiency', () => {
    it('should create summaries under ~100 tokens', () => {
      const message = createMockMessage();
      const summary = ResultProcessor.processEmailToSummary(message);
      const tokens = ResultProcessor.estimateTokens(summary);

      // Each summary should be significantly smaller than full message
      // Target: ~50-100 tokens per summary
      expect(tokens).toBeLessThan(150);
    });

    it('should drastically reduce token count vs full email', () => {
      const message = createMockMessage({
        body: {
          content: 'a'.repeat(5000), // Very long body
        },
      });

      const fullTokens = ResultProcessor.estimateTokens(message);
      const summary = ResultProcessor.processEmailToSummary(message);
      const summaryTokens = ResultProcessor.estimateTokens(summary);

      // Summary should be at least 90% smaller
      expect(summaryTokens).toBeLessThan(fullTokens * 0.1);
    });
  });
});
