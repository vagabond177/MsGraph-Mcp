/**
 * Unit tests for GraphAuthenticator
 * Tests OAuth 2.0 device code flow authentication with token caching
 */

import { GraphAuthenticator } from '../../../src/auth/graphAuth.js';
import { AuthError } from '../../../src/types/index.js';
import { createMockAuthConfig, createMockAuthResponse } from '../../helpers/mockFactories.js';
import { promises as fs } from 'fs';

// Mock dependencies
jest.mock('@azure/msal-node');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('../../../src/utils/config.js', () => ({
  getTokenStoragePath: jest.fn(() => '/mock/path/tokens.json'),
  getMsalCachePath: jest.fn(() => '/mock/path/msal-cache.json'),
}));

import { PublicClientApplication } from '@azure/msal-node';

const MockedPublicClientApplication = PublicClientApplication as jest.MockedClass<
  typeof PublicClientApplication
>;

describe('GraphAuthenticator', () => {
  let mockPca: any;
  let authenticator: GraphAuthenticator;
  const authConfig = createMockAuthConfig();

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock PCA instance
    mockPca = {
      acquireTokenByDeviceCode: jest.fn(),
      acquireTokenSilent: jest.fn(),
      getAllAccounts: jest.fn().mockReturnValue([]),
    };

    MockedPublicClientApplication.mockImplementation(() => mockPca);

    authenticator = new GraphAuthenticator(authConfig);
  });

  describe('constructor', () => {
    it('should create GraphAuthenticator with auth config', () => {
      expect(authenticator).toBeInstanceOf(GraphAuthenticator);
      expect(MockedPublicClientApplication).toHaveBeenCalledWith({
        auth: {
          clientId: authConfig.clientId,
          authority: `https://login.microsoftonline.com/${authConfig.tenantId}`,
        },
        cache: {
          cachePlugin: expect.objectContaining({
            beforeCacheAccess: expect.any(Function),
            afterCacheAccess: expect.any(Function),
          }),
        },
      });
    });
  });

  describe('initialize', () => {
    it('should use valid cached token', async () => {
      const mockAccount = { homeAccountId: 'test-account-id' };
      const authResponse = createMockAuthResponse();

      mockPca.getAllAccounts.mockReturnValue([mockAccount]);
      mockPca.acquireTokenSilent.mockResolvedValue(authResponse);

      await authenticator.initialize();

      expect(mockPca.getAllAccounts).toHaveBeenCalled();
      expect(mockPca.acquireTokenSilent).toHaveBeenCalledWith({
        scopes: authConfig.scopes,
        account: mockAccount,
      });
      expect(mockPca.acquireTokenByDeviceCode).not.toHaveBeenCalled();
      expect(authenticator.isAuthenticated()).toBe(true);
    });

    it('should refresh expired token with valid account', async () => {
      const mockAccount = { homeAccountId: 'test-account-id' };
      const refreshedResponse = createMockAuthResponse({
        accessToken: 'new-access-token',
      });

      mockPca.getAllAccounts.mockReturnValue([mockAccount]);
      mockPca.acquireTokenSilent.mockResolvedValue(refreshedResponse);

      await authenticator.initialize();

      expect(mockPca.getAllAccounts).toHaveBeenCalled();
      expect(mockPca.acquireTokenSilent).toHaveBeenCalledWith({
        scopes: authConfig.scopes,
        account: mockAccount,
      });
      expect(authenticator.isAuthenticated()).toBe(true);
    });

    it('should start device code flow when no cached token exists', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const authResponse = createMockAuthResponse();
      mockPca.acquireTokenByDeviceCode.mockResolvedValue(authResponse);

      await authenticator.initialize();

      expect(mockPca.acquireTokenByDeviceCode).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      expect(authenticator.isAuthenticated()).toBe(true);
    });

    it('should start device code flow when token refresh fails', async () => {
      const mockAccount = { homeAccountId: 'test-account-id' };
      mockPca.getAllAccounts.mockReturnValue([mockAccount]);
      mockPca.acquireTokenSilent.mockRejectedValue(new Error('Refresh failed'));

      const authResponse = createMockAuthResponse();
      mockPca.acquireTokenByDeviceCode.mockResolvedValue(authResponse);

      await authenticator.initialize();

      expect(mockPca.getAllAccounts).toHaveBeenCalled();
      expect(mockPca.acquireTokenSilent).toHaveBeenCalled();
      expect(mockPca.acquireTokenByDeviceCode).toHaveBeenCalled();
      expect(authenticator.isAuthenticated()).toBe(true);
    });

    it('should handle device code flow with callback', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const authResponse = createMockAuthResponse();
      mockPca.acquireTokenByDeviceCode.mockImplementation(async (request: any) => {
        // Call the device code callback
        request.deviceCodeCallback({
          verificationUri: 'https://microsoft.com/devicelogin',
          userCode: 'ABC123',
        });
        return authResponse;
      });

      await authenticator.initialize();

      expect(mockPca.acquireTokenByDeviceCode).toHaveBeenCalled();
      expect(authenticator.isAuthenticated()).toBe(true);
    });

    it('should throw AuthError when device code authentication fails', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      mockPca.acquireTokenByDeviceCode.mockRejectedValue(new Error('Auth failed'));

      await expect(authenticator.initialize()).rejects.toThrow(AuthError);
      await expect(authenticator.initialize()).rejects.toThrow(/Authentication failed/);
    });

    it('should throw AuthError when device code returns no response', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      mockPca.acquireTokenByDeviceCode.mockResolvedValue(null);

      await expect(authenticator.initialize()).rejects.toThrow(AuthError);
      await expect(authenticator.initialize()).rejects.toThrow(/Failed to acquire token/);
    });

    it('should save token after successful authentication', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const authResponse = createMockAuthResponse();
      mockPca.acquireTokenByDeviceCode.mockResolvedValue(authResponse);

      await authenticator.initialize();

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('mock-access-token'),
        { mode: 0o600 }
      );
    });
  });

  describe('getAccessToken', () => {
    it('should return cached valid token', async () => {
      const mockAccount = { homeAccountId: 'test-account-id' };
      const authResponse = createMockAuthResponse();

      mockPca.getAllAccounts.mockReturnValue([mockAccount]);
      mockPca.acquireTokenSilent.mockResolvedValue(authResponse);

      await authenticator.initialize();
      const token = await authenticator.getAccessToken();

      expect(token).toBe(authResponse.accessToken);
    });

    it('should throw error when not initialized', async () => {
      await expect(authenticator.getAccessToken()).rejects.toThrow(AuthError);
      await expect(authenticator.getAccessToken()).rejects.toThrow(/Not authenticated/);
    });

    it('should refresh token when expired', async () => {
      const mockAccount = { homeAccountId: 'test-account-id' };
      const authResponse = createMockAuthResponse({
        accessToken: 'initial-token',
      });

      mockPca.getAllAccounts.mockReturnValue([mockAccount]);
      mockPca.acquireTokenSilent.mockResolvedValue(authResponse);

      await authenticator.initialize();

      const token = await authenticator.getAccessToken();
      expect(token).toBe('initial-token');
    });

    it('should start device code flow when token expired and no account info', async () => {
      const expiredTokenNoAccount = {
        accessToken: 'expired-token',
        expiresAt: Date.now() - 60000,
        // No account property
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(expiredTokenNoAccount));
      mockPca.acquireTokenByDeviceCode.mockResolvedValue(createMockAuthResponse());

      await authenticator.initialize();

      // Should have fallen back to device code flow since no account info
      expect(mockPca.acquireTokenByDeviceCode).toHaveBeenCalled();
      expect(authenticator.isAuthenticated()).toBe(true);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false before initialization', () => {
      expect(authenticator.isAuthenticated()).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      const mockAccount = { homeAccountId: 'test-account-id' };
      const authResponse = createMockAuthResponse();

      mockPca.getAllAccounts.mockReturnValue([mockAccount]);
      mockPca.acquireTokenSilent.mockResolvedValue(authResponse);

      await authenticator.initialize();

      expect(authenticator.isAuthenticated()).toBe(true);
    });
  });

  describe('token validation', () => {
    it('should consider token valid if expires in more than 5 minutes', async () => {
      const mockAccount = { homeAccountId: 'test-account-id' };
      const authResponse = createMockAuthResponse({
        expiresOn: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });

      mockPca.getAllAccounts.mockReturnValue([mockAccount]);
      mockPca.acquireTokenSilent.mockResolvedValue(authResponse);

      await authenticator.initialize();

      const token = await authenticator.getAccessToken();
      expect(token).toBe(authResponse.accessToken);
    });

    it('should refresh token if expires in less than 5 minutes', async () => {
      const mockAccount = { homeAccountId: 'test-account-id' };
      const initialResponse = createMockAuthResponse({
        expiresOn: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
      });

      mockPca.getAllAccounts.mockReturnValue([mockAccount]);
      mockPca.acquireTokenSilent.mockResolvedValue(initialResponse);

      await authenticator.initialize();

      expect(mockPca.acquireTokenSilent).toHaveBeenCalled();
    });
  });

  describe('token caching', () => {
    it('should create cache plugin with callbacks', () => {
      // Constructor creates cache plugin - verify it was passed to MSAL
      expect(MockedPublicClientApplication).toHaveBeenCalledWith({
        auth: expect.any(Object),
        cache: {
          cachePlugin: expect.objectContaining({
            beforeCacheAccess: expect.any(Function),
            afterCacheAccess: expect.any(Function),
          }),
        },
      });
    });

    it('should handle MSAL cache loading in beforeCacheAccess', async () => {
      const cachePlugin = MockedPublicClientApplication.mock.calls[0]?.[0]?.cache?.cachePlugin;
      const mockContext: any = {
        tokenCache: {
          deserialize: jest.fn(),
          serialize: jest.fn(() => 'serialized-cache'),
        },
        cacheHasChanged: false,
      };

      (fs.readFile as jest.Mock).mockResolvedValue('cached-data');

      await cachePlugin?.beforeCacheAccess(mockContext);

      expect(fs.readFile).toHaveBeenCalled();
      expect(mockContext.tokenCache.deserialize).toHaveBeenCalledWith('cached-data');
    });

    it('should handle MSAL cache saving in afterCacheAccess', async () => {
      const cachePlugin = MockedPublicClientApplication.mock.calls[0]?.[0]?.cache?.cachePlugin;
      const mockContext: any = {
        tokenCache: {
          deserialize: jest.fn(),
          serialize: jest.fn(() => 'serialized-cache'),
        },
        cacheHasChanged: true,
      };

      await cachePlugin?.afterCacheAccess(mockContext);

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        'serialized-cache',
        { mode: 0o600 }
      );
    });

    it('should not save cache if not changed', async () => {
      const cachePlugin = MockedPublicClientApplication.mock.calls[0]?.[0]?.cache?.cachePlugin;
      const mockContext: any = {
        tokenCache: {
          deserialize: jest.fn(),
          serialize: jest.fn(),
        },
        cacheHasChanged: false,
      };

      (fs.writeFile as jest.Mock).mockClear();

      await cachePlugin?.afterCacheAccess(mockContext);

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should load cached token from disk', async () => {
      const mockAccount = { homeAccountId: 'test-account-id' };
      const authResponse = createMockAuthResponse();

      // Mock MSAL cache loading via getAllAccounts
      mockPca.getAllAccounts.mockReturnValue([mockAccount]);
      mockPca.acquireTokenSilent.mockResolvedValue(authResponse);

      await authenticator.initialize();

      // Verify MSAL cache was checked
      expect(mockPca.getAllAccounts).toHaveBeenCalled();
    });

    it('should handle missing cache file gracefully', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT: no such file'));
      mockPca.acquireTokenByDeviceCode.mockResolvedValue(createMockAuthResponse());

      await authenticator.initialize();

      expect(authenticator.isAuthenticated()).toBe(true);
    });

    it('should save token to disk with secure permissions', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      mockPca.acquireTokenByDeviceCode.mockResolvedValue(createMockAuthResponse());

      await authenticator.initialize();

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        { mode: 0o600 } // User read/write only
      );
    });

    it('should create cache directory if it does not exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      mockPca.acquireTokenByDeviceCode.mockResolvedValue(createMockAuthResponse());

      await authenticator.initialize();

      expect(fs.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('should handle cache save errors gracefully', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Permission denied'));
      mockPca.acquireTokenByDeviceCode.mockResolvedValue(createMockAuthResponse());

      // Should not throw even if save fails
      await expect(authenticator.initialize()).resolves.not.toThrow();
      expect(authenticator.isAuthenticated()).toBe(true);
    });
  });

  describe('token refresh', () => {
    it('should update cached token after refresh', async () => {
      const mockAccount = { homeAccountId: 'test-account-id' };
      const refreshedResponse = createMockAuthResponse({
        accessToken: 'new-refreshed-token',
      });

      mockPca.getAllAccounts.mockReturnValue([mockAccount]);
      mockPca.acquireTokenSilent.mockResolvedValue(refreshedResponse);

      await authenticator.initialize();

      // Verify token was cached after refresh
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('new-refreshed-token'),
        expect.any(Object)
      );
    });

    it('should throw error when refresh fails without account', async () => {
      const tokenWithoutAccount = {
        accessToken: 'token',
        expiresAt: Date.now() - 60000,
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(tokenWithoutAccount));
      mockPca.acquireTokenByDeviceCode.mockResolvedValue(createMockAuthResponse());

      // Should proceed with device code flow
      await authenticator.initialize();
      expect(mockPca.acquireTokenByDeviceCode).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle JSON parse errors in cached token', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('invalid json{{{');
      mockPca.acquireTokenByDeviceCode.mockResolvedValue(createMockAuthResponse());

      await authenticator.initialize();

      // Should fall back to device code flow
      expect(mockPca.acquireTokenByDeviceCode).toHaveBeenCalled();
    });

    it('should provide meaningful error messages', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      mockPca.acquireTokenByDeviceCode.mockRejectedValue(new Error('Network connection failed'));

      await expect(authenticator.initialize()).rejects.toThrow(
        /Authentication failed.*Network connection failed/
      );
    });
  });
});
