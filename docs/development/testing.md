# Testing

**Type:** Procedure
**Purpose:** Testing strategies for MsGraph-Mcp development
**Audience:** Developers implementing and validating functionality

---

## Table of Contents

- [Testing Approach](#testing-approach)
- [Manual Testing](#manual-testing)
- [Automated Testing](#automated-testing)
- [Test Scenarios](#test-scenarios)
- [Related Documentation](#related-documentation)

---

## Testing Approach

### Current State (Phase 1)

**Manual testing only**
- Test via Claude Code conversations
- Verify tool responses manually
- Check Graph API calls in logs

**Why manual initially:**
- Rapid prototyping phase
- Small codebase
- Complex authentication flow
- Real M365 data testing needed

### Future State (Phase 2+)

**Automated testing planned:**
- Unit tests for utility functions
- Integration tests with mocked Graph API
- End-to-end tests with test tenant

**Testing pyramid:**
```
    ┌─────────┐
    │   E2E   │  ← Few: Full conversation flows
    ├─────────┤
    │  Integ  │  ← Some: Tool handlers with mocked API
    ├─────────┤
    │  Unit   │  ← Many: Utilities, validation, processing
    └─────────┘
```

---

## Manual Testing

### Setup Testing Environment

**Step 1: Configure test environment**
```bash
# Use separate .env for testing (optional)
cp .env .env.test
```

**Modify `.env.test` if needed:**
```env
LOG_LEVEL=debug  # Enable detailed logging
USER_EMAIL=test-user@tbg.com  # Test account
```

**Step 2: Start server**
```bash
npm run build
npm start
```

**Step 3: Configure Claude Code**
- See `../integration/claude-code-setup.md`
- Point to your local MCP server

### Manual Test Workflow

**For each tool:**

**1. Test happy path**
```
User: "List my mailbox folders"
Expected: Returns folder structure
Verify: Correct folders, counts, hierarchy
```

**2. Test edge cases**
```
User: "Search emails from 50 companies mentioning 'cancel'"
Expected: Batch processing, grouped results
Verify: All companies processed, correct grouping
```

**3. Test error cases**
```
User: "Get email with ID 'invalid'"
Expected: Error message explaining issue
Verify: Graceful error handling, no crash
```

**4. Test parameter validation**
```
User: "List upcoming events for -5 days"
Expected: Error about invalid parameter
Verify: Validation message is clear
```

### Verification Checklist

**For each test:**
- [ ] Tool invoked correctly by Claude
- [ ] Parameters passed as expected
- [ ] Graph API called with correct query
- [ ] Results formatted properly
- [ ] Token usage reasonable (check conversation context)
- [ ] Error handling works
- [ ] Logs show expected flow

### Logging for Testing

**Enable debug logging:**
```env
LOG_LEVEL=debug
```

**What to check in logs:**
- Authentication flow
- Graph API requests
- Batch operations
- Error conditions
- Token refresh events
- Rate limiting

**Log format:**
```
[2025-10-31T10:15:00Z] DEBUG: Calling Graph API: GET /me/messages
[2025-10-31T10:15:01Z] INFO: Returned 5 results
[2025-10-31T10:15:01Z] DEBUG: Token usage: ~500 tokens
```

---

## Automated Testing

### Unit Tests (Future)

**Test utilities in isolation:**

**Example: Result processor tests**
```typescript
describe('resultProcessor', () => {
  describe('summarizeEmail', () => {
    it('should extract key fields', () => {
      const fullEmail = { /* full email object */ };
      const summary = summarizeEmail(fullEmail);

      expect(summary).toHaveProperty('messageId');
      expect(summary).toHaveProperty('subject');
      expect(summary).not.toHaveProperty('body');  // Excluded
    });

    it('should limit snippet to 100 chars', () => {
      const longEmail = { body: 'x'.repeat(500) };
      const summary = summarizeEmail(longEmail);

      expect(summary.snippet.length).toBeLessThanOrEqual(100);
    });
  });
});
```

**Test framework:** Jest (planned)

**Run tests:**
```bash
npm test
```

### Integration Tests (Future)

**Test tool handlers with mocked Graph API:**

**Example: Search tool test**
```typescript
describe('searchEmails tool', () => {
  let mockClient: jest.Mocked<Client>;

  beforeEach(() => {
    mockClient = createMockGraphClient();
  });

  it('should search with correct query', async () => {
    mockClient.api().get.mockResolvedValue({
      value: [{ /* email data */ }]
    });

    await searchEmails(mockClient, {
      query: 'subject:test'
    });

    expect(mockClient.api).toHaveBeenCalledWith(
      '/me/messages?$search="subject:test"'
    );
  });

  it('should handle rate limiting', async () => {
    mockClient.api().get.mockRejectedValue({
      statusCode: 429,
      message: 'Rate limited'
    });

    await expect(
      searchEmails(mockClient, { query: 'test' })
    ).rejects.toThrow('Rate limited');
  });
});
```

### End-to-End Tests (Future)

**Test full conversation flows:**

**Example: Cancellation detection scenario**
```typescript
describe('Cancellation detection E2E', () => {
  it('should find cancellation signals across multiple companies', async () => {
    // 1. Start MCP server
    const server = await startTestServer();

    // 2. Send tool call
    const response = await server.callTool('mcp__msgraph__search_emails_by_entities', {
      entities: ['Company A', 'Company B'],
      keywords: ['cancel', 'termination']
    });

    // 3. Verify response structure
    expect(response).toHaveProperty('Company A');
    expect(response).toHaveProperty('Company B');

    // 4. Verify data quality
    expect(response['Company A'].emails[0]).toHaveProperty('messageId');

    // 5. Stop server
    await server.stop();
  });
});
```

**Requirements:**
- Test M365 tenant
- Test account with sample data
- Isolated from production

---

## Test Scenarios

### Email Search Tools

**Scenario 1: Batch entity search**
```
Input: 50 companies, keywords: ["cancel", "churn"]
Expected:
- All 50 companies processed
- Results grouped by company
- Batch API used (not 50 sequential calls)
- Response under 10,000 tokens
```

**Scenario 2: Date range filtering**
```
Input: Search last 30 days
Expected:
- Only emails from date range returned
- Dates validated correctly
- No results outside range
```

**Scenario 3: Folder-specific search**
```
Input: Search only "Inbox/Important" folder
Expected:
- Results only from specified folder
- Other folders ignored
- Folder path validated
```

**Scenario 4: Zero matches**
```
Input: Search for entity with no emails
Expected:
- Returns { matchCount: 0 }
- No error thrown
- Handles gracefully
```

**Scenario 5: Large result set**
```
Input: Search entity with 1000+ matching emails
Expected:
- Returns top N (e.g., 10) most recent
- Sorted by date descending
- Doesn't exceed token limit
```

### Authentication

**Scenario 1: First-time auth**
```
Flow:
1. Server starts
2. No tokens stored
3. Browser opens for OAuth
4. User grants consent
5. Tokens stored
6. Server ready
```

**Scenario 2: Token refresh**
```
Flow:
1. Access token expired
2. Refresh token valid
3. Automatic refresh occurs
4. New access token acquired
5. API call succeeds
```

**Scenario 3: Refresh token expired**
```
Flow:
1. Both tokens expired
2. API call fails with 401
3. User prompted to re-authenticate
4. Browser opens for OAuth
5. New tokens acquired
```

### Error Handling

**Scenario 1: Rate limiting**
```
Trigger: Make many requests quickly
Expected:
- 429 error detected
- Automatic retry with backoff
- Eventually succeeds
- OR: Returns clear error to user
```

**Scenario 2: Invalid parameters**
```
Input: Invalid date format
Expected:
- Validation error before API call
- Clear error message
- No Graph API call made
```

**Scenario 3: Network failure**
```
Trigger: Disconnect network
Expected:
- Connection error detected
- Retry attempted
- Clear error message if all retries fail
```

---

## Related Documentation

**Development:**
- `getting-started.md` - Dev environment setup
- `adding-tools.md` - Creating new tools to test

**Integration:**
- `../integration/claude-code-setup.md` - MCP configuration for testing
- `../integration/usage-examples.md` - Test scenarios

**Reference:**
- `../reference/troubleshooting.md` - Common issues during testing

---

**Last Updated:** 2025-10-31
