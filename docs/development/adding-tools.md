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
2. Implement handler function
3. Register tool in index.ts
4. Test manually

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

### Step 4: Test Tool

**Build:**
```bash
npm run build
```

**Start server:**
```bash
npm start
```

**Test in Claude Code:**
1. Start conversation
2. Ask: "What meetings do I have this week?"
3. Claude should invoke `mcp__msgraph__list_upcoming_events`
4. Verify results are correct

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
