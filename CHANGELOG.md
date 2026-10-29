# Changelog

## 1.1.0 (2026-10-15)
- Command, bin file and messages now use the name envtriage.
- Relicensed under MIT and released as free open source. The commercial license no longer applies.
- README: install from GitHub and contributing notes.
- Added CI (GitHub Actions, Node 20/22/24), SECURITY.md, CONTRIBUTING.md and issue templates.

## 1.0.1 (2026-10-15)
- `example` now blanks commented-out assignments whose keys contain spaces, such as `# old key=...`.
- `diff` no longer reports files as the same when either file has parse errors. With no key differences it prints a parse-problem count instead.
- The `test` script runs `node --test`. The package now ships `test/`, `examples/` and `CHANGELOG.md`.
- README: the CI snippet passes `--example` and explains that `--strict` fails on blank values. Limits of `example` and `check` are documented.

## 1.0.0 (2026-10-15)
- First release. Includes `check`, `example` and `diff` commands, JSON output, strict mode and CI exit codes.
