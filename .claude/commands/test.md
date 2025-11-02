---
description: Run tests and validate changes
---

# Test Workflow

Run this workflow to test your changes thoroughly before committing.

## Instructions

1. **Build the Project**:
   ```bash
   npm run build
   ```
   This compiles TypeScript and ensures no type errors exist.

2. **Run All Tests**:
   ```bash
   npm test
   ```
   All tests must pass before proceeding.

3. **Check Test Coverage** (optional but recommended):
   ```bash
   npm run test:coverage
   ```
   Verify coverage meets thresholds:
   - Branches: 75%
   - Functions: 75%
   - Lines: 80%
   - Statements: 80%

4. **Run Linting**:
   ```bash
   npm run lint
   ```
   Fix any ESLint errors. DO NOT use eslint-disable comments.

5. **Check Formatting**:
   ```bash
   npm run format:check
   ```
   If this fails, run `npm run format` to auto-fix formatting.

6. **Lint Markdown** (if .md files changed):
   ```bash
   npm run lint:md
   ```

## Watch Mode

For active development, use watch mode:
```bash
npm run test:watch
```

This will re-run tests automatically when files change.

## Debugging Failed Tests

1. Check the test output for specific failures
2. Review the changed code for issues
3. Verify TypeScript types are correct
4. Check that dependencies are up to date with `npm install`
5. Look at test files in `tests/` directory for context

## Test Writing Guidelines

- Place tests in `tests/` directory
- Use Node.js built-in test runner via `tsx --test`
- Follow existing test patterns in the codebase
- Test both happy paths and edge cases
- Maintain or improve coverage percentages

## Common Issues

- **Type errors**: Fix TypeScript issues, don't use type assertions
- **ESLint errors**: Fix the underlying issue, don't disable rules
- **Formatting errors**: Run `npm run format` to auto-fix
- **Coverage drops**: Add tests for new code paths

## Next Steps

After all tests pass:
1. Review changes with `git diff`
2. Create a changeset if needed (see `/changeset`)
3. Create a conventional commit (see `/commit`)
