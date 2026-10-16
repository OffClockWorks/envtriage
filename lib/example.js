'use strict';

const { parse } = require('./parse');

// "# KEY=value" or "# export KEY=value": a commented-out assignment, which
// often holds an old secret. Its value is removed too.
const COMMENTED_ASSIGN = /^(\s*#\s*)(export\s+)?([A-Za-z_][A-Za-z0-9_.-]*(?:[ \t]+[A-Za-z0-9_.-]+)*)(\s*=)/;

// Build a .env.example from a .env: same keys, same order, comments and blank
// lines kept, every value removed. Lines that cannot be parsed are replaced by
// a note, so a malformed secret never reaches the example file.
function makeExample(text) {
  const clean = String(text).replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/);
  const { entries, errors } = parse(clean);
  const starts = new Map(entries.map((e) => [e.line, e]));
  const errAt = new Map(errors.map((e) => [e.line, e]));
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const n = i + 1;
    const line = lines[i];

    const entry = starts.get(n);
    if (entry) {
      const exp = /^\s*export\s+/.test(line) ? 'export ' : '';
      out.push(`${exp}${entry.key}=`);
      i = entry.endLine - 1;
      continue;
    }

    const err = errAt.get(n);
    if (err) {
      out.push(`# envtriage: line ${n} skipped (${err.message})`);
      if (err.endLine) i = err.endLine - 1;
      continue;
    }

    const m = line.match(COMMENTED_ASSIGN);
    if (m) {
      out.push(`${m[1]}${m[2] || ''}${m[3]}${m[4]}`);
      continue;
    }

    out.push(line);
  }

  return out.join('\n');
}

module.exports = { makeExample };
