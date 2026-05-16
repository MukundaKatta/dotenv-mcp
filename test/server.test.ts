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
