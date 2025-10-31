# Email Search Tools

**Type:** Command (Reference)
**Purpose:** Detailed reference for email search MCP tools
**Audience:** Users and AI agents performing email searches

---

## Table of Contents

- [search_emails_by_entities](#search_emails_by_entities)
- [search_emails](#search_emails)
- [get_email](#get_email)
- [list_mail_folders](#list_mail_folders)
- [Related Documentation](#related-documentation)

---

## search_emails_by_entities

### Purpose

Batch search emails for multiple companies/entities with specific keywords. Optimized for token efficiency with grouped, summarized results.

**Primary use case:** "Check email for references to these 50 companies mentioning cancellation"

### Parameters

```typescript
{
  entities: string[],           // Required: Company/entity names to search
  keywords: string[],           // Required: Keywords to match (OR logic)
  startDate?: string,           // Optional: ISO 8601 date (e.g., "2025-01-01")
  endDate?: string,             // Optional: ISO 8601 date (e.g., "2025-10-31")
  maxResultsPerEntity?: number, // Optional: Max emails per entity (default: 10)
  folders?: string[],           // Optional: Limit to specific folders (default: all)
  returnMode?: "summary" | "detailed"  // Optional: (default: "summary")
}
```

### Example Usage

```json
{
  "entities": ["Acme Corp", "TechVentures Inc", "Bay Area Solutions"],
  "keywords": ["cancel", "cancellation", "terminate", "end contract"],
  "startDate": "2025-01-01",
  "endDate": "2025-10-31",
  "maxResultsPerEntity": 5
}
```

### Response Format

```typescript
{
  "Acme Corp": {
    matchCount: 2,
    latestDate: "2025-10-15",
    emails: [
      {
        messageId: "AAMkAG...",
        receivedDateTime: "2025-10-15T14:30:00Z",
        subject: "Contract renewal discussion",
        from: "john@acmecorp.com",
        snippet: "We're considering cancellation of our subscription...",
        hasAttachments: false,
        importance: "normal"
      },
      {
        messageId: "AAMkAH...",
        receivedDateTime: "2025-10-10T09:15:00Z",
        subject: "Service feedback",
        from: "jane@acmecorp.com",
        snippet: "...contract termination clause...",
        hasAttachments: true,
        importance: "high"
      }
    ]
  },
  "TechVentures Inc": {
    matchCount: 0
  },
  "Bay Area Solutions": {
    matchCount: 1,
    latestDate: "2025-10-28",
    emails: [ ... ]
  }
}
```

### Behavior

**Matching logic:**
- Searches: subject, body, sender domain
- Entity match: Exact phrase or domain match
- Keywords: OR logic (any keyword matches)
- Case insensitive

**Sorting:**
- Results sorted by received date (newest first)
- Only most recent N per entity returned

**Token efficiency:**
- ~100 tokens per email summary
- ~50 tokens for zero-match entities
- Typical: 50 entities = 5,000 tokens

### Error Handling

**Partial failures:**
```json
{
  "Acme Corp": { matchCount: 2, emails: [...] },
  "TechVentures Inc": { error: "Rate limited, retry in 5s" },
  "Bay Area Solutions": { matchCount: 1, emails: [...] }
}
```

**Complete failure:**
- Returns error with details
- Suggests retry or check connectivity

---

## search_emails

### Purpose

General email search with flexible query syntax. Use for ad-hoc searches not requiring batch processing.

### Parameters

```typescript
{
  query: string,          // Required: KQL search query
  folder?: string,        // Optional: Folder name or ID
  startDate?: string,     // Optional: ISO 8601 date
  endDate?: string,       // Optional: ISO 8601 date
  limit?: number,         // Optional: Max results (default: 50)
  orderBy?: "receivedDateTime" | "subject" | "from",  // Optional: (default: receivedDateTime)
  orderDirection?: "asc" | "desc"  // Optional: (default: desc)
}
```

### Example Usage

**Simple search:**
```json
{
  "query": "subject:proposal from:john@acme.com"
}
```

**Complex search:**
```json
{
  "query": "(cancel OR terminate) AND hasAttachment:true",
  "startDate": "2025-09-01",
  "limit": 25
}
```

### KQL Query Syntax

**Field-specific searches:**
- `subject:keyword` - Search subject line
- `from:email` - Search sender
- `to:email` - Search recipients
- `body:keyword` - Search body text
- `hasAttachment:true` - Has attachments

**Operators:**
- `AND` - Both conditions
- `OR` - Either condition
- `NOT` - Exclude
- `()` - Grouping

**Examples:**
- `from:acme.com AND subject:invoice`
- `(cancel OR terminate) NOT resolved`
- `hasAttachment:true AND receivedDateTime>=2025-10-01`

### Response Format

```typescript
{
  matchCount: number,
  emails: [
    {
      messageId: string,
      receivedDateTime: string,
      subject: string,
      from: string,
      to: string[],
      cc: string[],
      snippet: string,
      hasAttachments: boolean,
      importance: string
    }
  ]
}
```

---

## get_email

### Purpose

Retrieve full content of a specific email message. Use after summary search to drill down into details.

**Use case:** "Show me the full email with ID AAMkAG..."

### Parameters

```typescript
{
  messageId: string,      // Required: Email message ID
  includeBody?: boolean,  // Optional: Include full body (default: true)
  includeAttachments?: boolean,  // Optional: Include attachment metadata (default: true)
  bodyFormat?: "text" | "html"  // Optional: (default: "text")
}
```

### Example Usage

```json
{
  "messageId": "AAMkAGVkOTI...",
  "includeBody": true,
  "bodyFormat": "text"
}
```

### Response Format

```typescript
{
  messageId: string,
  receivedDateTime: string,
  subject: string,
  from: {
    name: string,
    email: string
  },
  to: [{ name: string, email: string }],
  cc: [{ name: string, email: string }],
  body: string,  // Full email body
  bodyPreview: string,
  hasAttachments: boolean,
  attachments: [
    {
      id: string,
      name: string,
      contentType: string,
      size: number,
      isInline: boolean
    }
  ],
  importance: string,
  isRead: boolean,
  flag: { flagStatus: string }
}
```

**Token cost:** 1,000-5,000 tokens (depends on email length)

---

## list_mail_folders

### Purpose

List all mailbox folders and their structure. Useful for limiting searches to specific folders.

### Parameters

```typescript
{
  includeSubfolders?: boolean,  // Optional: Include nested folders (default: true)
  includeMessageCount?: boolean  // Optional: Include message counts (default: true)
}
```

### Example Usage

```json
{
  "includeSubfolders": true,
  "includeMessageCount": true
}
```

### Response Format

```typescript
{
  folders: [
    {
      id: string,
      displayName: string,
      parentFolderId: string | null,
      childFolderCount: number,
      unreadItemCount: number,
      totalItemCount: number,
      childFolders: [ ... ]  // Nested folders
    }
  ]
}
```

**Example:**
```json
{
  "folders": [
    {
      "id": "AAMkAG...",
      "displayName": "Inbox",
      "parentFolderId": null,
      "childFolderCount": 3,
      "unreadItemCount": 45,
      "totalItemCount": 523,
      "childFolders": [
        {
          "displayName": "Important",
          "totalItemCount": 87
        }
      ]
    }
  ]
}
```

---

## Related Documentation

**Overview:**
- `overview.md` - All available tools

**Usage:**
- `../integration/usage-examples.md` - Common email search patterns

**Architecture:**
- `../architecture/token-efficiency.md` - Why summaries vs full content
- `../architecture/overview.md` - How search tools work

**Reference:**
- `../reference/graph-api-notes.md` - Graph API specifics
- `../reference/rate-limiting.md` - Handling API throttling

---

**Last Updated:** 2025-10-31
