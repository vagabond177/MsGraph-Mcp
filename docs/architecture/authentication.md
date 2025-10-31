# Authentication

**Type:** Context
**Purpose:** Understand OAuth 2.0 implementation for Microsoft Graph
**Audience:** Developers implementing or troubleshooting authentication

---

## Table of Contents

- [Authentication Flow](#authentication-flow)
- [Azure AD Requirements](#azure-ad-requirements)
- [Token Management](#token-management)
- [Security Considerations](#security-considerations)
- [Related Documentation](#related-documentation)

---

## Authentication Flow

### OAuth 2.0 Authorization Code Flow

MsGraph-Mcp uses the standard OAuth 2.0 authorization code flow with PKCE (Proof Key for Code Exchange).

**Why this flow:**
- Secure for desktop/CLI applications
- Supports token refresh
- No client secret in environment (PKCE)
- User grants consent explicitly

### Step-by-Step Flow

```
1. User starts MCP server
   ↓
2. Server checks for valid access token
   ↓
3. If no token or expired:
   a. Server generates authorization URL
   b. Opens browser for user consent
   c. User logs in with M365 credentials
   d. User grants permissions
   ↓
4. Microsoft redirects to localhost callback
   ↓
5. Server receives authorization code
   ↓
6. Server exchanges code for tokens:
   - Access token (1 hour lifespan)
   - Refresh token (90 days lifespan)
   ↓
7. Server stores refresh token securely
   ↓
8. Server uses access token for Graph API calls
   ↓
9. Before expiration, server uses refresh token
   to get new access token (automatic)
```

### Implementation

**Location:** `src/auth/graphAuth.ts`

**Key functions:**
- `initialize()` - Check for existing tokens or start auth flow
- `getAccessToken()` - Return current token or refresh if needed
- `refreshAccessToken()` - Use refresh token to get new access token
- `handleAuthCallback()` - Process OAuth callback from browser

---

## Azure AD Requirements

### App Registration

**Required settings:**
- **Application type:** Public client (desktop/mobile)
- **Redirect URI:** `http://localhost:3000/auth/callback`
- **Supported account types:** Single tenant (organization only)

**API Permissions:**
- `Mail.Read` - Read user email
- `User.Read` - Read user profile
- _(Future phases)_
  - `Mail.ReadWrite` - Send/modify email
  - `Tasks.ReadWrite` - Planner/To Do access
  - `Calendars.Read` - Calendar access

**Admin consent:** Required for organizational email access

**Setup guide:** See `../setup/azure-ad-setup.md`

### Configuration Values

Required from Azure AD:
- **Tenant ID:** Found in Azure AD overview
- **Client ID:** Found in app registration overview
- **Redirect URI:** Must match app registration exactly

**Where to use:** Environment variables (`.env` file)

---

## Token Management

### Token Storage

**Access token:**
- Stored in memory only
- Never persisted to disk
- Expires after 1 hour
- Refreshed automatically

**Refresh token:**
- Stored securely on disk
- Used to get new access tokens
- Expires after 90 days (default)
- User must re-authenticate after expiration

**Storage location:**
- macOS: `~/.msgraph-mcp/tokens.json`
- Windows: `%USERPROFILE%\.msgraph-mcp\tokens.json`
- Linux: `~/.msgraph-mcp/tokens.json`

**File permissions:** 600 (owner read/write only)

### Token Refresh Strategy

**Proactive refresh:**
- Check token expiration before each API call
- Refresh if < 5 minutes remaining
- Prevents mid-request expiration

**Retry on 401:**
- If API returns 401 Unauthorized
- Attempt token refresh
- Retry original request once
- If still fails, prompt user to re-authenticate

### Token Expiration Handling

**Access token expired:**
- Automatic refresh using refresh token
- Transparent to user
- No re-authentication needed

**Refresh token expired:**
- User must re-authenticate
- Open browser for new consent flow
- New tokens issued

**Both expired:**
- Same as refresh token expired
- Clear stored tokens
- Start fresh authentication

---

## Security Considerations

### Credentials Protection

**Never commit to git:**
- `.env` file in `.gitignore`
- `tokens.json` never created in repo
- No secrets in source code

**Environment variables only:**
- `TENANT_ID` from environment
- `CLIENT_ID` from environment
- `USER_EMAIL` from environment (optional)

**Secure storage:**
- Token file permissions restricted
- No tokens in logs or errors
- Memory cleared on process exit

### Principle of Least Privilege

**Request minimal permissions:**
- Phase 1: Only `Mail.Read` and `User.Read`
- Add permissions only when features require them
- Avoid `*. ReadWrite.All` unless necessary

**Scope limitations:**
- User can only access their own mailbox
- No cross-user access
- Organization-only (no guest accounts)

### Token Rotation

**Regular rotation:**
- Access tokens expire hourly (forced rotation)
- Refresh tokens expire after 90 days
- Re-authentication required periodically

**Revocation:**
- User can revoke access via Azure AD
- Tokens immediately invalid
- Server handles gracefully (prompts re-auth)

---

## Related Documentation

**Setup:**
- `../setup/azure-ad-setup.md` - How to create app registration
- `../setup/configuration.md` - Environment variable setup

**Architecture:**
- `overview.md` - System architecture and components

**Troubleshooting:**
- `../reference/troubleshooting.md` - Common auth issues

**External:**
- [Microsoft Graph Authentication](https://docs.microsoft.com/en-us/graph/auth/)
- [Azure AD OAuth 2.0](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)

---

**Last Updated:** 2025-10-31
