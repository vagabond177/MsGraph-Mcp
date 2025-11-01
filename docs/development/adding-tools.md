# Adding New Tools

**Type:** Procedure
**Purpose:** Step-by-step guide for creating new MCP tools
**Audience:** Developers extending MsGraph-Mcp functionality

---

## Table of Contents

- [Overview](#overview)
- [Tool Creation Process](#tool-creation-process)
- [Implementation Steps](#implementation-steps)
- [Best Practices](#best-practices)
- [Related Documentation](#related-documentation)

---

## Overview

### What is an MCP Tool?

**MCP tool** = Function callable by Claude Code during conversations

**Components:**
1. **Tool definition** - Name, description, parameters
2. **Handler function** - Implementation logic
3. **Registration** - Register with MCP server

### Example: New Calendar Tool

**Goal:** Create tool to list upcoming meetings

**Tool name:** `mcp__msgraph__list_upcoming_events`

**Parameters:** `{ days: number }`

**Returns:** Array of calendar events

---

## Tool Creation Process

### Phase 1: Plan

**Questions to answer:**
1. What problem does this solve?
2. What inputs are needed?
3. What output format?
4. Which Graph API endpoint(s)?
5. Token efficiency strategy?

**Example (calendar tool):**
1. Problem: User wants to see upcoming meetings
2. Inputs: Number of days ahead
3. Output: Summarized event list (date, title, participants)
4. Endpoint: `/me/calendar/calendarView`
5. Strategy: Return summaries, not full event details

### Phase 2: Implement

**Steps:**
1. Create tool file
2. Write tests (TDD approach)
3. Implement handler function
4. Register tool in index.ts
5. Add required Azure AD permissions (automated)
6. Test with MCP verification
7. Verify tool appears in Claude Code

### Phase 3: Document

**Add documentation:**
1. Update `../tools/overview.md` - Add to tool list
2. Create detailed reference (e.g., `../tools/calendar.md`)
3. Add usage examples to `../integration/usage-examples.md`

---

## Implementation Steps

### Step 1: Create Tool File

**Location:** `src/tools/[category]/[toolName].ts`

**Example:** `src/tools/calendar/listUpcomingEvents.ts`

**Template:**
```typescript
import { Client } from '@microsoft/microsoft-graph-client';

export interface ListUpcomingEventsParams {
  days?: number;  // Optional: defaults to 7
}

export interface EventSummary {
  id: string;
  subject: string;
  start: string;
  end: string;
  attendees: string[];
  location: string;
}

export async function listUpcomingEvents(
  client: Client,
  params: ListUpcomingEventsParams
): Promise<EventSummary[]> {
  // Implementation here
}
```

### Step 2: Implement Handler Logic

**Pattern:**
```typescript
export async function listUpcomingEvents(
  client: Client,
  params: ListUpcomingEventsParams
): Promise<EventSummary[]> {
  // 1. Extract and validate parameters
  const days = params.days ?? 7;
  if (days < 1 || days > 90) {
    throw new Error('days must be between 1 and 90');
  }

  // 2. Calculate date range
  const startDateTime = new Date().toISOString();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  const endDateTime = endDate.toISOString();

  // 3. Call Graph API
  const response = await client
    .api('/me/calendar/calendarView')
    .query({
      startDateTime,
      endDateTime,
      $select: 'subject,start,end,attendees,location',
      $orderby: 'start/dateTime'
    })
    .get();

  // 4. Process and summarize results
  const events: EventSummary[] = response.value.map((event: any) => ({
    id: event.id,
    subject: event.subject,
    start: event.start.dateTime,
    end: event.end.dateTime,
    attendees: event.attendees.map((a: any) => a.emailAddress.address),
    location: event.location?.displayName || 'No location'
  }));

  // 5. Return token-efficient result
  return events.slice(0, 50);  // Limit results
}
```

### Step 3: Register Tool

**File:** `src/index.ts`

**Add import:**
```typescript
import { listUpcomingEvents } from './tools/calendar/listUpcomingEvents.js';
```

**Add tool definition:**
```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ... existing tools ...
      {
        name: 'mcp__msgraph__list_upcoming_events',
        description: 'List upcoming calendar events for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            days: {
              type: 'number',
              description: 'Number of days ahead to search (1-90, default: 7)',
              minimum: 1,
              maximum: 90
            }
          }
        }
      }
    ]
  };
});
```

**Add handler:**
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Get authenticated Graph client
  const client = await getGraphClient();

  switch (name) {
    // ... existing cases ...

    case 'mcp__msgraph__list_upcoming_events':
      const events = await listUpcomingEvents(client, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(events, null, 2)
          }
        ]
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

### Step 4: Add Required Azure AD Permissions

**CRITICAL:** Before testing, ensure your tool has the required Microsoft Graph API permissions.

**Automatic permission setup (RECOMMENDED):**

```bash
# Get CLIENT_ID from .env file
CLIENT_ID=$(grep CLIENT_ID .env | cut -d '=' -f2)

# Add required permissions using Azure CLI
# Example: Adding Calendar.Read delegated permission
az ad app permission add \
  --id $CLIENT_ID \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions a87076cf-6abd-4600-8e08-d2ce87f0a0df=Scope

# Grant admin consent
az ad app permission admin-consent --id $CLIENT_ID
```

**Common Graph API permission IDs:**
- `Mail.Read` - `810c84a8-4a9e-49e8-ab7b-73bbca54f2e5`
- `Mail.Read.Shared` - `7b9103a5-4610-446b-9670-80643382c1fa`
- `Mail.Send` - `e383f46e-2787-4529-855e-0e479a3ffac0`
- `Mail.Send.Shared` - `a367ab51-6b49-43bf-a716-a1fb06d2a174`
- `Calendars.Read` - `465a38f9-76ea-45b9-9f34-9e8b0d4b0b42`
- `Calendars.Read.Shared` - `2b9c4092-424d-4249-948d-b43879977640`
- `Files.Read.All` - `df85f4d6-205c-4ac5-a5ea-6bf408dba283`
- `Sites.Read.All` - `205e70e5-aba6-4c52-a976-6d2d46c48043`

**Find permission IDs:**
```bash
# Search for a permission by name
az ad sp show --id 00000003-0000-0000-c000-000000000000 \
  --query "oauth2PermissionScopes[?contains(value, 'Calendar')].{Permission:value, ID:id}" \
  -o table
```

**Update .env documentation:**
After adding permissions, update the `.env` file's permission list to document what's granted.

**Update src/utils/config.ts:**
Add the new scope to the scopes array if it's a new permission category:
```typescript
scopes: [
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Calendars.Read', // NEW
  'offline_access',
],
```

---

### Step 5: Test Tool with MCP Verification

**Build and run:**
```bash
npm run build
npm start
```

**REQUIRED: Verify MCP tool registration:**

Use the MCP server's own tools to verify registration:
```bash
# In a new terminal, use mcp-client to test
npx @modelcontextprotocol/inspector

# OR test directly with Claude Code:
# 1. Open Claude Code
# 2. Run: "List all available MCP tools from msgraph-mcp"
# 3. Verify your new tool appears in the list
```

**Manual testing in Claude Code:**
1. Restart Claude Code (to pick up new server changes)
2. Start conversation
3. Ask: "What meetings do I have this week?"
4. Claude should invoke `mcp__msgraph__list_upcoming_events`
5. Verify results are correct and token-efficient

**Automated verification (best practice):**
```bash
# Write an integration test that verifies tool is registered
npm test -- --testPathPattern=integration
```

---

## Best Practices

### Token Efficiency

**Always:**
- Return summaries, not full objects
- Use `$select` to limit fields from Graph API
- Set reasonable result limits
- Group related data

**Example:**
```typescript
// ❌ Bad: Returns full event objects (500+ tokens each)
const response = await client.api('/me/events').get();
return response.value;

// ✅ Good: Returns summaries (50-100 tokens each)
const response = await client
  .api('/me/events')
  .select('subject,start,end')
  .top(50)
  .get();
return response.value.map(summarize);
```

### Error Handling

**Handle Graph API errors:**
```typescript
try {
  const response = await client.api('/me/events').get();
  return processResponse(response);
} catch (error: any) {
  if (error.statusCode === 429) {
    // Rate limited
    throw new Error('Rate limited. Please retry in a few seconds.');
  } else if (error.statusCode === 401) {
    // Authentication failed
    throw new Error('Authentication failed. Please re-authenticate.');
  } else {
    // Other error
    throw new Error(`Graph API error: ${error.message}`);
  }
}
```

### Input Validation

**Always validate parameters:**
```typescript
export async function myTool(client: Client, params: MyParams) {
  // Validate required fields
  if (!params.requiredField) {
    throw new Error('requiredField is required');
  }

  // Validate ranges
  if (params.number && (params.number < 1 || params.number > 100)) {
    throw new Error('number must be between 1 and 100');
  }

  // Validate formats
  if (params.date && !isValidISODate(params.date)) {
    throw new Error('date must be ISO 8601 format');
  }

  // ... proceed with implementation
}
```

### Batch Operations

**Support batch inputs when possible:**
```typescript
export interface MyToolParams {
  entities: string[];  // Array input for batch processing
}

export async function myTool(client: Client, params: MyToolParams) {
  // Use Graph API $batch endpoint
  const batchRequests = params.entities.map((entity, index) => ({
    id: String(index),
    method: 'GET',
    url: `/search?query=${entity}`
  }));

  const batchResponse = await client
    .api('/$batch')
    .post({ requests: batchRequests });

  // Process batch responses
  return processBatchResults(batchResponse);
}
```

**Benefits:**
- Faster (parallel processing)
- Fewer API calls
- Better token efficiency (grouped results)

### Documentation

**Include in tool definition:**
```typescript
{
  name: 'mcp__msgraph__my_tool',
  description: 'Clear, concise description of what this tool does. Include primary use case.',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Detailed description of this parameter, including format and examples'
      }
    },
    required: ['param1']
  }
}
```

---

## Related Documentation

**Development:**
- `getting-started.md` - Dev environment setup
- `testing.md` - Testing strategies

**Architecture:**
- `../architecture/overview.md` - System design
- `../architecture/token-efficiency.md` - Optimization strategies

**Reference:**
- `../reference/graph-api-notes.md` - Graph API specifics
- `../reference/rate-limiting.md` - Handling throttling

**Tools:**
- `../tools/overview.md` - Update with new tool
- `../tools/email-search.md` - Example implementations

---

**Last Updated:** 2025-10-31
