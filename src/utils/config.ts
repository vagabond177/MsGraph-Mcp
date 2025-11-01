/**
 * Configuration management for MsGraph-Mcp server
 */

import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ServerConfig, AuthConfig } from '../types/index.js';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root is two levels up from src/utils/ (or three levels up from dist/src/utils/ when compiled)
const projectRoot = join(__dirname, '..', '..', '..');

// Load environment variables from .env file in project root
const envPath = join(projectRoot, '.env');
const result = loadEnv({ path: envPath });

// Debug logging (only shows if LOG_LEVEL=debug is already set in environment)
if (process.env.LOG_LEVEL === 'debug') {
  console.log(`[DEBUG] Loading .env from: ${envPath}`);
  console.log(`[DEBUG] .env loaded: ${result.parsed ? 'yes' : 'no'}`);
}

/**
 * Validate required environment variables
 */
function validateEnv(): void {
  const required = ['TENANT_ID', 'CLIENT_ID'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const envPath = join(projectRoot, '.env');
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        `Expected .env file at: ${envPath}\n` +
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
      'https://graph.microsoft.com/Mail.Read.Shared',
      'https://graph.microsoft.com/Mail.ReadWrite', // Required for creating/modifying drafts
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Mail.Send.Shared',
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
 * Get the project root directory
 */
export function getProjectRoot(): string {
  return projectRoot;
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

/**
 * Get MSAL cache storage path for refresh tokens
 */
export function getMsalCachePath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const configDir = '.msgraph-mcp';
  const platform = process.platform;

  if (platform === 'win32') {
    return `${homeDir}\\${configDir}\\msal-cache.json`;
  } else {
    return `${homeDir}/${configDir}/msal-cache.json`;
  }
}
