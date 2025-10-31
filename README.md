# MsGraph-Mcp

Microsoft Graph MCP server for token-efficient M365 integration with Claude Code.

## Overview

This MCP server enables Claude Code to efficiently query Microsoft 365 services (email, calendar, tasks) without consuming excessive tokens. It provides intelligent cross-referencing between business data and M365 communications.

**Key Use Case:** Search mailbox for references to companies (e.g., from RTP benchmark results) with specific keywords like "cancellation" or "churn" in a token-efficient manner.

## Architecture

```
Claude Code Conversation
        ↓
MCP Tool Calls (e.g., mcp__msgraph__search_emails_by_entities)
        ↓
MsGraph-Mcp Server (Node.js/TypeScript)
        ├─ Authentication Layer (OAuth 2.0)
        ├─ Graph API Client (batching, rate limiting)
        ├─ Result Processor (summarization, filtering)
        └─ Tool Handlers (email, calendar, tasks...)
        ↓
Microsoft Graph API
        ↓
M365 Services (Exchange, Planner, Calendar, Teams, SharePoint)
```

## Available Tools

### Phase 1: Email Search Tools

- `mcp__msgraph__search_emails_by_entities` - Batch search by company/entity names
- `mcp__msgraph__search_emails` - General email search with KQL syntax
- `mcp__msgraph__get_email` - Read specific email by ID
- `mcp__msgraph__list_mail_folders` - List mailbox folder structure

### Phase 4.5: Copilot-Powered Content Search

- `mcp__msgraph__search_content` - Search across SharePoint, OneDrive using natural language (requires Copilot license)

## Future Phases

- **Phase 2:** Tasks/Planner integration
- **Phase 3:** Calendar access
- **Phase 5:** Teams integration

## Documentation

Comprehensive documentation is available in the `docs/` directory, optimized for AI consumption.

See `docs/README.md` for the documentation index.

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```env
TENANT_ID=your-tenant-id
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
USER_EMAIL=your-email@domain.com
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run
npm start
```

## Project Management

Project management and planning materials are maintained in the TBG Executive workspace:
- Location: `OneDrive/TBG Exec/Projects/Microsoft Graph MCP/`
- Tasks: See Tasks.md in project folder
- Documentation: See project README.md

## License

MIT
