/**
 * Unit tests for SendMessage tool
 * Tests creating draft messages and sending emails
 */

import { SendMessage } from '../../../src/tools/mail/sendMessage.js';
import { GraphClient } from '../../../src/utils/graphClient.js';

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

describe('SendMessage', () => {
  let sendMessage: SendMessage;
  let mockGraphClient: jest.Mocked<GraphClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphClient = {
      createDraftMessage: jest.fn(),
      sendDraftMessage: jest.fn(),
    } as any;

    sendMessage = new SendMessage(mockGraphClient);
  });

  describe('execute - creating drafts', () => {
    it('should create a draft message by default', async () => {
      const mockDraft = {
        id: 'draft-123',
        subject: 'Test Subject',
        toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);

      const result = await sendMessage.execute({
        to: ['test@example.com'],
        subject: 'Test Subject',
        body: 'Test body content',
      });

      expect(mockGraphClient.createDraftMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Test Subject',
          body: {
            contentType: 'text',
            content: 'Test body content',
          },
          toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
          importance: 'normal',
        }),
        undefined
      );

      expect(mockGraphClient.sendDraftMessage).not.toHaveBeenCalled();

      expect(result).toMatchObject({
        messageId: 'draft-123',
        status: 'draft',
        subject: 'Test Subject',
        recipients: {
          to: ['test@example.com'],
        },
      });
    });

    it('should create draft with HTML body type', async () => {
      const mockDraft = {
        id: 'draft-124',
        subject: 'HTML Email',
        toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);

      await sendMessage.execute({
        to: ['test@example.com'],
        subject: 'HTML Email',
        body: '<h1>Hello</h1>',
        bodyType: 'html',
      });

      expect(mockGraphClient.createDraftMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            contentType: 'html',
            content: '<h1>Hello</h1>',
          },
        }),
        undefined
      );
    });

    it('should create draft with multiple recipients', async () => {
      const mockDraft = {
        id: 'draft-125',
        subject: 'Multiple Recipients',
        toRecipients: [
          { emailAddress: { address: 'user1@example.com' } },
          { emailAddress: { address: 'user2@example.com' } },
        ],
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);

      const result = await sendMessage.execute({
        to: ['user1@example.com', 'user2@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Multiple Recipients',
        body: 'Test',
      });

      expect(mockGraphClient.createDraftMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          toRecipients: [
            { emailAddress: { address: 'user1@example.com' } },
            { emailAddress: { address: 'user2@example.com' } },
          ],
          ccRecipients: [{ emailAddress: { address: 'cc@example.com' } }],
          bccRecipients: [{ emailAddress: { address: 'bcc@example.com' } }],
        }),
        undefined
      );

      expect(result.recipients).toEqual({
        to: ['user1@example.com', 'user2@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
      });
    });

    it('should set importance level', async () => {
      const mockDraft = {
        id: 'draft-126',
        subject: 'High Priority',
        toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);

      await sendMessage.execute({
        to: ['test@example.com'],
        subject: 'High Priority',
        body: 'Urgent message',
        importance: 'high',
      });

      expect(mockGraphClient.createDraftMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          importance: 'high',
        }),
        undefined
      );
    });

    it('should support attachments', async () => {
      const mockDraft = {
        id: 'draft-127',
        subject: 'With Attachment',
        toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);

      const attachments = [
        {
          name: 'document.pdf',
          contentType: 'application/pdf',
          contentBytes: 'base64content==',
        },
      ];

      await sendMessage.execute({
        to: ['test@example.com'],
        subject: 'With Attachment',
        body: 'See attached',
        attachments,
      });

      expect(mockGraphClient.createDraftMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              '@odata.type': '#microsoft.graph.fileAttachment',
              name: 'document.pdf',
              contentType: 'application/pdf',
              contentBytes: 'base64content==',
            },
          ],
        }),
        undefined
      );
    });
  });

  describe('execute - sending immediately', () => {
    it('should create draft and send when sendImmediately is true', async () => {
      const mockDraft = {
        id: 'draft-128',
        subject: 'Sent Email',
        toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);
      mockGraphClient.sendDraftMessage.mockResolvedValue(undefined);

      const result = await sendMessage.execute({
        to: ['test@example.com'],
        subject: 'Sent Email',
        body: 'Sending now',
        sendImmediately: true,
      });

      expect(mockGraphClient.createDraftMessage).toHaveBeenCalled();
      expect(mockGraphClient.sendDraftMessage).toHaveBeenCalledWith('draft-128', undefined);

      expect(result).toMatchObject({
        messageId: 'draft-128',
        status: 'sent',
        subject: 'Sent Email',
      });
    });

    it('should handle send failures gracefully', async () => {
      const mockDraft = {
        id: 'draft-129',
        subject: 'Failed Send',
        toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);
      mockGraphClient.sendDraftMessage.mockRejectedValue(new Error('Send failed'));

      await expect(
        sendMessage.execute({
          to: ['test@example.com'],
          subject: 'Failed Send',
          body: 'Test',
          sendImmediately: true,
        })
      ).rejects.toThrow('Send failed');
    });
  });

  describe('execute - mailbox support', () => {
    it('should create draft in specified mailbox', async () => {
      const mockDraft = {
        id: 'draft-130',
        subject: 'Shared Mailbox',
        toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);

      await sendMessage.execute({
        to: ['test@example.com'],
        subject: 'Shared Mailbox',
        body: 'From shared mailbox',
        mailbox: 'shared@example.com',
      });

      expect(mockGraphClient.createDraftMessage).toHaveBeenCalledWith(
        expect.any(Object),
        'shared@example.com'
      );
    });

    it('should send from specified mailbox', async () => {
      const mockDraft = {
        id: 'draft-131',
        subject: 'Send from Shared',
        toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);
      mockGraphClient.sendDraftMessage.mockResolvedValue(undefined);

      await sendMessage.execute({
        to: ['test@example.com'],
        subject: 'Send from Shared',
        body: 'Test',
        mailbox: 'shared@example.com',
        sendImmediately: true,
      });

      expect(mockGraphClient.createDraftMessage).toHaveBeenCalledWith(
        expect.any(Object),
        'shared@example.com'
      );
      expect(mockGraphClient.sendDraftMessage).toHaveBeenCalledWith(
        'draft-131',
        'shared@example.com'
      );
    });
  });

  describe('execute - send as support', () => {
    it('should set from address when specified', async () => {
      const mockDraft = {
        id: 'draft-132',
        subject: 'Send As',
        toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);

      await sendMessage.execute({
        to: ['test@example.com'],
        subject: 'Send As',
        body: 'Sent as another user',
        from: 'boss@example.com',
      });

      expect(mockGraphClient.createDraftMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          from: {
            emailAddress: {
              address: 'boss@example.com',
            },
          },
        }),
        undefined
      );
    });

    it('should support both mailbox and from parameters', async () => {
      const mockDraft = {
        id: 'draft-133',
        subject: 'Complex Send',
        toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);

      await sendMessage.execute({
        to: ['test@example.com'],
        subject: 'Complex Send',
        body: 'Test',
        mailbox: 'shared@example.com',
        from: 'boss@example.com',
      });

      expect(mockGraphClient.createDraftMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          from: {
            emailAddress: {
              address: 'boss@example.com',
            },
          },
        }),
        'shared@example.com'
      );
    });
  });

  describe('error handling', () => {
    it('should handle draft creation failure', async () => {
      mockGraphClient.createDraftMessage.mockRejectedValue(new Error('Permission denied'));

      await expect(
        sendMessage.execute({
          to: ['test@example.com'],
          subject: 'Test',
          body: 'Test',
        })
      ).rejects.toThrow('Permission denied');
    });

    it('should handle invalid email addresses', async () => {
      mockGraphClient.createDraftMessage.mockRejectedValue(
        new Error('Invalid email address format')
      );

      await expect(
        sendMessage.execute({
          to: ['invalid-email'],
          subject: 'Test',
          body: 'Test',
        })
      ).rejects.toThrow('Invalid email address format');
    });
  });

  describe('input validation', () => {
    it('should handle empty recipient arrays', async () => {
      const mockDraft = {
        id: 'draft-134',
        subject: 'Empty Recipients',
        toRecipients: [],
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);

      await sendMessage.execute({
        to: [],
        subject: 'Empty Recipients',
        body: 'Test',
      });

      expect(mockGraphClient.createDraftMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          toRecipients: [],
        }),
        undefined
      );
    });

    it('should default bodyType to text when not specified', async () => {
      const mockDraft = {
        id: 'draft-135',
        subject: 'Default Body Type',
        toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);

      await sendMessage.execute({
        to: ['test@example.com'],
        subject: 'Default Body Type',
        body: 'Plain text',
      });

      expect(mockGraphClient.createDraftMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            contentType: 'text',
            content: 'Plain text',
          },
        }),
        undefined
      );
    });

    it('should default importance to normal when not specified', async () => {
      const mockDraft = {
        id: 'draft-136',
        subject: 'Default Importance',
        toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);

      await sendMessage.execute({
        to: ['test@example.com'],
        subject: 'Default Importance',
        body: 'Test',
      });

      expect(mockGraphClient.createDraftMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          importance: 'normal',
        }),
        undefined
      );
    });
  });

  describe('token efficiency', () => {
    it('should return minimal result structure', async () => {
      const mockDraft = {
        id: 'draft-137',
        subject: 'Token Test',
        toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
        body: {
          content: 'A'.repeat(10000), // Large body
        },
      };

      mockGraphClient.createDraftMessage.mockResolvedValue(mockDraft);

      const result = await sendMessage.execute({
        to: ['test@example.com'],
        subject: 'Token Test',
        body: 'A'.repeat(10000),
      });

      // Result should be token-efficient, not include full body
      const resultString = JSON.stringify(result);
      expect(resultString.length).toBeLessThan(500);
      expect(result).not.toHaveProperty('body');
    });
  });
});
