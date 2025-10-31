# Testing Implementation Guide

**Type:** Procedure
**Purpose:** Write tests using TDD approach

---

## TDD Workflow

**Red-Green-Refactor cycle:**

**1. Write failing test:**
```typescript
// tests/unit/utils/batching.test.ts
describe('createBatchRequest', () => {
  it('should group requests into batches of 20', () => {
    const requests = Array(50).fill({ url: '/test' });
    const batches = createBatchRequest(requests);

    expect(batches).toHaveLength(3);  // 20 + 20 + 10
    expect(batches[0]).toHaveLength(20);
    expect(batches[2]).toHaveLength(10);
  });
});
```

**2. Run test (fails):**
```bash
npm run test:watch
```

**3. Implement minimum code:**
```typescript
// src/utils/batching.ts
export function createBatchRequest(requests: any[]) {
  const BATCH_SIZE = 20;
  const batches = [];

  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    batches.push(requests.slice(i, i + BATCH_SIZE));
  }

  return batches;
}
```

**4. Run test (passes)**

**5. Refactor if needed**

**6. Add edge cases:**
```typescript
it('should handle empty array', () => {
  expect(createBatchRequest([])).toEqual([]);
});

it('should handle single item', () => {
  expect(createBatchRequest([{url: '/'}])).toEqual([[{url: '/'}]]);
});
```

---

## Test Structure Patterns

### Unit Tests

**Purpose:** Test individual functions in isolation

**Characteristics:**
- < 1ms execution
- No I/O operations
- Mock all dependencies
- Single assertion focus

**Example: Result Processor**
```typescript
// tests/unit/utils/resultProcessor.test.ts
describe('resultProcessor', () => {
  describe('summarizeEmail', () => {
    it('should extract only key fields', () => {
      const fullEmail = {
        id: 'msg-123',
        subject: 'Test',
        from: { emailAddress: { address: 'test@example.com' } },
        body: { content: 'Large HTML body...' }
      };

      const summary = summarizeEmail(fullEmail);

      expect(summary).toMatchObject({
        messageId: 'msg-123',
        subject: 'Test',
        from: 'test@example.com'
      });
      expect(summary).not.toHaveProperty('body');
    });

    it('should limit snippet to 100 chars', () => {
      const email = { id: 'msg-456', bodyPreview: 'x'.repeat(500) };
      expect(summarizeEmail(email).snippet.length).toBeLessThanOrEqual(100);
    });

    it('should handle missing fields', () => {
      const minimalEmail = { id: 'msg-789' };
      expect(() => summarizeEmail(minimalEmail)).not.toThrow();
    });
  });
});
```

### Integration Tests

**Purpose:** Test component interactions with mocked external services

**Characteristics:**
- 10-100ms execution
- Mock external APIs
- Test data flow
- Multiple components

**Example: Email Search Tool**
```typescript
// tests/integration/tools/searchEmails.test.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { searchEmails } from '@/tools/mail/searchEmails';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('searchEmails (integration)', () => {
  it('should construct correct KQL query', async () => {
    server.use(
      rest.get('https://graph.microsoft.com/v1.0/me/messages', (req, res, ctx) => {
        const search = req.url.searchParams.get('$search');
        expect(search).toBe('"subject:test"');

        return res(ctx.json({
          value: [
            { id: 'msg-1', subject: 'Test 1' },
            { id: 'msg-2', subject: 'Test 2' }
          ]
        }));
      })
    );

    const result = await searchEmails({ query: 'subject:test' });

    expect(result.emails).toHaveLength(2);
  });

  it('should handle rate limiting with retry', async () => {
    let attemptCount = 0;

    server.use(
      rest.get('https://graph.microsoft.com/v1.0/me/messages', (req, res, ctx) => {
        attemptCount++;

        if (attemptCount === 1) {
          return res(
            ctx.status(429),
            ctx.set('Retry-After', '1'),
            ctx.json({ error: { message: 'Rate limited' } })
          );
        }

        return res(ctx.json({ value: [] }));
      })
    );

    await expect(searchEmails({ query: 'test' })).resolves.toBeDefined();
    expect(attemptCount).toBe(2);
  });

  it('should batch multiple entity searches', async () => {
    server.use(
      rest.post('https://graph.microsoft.com/v1.0/$batch', async (req, res, ctx) => {
        const body = await req.json();

        expect(body.requests).toHaveLength(3);

        return res(ctx.json({
          responses: body.requests.map((r, i) => ({
            id: r.id,
            status: 200,
            body: { value: [{ id: `msg-${i}` }] }
          }))
        }));
      })
    );

    const result = await searchEmailsByEntities({
      entities: ['CompanyA', 'CompanyB', 'CompanyC'],
      keywords: ['cancel']
    });

    expect(result).toHaveProperty('CompanyA');
    expect(result).toHaveProperty('CompanyB');
    expect(result).toHaveProperty('CompanyC');
  });
});
```

### E2E Tests

**Purpose:** Test complete MCP workflows

**Characteristics:**
- 100-1000ms execution
- Full server lifecycle
- Minimal mocking
- Real-world scenarios

**Example: Cancellation Detection**
```typescript
// tests/e2e/email-search-scenarios.test.ts
describe('Email Search E2E', () => {
  let server;

  beforeAll(async () => { server = await startTestServer(); });
  afterAll(async () => { await stopTestServer(server); });

  it('should detect cancellation signals across companies', async () => {
    const response = await callMcpTool('mcp__msgraph__search_emails_by_entities', {
      entities: ['Company A', 'Company B', 'Company C'],
      keywords: ['cancel', 'cancellation']
    });

    expect(response).toHaveProperty('Company A');
    expect(response).toHaveProperty('Company B');

    if (response['Company A'].matchCount > 0) {
      expect(response['Company A'].emails[0]).toMatchObject({
        messageId: expect.any(String),
        subject: expect.any(String)
      });
    }

    // Verify token efficiency
    expect(JSON.stringify(response).length / 4).toBeLessThan(10000);
  });
});
```

---

## Mock Graph API

**Use MSW (Mock Service Worker) for integration tests:**

**Setup in test file:**
```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Mock specific endpoints:**
```typescript
server.use(
  rest.get('https://graph.microsoft.com/v1.0/me/messages', (req, res, ctx) => {
    return res(ctx.json({
      value: [/* mock data */]
    }));
  }),

  rest.post('https://graph.microsoft.com/v1.0/$batch', async (req, res, ctx) => {
    const body = await req.json();
    return res(ctx.json({
      responses: body.requests.map(r => ({
        id: r.id,
        status: 200,
        body: { value: [] }
      }))
    }));
  })
);
```

**Mock error responses:**
```typescript
server.use(
  rest.get('https://graph.microsoft.com/v1.0/me/messages', (req, res, ctx) => {
    return res(
      ctx.status(429),
      ctx.set('Retry-After', '2'),
      ctx.json({ error: { message: 'Rate limited' } })
    );
  })
);
```

---

## Test Helpers

**Create reusable test utilities:**

**tests/helpers/mockGraphClient.ts:**
```typescript
export function createMockGraphClient() {
  return {
    api: jest.fn().mockReturnThis(),
    get: jest.fn(),
    post: jest.fn(),
    // ... other methods
  };
}
```

**tests/helpers/fixtures.ts:**
```typescript
export function createMockEmail(overrides = {}) {
  return {
    id: 'msg-123',
    subject: 'Test Email',
    from: { emailAddress: { address: 'test@example.com' } },
    receivedDateTime: '2025-10-31T10:00:00Z',
    bodyPreview: 'Test preview',
    ...overrides
  };
}

export function createMockBatchResponse(requests) {
  return {
    responses: requests.map((r, i) => ({
      id: r.id,
      status: 200,
      body: { value: [createMockEmail({ id: `msg-${i}` })] }
    }))
  };
}
```

---

## Testing Checklist

**Before implementing module:**
- [ ] Create test file in appropriate directory
- [ ] Write failing test for core functionality
- [ ] Implement minimum code to pass
- [ ] Add edge case tests
- [ ] Add error handling tests
- [ ] Verify coverage meets threshold (80%+)

**Test quality checks:**
- [ ] Tests are independent (no shared state)
- [ ] Tests are deterministic (no randomness)
- [ ] Clear test names (describe what, not how)
- [ ] Single assertion per test (or related assertions)
- [ ] Mock external dependencies
- [ ] Clean up after tests (afterEach/afterAll)

---

## Related Documentation

- `testing.md` - Strategy overview
- `testing-setup.md` - Framework configuration
- `testing-scenarios.md` - Specific test scenarios
- `testing-metrics.md` - Coverage requirements

---

**Last Updated:** 2025-10-31
