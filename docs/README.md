# MsGraph-Mcp Documentation

**Type:** Overview
**Audience:** AI agents and human developers
**Purpose:** Navigation hub for MsGraph-Mcp documentation

---

## Table of Contents

- [Quick Start](#quick-start)
- [Documentation Structure](#documentation-structure)
- [Common Paths](#common-paths)
- [Related Documentation](#related-documentation)

---

## Quick Start

**For first-time setup:**
1. Read `setup/prerequisites.md` - System requirements
2. Follow `setup/azure-ad-setup.md` - Azure AD app registration
3. Configure `setup/configuration.md` - Environment variables

**For understanding the system:**
1. Read `architecture/overview.md` - System design
2. Read `architecture/token-efficiency.md` - Core optimization strategy

**For using the MCP server:**
1. Read `integration/claude-code-setup.md` - Install in Claude Code
2. Reference `tools/overview.md` - Available tools
3. See `integration/usage-examples.md` - Common scenarios

**For development:**
1. Read `development/getting-started.md` - Dev environment
2. Reference `development/adding-tools.md` - Extend functionality
3. See `development/testing.md` - Test strategies

---

## Documentation Structure

### Architecture (`architecture/`)
**Type:** Context (WHY and WHAT)

Understanding how the system works:
- `overview.md` - System architecture and design decisions
- `authentication.md` - OAuth 2.0 implementation details
- `token-efficiency.md` - Token optimization strategies

### Setup (`setup/`)
**Type:** Procedure (HOW to set up)

Getting the server running:
- `prerequisites.md` - Requirements and dependencies
- `azure-ad-setup.md` - Azure AD app registration steps
- `configuration.md` - Environment configuration

### Tools (`tools/`)
**Type:** Command/Reference (WHAT tools exist)

MCP tool catalog and usage:
- `overview.md` - All available tools summary
- `email-search.md` - Email search tools (Phase 1)
- _(Future: planner.md, calendar.md, teams.md, sharepoint.md)_

### Development (`development/`)
**Type:** Procedure (HOW to develop)

Extending and contributing:
- `getting-started.md` - Set up development environment
- `adding-tools.md` - Create new MCP tools
- `testing.md` - Testing approaches

### Integration (`integration/`)
**Type:** Procedure (HOW to use)

Using with Claude Code:
- `claude-code-setup.md` - Configure MCP in Claude Code
- `usage-examples.md` - Common usage patterns

### Reference (`reference/`)
**Type:** Concept (definitions and specifics)

Technical reference materials:
- `graph-api-notes.md` - Microsoft Graph API specifics
- `rate-limiting.md` - Throttling and retry strategies
- `troubleshooting.md` - Common issues and solutions

---

## Common Paths

### "I want to use this MCP server"
```
1. setup/prerequisites.md
2. setup/azure-ad-setup.md
3. setup/configuration.md
4. integration/claude-code-setup.md
5. integration/usage-examples.md
```

### "I want to understand how it works"
```
1. architecture/overview.md
2. architecture/token-efficiency.md
3. architecture/authentication.md
4. tools/overview.md
```

### "I want to add new functionality"
```
1. development/getting-started.md
2. architecture/overview.md
3. development/adding-tools.md
4. reference/graph-api-notes.md
```

### "I'm having issues"
```
1. reference/troubleshooting.md
2. reference/rate-limiting.md (if API errors)
3. architecture/authentication.md (if auth errors)
```

---

## Related Documentation

**Project Management:**
- TBG Executive workspace: `OneDrive/TBG Exec/Projects/Microsoft Graph MCP/`
- Project README: `../../../OneDrive - Knowspro LLC/TBG Exec/Projects/Microsoft Graph MCP/README.md`
- Task board: `../../../OneDrive - Knowspro LLC/TBG Exec/Projects/Microsoft Graph MCP/Tasks.md`

**External Resources:**
- Microsoft Graph API: https://docs.microsoft.com/en-us/graph/
- Model Context Protocol: https://modelcontextprotocol.io/
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk

**Repository Root:**
- Main README: `../README.md`
- Package configuration: `../package.json`
- Source code: `../src/`

---

**Last Updated:** 2025-10-31
**Status:** Phase 1 (Email tools) in development
