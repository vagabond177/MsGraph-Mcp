# Token Efficiency

**Type:** Context
**Purpose:** Understand token optimization strategies
**Audience:** AI agents and developers implementing result processing

---

## Table of Contents

- [The Problem](#the-problem)
- [Solution Strategy](#solution-strategy)
- [Summarization Approach](#summarization-approach)
- [Batching Strategy](#batching-strategy)
- [Related Documentation](#related-documentation)

---

## The Problem

### Email Search Without Optimization

**Scenario:** Search 50 companies for cancellation signals

**Naive approach:**
```
1. Search each company sequentially (50 API calls)
2. Return full email bodies to Claude Code
3. Let Claude Code analyze in conversation
```

**Token cost:**
- Average email: 1000-3000 tokens (body + metadata)
- 50 companies × 3 emails each = 150 emails
- 150 emails × 2000 tokens = **300,000 tokens**
- Exceeds typical conversation context limit

**Problems:**
- Conversation context exhausted
- Slow (50 sequential API calls)
- Expensive (Graph API throttling)
- Information overload (Claude must parse all)

### Goal: Intelligent Filtering and Summarization

**What we need:**
- Process emails server-side
- Return only relevant summaries
- Batch API calls
- Keep total response under 5,000 tokens

---

## Solution Strategy

### Four-Layer Optimization

**Layer 1: Batching** - Reduce API calls
- Combine 50 searches into 3 batch requests
- Graph API supports up to 20 requests per batch
- Parallel processing, faster response

**Layer 2: Server-side filtering** - Reduce data volume
- Apply filters before returning to Claude
- Only return emails matching keywords
- Discard irrelevant results immediately

**Layer 3: Field selection** - Minimal metadata
- Extract only: date, subject, sender, snippet
- Discard: full body, headers, attachments
- Reduce per-email tokens from 2000 to 100

**Layer 4: Intelligent summarization** - Contextual compression
- Group by entity (company)
- Aggregate statistics (count, date range)
- Provide drill-down IDs for details

**Result:** 50 companies × 100 tokens = **5,000 tokens** (60x improvement)

---

## Summarization Approach

### Email Summary Format

**For each matching email:**
```typescript
{
  messageId: string,        // For drill-down via get_email
  receivedDateTime: string, // ISO 8601 format
  subject: string,          // Full subject line
  from: string,             // Sender email/name
  snippet: string,          // First 100 chars of body
  hasAttachments: boolean,  // Quick flag
  importance: string        // normal|low|high
}
```

**Token cost:** ~100 tokens per email

### Entity-Grouped Results

**For batch searches:**
```typescript
{
  "Company A": {
    matchCount: 2,
    latestDate: "2025-10-28",
    emails: [
      { messageId, receivedDateTime, subject, from, snippet, ... },
      { ... }
    ]
  },
  "Company B": {
    matchCount: 0
  },
  "Company C": {
    matchCount: 5,
    latestDate: "2025-10-30",
    emails: [ ... ]  // Top 5 most recent
  }
}
```

**Benefits:**
- Claude sees overview first
- Zero-match companies indicated clearly
- Can request details for specific messages
- User gets actionable insights immediately

### Drill-Down Pattern

**Two-phase approach:**

**Phase 1: Summary query**
```
User: "Check email for cancellation signals in these 50 companies"
→ Returns: Summaries (5,000 tokens)
→ Claude: "3 companies have concerning emails: A, C, G"
```

**Phase 2: Detail query (if needed)**
```
User: "Show me the full email from Company A on 2025-10-28"
→ Tool: mcp__msgraph__get_email({ messageId: "..." })
→ Returns: Full email (2,000 tokens) for just that one
```

**Token efficiency:** Only pay for details when needed

---

## Batching Strategy

### Graph API Batch Requests

**Endpoint:** `POST /v1.0/$batch`

**Format:**
```json
{
  "requests": [
    {
      "id": "1",
      "method": "GET",
      "url": "/me/messages?$search=\"from:CompanyA AND cancel\""
    },
    {
      "id": "2",
      "method": "GET",
      "url": "/me/messages?$search=\"from:CompanyB AND cancel\""
    }
    // ... up to 20 requests
  ]
}
```

**Limits:**
- Max 20 requests per batch
- Max 4 batch requests per second
- Responses preserve request IDs

### Batching Implementation

**For 50 companies:**
```
1. Split into chunks of 20
   Chunk 1: Companies 1-20
   Chunk 2: Companies 21-40
   Chunk 3: Companies 41-50

2. Send 3 batch requests (parallel)
   All complete in ~2 seconds

3. Merge results
   Preserve company → emails mapping

4. Summarize and return
```

**Performance:** 3 API calls instead of 50 (16x reduction)

### Handling Batch Failures

**Partial failures:**
- Graph API returns 200 OK for batch
- Individual requests may fail (404, 429, etc.)
- Process successful responses
- Report failures separately

**Example:**
```typescript
{
  "Company A": { matchCount: 2, emails: [...] },
  "Company B": { error: "Rate limited, retry in 5s" },
  "Company C": { matchCount: 0 }
}
```

**Retry strategy:**
- Failed requests automatically retried
- Exponential backoff
- Max 3 retries per request

**Details:** See `../reference/rate-limiting.md`

---

## Related Documentation

**Architecture:**
- `overview.md` - System architecture and data flow
- `authentication.md` - OAuth 2.0 details

**Implementation:**
- `../tools/email-search.md` - Tool implementations using these strategies
- `../development/adding-tools.md` - Apply these patterns to new tools

**Reference:**
- `../reference/graph-api-notes.md` - Graph API specifics
- `../reference/rate-limiting.md` - Handling throttling

---

**Last Updated:** 2025-10-31
