'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { makeExample } = require('../lib/example');
const { parse } = require('../lib/parse');

const SECRET = 'sk_live_DO_NOT_LEAK_123';

test('removes values, keeps keys, order, comments and blank lines', () => {
  const input = `# Database\nDATABASE_URL=postgres://u:${SECRET}@h/db\n\n# Stripe\nexport STRIPE_KEY="${SECRET}"\nPORT=3000 # web port\n`;
  const out = makeExample(input);
  assert.equal(out, '# Database\nDATABASE_URL=\n\n# Stripe\nexport STRIPE_KEY=\nPORT=\n');
});

test('blanks commented-out assignments', () => {
  const out = makeExample(`# OLD_KEY=${SECRET}\n#export OTHER = ${SECRET}\n# just a note\n`);
  assert.equal(out, '# OLD_KEY=\n#export OTHER =\n# just a note\n');
});

test('multi-line values collapse to one empty line', () => {
  const out = makeExample(`CERT="-----BEGIN-----\n${SECRET}\n-----END-----"\nNEXT=1\n`);
  assert.equal(out, 'CERT=\nNEXT=\n');
});

test('unparseable lines are replaced by a note, never copied', () => {
  const out = makeExample(`A=1\n${SECRET}\nB="${SECRET}\nC=3\n`);
  assert.ok(!out.includes(SECRET));
  assert.match(out, /# envtriage: line 2 skipped/);
  assert.match(out, /# envtriage: line 3 skipped/);
  assert.match(out, /^C=$/m);
});

test('output parses cleanly and has the same keys with empty values', () => {
  const input = 'A=1\nexport B="x"\nC=\'y\'\n';
  const r = parse(makeExample(input));
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.entries.map((e) => [e.key, e.value]), [['A', ''], ['B', ''], ['C', '']]);
});

test('blanks commented assignments with spaces in the key', () => {
  const out = makeExample('# old key=sk_live_123\nAPP=1\n');
  assert.ok(!out.includes('sk_live'));
  assert.equal(out.split('\n')[0], '# old key=');
});

test('handles CRLF and BOM input', () => {
  assert.equal(makeExample('\uFEFFA=1\r\nB=2\r\n'), 'A=\nB=\n');
});
