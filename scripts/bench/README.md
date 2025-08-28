# Benchmarks

Measure lint performance on a set of files.

## Usage

```bash
npm run build
DESIGNLINT_PROFILE=1 node scripts/bench/fs.js [files or directories]
```

The `DESIGNLINT_PROFILE` environment variable enables timing information for
file-system traversal inside the linter.
