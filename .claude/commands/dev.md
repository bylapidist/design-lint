---
description: Common development tasks and workflows
---

# Development Workflow

Quick reference for common development tasks in this repository.

## Initial Setup

```bash
# Verify Node.js version (must be >= 22)
node --version

# Install dependencies
npm install

# Build the project
npm run build

# Run tests to verify setup
npm test
```

## Development Cycle

### 1. Make Changes
- Edit files in `src/` directory
- Follow TypeScript best practices
- No type assertions or ESLint disables

### 2. Build and Test
```bash
# Compile TypeScript
npm run build

# Run tests
npm test

# Or use watch mode during development
npm run test:watch
```

### 3. Validate Code Quality
```bash
# Run all checks
npm run lint
npm run format:check
npm test
```

### 4. Format Code
```bash
# Auto-format all files
npm run format
```

## Working with Documentation

### Local Development
```bash
# Start VitePress dev server
npm run docs:dev

# Build documentation
npm run docs:build

# Preview built docs
npm run docs:preview
```

### Editing Docs
- Documentation files are in `docs/` directory
- Use VitePress markdown format
- Lint with `npm run lint:md` after changes
- Keep docs in sync with code changes

## Testing Workflows

### Run All Tests
```bash
npm test
```

### Watch Mode (continuous testing)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

Coverage thresholds (must meet):
- Branches: 75%
- Functions: 75%
- Lines: 80%
- Statements: 80%

## Debugging

### TypeScript Build Issues
```bash
# Clean build
rm -rf dist/
npm run build
```

### Dependency Issues
```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

### Test Issues
```bash
# Run specific test file
npx tsx --test tests/[filename].test.ts

# Verbose test output
npx tsx --test --test-reporter=spec tests/**/*.test.ts
```

## Project Structure

```
design-lint/
├── src/               # Source TypeScript files
│   ├── cli/          # Command-line interface
│   ├── core/         # Core linting logic
│   ├── rules/        # Linting rules
│   ├── formatters/   # Output formatters
│   └── plugins/      # Plugin system
├── tests/            # Test files
├── docs/             # VitePress documentation
├── dist/             # Compiled output (generated)
├── .changeset/       # Changeset files
└── .claude/          # Claude AI configuration
```

## Common Tasks Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Build project | `npm run build` |
| Run tests | `npm test` |
| Watch tests | `npm run test:watch` |
| Lint code | `npm run lint` |
| Format code | `npm run format` |
| Check formatting | `npm run format:check` |
| Lint markdown | `npm run lint:md` |
| Start docs dev server | `npm run docs:dev` |
| Build docs | `npm run docs:build` |

## Before Committing

Always run (see `/precommit` for details):
1. `npm run build`
2. `npm run lint`
3. `npm run format:check`
4. `npm test`
5. `npm run lint:md` (if .md changed)

## Getting Help

- **Architecture**: See `docs/architecture.md`
- **API Reference**: See `docs/api.md`
- **Configuration**: See `docs/configuration.md`
- **Rules**: See `docs/rules/index.md`
- **Contributing**: See `CONTRIBUTING.md`
- **Agent Guidelines**: See `AGENTS.md`

## Tips

- Use watch mode (`npm run test:watch`) during active development
- Run `npm run format` before `format:check` to auto-fix issues
- Check test coverage to ensure new code is tested
- Review `docs/` for detailed guidance on features
- Keep commits small and focused
- Follow conventional commit format

## Troubleshooting

### "Cannot find module" errors
```bash
npm install
npm run build
```

### Type errors in tests
- Ensure `@types/*` packages are installed
- Run `npm run build` first
- Check TypeScript version compatibility

### ESLint errors
- Fix the underlying issue
- DO NOT use `eslint-disable`
- Check `eslint.config.cjs` for rules

### Format check fails
```bash
npm run format
npm run format:check
```

## Release Process (Maintainers Only)

```bash
# Build and publish (maintainers only)
npm run release
```

This is handled by maintainers. Contributors should:
- Create changeset files (see `/changeset`)
- Follow conventional commits (see `/commit`)
- Let maintainers handle releases
