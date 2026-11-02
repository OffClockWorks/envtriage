# envtriage

Helps keep `.env` files honest without printing values by default.

Free and open source under the MIT license. Made by Off Clock Works, a small studio that builds developer tools, templates and starter kits.

`envtriage` is a small command-line tool with no dependencies. It does three things:

1. **check**: compares your `.env` with `.env.example` and reports missing keys, empty values, undocumented keys, duplicate keys and lines that cannot be parsed. Exit codes are made for CI.
2. **example**: writes a `.env.example` from your `.env` with every value removed. Commented-out assignments (`# OLD_KEY=...`) are blanked too, and a line it cannot parse is replaced by a note rather than copied.
3. **diff**: compares two env files (for example staging and production) by key. Values stay hidden unless you ask for them.

The output names keys, files and line numbers only. It does not print values unless you pass `diff --show-values`.

## Requirements

- Node.js 18 or newer (it uses only `node:test`, `node:fs` and other built-ins available since Node 18). 1.1.0 was tested on Node 22.22 and 26.5 on macOS (38 of 38 tests pass). Node 18 and 20 are expected to work but have not been tested.
- No npm packages. It uses only Node's built-in modules.

## Install

Clone the repository (or download it as a zip from GitHub), then do one of the following:

```sh
git clone https://github.com/OffClockWorks/envtriage.git

# run it directly
node /path/to/envtriage/bin/envtriage.js check

# or link it onto your PATH
cd /path/to/envtriage && npm link
envtriage --help
```

You can also copy the folder into a repo (for example `tools/envtriage/`) and call it from scripts or CI.

## Usage

```sh
envtriage check   [--env FILE] [--example FILE] [--strict] [--json]
envtriage example [--env FILE] [--out FILE] [--force | --stdout]
envtriage diff    FILE_A FILE_B [--show-values] [--json]
```

### check

Real output from the bundled demo (`cd examples/demo && node ../../bin/envtriage.js check`):

```sh
$ envtriage check
envtriage check: .env vs .env.example
  WARN  DUPLICATE .env:6  PORT is set 2 times (lines 3, 6); the last one wins
  ERROR MISSING   .env  DATABASE_URL is in .env.example (line 3) but not in .env
  WARN  EMPTY     .env:4  SENTRY_DSN is empty
  WARN  EXTRA     .env:7  OLD_FLAG is in .env but not documented in .env.example
1 error, 3 warnings
```

| Code | Level | Meaning |
|---|---|---|
| `MISSING` | error | Key is in the example but not in the env file |
| `PARSE` | error | A line in either file could not be read |
| `EMPTY` | warning | Key is present but its value is empty |
| `EXTRA` | warning | Key is in the env file but not in the example |
| `DUPLICATE` | warning | Key is set more than once in one file (the last one wins) |

`--strict` turns every warning into an error. `--json` prints a machine-readable result: `{ ok, errors, warnings, issues[] }`.

Defaults: `--env .env --example .env.example`.

### example

```sh
$ envtriage example
wrote .env.example (values removed)
```

The keys, their order, comments, blank lines and `export` prefixes are kept. Plain comments are copied as written, so if you pasted a secret into a free-text comment, remove it before you commit the example. (Commented-out lines in `KEY=value` form are blanked, including keys with spaces such as `# old key=...`. Other comment forms such as `# token: value` are copied as written. `example` does not detect a real secret typed into a free-text comment, so use a secret scanner for that.) A multi-line quoted value becomes one empty assignment. The command will not overwrite an existing file unless you pass `--force`, and it refuses to write to the same path as the env file it reads. `--stdout` prints the result instead of writing it.

### diff

Real output from the bundled demo (`examples/demo/.env.staging` and `.env.production`):

```sh
$ envtriage diff .env.staging .env.production
envtriage diff: .env.staging vs .env.production
  only in .env.staging: DEBUG
  only in .env.production: CDN_URL
  differs: DATABASE_URL
3 difference(s)
```

### Exit codes

| Code | check | diff |
|---|---|---|
| 0 | no errors | files match |
| 1 | errors found | differences or parse problems found |
| 2 | usage error or unreadable file | usage error or unreadable file |

## CI example (GitHub Actions)

```yaml
- name: Env file is complete
  run: |
    # .env.ci must be written from your CI secrets, with every value set
    node tools/envtriage/bin/envtriage.js check --env .env.ci --example .env.example --strict
```

With --strict, an empty value is an error, so a .env.ci copied from a blank .env.example will fail.

## Supported .env syntax

- `KEY=value`, with optional spaces around `=`
- `export KEY=value`
- `# comments` and blank lines
- An inline comment after an unquoted value needs a space before `#`: `PORT=3000 # web`. Without the space (`A=abc#def`), the `#` is part of the value.
- `"double quotes"` with `\n \r \t \" \\` escapes. Can span several lines.
- `'single quotes'` and `` `backticks` `` are literal.
- Key names: letters, digits, `_`, `.` and `-`. A key cannot start with a digit.
- CRLF line endings and a UTF-8 BOM
- `check` does not detect a real secret pasted into `.env.example`. Use a secret scanner for that.
- `example` blanks commented-out lines in `KEY=value` form, including keys with spaces such as `# old key=...`. Other comment forms such as `# token: value` are copied as written.

Not supported: variable expansion (`${OTHER}` is treated as literal text). envtriage checks files and never loads them into your environment.

## Use from code

```js
const { analyze, makeExample, diff, parse } = require('./envtriage/lib');
const result = analyze(envText, exampleText, { strict: true });
```

## Tests

```sh
npm test    # node --test, 38 tests, no dependencies
```

## Contributing

Issues and pull requests are welcome on GitHub. Please include a failing test with any bug report or fix.

## License

MIT. See `LICENSE`. © 2026 Hot Box Holdings LLC, d/b/a Off Clock Works.

Provided as is, with no warranty; see `LICENSE`. Not a substitute for a secret scanner.
