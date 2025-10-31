# Troubleshooting

**Type:** Concept (Reference)
**Purpose:** Common issues and solutions for MsGraph-Mcp
**Audience:** Users and developers resolving problems

---

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [API Errors](#api-errors)
- [Configuration Problems](#configuration-problems)
- [Performance Issues](#performance-issues)
- [Related Documentation](#related-documentation)

---

## Authentication Issues

### Error: "401 Unauthorized"

**Symptom:** API calls fail with 401 status code

**Common causes:**
1. Access token expired
2. Refresh token expired
3. Invalid credentials in configuration
4. Permissions revoked by admin
5. Azure AD app misconfigured

**Solutions:**

**Step 1: Check token status**
```bash
# Delete tokens to force re-authentication
rm ~/.msgraph-mcp/tokens.json
npm start
```

**Step 2: Verify credentials**
- Check `.env` file has correct TENANT_ID and CLIENT_ID
- Verify values match Azure AD app registration
- Ensure no extra spaces or quotes

**Step 3: Re-authenticate**
- Server will open browser for new OAuth flow
- Sign in and grant permissions
- Verify redirect succeeds

**Step 4: Check Azure AD app**
- Permissions still granted?
- App not disabled?
- Redirect URI correct?

### Error: "Browser doesn't open for authentication"

**Symptom:** Server starts but browser never opens

**Common causes:**
1. Port 3000 already in use
2. Firewall blocking localhost
3. No default browser configured
4. Running in headless environment

**Solutions:**

**Check port availability:**
```bash
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

**Use different port:**
```env
# .env file
REDIRECT_PORT=8080
```

**Note:** Must also update Azure AD app redirect URI

**Manual authentication:**
- Server will print URL to console
- Copy URL and paste into browser manually
- Complete OAuth flow
- Server will detect and proceed

### Error: "Consent required"

**Symptom:** Browser shows consent screen every time

**Cause:** Refresh token not being stored or retrieved

**Solutions:**

**Check token storage location:**
```bash
ls -la ~/.msgraph-mcp/tokens.json
```

**Verify file permissions:**
```bash
chmod 600 ~/.msgraph-mcp/tokens.json
```

**Check token expiration:**
- Refresh tokens expire after 90 days (default)
- Must re-authenticate periodically

---

## API Errors

### Error: "404 Not Found"

**Symptom:** API call fails with 404

**Common causes:**
1. Invalid message ID
2. Message was deleted
3. Incorrect folder ID
4. Wrong API endpoint

**Solutions:**

**Verify message exists:**
```
GET /me/messages/{message-id}
```

**Check folder path:**
```
GET /me/mailFolders
```

**Verify endpoint URL:**
- Check for typos in API path
- Ensure using /v1.0 not /beta (unless intentional)

### Error: "429 Too Many Requests"

**Symptom:** API calls fail with 429 status code

**Cause:** Rate limiting triggered

**Solution:** See `rate-limiting.md` for detailed handling

**Quick fix:**
- Server should automatically retry with backoff
- If persists, reduce batch size or call frequency

### Error: "403 Forbidden"

**Symptom:** API call fails with 403

**Common causes:**
1. Missing API permission
2. Admin consent not granted
3. Attempting to access other user's data
4. Organizational policy restriction

**Solutions:**

**Check API permissions:**
1. Go to Azure portal
2. App registration → API permissions
3. Verify `Mail.Read` and `User.Read` present
4. Check consent status

**Grant admin consent:**
- Click "Grant admin consent for [Org]"
- Requires admin privileges

**Verify mailbox access:**
- Ensure accessing own mailbox (not other user's)
- MsGraph-Mcp uses delegated permissions (user context)

### Error: "500 Internal Server Error"

**Symptom:** API call fails with 500

**Cause:** Microsoft Graph API service issue

**Solution:**
- Transient error, retry
- Check [Microsoft 365 Service Health](https://status.office365.com)
- Wait and retry later

---

## Configuration Problems

### Error: "Environment variable not set"

**Symptom:** Server fails to start, mentions missing variable

**Cause:** Required environment variables not configured

**Solution:**

**Check .env file exists:**
```bash
ls .env
```

**Verify all required variables present:**
```env
TENANT_ID=...
CLIENT_ID=...
USER_EMAIL=...
```

**Check for typos:**
- Variable names are case-sensitive
- `TENANT_ID` not `TENNANT_ID` or `tenant_id`

**Ensure no extra quotes:**
```env
# Correct
TENANT_ID=abc123

# Incorrect
TENANT_ID="abc123"
```

### Error: "Invalid redirect URI"

**Symptom:** OAuth flow fails at redirect

**Cause:** Redirect URI mismatch between code and Azure AD

**Solution:**

**Verify redirect URI in code:**
- Default: `http://localhost:3000/auth/callback`
- If customized: Check `REDIRECT_PORT` in .env

**Verify redirect URI in Azure AD:**
1. Azure portal → App registration
2. Authentication → Platform configurations
3. Redirect URIs must include: `http://localhost:3000/auth/callback`
4. If using custom port, update Azure AD to match

**Important:** Must be exact match (including http/https, port, path)

### Error: "Module not found"

**Symptom:** Server fails to start, can't find module

**Cause:** Dependencies not installed or build not run

**Solution:**

**Install dependencies:**
```bash
npm install
```

**Build project:**
```bash
npm run build
```

**Check dist/ folder exists:**
```bash
ls dist/
```

**Verify no errors during build:**
- Check for TypeScript compilation errors
- Fix any type errors or import issues

---

## Performance Issues

### Slow API Responses

**Symptom:** Searches take 10+ seconds

**Common causes:**
1. Large result sets
2. Sequential calls instead of batching
3. Network latency
4. Complex queries

**Solutions:**

**Use batching:**
- Ensure using `search_emails_by_entities` for multiple entities
- Don't call `search_emails` sequentially

**Limit results:**
- Set reasonable `maxResultsPerEntity` (e.g., 10)
- Use pagination if needed

**Optimize queries:**
- Use `$select` to limit fields returned
- Use `$search` instead of `$filter` when possible

**Check network:**
```bash
ping graph.microsoft.com
```

### High Token Usage

**Symptom:** Conversation context fills up quickly

**Causes:**
1. Returning full email bodies
2. Too many results per query
3. Not using summarization

**Solutions:**

**Use summary mode (default):**
- Don't request full emails unless necessary
- Use `get_email` sparingly

**Limit results:**
- Reduce `maxResultsPerEntity`
- Show top N most relevant

**Drill-down pattern:**
- Show summaries first
- User requests details if needed

---

## Related Documentation

**Setup:**
- `../setup/prerequisites.md` - System requirements
- `../setup/azure-ad-setup.md` - Azure AD configuration
- `../setup/configuration.md` - Environment variables

**Reference:**
- `graph-api-notes.md` - API details
- `rate-limiting.md` - Throttling handling

**Integration:**
- `../integration/claude-code-setup.md` - MCP configuration issues

**External:**
- [Microsoft Graph Error Codes](https://docs.microsoft.com/en-us/graph/errors)
- [Microsoft 365 Service Health](https://status.office365.com)

---

**Last Updated:** 2025-10-31
