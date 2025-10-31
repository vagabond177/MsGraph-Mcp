# Tools Overview

**Type:** Command (Reference)
**Purpose:** Catalog of all available MCP tools
**Audience:** Users and AI agents using MsGraph-Mcp

---

## Table of Contents

- [Available Tools](#available-tools)
- [Tool Naming Convention](#tool-naming-convention)
- [Common Parameters](#common-parameters)
- [Related Documentation](#related-documentation)

---

## Available Tools

### Phase 1: Email Search

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `mcp__msgraph__search_emails_by_entities` | Batch search by company/entity names | Entity list, keywords | Grouped summaries |
| `mcp__msgraph__search_emails` | General email search | KQL query | Email list |
| `mcp__msgraph__get_email` | Read specific email | Message ID | Full email |
| `mcp__msgraph__list_mail_folders` | List mailbox folders | (none) | Folder tree |

**Details:** See `email-search.md`

### Phase 4.5: Copilot Content Search

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `mcp__msgraph__search_content` | AI-powered content search | Natural language query | Relevance-ranked excerpts |

**Details:** See `copilot-search.md`
**Requirements:** Microsoft 365 Copilot license

### Phase 2: Tasks/Planner (Future)

| Tool | Purpose | Status |
|------|---------|--------|
| `mcp__msgraph__list_planner_tasks` | Get tasks from Planner | Planned |
| `mcp__msgraph__create_task` | Create new task | Planned |
| `mcp__msgraph__update_task` | Update task status | Planned |

### Phase 3: Calendar (Future)

| Tool | Purpose | Status |
|------|---------|--------|
| `mcp__msgraph__list_events` | Get calendar events | Planned |
| `mcp__msgraph__find_available_time` | Check availability | Planned |

### Phase 4: Teams (Future)

| Tool | Purpose | Status |
|------|---------|--------|
| `mcp__msgraph__search_teams_messages` | Search Teams chat/channels | Planned |
| `mcp__msgraph__get_team_channels` | List team channels | Planned |

### Phase 5: SharePoint (Future)

| Tool | Purpose | Status |
|------|---------|--------|
| `mcp__msgraph__get_document` | Download document | Planned |
| `mcp__msgraph__list_sites` | List SharePoint sites | Planned |

---

## Tool Naming Convention

### Pattern

```
mcp__msgraph__{action}_{resource}
```

**Examples:**
- `mcp__msgraph__search_emails` - Action: search, Resource: emails
- `mcp__msgraph__get_email` - Action: get, Resource: email
- `mcp__msgraph__list_mail_folders` - Action: list, Resource: mail_folders

### Actions

Common action verbs used:
- `search` - Query with filters, return multiple results
- `get` - Retrieve specific item by ID
- `list` - Enumerate items (all or filtered)
- `create` - Create new item (future)
- `update` - Modify existing item (future)
- `delete` - Remove item (future)

### Resources

Resources correspond to Microsoft Graph entities:
- `emails` / `email` - Email messages
- `mail_folders` - Mailbox folders
- `planner_tasks` / `task` - Planner tasks (future)
- `events` / `event` - Calendar events (future)
- `teams_messages` - Teams messages (future)
- `documents` / `document` - SharePoint files (future)

---

## Common Parameters

### Batch Operations

**Many tools support batch inputs:**
```typescript
{
  entities: string[]  // Array of entities to process
}
```

**Example:**
```json
{
  "entities": ["Company A", "Company B", "Company C"]
}
```

**Benefits:**
- Single API call instead of multiple
- Faster response time
- Token-efficient grouped results

### Date Ranges

**For time-filtered queries:**
```typescript
{
  startDate: string,  // ISO 8601: "2025-01-01"
  endDate: string     // ISO 8601: "2025-10-31"
}
```

**Optional:** If not specified, searches all time

### Result Limits

**Control result count:**
```typescript
{
  limit: number  // Max results to return (default varies by tool)
}
```

**Typical defaults:**
- Summary queries: 10 per entity
- List queries: 50 total
- Detail queries: N/A (returns single item)

### Return Modes

**Control response detail level:**
```typescript
{
  returnMode: "summary" | "detailed"
}
```

- `summary` - Minimal fields, token-optimized (default)
- `detailed` - More fields, still not full content

**Note:** Use `get_email` for full content

---

## Related Documentation

**Tool Details:**
- `email-search.md` - Email search tools reference

**Usage:**
- `../integration/usage-examples.md` - Common usage patterns

**Architecture:**
- `../architecture/token-efficiency.md` - Why summaries are default
- `../architecture/overview.md` - How tools fit into system

**Development:**
- `../development/adding-tools.md` - Create new tools

---

**Last Updated:** 2025-10-31
