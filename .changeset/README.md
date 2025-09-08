# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and releases across all packages in the `packages/` directory.

## Creating a changeset

Create a markdown file under the `.changeset` folder that lists the packages affected:

```md
---
'@lapidist/design-lint-core': patch
---

describe your change
```

Each file should use a descriptive kebab-case filename and list every package that needs a version bump. The `packages` option in `.changeset/config.json` is set to `"packages/*"` so Changesets can detect all packages.

Do not run the Changesets CLI; just add the file to the repository.
