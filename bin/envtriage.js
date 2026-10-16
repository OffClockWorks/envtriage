#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { analyze } = require('../lib/check');
const { makeExample } = require('../lib/example');
const { diff } = require('../lib/diff');
const pkg = require('../package.json');

const HELP = `envtriage ${pkg.version}: keep .env files honest without printing secrets

Usage:
  envtriage check   [--env FILE] [--example FILE] [--strict] [--json]
  envtriage example [--env FILE] [--out FILE] [--force | --stdout]
  envtriage diff    FILE_A FILE_B [--show-values] [--json]

Commands:
  check     Compare an env file with its example. Reports MISSING keys (error),
            PARSE problems (error), EMPTY values, EXTRA undocumented keys and
            DUPLICATE keys (warnings). --strict turns warnings into errors.
            Defaults: --env .env  --example .env.example
  example   Write a .env.example from a .env with every value removed.
            Comments are kept; commented-out assignments are blanked too.
            Defaults: --env .env  --out .env.example (refuses to overwrite
            without --force; --stdout prints instead of writing).
  diff      Show keys only in A, only in B, and keys whose values differ.
            Values are hidden unless --show-values is given.

Exit codes:
  0  clean (check: no errors; diff: files match)
  1  problems found (check: errors; diff: differences)
  2  usage error or unreadable file

Options:
  -h, --help     show this help
  -v, --version  show the version
`;

class UsageError extends Error {}

const VALUE_FLAGS = new Set(['env', 'example', 'out']);
const ALLOWED = {
  check: new Set(['env', 'example', 'strict', 'json']),
  example: new Set(['env', 'out', 'force', 'stdout']),
  diff: new Set(['show-values', 'json']),
};

function parseArgs(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h') flags.help = true;
    else if (a === '-v') flags.version = true;
    else if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const name = a.slice(2);
        if (VALUE_FLAGS.has(name)) {
          const v = argv[++i];
          if (v === undefined || v.startsWith('--')) throw new UsageError(`--${name} needs a file path`);
          flags[name] = v;
        } else {
          flags[name] = true;
        }
      }
    } else {
      pos.push(a);
    }
  }
  return { flags, pos };
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw new UsageError(`cannot read ${file} (${err.code || err.message})`);
  }
}

function formatIssue(i) {
  const where = i.line ? `${i.file}:${i.line}` : i.file;
  return `  ${i.level.toUpperCase().padEnd(5)} ${i.code.padEnd(9)} ${where}  ${i.message}`;
}

function cmdCheck(flags, out) {
  const envFile = flags.env || '.env';
  const exFile = flags.example || '.env.example';
  if (!fs.existsSync(exFile)) {
    throw new UsageError(`${exFile} not found. Create one with: envtriage example --env ${envFile}`);
  }
  const result = analyze(readText(envFile), readText(exFile), {
    strict: Boolean(flags.strict),
    envName: envFile,
    exampleName: exFile,
  });
  if (flags.json) {
    out.stdout(JSON.stringify(result, null, 2) + '\n');
  } else {
    out.stdout(`envtriage check: ${envFile} vs ${exFile}\n`);
    for (const i of result.issues) out.stdout(formatIssue(i) + '\n');
    const e = result.errors;
    const w = result.warnings;
    out.stdout(`${e} error${e === 1 ? '' : 's'}, ${w} warning${w === 1 ? '' : 's'}${result.ok ? ' - ok' : ''}\n`);
  }
  return result.ok ? 0 : 1;
}

function cmdExample(flags, out) {
  const envFile = flags.env || '.env';
  const text = makeExample(readText(envFile));
  if (flags.stdout) {
    out.stdout(text);
    return 0;
  }
  const outFile = flags.out || '.env.example';
  if (path.resolve(outFile) === path.resolve(envFile)) {
    throw new UsageError('--out is the same file as --env; refusing to overwrite your env file');
  }
  if (fs.existsSync(outFile) && !flags.force) {
    throw new UsageError(`${outFile} already exists. Use --force to overwrite or --stdout to print`);
  }
  fs.writeFileSync(outFile, text);
  out.stdout(`wrote ${outFile} (values removed)\n`);
  return 0;
}

function cmdDiff(flags, pos, out) {
  if (pos.length !== 2) throw new UsageError('diff needs exactly two files: envtriage diff FILE_A FILE_B');
  const [fa, fb] = pos;
  const result = diff(readText(fa), readText(fb), { showValues: Boolean(flags['show-values']) });
  if (flags.json) {
    out.stdout(JSON.stringify(result, null, 2) + '\n');
  } else {
    out.stdout(`envtriage diff: ${fa} vs ${fb}\n`);
    for (const k of result.onlyA) out.stdout(`  only in ${fa}: ${k}\n`);
    for (const k of result.onlyB) out.stdout(`  only in ${fb}: ${k}\n`);
    for (const c of result.changed) {
      out.stdout(flags['show-values']
        ? `  differs: ${c.key}  ${fa}=${JSON.stringify(c.a)}  ${fb}=${JSON.stringify(c.b)}\n`
        : `  differs: ${c.key}\n`);
    }
    for (const [label, errs] of [[fa, result.errors.a], [fb, result.errors.b]]) {
      for (const e of errs) out.stdout(`  parse problem ${label}:${e.line}  ${e.message}\n`);
    }
    const n = result.onlyA.length + result.onlyB.length + result.changed.length;
    const p = result.errors.a.length + result.errors.b.length;
    out.stdout(result.same ? 'no differences\n'
      : n ? `${n} difference(s)\n` : `${p} parse problem(s) found\n`);
  }
  return result.same ? 0 : 1;
}

function main(argv, out = { stdout: (s) => process.stdout.write(s), stderr: (s) => process.stderr.write(s) }) {
  try {
    const { flags, pos } = parseArgs(argv);
    if (flags.version) {
      out.stdout(pkg.version + '\n');
      return 0;
    }
    const cmd = pos.shift();
    if (flags.help || !cmd) {
      out.stdout(HELP);
      return cmd || flags.help ? 0 : 2;
    }
    if (!ALLOWED[cmd]) throw new UsageError(`unknown command "${cmd}". Run envtriage --help`);
    for (const f of Object.keys(flags)) {
      if (!ALLOWED[cmd].has(f)) throw new UsageError(`unknown option --${f} for ${cmd}`);
    }
    if (cmd !== 'diff' && pos.length) throw new UsageError(`unexpected argument "${pos[0]}"`);
    if (cmd === 'check') return cmdCheck(flags, out);
    if (cmd === 'example') return cmdExample(flags, out);
    return cmdDiff(flags, pos, out);
  } catch (err) {
    if (err instanceof UsageError) {
      out.stderr(`envtriage: ${err.message}\n`);
      return 2;
    }
    throw err;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main, parseArgs };
