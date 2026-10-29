# Security policy

envtriage reads `.env` files and is designed not to print their values unless you pass `diff --show-values`. If you find another way to make it print, write or leak a value, please treat that as a security issue.

## Reporting

Email offclockworks@givemeprompts.com with:

- the envtriage version (`CHANGELOG.md` top entry or `package.json`),
- the command you ran and a minimal env file that reproduces the issue, using fake values only.

Please do not open a public issue for a leak until it is fixed. We will reply as soon as we can. This is a small project with no bug bounty.

## Supported versions

Only the latest release receives fixes.
