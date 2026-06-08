import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { parse, stringify } from '../src/server.js';

test('parses basic KEY=value', () => {
  const v = parse('FOO=bar\nBAZ=qux');
  assert.deepEqual(v, { FOO: 'bar', BAZ: 'qux' });
});

test('strips inline single quotes', () => {
  const v = parse("PASSWORD='it''s secret'");
  // dotenv strips outer single quotes (inner '' stays literal per dotenv rules).
  assert.match(v.PASSWORD, /secret/);
});

test('strips inline double quotes + handles spaces', () => {
  const v = parse('MSG="hello world"');
  assert.equal(v.MSG, 'hello world');
});

test('skips comments', () => {
  const v = parse('# this is a comment\nFOO=bar\n');
  assert.deepEqual(v, { FOO: 'bar' });
});

test('stringify keeps unquoted when safe', () => {
  assert.match(stringify({ FOO: 'bar' }), /^FOO=bar$/);
});

test('stringify quotes values with spaces', () => {
  assert.match(stringify({ MSG: 'hello world' }), /^MSG="hello world"$/);
});

test('round trip', () => {
  const orig = { FOO: 'bar', MSG: 'hello world' };
  const back = parse(stringify(orig));
  assert.deepEqual(back, orig);
});

// Regression tests: stringify must produce output that parse reads back
// identically. The previous escaping assumed shell/JSON-style double-quote
// escapes, but dotenv only un-escapes \n and \r inside double quotes, so
// \\, \" and \$ were left literal and corrupted the value on parse.
test('round trips values containing a dollar sign', () => {
  const orig = { V: 'a$b' };
  assert.deepEqual(parse(stringify(orig)), orig);
});

test('round trips values containing a double quote', () => {
  const orig = { V: 'quote"inside' };
  assert.deepEqual(parse(stringify(orig)), orig);
});

test('round trips values containing a backslash', () => {
  const orig = { V: 'path\\to\\file with space' };
  assert.deepEqual(parse(stringify(orig)), orig);
});

test('round trips values containing a single quote', () => {
  const orig = { V: "single'quote" };
  assert.deepEqual(parse(stringify(orig)), orig);
});

test('round trips values containing a backtick', () => {
  const orig = { V: 'back`tick' };
  assert.deepEqual(parse(stringify(orig)), orig);
});

test('round trips values with embedded newlines', () => {
  const orig = { V: 'line1\nline2', W: 'win\r\nstyle' };
  assert.deepEqual(parse(stringify(orig)), orig);
});

test('round trips an empty value', () => {
  const orig = { V: '' };
  assert.deepEqual(parse(stringify(orig)), orig);
});

test('round trips a literal backslash-n (not a newline)', () => {
  const orig = { V: 'a\\nb' };
  assert.deepEqual(parse(stringify(orig)), orig);
});
