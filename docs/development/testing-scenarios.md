# Testing Scenarios

**Type:** Reference
**Purpose:** Comprehensive test scenarios for all MCP tools

---

## Email Search Scenarios

### Scenario 1: Batch Entity Search

**Input:**
```json
{
  "entities": ["Company A", "Company B", "Company C", ...50 companies],
  "keywords": ["cancel", "churn", "terminate"]
}
```

**Expected:**
- All 50 companies processed
- Results grouped by company
- Batch API used (not 50 sequential calls)
- Response under 10,000 tokens
- Execution time <5 seconds

**Test:**
```typescript
it('should batch process 50 entities efficiently', async () => {
  const entities = Array(50).fill(0).map((_, i) => `Company${i}`);
  const result = await searchEmailsByEntities({ entities, keywords: ['cancel'] });

  expect(Object.keys(result)).toHaveLength(50);
  expect(JSON.stringify(result).length / 4).toBeLessThan(10000);
});
```

---

### Scenario 2: Date Range Filtering

**Input:**
```json
{
  "query": "from:CompanyA",
  "dateRange": {
    "start": "2025-10-01",
    "end": "2025-10-31"
  }
}
```

**Expected:**
- Only emails from date range returned
- Dates validated before API call
- No results outside range
- KQL query includes date filter

**Test:**
```typescript
it('should filter by date range correctly', async () => {
  const result = await searchEmails({
    query: 'from:CompanyA',
    dateRange: { start: '2025-10-01', end: '2025-10-31' }
  });

  result.emails.forEach(email => {
    const date = new Date(email.receivedDate);
    expect(date >= new Date('2025-10-01')).toBe(true);
    expect(date <= new Date('2025-10-31')).toBe(true);
  });
});
```

---

### Scenario 3: Folder-Specific Search

**Input:**
```json
{
  "query": "subject:invoice",
  "folderId": "inbox-important"
}
```

**Expected:**
- Results only from specified folder
- Other folders ignored
- Folder ID validated before search

**Test:**
```typescript
it('should search only in specified folder', async () => {
  const result = await searchEmails({
    query: 'subject:invoice',
    folderId: 'inbox-important'
  });

  result.emails.forEach(email => {
    expect(email.parentFolderId).toBe('inbox-important');
  });
});
```

---

### Scenario 4: Zero Matches

**Input:**
```json
{
  "entities": ["NonExistentCompany"],
  "keywords": ["xyz123"]
}
```

**Expected:**
- Returns `{ matchCount: 0, emails: [] }`
- No error thrown
- Handles gracefully

**Test:**
```typescript
it('should handle zero matches gracefully', async () => {
  const result = await searchEmailsByEntities({
    entities: ['NonExistentCompany'],
    keywords: ['xyz123']
  });

  expect(result.NonExistentCompany).toEqual({
    matchCount: 0,
    emails: []
  });
});
```

---

### Scenario 5: Large Result Set

**Input:**
```json
{
  "query": "from:busydomain.com"
}
```

**Expected:**
- Returns top N (e.g., 10) most recent
- Sorted by date descending
- Doesn't exceed token limit
- Pagination available if needed

**Test:**
```typescript
it('should limit large result sets', async () => {
  const result = await searchEmails({ query: 'from:busydomain.com' });

  expect(result.emails.length).toBeLessThanOrEqual(10);

  // Verify descending order
  for (let i = 0; i < result.emails.length - 1; i++) {
    const current = new Date(result.emails[i].receivedDate);
    const next = new Date(result.emails[i + 1].receivedDate);
    expect(current >= next).toBe(true);
  }
});
```

---

## Authentication Scenarios

### Scenario 1: First-Time Authentication

**Flow:**
1. Server starts
2. No tokens stored
3. Browser opens for OAuth
4. User grants consent
5. Tokens stored
6. Server ready

**Test:**
```typescript
it('should handle first-time authentication', async () => {
  await clearStoredTokens();
  const server = await startServer();

  expect(server.authState).toBe('authenticated');
  expect(await getStoredTokens()).toBeDefined();
});
```

---

### Scenario 2: Token Refresh

**Flow:**
1. Access token expired
2. Refresh token valid
3. Automatic refresh occurs
4. New access token acquired
5. API call succeeds

**Test:**
```typescript
it('should refresh expired access token', async () => {
  await setExpiredAccessToken();

  const result = await listMailFolders();

  expect(result.folders).toBeDefined();
  expect(getAccessToken()).not.toBe(oldAccessToken);
});
```

---

### Scenario 3: Refresh Token Expired

**Flow:**
1. Both tokens expired
2. API call fails with 401
3. User prompted to re-authenticate
4. Browser opens for OAuth
5. New tokens acquired

**Test:**
```typescript
it('should handle expired refresh token', async () => {
  await setExpiredTokens();

  await expect(listMailFolders()).rejects.toThrow('Authentication required');

  // User re-authenticates
  await reauthenticate();

  const result = await listMailFolders();
  expect(result.folders).toBeDefined();
});
```

---

## Error Handling Scenarios

### Scenario 1: Rate Limiting

**Trigger:** Make many requests quickly

**Expected:**
- 429 error detected
- Automatic retry with exponential backoff
- Eventually succeeds OR clear error after max retries

**Test:**
```typescript
it('should handle rate limiting with retry', async () => {
  server.use(
    rest.get('*/messages', (req, res, ctx) => {
      return res.once(
        ctx.status(429),
        ctx.set('Retry-After', '1')
      );
    })
  );

  const result = await searchEmails({ query: 'test' });
  expect(result).toBeDefined();
});
```

---

### Scenario 2: Invalid Parameters

**Input:** Invalid date format, missing required fields

**Expected:**
- Validation error before API call
- Clear error message
- No Graph API call made

**Test:**
```typescript
it('should validate parameters before API call', async () => {
  await expect(
    searchEmails({ query: '', dateRange: { start: 'invalid-date' } })
  ).rejects.toThrow('Invalid date format');
});
```

---

### Scenario 3: Network Failure

**Trigger:** Disconnect network or timeout

**Expected:**
- Connection error detected
- Retry attempted with backoff
- Clear error message if all retries fail

**Test:**
```typescript
it('should handle network failures', async () => {
  server.use(
    rest.get('*/messages', (req, res) => {
      return res.networkError('Failed to connect');
    })
  );

  await expect(searchEmails({ query: 'test' })).rejects.toThrow('Network error');
});
```

---

## Related Documentation

- `testing.md` - Strategy overview
- `testing-implementation.md` - How to write tests
- `testing-manual.md` - Manual testing procedures

---

**Last Updated:** 2025-10-31
