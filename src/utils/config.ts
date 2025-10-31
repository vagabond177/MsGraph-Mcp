/**
 * Configuration management for MsGraph-Mcp server
 */

import { config as loadEnv } from 'dotenv';
import { ServerConfig, AuthConfig } from '../types/index.js';

// Load environment variables
loadEnv();

/**
 * Validate required environment variables
 */
function validateEnv(): void {
  const required = ['TENANT_ID', 'CLIENT_ID'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please create a .env file with TENANT_ID and CLIENT_ID.'
    );
  }
}

/**
 * Create authentication configuration from environment
 */
function createAuthConfig(): AuthConfig {
  return {
    tenantId: process.env.TENANT_ID!,
    clientId: process.env.CLIENT_ID!,
    redirectUri: process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback',
    scopes: [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/User.Read',
      'offline_access', // Required for refresh tokens
    ],
  };
}

/**
 * Get server configuration
 */
export function getConfig(): ServerConfig {
  validateEnv();

  return {
    auth: createAuthConfig(),
    userEmail: process.env.USER_EMAIL,
    environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  };
}

/**
 * Get token storage path based on platform
 */
export function getTokenStoragePath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const configDir = '.msgraph-mcp';
  const platform = process.platform;

  if (platform === 'win32') {
    return `${homeDir}\\${configDir}\\tokens.json`;
  } else {
    return `${homeDir}/${configDir}/tokens.json`;
  }
}
