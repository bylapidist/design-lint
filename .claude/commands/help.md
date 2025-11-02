---
description: Guide to Claude Code commands for this repository
---

# Claude Code Help

This repository is optimized for Claude Code with custom commands and guidelines.

## Available Commands

Use these commands by typing them in Claude Code:

### Core Workflows
- `/precommit` - Run all validation checks before committing
- `/commit` - Create a proper conventional commit
- `/test` - Run tests and validation
- `/changeset` - Create a changeset file for releases
- `/dev` - Development workflow and common tasks
- `/help` - Show this help message (you are here!)

## Quick Start

### First Time Setup
1. Ensure Node.js >= 22 is installed
2. Run `npm install`
3. Run `npm test` to verify setup
4. Read `.claude/prompts/repository-context.md` for full context

### Making Changes
1. Edit files in `src/`
2. Run `/test` to validate
3. Run `/precommit` before committing
4. Run `/changeset` if user-facing change
5. Run `/commit` to create proper commit

## Repository Standards

### Commit Format
**Required**: Conventional Commits (Angular style)

Format: `type(scope): description`

Examples:
- `feat(tokens): add animation token support`
- `fix(cli): handle empty paths`
- `docs(api): update examples`

### Code Quality
- ✅ Clean TypeScript types
- ✅ Pass all ESLint rules
- ✅ Formatted with Prettier
- ✅ All tests passing
- ❌ NO type assertions (`as any`)
- ❌ NO ESLint disables
- ❌ NO TypeScript ignores

### Pre-Commit Requirements
ALL must pass:
1. `npm run build` - TypeScript compilation
2. `npm run lint` - ESLint check
3. `npm run format:check` - Prettier check
4. `npm test` - Test suite
5. `npm run lint:md` - Markdown lint (if .md changed)

## Common Workflows

### Bug Fix
```
1. Make changes in src/
2. Run /test
3. Run /precommit
4. Run /changeset (patch level)
5. Run /commit (fix: message)
```

### New Feature
```
1. Make changes in src/
2. Add tests in tests/
3. Run /test
4. Run /precommit
5. Run /changeset (minor level)
6. Run /commit (feat: message)
```

### Documentation Update
```
1. Edit files in docs/
2. Run npm run lint:md
3. Run /commit (docs: message)
4. No changeset needed (docs only)
```

## File Locations

- **Source**: `src/` - TypeScript source files
- **Tests**: `tests/` - Test files
- **Docs**: `docs/` - VitePress documentation
- **Changesets**: `.changeset/` - Version/changelog files
- **Claude Config**: `.claude/` - Claude AI configuration

## Important Files

- `AGENTS.md` - Guidelines for AI agents (original reference)
- `CONTRIBUTING.md` - Contribution guidelines
- `README.md` - Project overview
- `package.json` - Scripts and dependencies
- `.claude/prompts/repository-context.md` - Full context for Claude

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run build` | Compile TypeScript |
| `npm test` | Run test suite |
| `npm run lint` | Run ESLint |
| `npm run format` | Auto-format code |
| `npm run format:check` | Check formatting |
| `npm run lint:md` | Lint Markdown |

## Tips for Claude

- Always read `.claude/prompts/repository-context.md` for full context
- Use slash commands (`/precommit`, `/test`, etc.) for guided workflows
- Never commit without running all checks
- Never use ESLint disables or type assertions
- Always create changesets for user-facing changes
- Follow conventional commit format strictly

## Getting More Help

- **Repository context**: `.claude/prompts/repository-context.md`
- **Agent guidelines**: `AGENTS.md`
- **Architecture**: `docs/architecture.md`
- **API docs**: `docs/api.md`
- **Configuration**: `docs/configuration.md`

## Questions?

If you encounter issues:
1. Check the relevant command documentation
2. Review `AGENTS.md` and `.claude/prompts/repository-context.md`
3. Look at existing code patterns
4. Check the docs in `docs/` directory

## Remember

This repository follows strict quality standards:
- Semantic Versioning
- Conventional Commits
- High code coverage
- No workarounds or shortcuts
- Quality over speed

Use the available commands to guide you through proper workflows.
