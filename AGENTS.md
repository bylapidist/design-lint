# AGENTS

This repository requires Node.js >= 18 and follows strict [Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/) (Angular style) for commit messages.

## Before committing

1. Ensure dependencies are installed with `npm install` if needed.
2. Run **and pass** the following commands:
   - `npm run lint`
   - `npm run format:check`
   - `npm test`

## Changesets and releases

- For any new feature or bug fix, create a changeset to generate the changelog and version bump:

  ```
  npm run changeset
  ```

  Select the correct semver bump (major, minor, patch).

## Commit guidelines

- Use Angular/Conventional Commit format: `type(scope): description`.
- Keep commits focused and explanatory.

## Additional notes

- Use `npm run format` to automatically format files when needed.
- Run `npm run build` when modifying source files to ensure the TypeScript build succeeds.
