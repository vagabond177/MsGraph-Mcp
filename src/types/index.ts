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

export interface AttachmentSummary {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
  lastModifiedDateTime?: string;
}

export interface AttachmentDetail extends AttachmentSummary {
  resourceUri?: string; // MCP Resource URI to access full content (when includeContent=true)
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
  mailbox?: string; // Optional: UPN or user ID for shared/delegated mailbox access
}

export interface SearchEmailsInput {
  query: string;
  maxResults?: number;
  folderIds?: string[];
  mailbox?: string; // Optional: UPN or user ID for shared/delegated mailbox access
}

export interface GetEmailInput {
  messageId: string;
  includeBody?: boolean;
  mailbox?: string; // Optional: UPN or user ID for shared/delegated mailbox access
}

export interface GetAttachmentsInput {
  messageId: string;
  includeContent?: boolean; // Include base64 content (default: false for token efficiency)
  mailbox?: string; // Optional: UPN or user ID for shared/delegated mailbox access
}

export interface DownloadAttachmentInput {
  messageId: string;
  attachmentId: string;
  outputPath: string; // Where to save the file
  mailbox?: string; // Optional: UPN or user ID for shared/delegated mailbox access
}

export interface ListMailFoldersInput {
  mailbox?: string; // Optional: UPN or user ID for shared/delegated mailbox access
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

// ============================================================================
// Copilot Retrieval API Types
// ============================================================================

export type CopilotDataSource = 'sharePoint' | 'oneDriveBusiness' | 'externalItem';

export interface CopilotDataSourceConfiguration {
  externalItem?: {
    connectionId: string;
  };
}

export interface CopilotRetrievalRequest {
  queryString: string;
  dataSource: CopilotDataSource;
  dataSourceConfiguration?: CopilotDataSourceConfiguration;
  filterExpression?: string;
  resourceMetadata?: string[];
  maximumNumberOfResults?: number;
}

export interface CopilotRetrievalExtract {
  text: string;
  relevanceScore: number;
}

export type CopilotResourceType = 'listItem' | 'externalItem';

export interface CopilotSensitivityLabel {
  id?: string;
  name?: string;
  color?: string;
  description?: string;
}

export interface CopilotRetrievalHit {
  webUrl: string;
  extracts: CopilotRetrievalExtract[];
  resourceType: CopilotResourceType;
  resourceMetadata?: Record<string, unknown>;
  sensitivityLabel?: CopilotSensitivityLabel;
}

export interface CopilotRetrievalResponse {
  retrievalHits: CopilotRetrievalHit[];
}

// Tool input for Copilot search
export interface CopilotSearchInput {
  query: string;
  dataSource?: CopilotDataSource;
  filterExpression?: string;
  maxResults?: number;
  includeMetadata?: boolean;
}

// Simplified result for MCP tool return
export interface CopilotSearchResult {
  source: string;
  url: string;
  relevance: number;
  excerpt: string;
  resourceType: string;
  metadata?: Record<string, unknown>;
  sensitivityLabel?: string;
}

// Brief summary returned to Claude (token-efficient)
export interface CopilotSearchResultBrief {
  resultId: string;
  title: string;
  url: string;
  relevance: number;
  briefExcerpt: string; // Short 100-150 char preview
  resourceType: string;
  sensitivityLabel?: string;
  resourceUri: string; // MCP Resource URI for full details
  metadata?: {
    fileExtension?: string;
    lastModifiedDateTime?: string;
  };
}

// Search response with cached results
export interface CopilotSearchResponse {
  searchId: string;
  query: string;
  dataSource: CopilotDataSource;
  totalResults: number;
  results: CopilotSearchResultBrief[];
  instruction: string;
}
