# Troubleshooting

## Config file not found
Run `npx design-lint init` to generate a configuration file. Use `--config` to specify a path.

## Unknown rule
Ensure the rule is spelled correctly and the plugin providing it is installed.

## Plugin failed to load
Node cannot resolve the plugin module. Check the package name and that it exports a `rules` array.

## Parser error
The file could not be parsed. Verify the file extension and that any `lang` attributes match the content.
