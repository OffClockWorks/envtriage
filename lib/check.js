'use strict';

const { parse } = require('./parse');

function index(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.key)) map.set(e.key, []);
    map.get(e.key).push(e);
  }
  return map;
}

// Compare an env file with its example/template file.
// Issue codes:
//   PARSE      a line could not be read (error)
//   MISSING    key is in the example but not in the env file (error)
//   EMPTY      key is present but has an empty value (warning)
//   EXTRA      key is in the env file but not documented in the example (warning)
//   DUPLICATE  key is set more than once in one file (warning)
// With opts.strict every warning becomes an error.
// Issues never contain values, only key names, files and line numbers.
function analyze(envText, exampleText, opts = {}) {
  const envName = opts.envName || '.env';
  const exName = opts.exampleName || '.env.example';
  const env = parse(envText);
  const ex = parse(exampleText);
  const issues = [];
  const add = (level, code, key, file, line, message) =>
    issues.push({ level, code, key, file, line, message });

  for (const e of env.errors) add('error', 'PARSE', null, envName, e.line, e.message);
  for (const e of ex.errors) add('error', 'PARSE', null, exName, e.line, e.message);

  const ei = index(env.entries);
  const xi = index(ex.entries);

  for (const [file, idx] of [[envName, ei], [exName, xi]]) {
    for (const [k, list] of idx) {
      if (list.length > 1) {
        add('warn', 'DUPLICATE', k, file, list[1].line,
          `${k} is set ${list.length} times (lines ${list.map((x) => x.line).join(', ')}); the last one wins`);
      }
    }
  }

  for (const [k, list] of xi) {
    if (!ei.has(k)) {
      add('error', 'MISSING', k, envName, null, `${k} is in ${exName} (line ${list[0].line}) but not in ${envName}`);
    } else {
      const last = ei.get(k)[ei.get(k).length - 1];
      if (last.value === '') add('warn', 'EMPTY', k, envName, last.line, `${k} is empty`);
    }
  }

  for (const [k, list] of ei) {
    if (!xi.has(k)) {
      add('warn', 'EXTRA', k, envName, list[0].line, `${k} is in ${envName} but not documented in ${exName}`);
    }
  }

  if (opts.strict) for (const i of issues) if (i.level === 'warn') i.level = 'error';

  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.length - errors;
  return { ok: errors === 0, errors, warnings, issues };
}

module.exports = { analyze };
