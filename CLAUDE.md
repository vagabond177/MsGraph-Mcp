# MsGraph-Mcp: AI Assistant Project Guide

**Type:** Navigation Hub
**Purpose:** Quick orientation and navigation to detailed documentation
**Last Updated:** 2025-10-31

---

## What This Is

**Microsoft Graph MCP server** - Token-efficient M365 integration with Claude Code

**Key Goal:** Query email/calendar/tasks without consuming excessive tokens through server-side summarization

**Status:** Phase 1 (Email tools) - `feature/core-architecture` branch

**Stack:** TypeScript/Node.js, MCP SDK, Microsoft Graph API, Jest (80%+ coverage required)

---

## Critical Context

### Core Design Principles (Read First!)
1. **Token Efficiency:** Never return full email bodies - summarize to 50-100 tokens vs 1000-5000
2. **Batch-First:** All tools support multiple entities (Graph API batches up to 20 requests)
3. **Read-Only (Phase 1):** No write operations yet
4. **TDD Required:** Write tests before implementation, 80%+ coverage enforced

### Architecture in 30 Seconds
```
Claude Code → MCP Tools → MsGraph-Mcp Server → Microsoft Graph API → M365
                              ├─ Auth (OAuth 2.0)
                              ├─ Graph Client (batching, retry, rate limiting)
                              ├─ Result Processor (summarization)
                              └─ Tool Handlers (email, calendar, tasks)
```

**Details:** `docs/architecture/overview.md`

---

## Quick Navigation

### "I Need to Understand This Project"
1. Read this file first
2. `README.md` - Project overview
3. `docs/architecture/overview.md` - System design and data flow
4. `docs/architecture/token-efficiency.md` - Why summarization matters

### "I Need to Set This Up"
1. `docs/setup/prerequisites.md`
2. `docs/setup/azure-ad-setup.md`
3. `docs/setup/configuration.md`
4. Copy `.env.example` → `.env` and fill in `TENANT_ID`, `CLIENT_ID`

### "I Need to Add a New Tool/Feature"
1. **READ FIRST:** `docs/development/adding-tools.md`
2. **THEN:** `docs/development/testing.md` (TDD workflow)
3. **CHECK:** Similar tool in `src/tools/mail/` for patterns
4. **FOLLOW:** `docs/development/git-workflow.md` for branch/PR process

### "I Need to Fix a Bug"
1. `docs/reference/troubleshooting.md` - Common issues
2. `docs/architecture/authentication.md` - Auth issues
3. `docs/reference/rate-limiting.md` - API throttling
4. `docs/reference/graph-api-notes.md` - Graph API specifics

### "I Need to Understand Testing"
- **Start:** `docs/development/testing.md` - Overview and TDD workflow
- **Setup:** `docs/development/testing-setup.md`
- **Implementation:** `docs/development/testing-implementation.md`
- **CI/CD:** `docs/development/testing-ci-cd.md`

---

## Essential File Locations

### Core Implementation
- `src/index.ts` - MCP server entry point, tool registration
- `src/auth/graphAuth.ts` - OAuth 2.0 implementation
- `src/tools/mail/*.ts` - Email tool handlers
- `src/utils/graphClient.ts` - Graph API client (batching, retry)
- `src/utils/resultProcessor.ts` - **CRITICAL** - Token optimization/summarization

### Configuration
- `.env` - Secrets (use `.env.example` as template)
- `package.json` - Scripts and dependencies
- `tsconfig.json` - TypeScript config
- `jest.config.js` - Testing config

### Documentation Hub
- `docs/README.md` - Full documentation navigation
- `docs/architecture/` - WHY and WHAT (design decisions)
- `docs/development/` - HOW to build
- `docs/setup/` - HOW to configure
- `docs/tools/` - WHAT tools exist
- `docs/reference/` - Technical details

---

## Common Commands

```bash
# Development
npm run build          # Build to dist/
npm run dev            # Watch mode
npm start              # Run MCP server
npm test               # Run all tests
npm run test:watch     # TDD mode
npm run test:coverage  # Coverage report (80%+ required)

# Quality
npm run lint:fix       # Auto-fix linting
npm run format         # Prettier format
npm run type-check     # TypeScript validation

# Before commit (pre-commit hooks run these)
npm test && npm run lint && npm run type-check
```

---

## Critical Rules

### Token Efficiency (Enforced in `resultProcessor.ts`)
- ❌ Never return full email bodies
- ✅ Always return summaries: date, subject, sender, snippet (50-100 tokens)
- ✅ Filter server-side before returning results
- ✅ Batch multiple requests

### Testing (Enforced by CI/CD)
- ✅ TDD: Write tests BEFORE implementation
- ✅ 80%+ overall coverage (95%+ for auth, 85%+ for tools, 90%+ for utils)
- ✅ Use MSW for Graph API mocking
- ✅ Pre-commit hooks run tests on changed files
- ❌ No PR merge without passing tests

### Git Workflow (Branch protection on `main`)
- ✅ Create `feature/*`, `fix/*`, `docs/*`, or `test/*` branch
- ✅ Write tests first (TDD)
- ✅ Commit with format: `<type>: <subject>` + Claude footer
- ✅ PR requires 1 approval + all CI checks pass
- ✅ Squash and merge to `main`
- **Details:** `docs/development/git-workflow.md`

### Adding New MCP Tools
1. Write tests first in `tests/unit/tools/` or `tests/integration/tools/`
2. Add handler to `src/tools/[category]/`
3. Use `resultProcessor.ts` for summarization
4. Support array inputs (batching)
5. Register in `src/index.ts`
6. Naming: `mcp__msgraph__<action>_<resource>`
7. **Details:** `docs/development/adding-tools.md`

---

## AI Assistant Workflow

### Starting Any Task
1. ✅ Read this file
2. ✅ Navigate to specific detailed docs using "Quick Navigation" above
3. ✅ Check similar implementations in `src/tools/mail/` for patterns
4. ✅ Remember: TDD (tests first), token efficiency (summarize), batching (array inputs)

### Writing Code
1. Write tests first in `tests/`
2. Run `npm run test:watch` for fast feedback
3. Implement in `src/`
4. Use `resultProcessor.ts` for summarization
5. Log with `src/utils/logger.ts` (not `console.log`)

### Before Committing
1. `npm run test:coverage` (80%+ required)
2. `npm run lint:fix && npm run format`
3. `npm run type-check`
4. Pre-commit hooks will enforce, but check first

---

## Key Technical Decisions (The "Why")

**Why MCP?** Token efficiency through server-side processing
**Why Batching?** Primary use case: search 50+ companies at once
**Why Read-Only?** Reduce complexity, faster time-to-value
**Why Summarization?** 500 tokens vs 50,000 for raw emails

**Full rationale:** `docs/architecture/overview.md` (Design Decisions section)

---

## Environment Setup

**Required in `.env`:**
```bash
TENANT_ID=<azure-ad-tenant-id>
CLIENT_ID=<app-registration-client-id>
```

**Setup details:** `docs/setup/configuration.md` and `.env.example`

---

## Troubleshooting Shortcuts

| Issue | Look Here |
|-------|-----------|
| Auth failures | `.env` values, `docs/architecture/authentication.md` |
| API rate limiting | `docs/reference/rate-limiting.md` |
| Test failures | `npm run test:coverage`, `docs/development/testing.md` |
| Build errors | `npm run type-check` |
| General issues | `docs/reference/troubleshooting.md` |

---

## External Resources

- **Microsoft Graph API:** https://docs.microsoft.com/en-us/graph/
- **MCP Protocol:** https://modelcontextprotocol.io/
- **MCP TypeScript SDK:** https://github.com/modelcontextprotocol/typescript-sdk

---

**Documentation Hub:** `docs/README.md`
**Current Branch:** `feature/core-architecture`
**Version:** 0.1.0
