/**
 * List mail folders
 */

import { MailFolder } from '../../types/index.js';
import { GraphClient } from '../../utils/graphClient.js';
import { logger } from '../../utils/logger.js';

export class ListMailFolders {
  private graphClient: GraphClient;

  constructor(graphClient: GraphClient) {
    this.graphClient = graphClient;
  }

  /**
   * List all mail folders
   */
  async execute(): Promise<MailFolder[]> {
    logger.info('Listing mail folders');

    try {
      const result = await this.graphClient.listMailFolders();
      const folders = result?.value || [];

      logger.info(`Found ${folders.length} folders`);

      // Map to our MailFolder type
      return folders.map((folder: any) => ({
        id: folder.id,
        displayName: folder.displayName,
        parentFolderId: folder.parentFolderId,
        childFolderCount: folder.childFolderCount || 0,
        unreadItemCount: folder.unreadItemCount || 0,
        totalItemCount: folder.totalItemCount || 0,
      }));
    } catch (error) {
      logger.error('Failed to list folders:', error);
      throw error;
    }
  }
}
