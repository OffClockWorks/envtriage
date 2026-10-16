# envtriage v1.1.0

First public release of envtriage, free and open source under the MIT license.

envtriage keeps `.env` files honest without printing secrets. It has no dependencies and needs Node.js 18 or newer.

## What it does

- `envtriage check` compares `.env` with `.env.example` and reports missing keys, empty values, undocumented keys, duplicates and unreadable lines, with CI-friendly exit codes, `--strict` and `--json`.
- `envtriage example` writes a value-free `.env.example` from your `.env`.
- `envtriage diff` compares two env files by key. Values stay hidden unless you pass `--show-values`.

## Changes in 1.1.0

- Renamed from env-doctor to envtriage.
- Relicensed under MIT.
- Added CI on Node 20, 22 and 24, plus SECURITY.md, CONTRIBUTING.md and issue templates.

## Install

```sh
git clone https://github.com/OffClockWorks/envtriage.git
cd envtriage && npm link
envtriage --help
```

Not published to npm.

## Tests

38 tests with `node --test`, no dependencies.
