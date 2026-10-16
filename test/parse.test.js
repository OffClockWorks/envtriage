'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parse, toMap } = require('../lib/parse');

const val = (text, key) => toMap(parse(text).entries).get(key);

test('plain values, export prefix, comments and blank lines', () => {
  const r = parse('# top\n\nA=1\nexport B=two\n  C = spaced  \n');
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.entries.map((e) => [e.key, e.value]), [['A', '1'], ['B', 'two'], ['C', 'spaced']]);
});

test('inline comment needs whitespace before #', () => {
  assert.equal(val('A=abc # note', 'A'), 'abc');
  assert.equal(val('A=abc#def', 'A'), 'abc#def');
  assert.equal(val('A= # only a comment', 'A'), '');
  assert.equal(val('A=', 'A'), '');
});

test('double quotes keep # and handle escapes', () => {
  assert.equal(val('A="x # y"', 'A'), 'x # y');
  assert.equal(val('A="l1\\nl2\\t\\"q\\" \\\\n"', 'A'), 'l1\nl2\t"q" \\n');
  assert.equal(val('A="v" # trailing comment', 'A'), 'v');
});

test('single quotes and backticks are literal', () => {
  assert.equal(val("A='a\\nb $X'", 'A'), 'a\\nb $X');
  assert.equal(val('A=`it\'s`', 'A'), "it's");
});

test('multi-line double-quoted value', () => {
  const r = parse('KEY="-----BEGIN-----\nabc\n-----END-----"\nNEXT=1');
  assert.deepEqual(r.errors, []);
  assert.equal(r.entries[0].value, '-----BEGIN-----\nabc\n-----END-----');
  assert.equal(r.entries[0].line, 1);
  assert.equal(r.entries[0].endLine, 3);
  assert.equal(r.entries[1].key, 'NEXT');
  assert.equal(r.entries[1].line, 4);
});

test('unterminated quote is an error and does not swallow later lines', () => {
  const r = parse('A="open\nB=2\nC=3');
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].line, 1);
  assert.match(r.errors[0].message, /unterminated/);
  assert.deepEqual(r.entries.map((e) => e.key), ['B', 'C']);
});

test('bad lines are reported with line numbers', () => {
  const r = parse('GOOD=1\nnot an assignment\n1BAD=x\nmy key=x\nA="x" junk');
  assert.deepEqual(r.errors.map((e) => e.line), [2, 3, 4, 5]);
  assert.match(r.errors[0].message, /missing "="/);
  assert.match(r.errors[1].message, /invalid key/);
  assert.match(r.errors[3].message, /after the closing quote/);
  assert.deepEqual(r.entries.map((e) => e.key), ['GOOD']);
});

test('CRLF line endings and a UTF-8 BOM', () => {
  const r = parse('\uFEFFA=1\r\nB=2\r\n');
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.entries.map((e) => [e.key, e.value]), [['A', '1'], ['B', '2']]);
});

test('keys may contain dots and dashes; last duplicate wins in toMap', () => {
  assert.equal(val('app.name-x=1', 'app.name-x'), '1');
  assert.equal(val('A=1\nA=2', 'A'), '2');
});

test('never throws on junk input', () => {
  for (const junk of ['', '=', '"', '==', '\n\n\n', 'A="\\', String.fromCharCode(0)]) {
    assert.doesNotThrow(() => parse(junk));
  }
});
