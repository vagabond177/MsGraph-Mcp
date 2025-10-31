/**
 * Unit tests for GraphClient
 * Tests multi-mailbox support and endpoint construction
 */

import { GraphClient } from '../../../src/utils/graphClient.js';
import { GraphAuthenticator } from '../../../src/auth/graphAuth.js';
import { Client } from '@microsoft/microsoft-graph-client';

// Mock dependencies
jest.mock('../../../src/auth/graphAuth.js');
jest.mock('@microsoft/microsoft-graph-client');
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('GraphClient', () => {
  let graphClient: GraphClient;
  let mockAuthenticator: jest.Mocked<GraphAuthenticator>;
  let mockClientInstance: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockAuthenticator = {
      getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
    } as any;

    // Mock the Graph client instance
    mockClientInstance = {
      api: jest.fn().mockReturnThis(),
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    // Mock Client.init
    (Client.init as jest.Mock).mockReturnValue(mockClientInstance);

    graphClient = new GraphClient(mockAuthenticator);
    await graphClient.initialize();
  });

  describe('searchMessages', () => {
    it('should use /me/messages endpoint when mailbox not specified', async () => {
      mockClientInstance.get.mockResolvedValue({ value: [] });

      await graphClient.searchMessages('test query', 25);

      expect(mockClientInstance.api).toHaveBeenCalledWith(
        '/me/messages?$search="test query"&$top=25&$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,importance'
      );
    });

    it('should use /users/{mailbox}/messages endpoint when mailbox specified', async () => {
      mockClientInstance.get.mockResolvedValue({ value: [] });

      await graphClient.searchMessages('test query', 25, 'user@example.com');

      expect(mockClientInstance.api).toHaveBeenCalledWith(
        '/users/user@example.com/messages?$search="test query"&$top=25&$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,importance'
      );
    });

    it('should handle mailbox with spaces (URL encoded)', async () => {
      mockClientInstance.get.mockResolvedValue({ value: [] });

      await graphClient.searchMessages('test', 10, 'user name@example.com');

      expect(mockClientInstance.api).toHaveBeenCalledWith(
        '/users/user name@example.com/messages?$search="test"&$top=10&$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,importance'
      );
    });

    it('should support user ID as mailbox parameter', async () => {
      mockClientInstance.get.mockResolvedValue({ value: [] });

      await graphClient.searchMessages('test', 5, '12345-67890-abcdef');

      expect(mockClientInstance.api).toHaveBeenCalledWith(
        '/users/12345-67890-abcdef/messages?$search="test"&$top=5&$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,importance'
      );
    });
  });

  describe('getMessage', () => {
    it('should use /me/messages/{id} endpoint when mailbox not specified', async () => {
      mockClientInstance.get.mockResolvedValue({});

      await graphClient.getMessage('message-123', false);

      expect(mockClientInstance.api).toHaveBeenCalledWith(
        '/me/messages/message-123?$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,importance,toRecipients,ccRecipients'
      );
    });

    it('should use /users/{mailbox}/messages/{id} endpoint when mailbox specified', async () => {
      mockClientInstance.get.mockResolvedValue({});

      await graphClient.getMessage('message-123', false, 'shared@example.com');

      expect(mockClientInstance.api).toHaveBeenCalledWith(
        '/users/shared@example.com/messages/message-123?$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,importance,toRecipients,ccRecipients'
      );
    });

    it('should include body field when includeBody is true (own mailbox)', async () => {
      mockClientInstance.get.mockResolvedValue({});

      await graphClient.getMessage('message-123', true);

      expect(mockClientInstance.api).toHaveBeenCalledWith(
        '/me/messages/message-123?$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,importance,toRecipients,ccRecipients,body'
      );
    });

    it('should include body field when includeBody is true (shared mailbox)', async () => {
      mockClientInstance.get.mockResolvedValue({});

      await graphClient.getMessage('message-123', true, 'shared@example.com');

      expect(mockClientInstance.api).toHaveBeenCalledWith(
        '/users/shared@example.com/messages/message-123?$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,importance,toRecipients,ccRecipients,body'
      );
    });
  });

  describe('listMailFolders', () => {
    it('should use /me/mailFolders endpoint when mailbox not specified', async () => {
      mockClientInstance.get.mockResolvedValue({ value: [] });

      await graphClient.listMailFolders();

      expect(mockClientInstance.api).toHaveBeenCalledWith(
        '/me/mailFolders?$select=id,displayName,parentFolderId,childFolderCount,unreadItemCount,totalItemCount'
      );
    });

    it('should use /users/{mailbox}/mailFolders endpoint when mailbox specified', async () => {
      mockClientInstance.get.mockResolvedValue({ value: [] });

      await graphClient.listMailFolders('delegate@example.com');

      expect(mockClientInstance.api).toHaveBeenCalledWith(
        '/users/delegate@example.com/mailFolders?$select=id,displayName,parentFolderId,childFolderCount,unreadItemCount,totalItemCount'
      );
    });
  });

  describe('batch operations with mailbox parameter', () => {
    it('should support batch requests with different mailboxes', async () => {
      mockClientInstance.post.mockResolvedValue({
        responses: [
          { id: '1', status: 200, body: { value: [] } },
          { id: '2', status: 200, body: { value: [] } },
        ],
      });

      const batchRequests = [
        {
          id: '1',
          method: 'GET' as const,
          url: '/users/user1@example.com/messages?$search="test"&$top=5',
        },
        {
          id: '2',
          method: 'GET' as const,
          url: '/users/user2@example.com/messages?$search="test"&$top=5',
        },
      ];

      const result = await graphClient.executeBatch(batchRequests);

      expect(mockClientInstance.api).toHaveBeenCalledWith('/$batch');
      expect(mockClientInstance.post).toHaveBeenCalled();
      expect(result.responses).toHaveLength(2);
    });
  });

  describe('error handling for shared mailbox access', () => {
    it('should handle 403 Forbidden error for unauthorized mailbox access', async () => {
      const error = new Error('Forbidden');
      (error as any).statusCode = 403;
      mockClientInstance.get.mockRejectedValue(error);

      await expect(
        graphClient.searchMessages('test', 10, 'unauthorized@example.com')
      ).rejects.toThrow();
    });

    it('should handle 404 Not Found error for non-existent mailbox', async () => {
      const error = new Error('Not Found');
      (error as any).statusCode = 404;
      mockClientInstance.get.mockRejectedValue(error);

      await expect(
        graphClient.searchMessages('test', 10, 'nonexistent@example.com')
      ).rejects.toThrow();
    });
  });
});
