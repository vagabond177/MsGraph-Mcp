/**
 * Core type definitions for MsGraph-Mcp server
 */

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthConfig {
  tenantId: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp
}

export interface AuthState {
  isAuthenticated: boolean;
  tokenData?: TokenData;
}

// ============================================================================
// Email Types
// ============================================================================

export interface EmailSummary {
  messageId: string;
  receivedDateTime: string;
  subject: string;
  from: string;
  snippet: string;
  hasAttachments: boolean;
  importance: 'low' | 'normal' | 'high';
}

export interface EmailSearchResult {
  matchCount: number;
  latestDate?: string;
  emails: EmailSummary[];
  error?: string;
}

export interface BatchEmailSearchResult {
  [entity: string]: EmailSearchResult;
}

export interface MailFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
}

// ============================================================================
// Tool Input Types
// ============================================================================

export interface SearchEmailsByEntitiesInput {
  entities: string[];
  keywords?: string[];
  dateFrom?: string;
  dateTo?: string;
  maxResultsPerEntity?: number;
}

export interface SearchEmailsInput {
  query: string;
  maxResults?: number;
  folderIds?: string[];
}

export interface GetEmailInput {
  messageId: string;
  includeBody?: boolean;
}

// ============================================================================
// Graph API Types
// ============================================================================

export interface GraphBatchRequest {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface GraphBatchResponse {
  id: string;
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface GraphBatch {
  requests: GraphBatchRequest[];
}

export interface GraphBatchResult {
  responses: GraphBatchResponse[];
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitInfo {
  retryAfter: number; // Seconds to wait
  limit?: number;
  remaining?: number;
  reset?: number; // Unix timestamp
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ServerConfig {
  auth: AuthConfig;
  userEmail?: string;
  environment: 'development' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// ============================================================================
// Error Types
// ============================================================================

export class GraphError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public graphError?: unknown
  ) {
    super(message);
    this.name = 'GraphError';
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}
