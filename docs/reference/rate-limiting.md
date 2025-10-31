# Rate Limiting

**Type:** Concept (Reference)
**Purpose:** Understand and handle Microsoft Graph API throttling
**Audience:** Developers implementing retry logic

---

## Table of Contents

- [Overview](#overview)
- [Throttling Limits](#throttling-limits)
- [Detection](#detection)
- [Handling Strategy](#handling-strategy)
- [Related Documentation](#related-documentation)

---

## Overview

### What is Rate Limiting?

**Rate limiting** = Microsoft Graph restricts number of API calls per time period

**Why:** Protect service availability and performance

**Impact:** Requests exceeding limit are rejected with 429 status code

### When It Happens

**Common scenarios:**
- Batch operations (many entities)
- Rapid sequential calls
- Large result sets with pagination
- Multiple concurrent users (if scaled)

**Unlikely scenarios:**
- Single user, normal use
- Well-designed batching
- Reasonable result limits

---

## Throttling Limits

### Per-User Limits

**Graph API throttling is per-user:**
- Each user has independent quota
- MsGraph-Mcp uses delegated permissions (user context)
- Limits apply to the authenticated user's account

### Approximate Limits

**Microsoft doesn't publish exact numbers, but approximately:**

| Resource | Requests/Second | Requests/Minute |
|----------|-----------------|-----------------|
| Mail | 10,000 | 60,000 |
| Calendar | 10,000 | 60,000 |
| Overall | 2,000 | 10,000 |

**Note:** These are approximate and subject to change

### Batch Request Limits

**Batch-specific limits:**
- Max 20 requests per batch call
- Max 4 batch calls per second
- Each request in batch counts toward quota

**Effective rate:** 80 individual requests per second via batching

---

## Detection

### HTTP 429 Response

**Status code:** `429 Too Many Requests`

**Response headers:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 5
```

**Response body:**
```json
{
  "error": {
    "code": "TooManyRequests",
    "message": "Rate limit is exceeded. Try again in X seconds.",
    "innerError": {
      "date": "2025-10-31T10:15:00",
      "request-id": "abc123..."
    }
  }
}
```

### Retry-After Header

**Purpose:** Tells you how long to wait before retrying

**Format:** Seconds (integer)

**Example:** `Retry-After: 5` means wait 5 seconds

**Important:** Always respect this value (don't retry immediately)

---

## Handling Strategy

### Exponential Backoff

**Pattern for retries:**

```
Attempt 1: Immediate
Attempt 2: Wait 1 second
Attempt 3: Wait 2 seconds
Attempt 4: Wait 4 seconds
Attempt 5: Wait 8 seconds
Attempt 6: Fail (give up)
```

**Benefit:** Gradually increases wait time, avoids hammering API

### Implementation

**Pseudocode:**
```typescript
async function callGraphAPIWithRetry(apiCall, maxRetries = 3) {
  let attempt = 0;
  let delay = 1000;  // Start with 1 second

  while (attempt < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.statusCode === 429) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error('Max retries exceeded');
        }

        // Use Retry-After header if available
        const retryAfter = error.headers['retry-after'];
        const waitTime = retryAfter ? retryAfter * 1000 : delay;

        console.log(`Rate limited. Retrying in ${waitTime}ms...`);
        await sleep(waitTime);

        // Exponential backoff
        delay *= 2;
      } else {
        // Not a rate limit error, don't retry
        throw error;
      }
    }
  }
}
```

### Best Practices

**Do:**
- Respect `Retry-After` header
- Use exponential backoff
- Limit retry attempts (3-5 max)
- Log retry events
- Return clear error after max retries

**Don't:**
- Retry immediately
- Ignore `Retry-After` header
- Retry indefinitely
- Retry non-429 errors (e.g., 401, 404)

### Preventive Measures

**Design to avoid throttling:**

**1. Use batching**
- Combine multiple queries into one batch request
- Reduces total API call count

**2. Implement caching**
- Cache frequently accessed data (user info, folder IDs)
- Avoid redundant API calls

**3. Use pagination wisely**
- Set reasonable `$top` limits (50-100)
- Don't request huge result sets

**4. Parallel vs Sequential**
- Batch requests are parallel by design
- But don't send 100 batch requests simultaneously

**5. Rate limit client-side**
- Optionally implement client-side throttling
- E.g., max 5 batch requests per second

---

## Related Documentation

**Reference:**
- `graph-api-notes.md` - Batch request details
- `troubleshooting.md` - Other API errors

**Architecture:**
- `../architecture/overview.md` - Batching strategy

**Development:**
- `../development/adding-tools.md` - Implement retry logic in new tools

**External:**
- [Microsoft Graph Throttling Guidance](https://docs.microsoft.com/en-us/graph/throttling)
- [Best practices for discovering files and detecting changes](https://docs.microsoft.com/en-us/graph/best-practices-concept)

---

**Last Updated:** 2025-10-31
