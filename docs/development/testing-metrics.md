# Testing Metrics & Quality

**Type:** Reference
**Purpose:** Coverage requirements, quality indicators, and checklists

---

## Coverage Requirements

### Minimum Thresholds (Enforced by Jest)

**Global coverage:**
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

**Per-module targets:**
- Critical modules (auth, rateLimiting): 95%+
- Tool handlers (mail/*, tasks/*): 85%+
- Utilities (utils/*): 90%+
- Type definitions: N/A (excluded from coverage)

---

### Coverage Commands

**Run tests with coverage:**
```bash
npm run test:coverage
```

**View HTML report:**
```bash
open coverage/index.html
```

**Check specific file:**
```bash
npm run test:coverage -- --collectCoverageFrom="src/utils/batching.ts"
```

**CI mode (fails if below threshold):**
```bash
npm run test:ci
```

---

## Test Count Targets

**Target distribution (100+ total tests):**

**Unit tests: 80% (80+ tests)**
- Auth module: 10-15 tests
- Utils module: 30-40 tests
- Tools module: 30-40 tests

**Integration tests: 15% (15-20 tests)**
- MCP server lifecycle: 3-5 tests
- Tool routing: 5-8 tests
- Graph API client: 5-8 tests

**E2E tests: 5% (5-10 tests)**
- Email search scenarios: 2-3 tests
- Authentication flows: 2-3 tests
- Error handling: 1-2 tests

---

## Performance Targets

**Test suite execution:**
- Unit test suite: < 10 seconds
- Integration test suite: < 30 seconds
- Full test suite: < 60 seconds
- CI/CD pipeline: < 5 minutes

**Individual test speed:**
- Unit test: < 1ms per test
- Integration test: < 100ms per test
- E2E test: < 1000ms per test

---

## Quality Indicators

**Test suite health:**
- [ ] All tests passing
- [ ] No skipped tests in main branch
- [ ] No flaky tests (inconsistent pass/fail)
- [ ] Clear, descriptive test names
- [ ] Well-organized test structure
- [ ] No console.log/console.error in tests
- [ ] All async operations properly awaited

**Code quality:**
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Consistent formatting (Prettier)
- [ ] No unused variables/imports
- [ ] Proper error handling in all paths

---

## Testing Checklists

### Before Starting Development

- [ ] Jest and testing dependencies installed
- [ ] `jest.config.js` configured
- [ ] Test directory structure created
- [ ] Husky pre-commit hooks installed
- [ ] GitHub Actions workflow configured
- [ ] Branch protection rules set up

### For Each New Module

- [ ] Write failing test first (TDD)
- [ ] Implement minimum code to pass
- [ ] Add edge case tests
- [ ] Add error handling tests
- [ ] Verify 80%+ coverage for module
- [ ] Run tests locally before commit
- [ ] No console.log statements left in code

### Before Committing

- [ ] All tests pass (`npm test`)
- [ ] Coverage meets threshold (`npm run test:coverage`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Linter passes (`npm run lint`)
- [ ] No TypeScript errors
- [ ] Manual smoke test completed
- [ ] Git hooks execute successfully

### Before Merging PR

- [ ] CI/CD pipeline passes (all jobs green)
- [ ] Coverage report reviewed (no decrease)
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing completed
- [ ] Code reviewed by peer
- [ ] All review comments addressed
- [ ] Branch up to date with main

---

## Coverage Exclusions

**Files excluded from coverage:**
```javascript
// jest.config.js
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.d.ts',       // Type definitions
  '!src/**/index.ts',     // Barrel exports
  '!src/**/types.ts',     // Type-only files
  '!src/**/*.interface.ts' // Interface files
]
```

**Why excluded:**
- Type definitions: No runtime code to test
- Barrel exports: Simple re-exports
- Interface files: TypeScript interfaces only

---

## Project Health Metrics

**Track over time:**

**Test metrics:**
- Total test count (target: 100+)
- Test pass rate (target: 100%)
- Average test execution time (target: <1s for suite)
- Flaky test count (target: 0)

**Coverage metrics:**
- Overall coverage (target: 80%+)
- Critical module coverage (target: 95%+)
- Coverage trend (should not decrease)

**Quality metrics:**
- Linting errors (target: 0)
- TypeScript errors (target: 0)
- Code review turnaround time (target: <24hrs)
- CI/CD pipeline success rate (target: >95%)

---

## Coverage Report Interpretation

**Example coverage output:**
```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   85.23 |    82.45 |   87.12 |   85.67 |
 src/auth/          |   95.50 |    93.20 |   96.00 |   95.80 | ✓
 src/utils/         |   90.30 |    88.10 |   91.50 |   90.60 | ✓
 src/tools/mail/    |   82.10 |    79.30 |   84.20 |   82.50 | ✓
--------------------|---------|----------|---------|---------|
```

**Analysis:**
- Overall: 85% ✓ (above 80% threshold)
- Auth: 95% ✓ (critical module, excellent coverage)
- Utils: 90% ✓ (good coverage)
- Tools: 82% ✓ (meets minimum, could improve)

**Action items:**
- Auth: Maintain high coverage
- Utils: Keep above 90%
- Tools: Add tests for uncovered branches (79% branch coverage)

---

## Related Documentation

- `testing.md` - Strategy overview
- `testing-setup.md` - Framework configuration
- `testing-implementation.md` - Write tests
- `testing-ci-cd.md` - CI/CD integration

---

**Last Updated:** 2025-10-31
