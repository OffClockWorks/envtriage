'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze } = require('../lib/check');

const codes = (r) => r.issues.map((i) => `${i.level}:${i.code}:${i.key}`).sort();

test('matching files are ok with no issues', () => {
  const r = analyze('A=1\nB=2\n', 'A=\nB=\n');
  assert.equal(r.ok, true);
  assert.deepEqual(r.issues, []);
});

test('missing key is an error', () => {
  const r = analyze('A=1\n', 'A=\nDATABASE_URL=\n');
  assert.equal(r.ok, false);
  assert.equal(r.errors, 1);
  assert.deepEqual(codes(r), ['error:MISSING:DATABASE_URL']);
  assert.match(r.issues[0].message, /line 2/);
});

test('empty, extra and duplicate keys are warnings', () => {
  const r = analyze('A=\nB=1\nB=2\nEXTRA=x\n', 'A=\nB=\n');
  assert.equal(r.ok, true);
  assert.deepEqual(codes(r), ['warn:DUPLICATE:B', 'warn:EMPTY:A', 'warn:EXTRA:EXTRA']);
});

test('strict mode turns warnings into errors', () => {
  const r = analyze('A=\nEXTRA=x\n', 'A=\n', { strict: true });
  assert.equal(r.ok, false);
  assert.equal(r.warnings, 0);
  assert.deepEqual(codes(r), ['error:EMPTY:A', 'error:EXTRA:EXTRA']);
});

test('parse problems in either file are errors', () => {
  const r = analyze('A=1\nbroken line\n', 'A=\n"bad\n', { envName: 'x.env', exampleName: 'x.example' });
  assert.equal(r.ok, false);
  const parse = r.issues.filter((i) => i.code === 'PARSE');
  assert.deepEqual(parse.map((i) => `${i.file}:${i.line}`), ['x.env:2', 'x.example:2']);
});

test('issues never contain values', () => {
  const secret = 'sk_live_DO_NOT_LEAK_123';
  const r = analyze(`A=${secret}\nEXTRA=${secret}\nA=${secret}\n`, 'A=\nB=\n');
  assert.ok(!JSON.stringify(r).includes(secret));
});
