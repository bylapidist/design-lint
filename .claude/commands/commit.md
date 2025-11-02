---
description: Create a conventional commit with proper validation
---

# Commit Workflow

Follow this workflow to create a proper commit for this repository.

## Instructions

1. **Run Pre-Commit Checks**: Execute ALL of these commands and ensure they pass:
   - `npm run lint` - ESLint must pass with no errors
   - `npm run format:check` - Prettier must pass with no errors
   - `npm test` - All tests must pass
   - `npm run build` - TypeScript must compile successfully (if source files changed)
   - `npm run lint:md` - Markdown linting must pass (if .md files changed)

2. **Review Changes**: Use `git status` and `git diff` to review all changes

3. **Determine Commit Type**: Choose the appropriate type:
   - `feat`: New feature
   - `fix`: Bug fix
   - `docs`: Documentation only
   - `style`: Code style changes (formatting, etc.)
   - `refactor`: Code refactoring
   - `perf`: Performance improvements
   - `test`: Adding or updating tests
   - `build`: Build system changes
   - `ci`: CI/CD changes
   - `chore`: Other changes that don't modify src or test files

4. **Write Commit Message**: Format: `type(scope): description`
   - Keep description clear and concise
   - Use imperative mood ("add" not "added")
   - Don't capitalize first letter of description
   - No period at the end
   - Optional scope in parentheses

5. **Create the Commit**: Stage and commit changes with the proper message

## Examples

```bash
git commit -m "feat(tokens): add support for animation tokens"
git commit -m "fix(cli): handle empty file paths correctly"
git commit -m "docs(api): update configuration examples"
git commit -m "test(parser): add edge case for nested properties"
```

## Validation Rules

- All pre-commit checks MUST pass
- Commit message MUST follow Conventional Commits format
- NO ESLint disable comments should be added
- NO type assertions (as any) should be added
- If checks fail, fix the issues - don't work around them

## After Committing

If this is a feature or bug fix that affects users:
- Create a changeset file (see `/changeset` command)
- Include it in the same commit or a follow-up commit
