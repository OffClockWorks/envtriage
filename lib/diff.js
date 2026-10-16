'use strict';

const { parse, toMap } = require('./parse');

// Compare two env files by key. Values are compared but not returned unless
// opts.showValues is set.
function diff(aText, bText, opts = {}) {
  const a = parse(aText);
  const b = parse(bText);
  const am = toMap(a.entries);
  const bm = toMap(b.entries);

  const onlyA = [...am.keys()].filter((k) => !bm.has(k)).sort();
  const onlyB = [...bm.keys()].filter((k) => !am.has(k)).sort();
  const changedKeys = [...am.keys()].filter((k) => bm.has(k) && am.get(k) !== bm.get(k)).sort();

  const changed = changedKeys.map((key) =>
    opts.showValues ? { key, a: am.get(key), b: bm.get(key) } : { key });

  return {
    same: onlyA.length + onlyB.length + changed.length === 0 && a.errors.length === 0 && b.errors.length === 0,
    onlyA,
    onlyB,
    changed,
    errors: { a: a.errors, b: b.errors },
  };
}

module.exports = { diff };
