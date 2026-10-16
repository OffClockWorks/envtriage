'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { diff } = require('../lib/diff');

test('identical key sets and values are the same', () => {
  const r = diff('A=1\nB=2', 'B=2\nA=1');
  assert.equal(r.same, true);
});

test('reports only-in-A, only-in-B and changed keys, sorted', () => {
  const r = diff('Z=1\nA=1\nSAME=x\nCHG=old', 'B=1\nSAME=x\nCHG=new');
  assert.equal(r.same, false);
  assert.deepEqual(r.onlyA, ['A', 'Z']);
  assert.deepEqual(r.onlyB, ['B']);
  assert.deepEqual(r.changed, [{ key: 'CHG' }]);
});

test('values are hidden unless showValues is set', () => {
  const secret = 'sk_live_DO_NOT_LEAK_123';
  const hidden = diff(`K=${secret}`, 'K=other');
  assert.ok(!JSON.stringify(hidden).includes(secret));
  const shown = diff(`K=${secret}`, 'K=other', { showValues: true });
  assert.deepEqual(shown.changed, [{ key: 'K', a: secret, b: 'other' }]);
});

test('diff is not "same" when either file has parse errors', () => {
  const bad = 'A=1\nB="oops\n';
  assert.equal(diff(bad, bad).same, false);
});

test('parse errors are returned per file', () => {
  const r = diff('bad line', 'A=1\n"x');
  assert.equal(r.errors.a.length, 1);
  assert.equal(r.errors.b.length, 1);
});
