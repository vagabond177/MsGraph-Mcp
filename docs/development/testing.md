# Testing Strategy

**Type:** Overview
**Purpose:** Navigation hub for MsGraph-Mcp testing approach
**Audience:** Developers implementing and validating functionality

---

## Table of Contents

- [Quick Start](#quick-start)
- [Testing Approach](#testing-approach)
- [Detailed Documentation](#detailed-documentation)
- [Testing Workflow](#testing-workflow)
- [Related Documentation](#related-documentation)

---

## Quick Start

**Goal:** Aggressive test coverage from Day 1 with 80%+ code coverage

**Core principles:**
1. Test-Driven Development (TDD) - Write tests before implementation
2. Three-layer pyramid - Unit (80%), Integration (15%), E2E (5%)
3. Mock external dependencies - Graph API, Azure AD
4. Fast feedback loops - Pre-commit hooks, CI/CD enforcement
5. Coverage requirements - 80% minimum, enforced by CI/CD

**First steps:**
1. **Setup:** `testing-setup.md` - Install Jest, configure testing infrastructure
2. **Implementation:** `testing-implementation.md` - Learn TDD workflow and test structure
3. **Automation:** `testing-ci-cd.md` - Set up CI/CD pipeline and pre-commit hooks
4. **Execution:** `testing-manual.md` - Manual testing procedures
5. **Reference:** `testing-metrics.md` - Coverage requirements and quality indicators

---

## Testing Approach

**Philosophy:** Test-Driven Development (TDD) from Day 1

**Why aggressive testing:**
- MCP servers are mission-critical integration points
- Authentication bugs can expose credentials
- Graph API interactions are complex
- Token efficiency must be validated
- Rate limiting requires careful testing

**Testing pyramid:**
```
    ┌─────────┐
    │   E2E   │  ← Few: Full MCP conversation flows (5-10 tests)
    ├─────────┤
    │  Integ  │  ← Some: Tool handlers with mocked API (20-30 tests)
    ├─────────┤
    │  Unit   │  ← Many: Utilities, validation, processing (100+ tests)
    └─────────┘
```

**Coverage targets:**
- Overall: 80%+ (enforced)
- Critical modules (auth, rateLimiting): 95%+
- Tool handlers: 85%+
- Utilities: 90%+

---

## Detailed Documentation

### Setup & Configuration

**testing-setup.md** - Framework installation and configuration
- Install Jest and testing dependencies
- Configure jest.config.js
- Set up NPM test scripts
- Install pre-commit hooks (Husky)
- Create test directory structure

### Implementation & TDD

**testing-implementation.md** - How to write tests with TDD
- TDD workflow (write test → implement → refactor)
- Test structure and directory layout
- Testing pyramid layers with examples
- Unit test patterns
- Integration test patterns
- E2E test patterns
- Mock Graph API with MSW

### Automation & CI/CD

**testing-ci-cd.md** - Continuous integration setup
- GitHub Actions workflow configuration
- Pre-commit and pre-push hooks
- Coverage reporting with Codecov
- Branch protection rules
- CI/CD best practices

### Execution

**testing-manual.md** - Manual testing procedures
- Setup test environment
- Manual test workflow
- Verification checklist
- Debug logging configuration

**testing-scenarios.md** - Test scenarios for all tools
- Email search tool scenarios
- Authentication flow scenarios
- Error handling scenarios
- Rate limiting scenarios

### Reference

**testing-metrics.md** - Quality metrics and checklists
- Coverage requirements (80% threshold)
- Performance targets (test suite speed)
- Quality indicators (no flaky tests)
- Testing checklist (before commit, before PR)
- Project health metrics

---

## Testing Workflow

**For each new module:**

**1. Write failing test first (TDD)**
```bash
# Create test file
touch tests/unit/utils/myModule.test.ts

# Write test that fails
npm run test:watch
```

**2. Implement minimum code to pass**
```bash
# Create source file
touch src/utils/myModule.ts

# Implement until test passes
```

**3. Refactor with confidence**
```bash
# Tests provide safety net
npm test
```

**4. Verify coverage**
```bash
npm run test:coverage
# Ensure module meets 80%+ threshold
```

**5. Verify MCP tool registration (for new tools only)**
```bash
# Build and start server
npm run build
npm start

# In Claude Code or MCP Inspector:
# Ask: "List all available MCP tools from msgraph-mcp"
# Verify your new tool appears in the list

# OR use MCP Inspector:
npx @modelcontextprotocol/inspector
```

**Why this is critical:**
- Ensures tool is properly registered with MCP server
- Validates tool definition schema is correct
- Confirms Claude Code can discover the tool
- Catches registration issues before PR

**6. Commit with pre-commit validation**
```bash
git add .
git commit -m "Add myModule with tests"
# Pre-commit hook runs tests automatically
```

---

## Related Documentation

**Development:**
- `getting-started.md` - Dev environment setup
- `adding-tools.md` - Creating new tools to test

**Integration:**
- `../integration/claude-code-setup.md` - MCP configuration for testing
- `../integration/usage-examples.md` - Test scenarios

**Architecture:**
- `../architecture/overview.md` - System design to test

**External:**
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [MSW Documentation](https://mswjs.io/docs/)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Last Updated:** 2025-10-31
**Status:** Ready for implementation
