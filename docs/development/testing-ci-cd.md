# Testing CI/CD Integration

**Type:** Procedure
**Purpose:** Configure continuous integration and deployment for testing

---

## GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run tests with coverage
        run: npm run test:ci

      - name: Check coverage thresholds
        run: |
          if [ "$(npm run test:coverage --silent | grep 'All files' | awk '{print $10}' | sed 's/%//')" -lt 80 ]; then
            echo "❌ Coverage below 80% threshold"
            exit 1
          fi

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

      - name: Build project
        run: npm run build

  lint:
    name: Lint and Format
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
```

---

## Pre-commit Hooks

**Install Husky** (if not done during setup):
```bash
npm install --save-dev husky lint-staged
npx husky install
```

**Create `.husky/pre-commit`:**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
npm run type-check
```

**Create `.husky/pre-push`:**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run test:ci
```

**Make executable:**
```bash
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

---

## Coverage Reporting

**Install Codecov:**
```bash
npm install --save-dev codecov
```

**Create `codecov.yml` in project root:**
```yaml
coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 1%
    patch:
      default:
        target: 80%
        threshold: 1%

comment:
  layout: "reach,diff,flags,tree"
  behavior: default
  require_changes: false
```

**Configure Codecov in GitHub:**
1. Go to https://codecov.io
2. Sign in with GitHub
3. Enable for repository
4. Add `CODECOV_TOKEN` to GitHub secrets (if private repo)

---

## Branch Protection Rules

**Configure in GitHub repository settings:**

**Required status checks:**
- Test Suite (Node.js 18.x)
- Test Suite (Node.js 20.x)
- Lint and Format
- Coverage threshold (80%+)

**Merge requirements:**
- All status checks must pass
- Require pull request reviews (1 approver)
- Dismiss stale reviews on new commits
- Require branches to be up to date

**Protection rules:**
- Do not allow bypassing
- Do not allow force pushes
- Do not allow deletions

---

## ESLint Configuration

Create `.eslintrc.js`:

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off'
  },
  env: {
    node: true,
    jest: true
  }
};
```

---

## Prettier Configuration

Create `.prettierrc.js`:

```javascript
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'avoid'
};
```

Create `.prettierignore`:

```
dist/
coverage/
node_modules/
*.md
```

---

## CI/CD Best Practices

**Fast feedback:**
- Run lint/type-check first (fail fast)
- Run unit tests before integration tests
- Run E2E tests only on main branch

**Parallel execution:**
- Run tests across multiple Node versions
- Run lint, type-check, tests in parallel jobs

**Caching:**
- Cache `node_modules` for faster builds
- Cache Jest cache: `~/.cache/jest`

**Optimization:**
```yaml
- name: Cache Jest
  uses: actions/cache@v3
  with:
    path: ~/.cache/jest
    key: ${{ runner.os }}-jest-${{ hashFiles('**/package-lock.json') }}
```

**Fail fast in CI, run all in local:**
```yaml
# CI mode
- run: npm run test:ci

# Local mode
- run: npm test
```

---

## Continuous Deployment

**Automated releases on tag push:**

Add to `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npm test
      - run: npm run build

      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Related Documentation

- `testing.md` - Strategy overview
- `testing-setup.md` - Framework setup
- `testing-metrics.md` - Coverage requirements

---

**Last Updated:** 2025-10-31
