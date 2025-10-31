/**
 * Unit tests for ListMailFolders tool
 * Tests mail folder listing functionality
 */

import { ListMailFolders } from '../../../src/tools/mail/listFolders.js';
import { GraphClient } from '../../../src/utils/graphClient.js';
import { createMockMailFolder } from '../../helpers/mockFactories.js';

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

describe('ListMailFolders', () => {
  let listFolders: ListMailFolders;
  let mockGraphClient: jest.Mocked<GraphClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphClient = {
      listMailFolders: jest.fn(),
    } as any;

    listFolders = new ListMailFolders(mockGraphClient);
  });

  describe('execute', () => {
    it('should list mail folders', async () => {
      const mockFolders = [
        createMockMailFolder({ id: 'inbox', displayName: 'Inbox' }),
        createMockMailFolder({ id: 'sent', displayName: 'Sent Items' }),
        createMockMailFolder({ id: 'drafts', displayName: 'Drafts' }),
      ];

      mockGraphClient.listMailFolders.mockResolvedValue({ value: mockFolders });

      const result = await listFolders.execute();

      expect(mockGraphClient.listMailFolders).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        id: 'inbox',
        displayName: 'Inbox',
      });
    });

    it('should handle empty folder list', async () => {
      mockGraphClient.listMailFolders.mockResolvedValue({ value: [] });

      const result = await listFolders.execute();

      expect(result).toEqual([]);
    });

    it('should handle null value in response', async () => {
      mockGraphClient.listMailFolders.mockResolvedValue({});

      const result = await listFolders.execute();

      expect(result).toEqual([]);
    });

    it('should map folder properties correctly', async () => {
      const mockFolder = createMockMailFolder({
        id: 'test-id',
        displayName: 'Test Folder',
        parentFolderId: 'parent-id',
        childFolderCount: 5,
        unreadItemCount: 10,
        totalItemCount: 100,
      });

      mockGraphClient.listMailFolders.mockResolvedValue({ value: [mockFolder] });

      const result = await listFolders.execute();

      expect(result[0]).toEqual({
        id: 'test-id',
        displayName: 'Test Folder',
        parentFolderId: 'parent-id',
        childFolderCount: 5,
        unreadItemCount: 10,
        totalItemCount: 100,
      });
    });

    it('should default missing counts to 0', async () => {
      const mockFolder = {
        id: 'test-id',
        displayName: 'Test Folder',
        parentFolderId: null,
        // Missing count fields
      };

      mockGraphClient.listMailFolders.mockResolvedValue({ value: [mockFolder] });

      const result = await listFolders.execute();

      expect(result[0]).toMatchObject({
        childFolderCount: 0,
        unreadItemCount: 0,
        totalItemCount: 0,
      });
    });

    it('should handle folders with no parent', async () => {
      const rootFolder = createMockMailFolder({
        parentFolderId: null,
      });

      mockGraphClient.listMailFolders.mockResolvedValue({ value: [rootFolder] });

      const result = await listFolders.execute();

      expect(result[0].parentFolderId).toBeNull();
    });

    it('should handle nested folders', async () => {
      const mockFolders = [
        createMockMailFolder({
          id: 'parent',
          displayName: 'Parent Folder',
          parentFolderId: null,
          childFolderCount: 2,
        }),
        createMockMailFolder({
          id: 'child1',
          displayName: 'Child 1',
          parentFolderId: 'parent',
          childFolderCount: 0,
        }),
        createMockMailFolder({
          id: 'child2',
          displayName: 'Child 2',
          parentFolderId: 'parent',
          childFolderCount: 0,
        }),
      ];

      mockGraphClient.listMailFolders.mockResolvedValue({ value: mockFolders });

      const result = await listFolders.execute();

      expect(result).toHaveLength(3);
      expect(result[0].childFolderCount).toBe(2);
      expect(result[1].parentFolderId).toBe('parent');
      expect(result[2].parentFolderId).toBe('parent');
    });

    it('should handle API errors', async () => {
      mockGraphClient.listMailFolders.mockRejectedValue(new Error('API error'));

      await expect(listFolders.execute()).rejects.toThrow('API error');
    });

    it('should include unread counts', async () => {
      const mockFolders = [
        createMockMailFolder({
          displayName: 'Inbox',
          unreadItemCount: 25,
          totalItemCount: 150,
        }),
      ];

      mockGraphClient.listMailFolders.mockResolvedValue({ value: mockFolders });

      const result = await listFolders.execute();

      expect(result[0].unreadItemCount).toBe(25);
      expect(result[0].totalItemCount).toBe(150);
    });

    it('should list standard Outlook folders', async () => {
      const standardFolders = [
        createMockMailFolder({ displayName: 'Inbox' }),
        createMockMailFolder({ displayName: 'Drafts' }),
        createMockMailFolder({ displayName: 'Sent Items' }),
        createMockMailFolder({ displayName: 'Deleted Items' }),
        createMockMailFolder({ displayName: 'Junk Email' }),
        createMockMailFolder({ displayName: 'Archive' }),
      ];

      mockGraphClient.listMailFolders.mockResolvedValue({ value: standardFolders });

      const result = await listFolders.execute();

      expect(result).toHaveLength(6);
      const folderNames = result.map(f => f.displayName);
      expect(folderNames).toContain('Inbox');
      expect(folderNames).toContain('Sent Items');
      expect(folderNames).toContain('Drafts');
    });
  });
});
