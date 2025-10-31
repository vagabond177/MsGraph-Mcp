# Architecture Overview

**Type:** Context
**Purpose:** Understand system design and component interactions
**Audience:** Developers and AI agents needing system context

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Component Responsibilities](#component-responsibilities)
- [Data Flow](#data-flow)
- [Design Decisions](#design-decisions)
- [Related Documentation](#related-documentation)

---

## System Architecture

```
┌─────────────────────────────────────────┐
│      Claude Code Conversation           │
│   (User asks questions about email)     │
└──────────────────┬──────────────────────┘
                   │
                   │ MCP Protocol
                   │ Tool Calls
                   ↓
┌─────────────────────────────────────────┐
│        MsGraph-Mcp Server               │
│  ┌──────────────────────────────────┐   │
│  │  Tool Router                     │   │
│  │  - search_emails_by_entities     │   │
│  │  - search_emails                 │   │
│  │  - get_email                     │   │
│  │  - list_mail_folders             │   │
│  └──────────────┬───────────────────┘   │
│                 │                        │
│  ┌──────────────▼───────────────────┐   │
│  │  Graph API Client                │   │
│  │  - Batching                      │   │
│  │  - Rate limiting                 │   │
│  │  - Retry logic                   │   │
│  └──────────────┬───────────────────┘   │
│                 │                        │
│  ┌──────────────▼───────────────────┐   │
│  │  Result Processor                │   │
│  │  - Filtering                     │   │
│  │  - Summarization                 │   │
│  │  - Token optimization            │   │
│  └──────────────────────────────────┘   │
└──────────────────┬──────────────────────┘
                   │
                   │ Microsoft Graph API
                   │ HTTPS/OAuth 2.0
                   ↓
┌─────────────────────────────────────────┐
│     Microsoft Graph API                 │
│  ┌────────┐ ┌────────┐ ┌─────────────┐ │
│  │Exchange│ │Planner │ │  Calendar   │ │
│  │(Email) │ │(Tasks) │ │  (Future)   │ │
│  └────────┘ └────────┘ └─────────────┘ │
└─────────────────────────────────────────┘
```

---

## Component Responsibilities

### MCP Server (Node.js/TypeScript)

**Entry point:** `src/index.ts`

**Responsibilities:**
- Register MCP tools with Claude Code
- Route tool calls to appropriate handlers
- Manage authentication state
- Return structured responses

**Key modules:**
- `src/tools/` - Tool implementations
- `src/auth/` - Authentication logic
- `src/utils/` - Shared utilities

### Authentication Layer

**Location:** `src/auth/graphAuth.ts`

**Responsibilities:**
- OAuth 2.0 flow implementation
- Token acquisition and refresh
- Credential storage
- Token expiration handling

**Details:** See `authentication.md`

### Graph API Client

**Location:** `src/utils/graphClient.ts`

**Responsibilities:**
- Initialize Microsoft Graph client
- Batch multiple requests
- Handle rate limiting (429 responses)
- Implement retry with exponential backoff
- Cache frequently accessed data

**Details:** See `../reference/rate-limiting.md`

### Result Processor

**Location:** `src/utils/resultProcessor.ts`

**Responsibilities:**
- Filter results by relevance
- Summarize email content (not full text)
- Extract key fields (date, subject, participants)
- Optimize for token efficiency

**Details:** See `token-efficiency.md`

### Tool Handlers

**Location:** `src/tools/mail/`

**Responsibilities:**
- Implement specific MCP tool logic
- Validate input parameters
- Call Graph API client
- Process and return results

**Details:** See `../tools/email-search.md`

---

## Data Flow

### Example: Search Emails by Entities

**User request:** "For companies A, B, C, check my email for cancellation signals"

**Flow:**
```
1. Claude Code → MCP call
   mcp__msgraph__search_emails_by_entities({
     entities: ["Company A", "Company B", "Company C"],
     keywords: ["cancel", "cancellation", "terminate"]
   })

2. MCP Server → Tool handler
   tools/mail/searchByEntities.ts

3. Tool handler → Graph API Client
   - Batch 3 searches into single API call
   - Apply KQL query: from:(CompanyA) AND (cancel OR cancellation)

4. Graph API Client → Microsoft Graph
   POST /v1.0/$batch
   { requests: [search1, search2, search3] }

5. Microsoft Graph → Results
   Returns email metadata for matches

6. Result Processor → Summarization
   - Keep: date, subject, sender, snippet
   - Discard: full body, attachments
   - Group by entity

7. MCP Server → Claude Code
   {
     "Company A": { match_count: 2, latest_date: "...", emails: [...] },
     "Company B": { match_count: 0 },
     "Company C": { match_count: 1, latest_date: "...", emails: [...] }
   }

8. Claude Code → User
   Natural language summary of findings
```

**Token impact:** ~500 tokens vs ~50,000 if full emails returned

---

## Design Decisions

### Decision: MCP Architecture vs PowerShell Scripts

**Chosen:** MCP server architecture

**Rationale:**
- Token efficiency (process server-side, return summaries)
- Reusability (available in all Claude Code conversations)
- Real-time (interactive queries during conversations)
- Scalability (handles batching, rate limiting internally)

**Trade-off:** PowerShell scripts better for scheduled/batch operations (e.g., nightly sync)

**Context:** See `../../Ideas/In Planning/M365 Integration/Integration Strategy.md` in TBG workspace

### Decision: Batch Operations First-Class

**Chosen:** All tools support batch/multiple inputs

**Rationale:**
- Primary use case: search 50+ companies at once
- Graph API supports batching (up to 20 requests)
- Dramatically reduces round-trips
- Better token efficiency

**Implementation:** Tools accept array inputs, handle internally

### Decision: Read-Only Initially (Phase 1)

**Chosen:** Email search tools are read-only

**Rationale:**
- Reduces complexity and risk
- No conflict resolution needed
- Faster time-to-value
- Can add write operations later

**Future:** Phase 2+ may add email sending, task creation, etc.

### Decision: Result Summarization Required

**Chosen:** Never return full email bodies

**Rationale:**
- Full email = 1000-5000 tokens each
- Summaries = 50-100 tokens each
- User can request specific email if needed
- Maintains conversation context budget

**Implementation:** `resultProcessor.ts` enforces summarization

---

## Related Documentation

**Architecture:**
- `authentication.md` - OAuth 2.0 flow details
- `token-efficiency.md` - Summarization strategies

**Implementation:**
- `../development/adding-tools.md` - How to add new tools
- `../reference/graph-api-notes.md` - Graph API specifics
- `../reference/rate-limiting.md` - Handling throttling

**Project Context:**
- TBG M365 Integration Strategy: `../../../OneDrive - Knowspro LLC/TBG Exec/Ideas/In Planning/M365 Integration/Integration Strategy.md`

---

**Last Updated:** 2025-10-31
