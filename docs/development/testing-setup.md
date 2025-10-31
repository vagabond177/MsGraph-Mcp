# Testing Framework Setup

**Type:** Procedure
**Purpose:** Install and configure testing infrastructure

---

## Install Dependencies

```bash
npm install --save-dev \
  jest@^29.7.0 \
  @types/jest@^29.5.0 \
  ts-jest@^29.1.0 \
  nock@^13.5.0 \
  @faker-js/faker@^8.4.0 \
  msw@^2.0.0 \
  @typescript-eslint/eslint-plugin@^6.0.0 \
  @typescript-eslint/parser@^6.0.0 \
  eslint@^8.50.0 \
  eslint-config-prettier@^9.0.0 \
  prettier@^3.0.0 \
  husky@^8.0.0 \
  lint-staged@^15.0.0
```

## Configure Jest

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

---

## Configure NPM Scripts

NPM scripts already configured in `package.json`:
- `test` - Run all tests
- `test:watch` - Watch mode
- `test:coverage` - With coverage report
- `test:unit` - Unit tests only
- `test:integration` - Integration tests only
- `test:e2e` - E2E tests only
- `test:ci` - CI mode
- `type-check` - TypeScript validation
- `lint` / `lint:fix` - Linting
- `format` / `format:check` - Formatting

---

## Set Up Pre-commit Hooks

Initialize Husky:
```bash
npx husky install
```

Create hooks:
```bash
npx husky add .husky/pre-commit "npx lint-staged && npm run type-check"
npx husky add .husky/pre-push "npm run test:ci"
```

Configure lint-staged in `package.json`:
```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write",
      "npm run test:unit -- --findRelatedTests --passWithNoTests"
    ]
  }
}
```

---

## Create Test Directory Structure

```bash
mkdir -p tests/{unit/{auth,utils,tools/mail},integration,e2e,fixtures,helpers}
```

Directory structure:
```
tests/
├── unit/{auth,utils,tools/mail}
├── integration/
├── e2e/
├── fixtures/
├── helpers/
└── setup.ts
```

---

## Verification

```bash
npx jest --showConfig  # Verify Jest config
npm test              # Run tests (should find none initially)
npm run test:watch    # Test watch mode
```

## Related Documentation

- `testing.md` - Testing strategy overview
- `testing-implementation.md` - Write tests with TDD
- `testing-metrics.md` - Coverage requirements

---

**Last Updated:** 2025-10-31
