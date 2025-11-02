# Claude Code Configuration

This directory contains configuration and commands to optimize Claude Code's interaction with this repository.

## Purpose

The `.claude/` directory provides Claude AI agents with:
- Repository context and guidelines
- Pre-built workflow commands
- Quality standards and requirements
- Common task automation

This ensures Claude agents follow the same strict standards as human contributors.

## Directory Structure

```
.claude/
├── README.md                          # This file
├── prompts/
│   └── repository-context.md         # Full repository context for Claude agents
└── commands/
    ├── help.md                        # Guide to available commands
    ├── precommit.md                   # Pre-commit validation workflow
    ├── commit.md                      # Commit creation workflow
    ├── test.md                        # Testing workflow
    ├── changeset.md                   # Changeset creation workflow
    └── dev.md                         # Development workflow reference
```

## Available Commands

Claude Code users can invoke these commands by typing them:

- `/help` - Show available commands and quick reference
- `/precommit` - Run all validation checks before committing
- `/commit` - Create a proper conventional commit
- `/test` - Run tests and validation
- `/changeset` - Create a changeset file for version management
- `/dev` - View development workflow and common tasks

## Usage

### For Claude Code Users

When working in this repository with Claude Code:

1. **Start with context**: The repository context in `prompts/repository-context.md` is automatically loaded
2. **Use commands**: Type `/help` to see all available commands
3. **Follow workflows**: Commands guide you through proper procedures

### For Repository Maintainers

The `.claude/` directory should be:
- ✅ Committed to version control
- ✅ Updated when repository standards change
- ✅ Kept in sync with `AGENTS.md`
- ❌ Not added to `.gitignore`

## Relationship to AGENTS.md

This directory complements `AGENTS.md`:

- **AGENTS.md**: Original guidelines for AI agents (like Cursor/Codex)
- **.claude/**: Optimized structure for Claude Code specifically

Both should be kept in sync to ensure consistent AI agent behavior.

## Key Standards

### Code Quality
- TypeScript without type assertions
- ESLint without disable comments
- Prettier formatting enforced
- All tests must pass

### Commit Standards
- Conventional Commits (Angular style)
- Format: `type(scope): description`
- All pre-commit checks must pass

### Versioning
- Semantic Versioning (semver)
- Changeset files for user-facing changes
- Manual changeset creation (no CLI)

## Customization

To customize Claude Code behavior:

1. **Edit prompts**: Modify `prompts/repository-context.md`
2. **Add commands**: Create new `.md` files in `commands/`
3. **Follow format**: Use YAML frontmatter with `description`

### Command File Format

```md
---
description: Brief description of the command
---

# Command Title

Instructions and content here...
```

## Requirements

- Node.js >= 22
- npm dependencies installed
- Git repository

## Related Documentation

- `AGENTS.md` - AI agent guidelines (original)
- `CONTRIBUTING.md` - Human contribution guidelines
- `docs/` - Full project documentation
- `README.md` - Project overview

## Benefits

Using this Claude Code configuration provides:

- ✅ Consistent code quality
- ✅ Automated validation workflows
- ✅ Reduced chance of CI failures
- ✅ Adherence to repository standards
- ✅ Faster onboarding for Claude agents
- ✅ Better commit messages and changesets

## Maintenance

Update this configuration when:
- Repository standards change
- New validation steps are added
- Commit format requirements change
- Build or test processes change
- New best practices are adopted

Keep in sync with:
- `AGENTS.md`
- `CONTRIBUTING.md`
- `package.json` scripts
- CI/CD configuration

## Support

For issues or improvements:
- Check `AGENTS.md` for latest guidelines
- Review `CONTRIBUTING.md` for contribution process
- Open an issue on GitHub
- Update documentation to reflect changes

## Version

This configuration is specific to:
- Repository: `@lapidist/design-lint`
- Node.js: >= 22
- Claude Code: Latest version

---

**Note**: This directory is part of the repository and should be committed to version control. It helps both AI and human contributors maintain code quality.
