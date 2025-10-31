/**
 * Authentication layer for Microsoft Graph using OAuth 2.0 Device Code Flow
 * Implements persistent token caching with refresh token support
 */

import { PublicClientApplication, DeviceCodeRequest } from '@azure/msal-node';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { AuthConfig, AuthError } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getTokenStoragePath } from '../utils/config.js';

interface CachedTokenData {
  accessToken: string;
  expiresAt: number;
  account?: any;
}

export class GraphAuthenticator {
  private authConfig: AuthConfig;
  private pca: PublicClientApplication;
  private cachedToken?: CachedTokenData;
  private isInitialized = false;

  constructor(authConfig: AuthConfig) {
    this.authConfig = authConfig;

    // Initialize MSAL Public Client Application
    this.pca = new PublicClientApplication({
      auth: {
        clientId: this.authConfig.clientId,
        authority: `https://login.microsoftonline.com/${this.authConfig.tenantId}`,
      },
      cache: {
        cachePlugin: undefined, // We'll handle caching manually
      },
    });
  }

  /**
   * Initialize authentication
   * Loads cached token or prompts for device code authentication
   */
  async initialize(): Promise<void> {
    logger.info('Initializing authentication...');

    // Try to load cached token
    await this.loadCachedToken();

    if (this.cachedToken) {
      // Check if token is still valid
      if (this.isTokenValid(this.cachedToken)) {
        logger.info('Using cached access token');
        this.isInitialized = true;
        return;
      }

      // Token expired, try to refresh
      if (this.cachedToken.account) {
        logger.info('Access token expired, refreshing...');
        try {
          await this.refreshToken();
          this.isInitialized = true;
          return;
        } catch (error) {
          logger.warn('Token refresh failed, will re-authenticate:', error);
        }
      }
    }

    // No valid cached token, start device code flow
    logger.info('Starting device code authentication...');
    await this.authenticateWithDeviceCode();
    this.isInitialized = true;
  }

  /**
   * Authenticate using device code flow
   */
  private async authenticateWithDeviceCode(): Promise<void> {
    const deviceCodeRequest: DeviceCodeRequest = {
      scopes: this.authConfig.scopes,
      deviceCodeCallback: response => {
        logger.info('\n=================================================');
        logger.info('MICROSOFT AUTHENTICATION REQUIRED');
        logger.info('=================================================');
        logger.info(`\nPlease visit: ${response.verificationUri}`);
        logger.info(`\nAnd enter code: ${response.userCode}`);
        logger.info('\nWaiting for authentication...\n');
      },
    };

    try {
      const response = await this.pca.acquireTokenByDeviceCode(deviceCodeRequest);

      if (!response) {
        throw new AuthError('Failed to acquire token');
      }

      // Cache the token (MSAL manages refresh tokens internally)
      this.cachedToken = {
        accessToken: response.accessToken,
        expiresAt: response.expiresOn?.getTime() || Date.now() + 3600000,
        account: response.account,
      };

      await this.saveCachedToken();
      logger.info('Authentication successful!');
    } catch (error) {
      logger.error('Device code authentication failed:', error);
      throw new AuthError(`Authentication failed: ${error}`);
    }
  }

  /**
   * Refresh access token using MSAL silent authentication
   */
  private async refreshToken(): Promise<void> {
    if (!this.cachedToken?.account) {
      throw new AuthError('No account information available');
    }

    try {
      const response = await this.pca.acquireTokenSilent({
        scopes: this.authConfig.scopes,
        account: this.cachedToken.account,
      });

      if (!response) {
        throw new AuthError('Failed to refresh token');
      }

      // Update cached token
      this.cachedToken = {
        accessToken: response.accessToken,
        expiresAt: response.expiresOn?.getTime() || Date.now() + 3600000,
        account: response.account,
      };

      await this.saveCachedToken();
      logger.info('Token refreshed successfully');
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Get current access token
   */
  async getAccessToken(): Promise<string> {
    if (!this.isInitialized || !this.cachedToken) {
      throw new AuthError('Not authenticated. Call initialize() first.');
    }

    // Check if token needs refresh
    if (!this.isTokenValid(this.cachedToken)) {
      if (this.cachedToken.account) {
        await this.refreshToken();
      } else {
        throw new AuthError('Token expired and no account information available');
      }
    }

    return this.cachedToken.accessToken;
  }

  /**
   * Check if token is valid (not expired)
   */
  private isTokenValid(token: CachedTokenData): boolean {
    const now = Date.now();
    const expiresIn = token.expiresAt - now;
    const fiveMinutes = 5 * 60 * 1000;
    return expiresIn > fiveMinutes;
  }

  /**
   * Load cached token from disk
   */
  private async loadCachedToken(): Promise<void> {
    try {
      const tokenPath = getTokenStoragePath();
      const data = await fs.readFile(tokenPath, 'utf-8');
      this.cachedToken = JSON.parse(data);
      logger.debug('Loaded cached token');
    } catch (error) {
      logger.debug('No cached token found');
    }
  }

  /**
   * Save token to disk
   */
  private async saveCachedToken(): Promise<void> {
    if (!this.cachedToken) {
      return;
    }

    try {
      const tokenPath = getTokenStoragePath();
      await fs.mkdir(dirname(tokenPath), { recursive: true });
      await fs.writeFile(tokenPath, JSON.stringify(this.cachedToken, null, 2), {
        mode: 0o600,
      });
      logger.debug('Saved token to cache');
    } catch (error) {
      logger.warn('Failed to save token:', error);
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.isInitialized;
  }
}
