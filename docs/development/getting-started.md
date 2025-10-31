# Development Getting Started

**Type:** Procedure
**Purpose:** Set up development environment for contributing to MsGraph-Mcp
**Audience:** Developers extending or modifying the codebase

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Repository Setup](#repository-setup)
- [Development Workflow](#development-workflow)
- [Code Structure](#code-structure)
- [Related Documentation](#related-documentation)

---

## Prerequisites

**See:** `../setup/prerequisites.md` for base requirements

**Additional for development:**
- Git
- TypeScript knowledge
- Familiarity with async/await patterns
- Understanding of OAuth 2.0 (helpful)
- Microsoft Graph API experience (helpful)

---

## Repository Setup

### Step 1: Clone Repository

```bash
cd ~/RiderProjects
git clone [repository-url] MsGraph-Mcp
cd MsGraph-Mcp
```

**If already cloned:** Skip to Step 2

### Step 2: Install Dependencies

```bash
npm install
```

**What this installs:**
- `@modelcontextprotocol/sdk` - MCP server SDK
- `@microsoft/microsoft-graph-client` - Graph API client
- `@azure/identity` - Azure AD authentication
- TypeScript and type definitions

**Expected output:** Dependencies installed successfully

### Step 3: Configure Environment

**Follow:** `../setup/configuration.md` to create `.env` file

**Required for development:**
- `TENANT_ID`
- `CLIENT_ID`
- `USER_EMAIL`

**Optional for development:**
```env
LOG_LEVEL=debug  # Enable detailed logging
```

### Step 4: Build Project

```bash
npm run build
```

**What this does:**
- Compiles TypeScript to JavaScript
- Outputs to `dist/` directory
- Generates source maps
- Creates type declarations

**Expected output:** `dist/` directory created with compiled files

### Step 5: Verify Setup

```bash
npm start
```

**Expected behavior:**
1. Server starts
2. Authentication flow begins (if first time)
3. Browser opens for Microsoft login
4. Server ready to accept MCP calls

**If successful:** Development environment is ready

---

## Development Workflow

### Watch Mode (Recommended)

**Start TypeScript watch mode:**
```bash
npm run dev
```

**Behavior:**
- Monitors `src/` for changes
- Automatically recompiles on save
- Must manually restart server for changes to take effect

**Workflow:**
1. Edit code in `src/`
2. Save file (automatic compile)
3. Restart server: `npm start`
4. Test changes

### Manual Build

**For production builds:**
```bash
npm run build
npm start
```

### Testing Changes

**Option A: Manual testing**
- Configure MCP in Claude Code (see `../integration/claude-code-setup.md`)
- Invoke tools in conversation
- Verify behavior

**Option B: Unit tests (future)**
- Run test suite: `npm test`
- Currently: No automated tests (planned)

---

## Code Structure

### Directory Layout

```
src/
├── index.ts                 # MCP server entry point
├── auth/
│   └── graphAuth.ts         # OAuth 2.0 authentication
├── tools/
│   └── mail/                # Email tools
│       ├── searchByEntities.ts
│       ├── searchEmails.ts
│       ├── getEmail.ts
│       └── listFolders.ts
└── utils/
    ├── graphClient.ts       # Graph API client initialization
    ├── resultProcessor.ts   # Response summarization
    ├── batching.ts          # Batch request handling
    └── rateLimiting.ts      # Throttle and retry logic
```

### Key Files

**`src/index.ts`**
- MCP server initialization
- Tool registration
- Request routing

**`src/auth/graphAuth.ts`**
- OAuth 2.0 flow implementation
- Token management
- Credential storage

**`src/tools/mail/`**
- Individual tool implementations
- Input validation
- Response formatting

**`src/utils/`**
- Shared utilities
- Graph API client
- Common processing logic

### Module Dependencies

```
index.ts
  ├─→ auth/graphAuth.ts
  │     └─→ @azure/identity
  │
  ├─→ tools/mail/*.ts
  │     ├─→ utils/graphClient.ts
  │     └─→ utils/resultProcessor.ts
  │
  └─→ utils/graphClient.ts
        └─→ @microsoft/microsoft-graph-client
```

### TypeScript Configuration

**File:** `tsconfig.json`

**Key settings:**
- `target: ES2022` - Modern JavaScript
- `module: Node16` - Node.js ESM support
- `strict: true` - Strict type checking
- `outDir: dist` - Compiled output location

**Import style:** ES modules (`import/export`)

---

## Related Documentation

**Adding functionality:**
- `adding-tools.md` - How to create new MCP tools
- `testing.md` - Testing strategies

**Architecture:**
- `../architecture/overview.md` - System design
- `../architecture/authentication.md` - Auth implementation

**External:**
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Microsoft Graph SDK](https://docs.microsoft.com/en-us/graph/sdks/sdks-overview)

---

**Last Updated:** 2025-10-31
