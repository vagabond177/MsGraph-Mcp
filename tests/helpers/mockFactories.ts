/**
 * Mock factories for testing
 * Provides reusable mock objects for Graph API responses and other test data
 */

import { AuthConfig } from '../../src/types/index.js';

/**
 * Create a mock Graph API message
 */
export function createMockMessage(overrides?: Partial<any>): any {
  return {
    id: 'message-123',
    subject: 'Test Email Subject',
    receivedDateTime: '2025-10-31T10:00:00Z',
    from: {
      emailAddress: {
        name: 'John Doe',
        address: 'john.doe@example.com',
      },
    },
    bodyPreview: 'This is a test email preview that contains some content...',
    hasAttachments: false,
    importance: 'normal',
    toRecipients: [
      {
        emailAddress: {
          name: 'Jane Smith',
          address: 'jane.smith@example.com',
        },
      },
    ],
    ccRecipients: [],
    body: {
      contentType: 'html',
      content: '<html><body>This is the full email body content</body></html>',
    },
    ...overrides,
  };
}

/**
 * Create multiple mock messages
 */
export function createMockMessages(count: number): any[] {
  return Array.from({ length: count }, (_, i) =>
    createMockMessage({
      id: `message-${i + 1}`,
      subject: `Test Email ${i + 1}`,
      receivedDateTime: new Date(Date.now() - i * 3600000).toISOString(),
    })
  );
}

/**
 * Create a mock auth config
 */
export function createMockAuthConfig(overrides?: Partial<AuthConfig>): AuthConfig {
  return {
    tenantId: 'test-tenant-id',
    clientId: 'test-client-id',
    redirectUri: 'http://localhost:3000/auth/callback',
    scopes: [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/User.Read',
      'offline_access',
    ],
    ...overrides,
  };
}

/**
 * Create a mock MSAL authentication response
 */
export function createMockAuthResponse(overrides?: Partial<any>): any {
  return {
    accessToken: 'mock-access-token',
    expiresOn: new Date(Date.now() + 3600000), // 1 hour from now
    account: {
      homeAccountId: 'test-account-id',
      environment: 'login.microsoftonline.com',
      tenantId: 'test-tenant-id',
      username: 'test@example.com',
      localAccountId: 'test-local-id',
    },
    ...overrides,
  };
}

/**
 * Create a mock cached token
 */
export function createMockCachedToken(overrides?: Partial<any>): any {
  return {
    accessToken: 'cached-access-token',
    expiresAt: Date.now() + 3600000, // 1 hour from now
    account: {
      homeAccountId: 'test-account-id',
      environment: 'login.microsoftonline.com',
      tenantId: 'test-tenant-id',
      username: 'test@example.com',
      localAccountId: 'test-local-id',
    },
    ...overrides,
  };
}

/**
 * Create an expired mock token
 */
export function createExpiredToken(): any {
  return createMockCachedToken({
    expiresAt: Date.now() - 60000, // 1 minute ago
  });
}

/**
 * Create a mock Graph batch response
 */
export function createMockBatchResponse(id: string, status: number, body?: any): any {
  return {
    id,
    status,
    body: body || { value: [] },
  };
}

/**
 * Create a mock mail folder
 */
export function createMockMailFolder(overrides?: Partial<any>): any {
  return {
    id: 'folder-123',
    displayName: 'Inbox',
    parentFolderId: null,
    childFolderCount: 0,
    unreadItemCount: 5,
    totalItemCount: 100,
    ...overrides,
  };
}
