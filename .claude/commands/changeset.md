---
description: Create a changeset file for version management
---

# Changeset Creation Workflow

Create a changeset file to document changes for version bumping and changelog generation.

## When to Create a Changeset

Create a changeset for:
- ✅ New features (minor version bump)
- ✅ Bug fixes (patch version bump)
- ✅ Breaking changes (major version bump)
- ✅ Performance improvements (patch version bump)
- ❌ Internal refactoring with no user impact
- ❌ Test-only changes
- ❌ Documentation updates (unless they reflect functional changes)

## Instructions

1. **Determine the Semver Level**:
   - `major`: Breaking changes that require user action
   - `minor`: New features, backwards-compatible additions
   - `patch`: Bug fixes, minor improvements, no breaking changes

2. **Create the Changeset File**:
   - Location: `.changeset/`
   - Filename: Use kebab-case describing the change (e.g., `fix-lint-file-return-format.md`)
   - **DO NOT** use the Changesets CLI

3. **File Format**:
   ```md
   ---
   '@lapidist/design-lint': [SEMVER_LEVEL]
   ---

   [Description of the change]
   ```

## Examples

### Bug Fix (Patch)
Filename: `.changeset/fix-empty-file-handling.md`
```md
---
'@lapidist/design-lint': patch
---

fix: handle empty files correctly in lintFile function
```

### New Feature (Minor)
Filename: `.changeset/add-animation-token-support.md`
```md
---
'@lapidist/design-lint': minor
---

feat: add support for animation design tokens
```

### Breaking Change (Major)
Filename: `.changeset/remove-deprecated-api.md`
```md
---
'@lapidist/design-lint': major
---

BREAKING: remove deprecated lintFiles legacy format
```

### Internal Change (No Changeset Needed)
```md
# For internal refactoring, test updates, or docs-only changes:
# NO CHANGESET REQUIRED
```

## Changeset Description Guidelines

- Start with the change type (fix:, feat:, etc.) matching your commit message
- Be clear and concise
- Explain what changed from the user's perspective
- For breaking changes, prefix with "BREAKING:"
- Use imperative mood

## Workflow Integration

1. Make your code changes
2. Run tests and validation (see `/test` command)
3. Create changeset file if needed
4. Commit both code and changeset together
5. Follow conventional commit format (see `/commit` command)

## Checking Existing Changesets

To see existing changesets:
```bash
ls -la .changeset/
cat .changeset/[filename].md
```

## Important Reminders

- ❌ DO NOT run `npm run changeset` or `changeset` CLI
- ✅ Manually create files in `.changeset/` directory
- ✅ Use descriptive kebab-case filenames
- ✅ Follow the exact YAML frontmatter format
- ✅ Include changesets in the same commit as the changes

## After Creating

The changeset will be automatically processed during release:
- Changelog entry will be generated
- Version will be bumped according to semver level
- Package will be published to npm

## Questions?

- See existing changesets in `.changeset/` for examples
- Review `AGENTS.md` for more guidance
- Check `docs/changelog-guide.md` if available
