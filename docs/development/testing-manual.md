# Manual Testing Procedures

**Type:** Procedure
**Purpose:** Manual testing workflows for real-world validation

---

## Setup Test Environment

Create test environment file:
```bash
cp .env .env.test
```

Modify `.env.test`:
```env
LOG_LEVEL=debug
USER_EMAIL=test-user@tbg.com
```

Start server:
```bash
npm run build
npm start
```

---

## Test Workflow

**For each MCP tool:**

**1. Happy path:**
```
Input: "List my mailbox folders"
Expected: Folder structure with names, counts
Verify: Correct hierarchy, accurate counts
```

**2. Edge cases:**
```
Input: "Search emails from 50 companies for 'cancel'"
Expected: Batch processing, grouped results
Verify: All companies processed, correct grouping
```

**3. Error handling:**
```
Input: "Get email with ID 'invalid-id'"
Expected: Clear error message
Verify: Graceful failure, no crash
```

**4. Parameter validation:**
```
Input: Invalid date format in query
Expected: Validation error before API call
Verify: Clear error message, no API call made
```

---

## Verification Checklist

**For each test:**
- [ ] Tool invoked correctly by Claude
- [ ] Parameters passed as expected
- [ ] Graph API called with correct query
- [ ] Results formatted properly
- [ ] Token usage reasonable (<10k tokens)
- [ ] Error handling works
- [ ] Logs show expected flow

---

## Debug Logging

Enable debug mode in `.env`:
```env
LOG_LEVEL=debug
```

**Monitor logs for:**
- Authentication flow (token acquisition/refresh)
- Graph API requests (endpoints, query parameters)
- Batch operations (request grouping)
- Error conditions (status codes, messages)
- Rate limiting (429 responses, retry logic)

**Log format:**
```
[2025-10-31T10:15:00Z] DEBUG: Calling Graph API: GET /me/messages
[2025-10-31T10:15:01Z] INFO: Returned 5 results
[2025-10-31T10:15:01Z] DEBUG: Token usage: ~500 tokens
```

---

## Test Scenarios

**Email search:**
```
1. Search single entity, single keyword
2. Search multiple entities, multiple keywords
3. Search with date range filter
4. Search specific folder
5. Search with zero results
6. Search with large result set (>100 emails)
```

**Authentication:**
```
1. First-time auth (browser opens, consent granted)
2. Token refresh (expired access token)
3. Re-authentication (expired refresh token)
```

**Error handling:**
```
1. Rate limiting (429 error, retry logic)
2. Invalid parameters (validation before API call)
3. Network failure (retry with backoff)
4. Invalid authentication (clear error message)
```

---

## Performance Validation

**Token efficiency:**
```bash
# Get response size
response=$(echo "$mcp_response" | wc -c)
tokens=$((response / 4))  # Rough estimate

# Should be <10k tokens for batch search
echo "Estimated tokens: $tokens"
```

**Response time:**
```bash
# Time MCP call
time npm run test:e2e
```

**Expected performance:**
- Single email search: <500ms
- Batch search (10 entities): <2s
- Batch search (50 entities): <5s

---

## Integration with Claude Code

**Configure MCP in Claude Code** (see `../integration/claude-code-setup.md`)

**Test in conversation:**
```
User: "Search my email for Company A mentioning 'cancellation'"
Claude: [Invokes mcp__msgraph__search_emails]
Result: [Verify response structure and content]
```

**Verify:**
- Tool discovered by Claude Code
- Parameters passed correctly
- Response formatted for conversation
- Error messages are user-friendly

---

## Related Documentation

- `testing.md` - Strategy overview
- `testing-scenarios.md` - Detailed test scenarios
- `../integration/claude-code-setup.md` - MCP configuration

---

**Last Updated:** 2025-10-31
