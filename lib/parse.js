'use strict';

// Parser for .env files. It understands:
//   KEY=value            plain values (an inline " #" starts a comment)
//   export KEY=value     shell-style export prefix
//   KEY="a\nb"           double quotes, with \n \r \t \" \\ escapes, may span lines
//   KEY='literal'        single quotes, no escapes
//   KEY=`literal`        backticks, no escapes
//   # comment / blank    ignored
// It never throws on bad input. Problems come back in `errors` with line numbers.

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const ESCAPES = { n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\' };

function findClose(buf, quote) {
  for (let i = 0; i < buf.length; i++) {
    const ch = buf[i];
    if (quote === '"' && ch === '\\') {
      i++; // skip the escaped character
      continue;
    }
    if (ch === quote) return i;
  }
  return -1;
}

function parse(text) {
  const entries = [];
  const errors = [];
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    let body = raw.replace(/^\s+/, '');
    if (/^export\s+/.test(body)) body = body.replace(/^export\s+/, '');

    const eq = body.indexOf('=');
    if (eq === -1) {
      errors.push({ line: lineNo, message: 'missing "=" (expected KEY=value)' });
      continue;
    }

    const key = body.slice(0, eq).trim();
    if (!KEY_RE.test(key)) {
      errors.push({ line: lineNo, message: 'invalid key name (use letters, digits, _ . -; must not start with a digit)' });
      continue;
    }

    const rest = body.slice(eq + 1).replace(/^\s+/, '');
    const q = rest[0];

    if (q === '"' || q === "'" || q === '`') {
      const startIdx = i;
      let buf = rest.slice(1);
      let end = findClose(buf, q);
      while (end === -1 && i + 1 < lines.length) {
        i++;
        buf += '\n' + lines[i];
        end = findClose(buf, q);
      }
      if (end === -1) {
        i = startIdx; // do not swallow the rest of the file
        errors.push({ line: lineNo, message: `unterminated ${q} quote for ${key}` });
        continue;
      }
      const after = buf.slice(end + 1).trim();
      if (after && !after.startsWith('#')) {
        errors.push({ line: lineNo, endLine: i + 1, message: `unexpected text after the closing quote for ${key}` });
        continue;
      }
      let value = buf.slice(0, end);
      if (q === '"') {
        value = value.replace(/\\(.)/g, (m, c) => (c in ESCAPES ? ESCAPES[c] : m));
      }
      entries.push({ key, value, line: lineNo, endLine: i + 1, quoted: q });
    } else {
      let value;
      if (rest.startsWith('#')) {
        value = '';
      } else {
        const hash = rest.search(/\s#/);
        value = (hash === -1 ? rest : rest.slice(0, hash)).trim();
      }
      entries.push({ key, value, line: lineNo, endLine: lineNo, quoted: null });
    }
  }

  return { entries, errors };
}

// Last assignment wins, the same as loading the file top to bottom.
function toMap(entries) {
  const map = new Map();
  for (const e of entries) map.set(e.key, e.value);
  return map;
}

module.exports = { parse, toMap, KEY_RE };
