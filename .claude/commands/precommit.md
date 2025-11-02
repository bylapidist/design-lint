---
description: Run all pre-commit validation checks
---

# Pre-Commit Validation

Run all required checks before committing code. This ensures code quality and prevents CI failures.

## Required Checks

Execute ALL of the following commands. ALL must pass before committing:

### 1. Install Dependencies
```bash
npm install
```
Run this if package.json or package-lock.json changed.

### 2. Build TypeScript
```bash
npm run build
```
**Required if**: Any `.ts` files in `src/` were modified.
**Must**: Complete with zero errors.

### 3. Run ESLint
```bash
npm run lint
```
**Must**: Pass with zero errors.
**Do NOT**: Add `eslint-disable` comments to bypass errors.
**Fix**: Underlying issues, don't disable rules.

### 4. Check Code Formatting
```bash
npm run format:check
```
**Must**: Pass with zero errors.
**If fails**: Run `npm run format` to auto-fix, then check again.

### 5. Run Test Suite
```bash
npm test
```
**Must**: All tests pass.
**Coverage**: Should meet or exceed thresholds (75-80%).

### 6. Lint Markdown (if applicable)
```bash
npm run lint:md
```
**Required if**: Any `.md` files were modified.
**Must**: Pass with zero errors.

## Quick Check Script

Run all checks in sequence:

```bash
npm run build && npm run lint && npm run format:check && npm test && npm run lint:md
```

If any command fails, the sequence stops. Fix the issue and re-run.

## Common Failure Scenarios

### TypeScript Errors
- **Problem**: `npm run build` fails with type errors
- **Solution**: Fix type issues, DO NOT use type assertions (`as any`)
- **Check**: Review error messages carefully

### ESLint Errors
- **Problem**: `npm run lint` reports violations
- **Solution**: Fix the code to satisfy the rule
- **Wrong approach**: Adding `eslint-disable` comments
- **Check**: Understand why the rule exists before "fixing"

### Format Errors
- **Problem**: `npm run format:check` fails
- **Solution**: Run `npm run format` to auto-fix
- **Check**: Review changes before committing

### Test Failures
- **Problem**: `npm test` shows failing tests
- **Solution**: Debug and fix the failing tests
- **Check**: Ensure your changes didn't break existing functionality

### Markdown Lint Errors
- **Problem**: `npm run lint:md` reports violations
- **Solution**: Fix markdown formatting issues
- **Check**: Follow repository markdown conventions

## Code Quality Rules

### TypeScript
- ✅ Use proper types
- ❌ NO type assertions (`as any`, `as unknown`)
- ❌ NO `@ts-ignore` or `@ts-expect-error`

### ESLint
- ✅ Fix violations properly
- ❌ NO `eslint-disable` comments
- ❌ NO inline rule overrides

### Testing
- ✅ All existing tests must pass
- ✅ Add tests for new functionality
- ✅ Maintain coverage thresholds

## After All Checks Pass

1. Review changes with `git status` and `git diff`
2. Create changeset if needed (see `/changeset`)
3. Create conventional commit (see `/commit`)
4. Push to the correct branch

## Troubleshooting

### "Command not found"
- Run `npm install` first
- Verify Node.js >= 22 is installed

### "Module not found" errors
- Delete `node_modules/` and `package-lock.json`
- Run `npm install` again

### Persistent test failures
- Check if tests are flaky
- Review recent changes for bugs
- Look at test output for specific issues

### Build cache issues
- Delete `dist/` directory
- Run `npm run build` again

## Success Criteria

✅ All commands complete successfully
✅ Zero errors or warnings
✅ Code follows repository standards
✅ Ready to commit with confidence

## Next Steps

Once all checks pass:
- Use `/commit` to create a proper commit
- Use `/changeset` if a changeset is needed
- Push to your branch (not main/master)
