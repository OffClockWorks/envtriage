'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BIN = path.join(__dirname, '..', 'bin', 'envtriage.js');
const SECRET = 'sk_live_DO_NOT_LEAK_123';

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envtriage-'));
}

function run(args, cwd) {
  const r = spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

test('--help and --version exit 0', () => {
  const h = run(['--help'], tmpdir());
  assert.equal(h.code, 0);
  assert.match(h.out, /Usage:/);
  const v = run(['--version'], tmpdir());
  assert.equal(v.code, 0);
  assert.match(v.out, /^\d+\.\d+\.\d+\n$/);
});

test('no command prints help and exits 2', () => {
  const r = run([], tmpdir());
  assert.equal(r.code, 2);
  assert.match(r.out, /Usage:/);
});

test('unknown command or option exits 2', () => {
  assert.equal(run(['bogus'], tmpdir()).code, 2);
  assert.equal(run(['check', '--nope'], tmpdir()).code, 2);
  assert.equal(run(['check', '--env'], tmpdir()).code, 2);
});

test('check: clean files exit 0, missing key exits 1, secrets never printed', () => {
  const d = tmpdir();
  fs.writeFileSync(path.join(d, '.env'), `API_KEY=${SECRET}\nPORT=3000\n`);
  fs.writeFileSync(path.join(d, '.env.example'), 'API_KEY=\nPORT=\n');
  const ok = run(['check'], d);
  assert.equal(ok.code, 0, ok.out + ok.err);
  assert.match(ok.out, /0 errors, 0 warnings - ok/);

  fs.writeFileSync(path.join(d, '.env.example'), 'API_KEY=\nPORT=\nDATABASE_URL=\n');
  const bad = run(['check'], d);
  assert.equal(bad.code, 1);
  assert.match(bad.out, /ERROR MISSING\s+\.env\s+DATABASE_URL/);
  assert.ok(!bad.out.includes(SECRET));
});

test('check --json is valid JSON; --strict fails on warnings', () => {
  const d = tmpdir();
  fs.writeFileSync(path.join(d, 'a.env'), `A=${SECRET}\nEXTRA=1\n`);
  fs.writeFileSync(path.join(d, 'a.example'), 'A=\n');
  const j = run(['check', '--env', 'a.env', '--example=a.example', '--json'], d);
  assert.equal(j.code, 0);
  const parsed = JSON.parse(j.out);
  assert.equal(parsed.warnings, 1);
  assert.equal(parsed.issues[0].code, 'EXTRA');
  assert.ok(!j.out.includes(SECRET));
  assert.equal(run(['check', '--env', 'a.env', '--example', 'a.example', '--strict'], d).code, 1);
});

test('check without an example file explains how to make one', () => {
  const d = tmpdir();
  fs.writeFileSync(path.join(d, '.env'), 'A=1\n');
  const r = run(['check'], d);
  assert.equal(r.code, 2);
  assert.match(r.err, /envtriage example/);
});

test('check with a missing env file exits 2', () => {
  const d = tmpdir();
  fs.writeFileSync(path.join(d, '.env.example'), 'A=\n');
  const r = run(['check'], d);
  assert.equal(r.code, 2);
  assert.match(r.err, /cannot read \.env/);
});

test('example writes a value-free file and refuses to overwrite', () => {
  const d = tmpdir();
  fs.writeFileSync(path.join(d, '.env'), `# keys\nAPI_KEY=${SECRET}\n# OLD=${SECRET}\n`);
  const w = run(['example'], d);
  assert.equal(w.code, 0, w.err);
  const written = fs.readFileSync(path.join(d, '.env.example'), 'utf8');
  assert.equal(written, '# keys\nAPI_KEY=\n# OLD=\n');

  const again = run(['example'], d);
  assert.equal(again.code, 2);
  assert.match(again.err, /already exists/);
  assert.equal(run(['example', '--force'], d).code, 0);

  const s = run(['example', '--stdout'], d);
  assert.equal(s.code, 0);
  assert.equal(s.out, written);
  assert.ok(!s.out.includes(SECRET));
});

test('example refuses to overwrite the env file itself', () => {
  const d = tmpdir();
  fs.writeFileSync(path.join(d, '.env'), `A=${SECRET}\n`);
  const r = run(['example', '--out', '.env', '--force'], d);
  assert.equal(r.code, 2);
  assert.equal(fs.readFileSync(path.join(d, '.env'), 'utf8'), `A=${SECRET}\n`);
});

test('diff: exit 0 when same, 1 when different; values hidden by default', () => {
  const d = tmpdir();
  fs.writeFileSync(path.join(d, 'a'), `K=${SECRET}\nONLY_A=1\n`);
  fs.writeFileSync(path.join(d, 'b'), 'K=other\nONLY_B=1\n');
  fs.writeFileSync(path.join(d, 'c'), `K=${SECRET}\nONLY_A=1\n`);
  assert.equal(run(['diff', 'a', 'c'], d).code, 0);
  const r = run(['diff', 'a', 'b'], d);
  assert.equal(r.code, 1);
  assert.match(r.out, /only in a: ONLY_A/);
  assert.match(r.out, /only in b: ONLY_B/);
  assert.match(r.out, /differs: K/);
  assert.ok(!r.out.includes(SECRET));
  const shown = run(['diff', 'a', 'b', '--show-values'], d);
  assert.ok(shown.out.includes(SECRET));
  assert.equal(run(['diff', 'a'], d).code, 2);
});
