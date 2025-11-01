# Git Workflow Standard

**Type:** Procedure
**Purpose:** Git branching strategy and contribution workflow

---

## MANDATORY SOP: Feature Branch Workflow

**⚠️ CRITICAL RULES - NO EXCEPTIONS:**

1. **ALWAYS work on feature branches** - Never commit directly to `main`
2. **ALL changes must go through Pull Requests** - No exceptions
3. **Use squash merge** when completing PRs - Keep history clean
4. **Delete branch after merge** - Prevent branch proliferation

**Violation of these rules will result in:**
- Failed CI/CD checks
- Rejected PRs
- Main branch protection enforcement

---

## Branch Strategy

**Protected branches:**
- `main` - Production-ready code, PR-only, **ZERO direct commits allowed**

**Working branches (REQUIRED for all work):**
- `feature/*` - New features (e.g., `feature/email-search`)
- `fix/*` - Bug fixes (e.g., `fix/auth-token-refresh`)
- `docs/*` - Documentation updates (e.g., `docs/api-reference`)
- `test/*` - Test improvements (e.g., `test/integration-coverage`)

---

## Workflow

**1. Create feature branch:**
```bash
git checkout main
git pull
git checkout -b feature/my-feature
```

**2. Make changes with TDD:**
```bash
# Write test
npm run test:watch

# Implement
# ... code changes ...

# Verify
npm test
npm run lint
npm run type-check
```

**3. Commit changes:**
```bash
git add .
git commit -m "Add feature with tests"
# Pre-commit hook runs automatically
```

**4. Push branch:**
```bash
git push -u origin feature/my-feature
# Pre-push hook runs tests
```

**5. Create PR:**
```bash
gh pr create --title "Add feature" --body "Description"
```

**6. Wait for CI/CD:**
- All tests pass
- Coverage meets 80% threshold
- Linter passes
- Type check passes

**7. Request review:**
- At least 1 approver required

**8. Complete PR with squash merge:**
```bash
# Via GitHub UI: Select "Squash and merge" (REQUIRED)
# OR via gh CLI:
gh pr merge --squash --delete-branch
```
- **ALWAYS use squash merge** - Consolidates commits into single clean commit
- **ALWAYS delete branch after merge** - Keeps repository clean

---

## Branch Protection Rules

**Main branch protection (configured in GitHub):**

**Require pull requests:**
- ✓ Require pull request before merging
- ✓ Require 1 approval
- ✓ Dismiss stale reviews when new commits pushed
- ✓ Require review from code owners (if CODEOWNERS file exists)

**Require status checks:**
- ✓ Require status checks to pass before merging
- ✓ Require branches to be up to date before merging
- Required checks:
  - `Run Tests (18.x)`
  - `Run Tests (20.x)`
  - `Lint and Format`

**Additional restrictions:**
- ✓ Do not allow bypassing the above settings
- ✓ Restrict who can push to matching branches (admins only for emergencies)
- ✗ Allow force pushes (disabled)
- ✗ Allow deletions (disabled)

---

## Commit Message Format

**Standard format:**
```
<type>: <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `test` - Adding or updating tests
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `chore` - Maintenance tasks

**Examples:**
```
feat: Add email search by entities tool

Implements batch search across multiple companies with keyword filtering.
Includes comprehensive tests and token-efficient result processing.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

```
fix: Handle expired refresh tokens correctly

Previously crashed on expired refresh tokens. Now prompts for re-authentication
and gracefully handles the OAuth flow.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Pull Request Process

**PR title format:**
```
<type>: <brief description>
```

**PR description template:**
```markdown
## Summary
- Brief description of changes
- Why this change is needed

## Changes
- List of specific changes made

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Coverage meets threshold (80%+)

## Checklist
- [ ] Tests pass locally
- [ ] Linter passes
- [ ] Type check passes
- [ ] Documentation updated (if needed)
- [ ] No breaking changes (or documented)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Emergency Hotfix Process

**For critical production issues only:**

**1. Create hotfix branch from main:**
```bash
git checkout main
git pull
git checkout -b fix/critical-issue
```

**2. Fix issue with test:**
```bash
# Add failing test demonstrating bug
# Fix bug
# Verify test passes
npm test
```

**3. Fast-track PR:**
```bash
git push -u origin fix/critical-issue
gh pr create --title "HOTFIX: Critical issue" --body "Details"
```

**4. Request immediate review:**
- Tag reviewer for urgent review
- Merge as soon as CI passes + 1 approval

---

## Configuration Steps

**To enable branch protection on GitHub:**

1. Go to: https://github.com/vagabond177/MsGraph-Mcp/settings/branches

2. Click "Add branch protection rule"

3. Configure as follows:
   - Branch name pattern: `main`
   - ✓ Require a pull request before merging
     - Required approvals: 1
     - ✓ Dismiss stale pull request approvals when new commits are pushed
   - ✓ Require status checks to pass before merging
     - ✓ Require branches to be up to date before merging
     - Search and add required checks:
       - `Run Tests` (both 18.x and 20.x will appear after first workflow run)
       - `Lint and Format`
   - ✓ Restrict who can push to matching branches
     - Add: admins only
   - ✗ Allow force pushes (leave unchecked)
   - ✗ Allow deletions (leave unchecked)

4. Click "Create" or "Save changes"

---

## Related Documentation

- `testing-ci-cd.md` - CI/CD pipeline configuration
- `testing.md` - Testing strategy

---

**Last Updated:** 2025-10-31
