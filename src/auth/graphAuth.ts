/**
 * Authentication layer for Microsoft Graph using OAuth 2.0 Interactive Browser Flow
 * Implements persistent token caching with refresh token support
 */

import { PublicClientApplication, DeviceCodeRequest, AuthorizationUrlRequest, AuthorizationCodeRequest, ICachePlugin } from '@azure/msal-node';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { exec } from 'child_process';
import { AuthConfig, AuthError } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getTokenStoragePath, getMsalCachePath } from '../utils/config.js';

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

    // Initialize MSAL Public Client Application with persistent cache
    this.pca = new PublicClientApplication({
      auth: {
        clientId: this.authConfig.clientId,
        authority: `https://login.microsoftonline.com/${this.authConfig.tenantId}`,
      },
      cache: {
        cachePlugin: this.createCachePlugin(),
      },
    });
  }

  /**
   * Create MSAL cache plugin for persisting refresh tokens
   */
  private createCachePlugin(): ICachePlugin {
    const cachePath = getMsalCachePath();

    return {
      beforeCacheAccess: async (cacheContext) => {
        try {
          const data = await fs.readFile(cachePath, 'utf-8');
          cacheContext.tokenCache.deserialize(data);
          logger.debug('Loaded MSAL cache from disk');
        } catch (error) {
          // Cache file doesn't exist yet, that's okay
          logger.debug('No MSAL cache found, starting fresh');
        }
      },
      afterCacheAccess: async (cacheContext) => {
        if (cacheContext.cacheHasChanged) {
          try {
            await fs.mkdir(dirname(cachePath), { recursive: true });
            await fs.writeFile(
              cachePath,
              cacheContext.tokenCache.serialize(),
              { mode: 0o600 }
            );
            logger.debug('Saved MSAL cache to disk');
          } catch (error) {
            logger.warn('Failed to save MSAL cache:', error);
          }
        }
      },
    };
  }

  /**
   * Initialize authentication
   * Loads cached token or prompts for device code authentication
   */
  async initialize(): Promise<void> {
    logger.info('Initializing authentication...');

    // First, try to get accounts from MSAL cache (includes refresh tokens)
    const accounts = await this.pca.getAllAccounts();

    if (accounts.length > 0) {
      logger.info('Found cached account, attempting silent authentication...');
      try {
        const response = await this.pca.acquireTokenSilent({
          scopes: this.authConfig.scopes,
          account: accounts[0],
        });

        if (response) {
          this.cachedToken = {
            accessToken: response.accessToken,
            expiresAt: response.expiresOn?.getTime() || Date.now() + 3600000,
            account: response.account,
          };
          await this.saveCachedToken();
          logger.info('Silent authentication successful');
          this.isInitialized = true;
          return;
        }
      } catch (error) {
        logger.warn('Silent authentication failed, will re-authenticate:', error);
      }
    }

    // No cached account or silent auth failed, start interactive browser flow
    logger.info('Starting interactive browser authentication...');
    try {
      await this.authenticateInteractive();
      this.isInitialized = true;
    } catch (error) {
      logger.warn('Interactive auth failed, falling back to device code:', error);
      logger.info('Starting device code authentication...');
      await this.authenticateWithDeviceCode();
      this.isInitialized = true;
    }
  }

  /**
   * Authenticate using interactive browser flow
   * Opens browser automatically and uses existing session
   */
  private async authenticateInteractive(): Promise<void> {
    return new Promise((resolve, reject) => {
      const redirectUri = this.authConfig.redirectUri;
      const redirectUrl = new URL(redirectUri);
      const port = parseInt(redirectUrl.port) || 3000;

      let authCode: string | null = null;

      // Create local HTTP server to capture redirect
      const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const reqUrl = new URL(req.url || '', `http://localhost:${port}`);

        if (reqUrl.pathname === redirectUrl.pathname) {
          authCode = reqUrl.searchParams.get('code');
          const error = reqUrl.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <title>Authentication Failed</title>
                </head>
                <body style="font-family: system-ui, -apple-system, sans-serif; padding: 40px; text-align: center; background: #f5f5f5;">
                  <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
                    <div style="font-size: 48px; margin-bottom: 20px;">&#x274C;</div>
                    <h1 style="color: #d32f2f; margin: 0 0 16px 0;">Authentication Failed</h1>
                    <p style="color: #666;">Error: ${error}</p>
                    <p style="color: #999; font-size: 14px;">You can close this window and try again.</p>
                  </div>
                </body>
              </html>
            `);
            server.close();
            reject(new AuthError(`Authentication error: ${error}`));
            return;
          }

          if (authCode) {
            // Send success response immediately
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <title>Authentication Successful</title>
                </head>
                <body style="font-family: system-ui, -apple-system, sans-serif; padding: 40px; text-align: center; background: #f5f5f5;">
                  <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
                    <div style="font-size: 48px; margin-bottom: 20px;">&#x2705;</div>
                    <h1 style="color: #4caf50; margin: 0 0 16px 0;">Authentication Successful!</h1>
                    <p style="color: #666; margin: 0;">This window will close automatically...</p>
                  </div>
                  <script>
                    // Auto-close after 1.5 seconds
                    setTimeout(() => {
                      window.close();
                      // Fallback for browsers that block window.close()
                      setTimeout(() => {
                        document.body.innerHTML = '<div style="font-family: system-ui; padding: 40px; text-align: center;"><h2>You can close this tab now</h2></div>';
                      }, 500);
                    }, 1500);
                  </script>
                </body>
              </html>
            `);

            // Exchange authorization code for tokens immediately
            logger.info('Exchanging authorization code for tokens...');
            try {
              const tokenRequest: AuthorizationCodeRequest = {
                code: authCode,
                scopes: this.authConfig.scopes,
                redirectUri: redirectUri,
              };

              const response = await this.pca.acquireTokenByCode(tokenRequest);

              if (!response) {
                server.close();
                reject(new AuthError('Failed to acquire token'));
                return;
              }

              // Cache the token
              this.cachedToken = {
                accessToken: response.accessToken,
                expiresAt: response.expiresOn?.getTime() || Date.now() + 3600000,
                account: response.account,
              };

              await this.saveCachedToken();
              logger.info('Authentication successful!');
              server.close();
              resolve();
            } catch (error) {
              logger.error('Token acquisition failed:', error);
              server.close();
              reject(new AuthError(`Token acquisition failed: ${error}`));
            }
          } else {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <title>Authentication Error</title>
                </head>
                <body style="font-family: system-ui, -apple-system, sans-serif; padding: 40px; text-align: center; background: #f5f5f5;">
                  <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
                    <div style="font-size: 48px; margin-bottom: 20px;">&#x26A0;</div>
                    <h1 style="color: #d32f2f; margin: 0 0 16px 0;">No Authorization Code Received</h1>
                    <p style="color: #999; font-size: 14px;">You can close this window and try again.</p>
                  </div>
                </body>
              </html>
            `);
            server.close();
            reject(new AuthError('No authorization code received'));
          }
        }
      });

      // Handle server errors
      server.on('error', (error) => {
        logger.error('HTTP server error:', error);
        reject(new AuthError(`Server error: ${error.message}`));
      });

      // Start server
      server.listen(port, async () => {
        logger.info('\n=================================================');
        logger.info('MICROSOFT AUTHENTICATION REQUIRED');
        logger.info('=================================================');
        logger.info('\nOpening browser for authentication...');
        logger.info('If browser does not open automatically, please visit:');

        try {
          // Generate authorization URL
          const authUrlRequest: AuthorizationUrlRequest = {
            scopes: this.authConfig.scopes,
            redirectUri: redirectUri,
          };

          const authUrl = await this.pca.getAuthCodeUrl(authUrlRequest);
          logger.info(`\n${authUrl}\n`);

          // Open browser
          this.openBrowser(authUrl);

          // Timeout after 5 minutes
          setTimeout(() => {
            if (!authCode) {
              server.close();
              reject(new AuthError('Authentication timeout - no response received'));
            }
          }, 5 * 60 * 1000);
        } catch (error) {
          server.close();
          reject(error);
        }
      });
    });
  }

  /**
   * Open browser to URL
   */
  private openBrowser(url: string): void {
    const platform = process.platform;
    let command: string;

    if (platform === 'darwin') {
      command = `open "${url}"`;
    } else if (platform === 'win32') {
      command = `start "" "${url}"`;
    } else {
      // Linux
      command = `xdg-open "${url}"`;
    }

    exec(command, (error) => {
      if (error) {
        logger.warn('Could not open browser automatically:', error.message);
      }
    });
  }

  /**
   * Authenticate using device code flow (fallback)
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
