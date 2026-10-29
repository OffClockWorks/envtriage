# Contributing

Thanks for helping.

- envtriage has no dependencies. Please keep it that way: use Node built-ins only.
- Run the tests before you open a pull request: `node --test` (Node 18 or newer).
- Every bug fix needs a test that fails without the fix.
- Never put a real secret in a test, fixture or issue. Use obvious fakes like `sk_test_FAKE_DO_NOT_USE`.
- Output must name keys, files and line numbers only. A change that can print a value is a bug, except for `diff --show-values`.
- Add a line to `CHANGELOG.md` under an "Unreleased" heading.

Security problems: see `SECURITY.md` instead of opening a public issue.
