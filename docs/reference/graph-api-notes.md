# Microsoft Graph API Notes

**Type:** Concept (Reference)
**Purpose:** Microsoft Graph API specifics for MsGraph-Mcp
**Audience:** Developers working with Graph API

---

## Table of Contents

- [API Basics](#api-basics)
- [Email/Mail Endpoints](#emailmail-endpoints)
- [Query Parameters](#query-parameters)
- [Batch Requests](#batch-requests)
- [Related Documentation](#related-documentation)

---

## API Basics

### Base URL

```
https://graph.microsoft.com/v1.0
```

**Alternative:** `/beta` endpoint for preview features (not used in Phase 1)

### Authentication

**Method:** OAuth 2.0 Bearer token

**Header:**
```
Authorization: Bearer {access-token}
```

**Token management:** Handled by `src/auth/graphAuth.ts`

### Common Response Format

```json
{
  "@odata.context": "...",
  "@odata.nextLink": "...",  // Pagination (if results exceed limit)
  "value": [
    { /* result objects */ }
  ]
}
```

### Pagination

**When response has more results:**
- `@odata.nextLink` property present
- Contains URL for next page
- Follow link to get additional results

**Implementation:**
```typescript
let allResults = [];
let nextLink = initialUrl;

while (nextLink) {
  const response = await client.api(nextLink).get();
  allResults.push(...response.value);
  nextLink = response['@odata.nextLink'];
}
```

---

## Email/Mail Endpoints

### List Messages

**Endpoint:** `GET /me/messages`

**Returns:** All messages in mailbox

**Query options:**
- `$filter` - Filter results
- `$search` - Full-text search
- `$select` - Choose fields
- `$orderby` - Sort results
- `$top` - Limit count
- `$skip` - Skip N results

**Example:**
```
GET /me/messages?$search="subject:invoice"&$select=subject,from&$top=10
```

### Get Specific Message

**Endpoint:** `GET /me/messages/{message-id}`

**Returns:** Full message object

**Useful properties:**
- `subject` - Email subject
- `body` - Email body (HTML or text)
- `from` - Sender
- `toRecipients` - Recipients
- `receivedDateTime` - When received
- `hasAttachments` - Boolean
- `attachments` - Attachment metadata

### Search Messages

**Endpoint:** `GET /me/messages?$search="query"`

**Query syntax:** Keyword Query Language (KQL)

**Examples:**
- `$search="from:john@acme.com"`
- `$search="subject:invoice"`
- `$search="hasAttachment:true"`
- `$search="(cancel OR terminate)"`

**Note:** $search uses server-side indexing (faster than $filter)

### List Folders

**Endpoint:** `GET /me/mailFolders`

**Returns:** Top-level folders

**Get subfolders:**
```
GET /me/mailFolders/{folder-id}/childFolders
```

**Get messages in folder:**
```
GET /me/mailFolders/{folder-id}/messages
```

### Calendar View

**Endpoint:** `GET /me/calendar/calendarView`

**Required query parameters:**
- `startDateTime` - ISO 8601 format
- `endDateTime` - ISO 8601 format

**Example:**
```
GET /me/calendar/calendarView?startDateTime=2025-11-01T00:00:00Z&endDateTime=2025-11-30T23:59:59Z
```

---

## Query Parameters

### $select

**Purpose:** Choose which fields to return

**Benefit:** Reduces payload size, faster response

**Syntax:**
```
$select=field1,field2,field3
```

**Example:**
```
GET /me/messages?$select=subject,from,receivedDateTime
```

**Returns only:** Selected fields (not full object)

### $filter

**Purpose:** Filter results by criteria

**Operators:**
- `eq` - Equals
- `ne` - Not equals
- `gt` - Greater than
- `lt` - Less than
- `and` - Logical AND
- `or` - Logical OR

**Example:**
```
$filter=receivedDateTime ge 2025-10-01T00:00:00Z and from/emailAddress/address eq 'john@acme.com'
```

### $search

**Purpose:** Full-text search

**KQL syntax:** See "Search Messages" above

**Limitation:** Not all properties are searchable

**Searchable fields:**
- subject
- body
- from
- to
- hasAttachment

### $orderby

**Purpose:** Sort results

**Syntax:**
```
$orderby=field asc|desc
```

**Example:**
```
$orderby=receivedDateTime desc
```

**Default:** Usually sorted by received date descending

### $top

**Purpose:** Limit result count

**Syntax:**
```
$top=N
```

**Example:**
```
$top=50
```

**Default:** 10 (varies by endpoint)

**Maximum:** Usually 999

### $skip

**Purpose:** Skip first N results (pagination)

**Syntax:**
```
$skip=N
```

**Example:**
```
$skip=50  // Get results 51-100
```

**Alternative:** Use `@odata.nextLink` for pagination

---

## Batch Requests

### Purpose

Execute multiple Graph API requests in single HTTP call.

**Benefits:**
- Reduce network round-trips
- Faster overall execution
- Better token efficiency in MCP context

### Endpoint

```
POST https://graph.microsoft.com/v1.0/$batch
```

### Request Format

```json
{
  "requests": [
    {
      "id": "1",
      "method": "GET",
      "url": "/me/messages?$search=\"from:acme.com\""
    },
    {
      "id": "2",
      "method": "GET",
      "url": "/me/messages?$search=\"from:techventures.com\""
    }
  ]
}
```

**Limits:**
- Max 20 requests per batch
- Requests executed in parallel
- Independent (no dependencies between requests)

### Response Format

```json
{
  "responses": [
    {
      "id": "1",
      "status": 200,
      "body": {
        "value": [ /* email results */ ]
      }
    },
    {
      "id": "2",
      "status": 200,
      "body": {
        "value": [ /* email results */ ]
      }
    }
  ]
}
```

**Note:** Each response has individual status code

### Handling Partial Failures

**Some requests may fail while others succeed:**

```json
{
  "responses": [
    {
      "id": "1",
      "status": 200,
      "body": { /* success */ }
    },
    {
      "id": "2",
      "status": 429,
      "body": {
        "error": {
          "code": "TooManyRequests",
          "message": "Rate limit exceeded"
        }
      }
    }
  ]
}
```

**Implementation:** Process successful responses, retry failed ones

---

## Related Documentation

**Architecture:**
- `../architecture/authentication.md` - OAuth 2.0 implementation
- `../architecture/token-efficiency.md` - Batching strategy

**Reference:**
- `rate-limiting.md` - Handling API throttling
- `troubleshooting.md` - Common API errors

**External:**
- [Microsoft Graph REST API Reference](https://docs.microsoft.com/en-us/graph/api/overview)
- [Query Parameters](https://docs.microsoft.com/en-us/graph/query-parameters)
- [Use query parameters](https://docs.microsoft.com/en-us/graph/use-query-parameters)
- [JSON Batching](https://docs.microsoft.com/en-us/graph/json-batching)

---

**Last Updated:** 2025-10-31
