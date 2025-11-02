# Repository Context for Claude Agents

This repository is **@lapidist/design-lint**, a design system linter that validates design tokens, flags unsupported components, and offers rich formatting options for CI pipelines.

## Critical Requirements

### Node.js Version
- **Requires Node.js >= 22**
- Always verify the Node.js version before running commands
- This is a hard requirement for all operations

### Commit Standards
- **Semantic Versioning**: Follow [semver.org](https://semver.org/) strictly
- **Conventional Commits**: Use [Angular style](https://www.conventionalcommits.org/)
- Format: `type(scope): description`
- Examples:
  - `feat(tokens): add support for animation tokens`
  - `fix(cli): handle empty file paths correctly`
  - `docs(api): update configuration examples`

### Code Quality Standards

#### TypeScript Requirements
- Use clean TypeScript types
- **NEVER** use type casting or assertions like `as any`
- **NEVER** use `@ts-ignore` or `@ts-expect-error`
- All code must satisfy type checking without workarounds

#### ESLint Requirements
- **NEVER** use `eslint-disable` comments
- **NEVER** add `eslint-ignore` directives
- All code must satisfy ESLint rules without overrides
- If ESLint fails, fix the underlying issue, don't disable the rule

### Pre-Commit Checklist

Before creating any commit, you **MUST** run and pass ALL of the following:

1. `npm install` (if dependencies changed)
2. `npm run lint` (ESLint check)
3. `npm run format:check` (Prettier check)
4. `npm test` (Test suite)
5. `npm run build` (TypeScript compilation - if source files changed)
6. `npm run lint:md` (if Markdown files were modified)

**IMPORTANT**: All commands must pass with zero errors. Do not commit if any check fails.

### Changesets

For any new feature or bug fix:

1. **Manually create** a changeset file under `.changeset/`
2. Use a descriptive kebab-case filename (e.g., `fix-lint-file-return-format.md`)
3. **DO NOT** run the Changesets CLI
4. Follow this exact format:

```md
---
'@lapidist/design-lint': patch
---

fix lintFile to handle lintFiles return format
```

Replace `patch` with the appropriate semver level:
- `patch`: Bug fixes, internal changes, documentation
- `minor`: New features, backwards-compatible
- `major`: Breaking changes

## Build and Development

### Key Commands
- `npm run build`: Compile TypeScript (required before testing changes)
- `npm run lint`: Run ESLint
- `npm run format`: Auto-format code with Prettier
- `npm run format:check`: Check code formatting
- `npm test`: Run all tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Generate coverage report
- `npm run lint:md`: Lint Markdown files

### Project Structure
- `src/`: Source TypeScript files
- `tests/`: Test files
- `docs/`: Documentation (VitePress)
- `dist/`: Compiled output (generated)
- `.changeset/`: Changeset files for versioning

## Common Workflows

### Making Changes
1. Understand the change required
2. Modify source files in `src/`
3. Run `npm run build` to compile
4. Run `npm test` to verify tests pass
5. Run `npm run lint` and `npm run format:check`
6. Create changeset if needed
7. Commit with conventional commit message

### Adding Tests
- Place tests in `tests/` directory
- Use Node.js built-in test runner (`tsx --test`)
- Maintain coverage thresholds (see package.json c8 config)

### Documentation Updates
- Docs are in `docs/` directory
- Use VitePress format
- Run `npm run lint:md` after changes
- Keep docs in sync with code changes

## What NOT to Do

- ❌ Don't commit without running all pre-commit checks
- ❌ Don't use ESLint disable comments
- ❌ Don't use TypeScript type assertions (`as any`, etc.)
- ❌ Don't run the Changesets CLI directly
- ❌ Don't create commits that don't follow Conventional Commits
- ❌ Don't modify files without ensuring tests pass
- ❌ Don't push directly to main/master branch

## Repository-Specific Context

### Design Token Interchange Format (DTIF)
- This linter uses DTIF as its canonical format
- DTIF parser, schema, and validator are dependencies
- Understanding DTIF is crucial for working with this codebase

### Supported Languages
- JavaScript, TypeScript
- CSS, SCSS, Sass, Less
- Inline styles and tagged template literals
- Vue SFC, Svelte components

### Key Features
- Token validation
- Component deprecation warnings
- Auto-fixes with `--fix` flag
- Extensible rules and formatters

## Getting Help

- Documentation: https://design-lint.lapidist.net/
- Issues: https://github.com/bylapidist/design-lint/issues
- Architecture: See `docs/architecture.md`
- API Reference: See `docs/api.md`

---

**Remember**: Quality over speed. Always run checks before committing. Keep the codebase clean and maintainable.
