import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKey, InvalidKeyError, KEY_BYTES } from '../src/index.ts';

test('generateKey returns a base64url string of the requested size', () => {
  const key = generateKey();
  assert.match(key, /^[A-Za-z0-9_-]+$/);
  assert.equal(Buffer.from(key, 'base64url').length, KEY_BYTES);
  const small = generateKey(16);
  assert.equal(Buffer.from(small, 'base64url').length, 16);
});

test('generateKey produces unique values', () => {
  const keys = new Set(Array.from({ length: 50 }, () => generateKey()));
  assert.equal(keys.size, 50);
});

test('generateKey rejects invalid sizes', () => {
  assert.throws(() => generateKey(0), InvalidKeyError);
  assert.throws(() => generateKey(8), InvalidKeyError);
  assert.throws(() => generateKey(1.5), InvalidKeyError);
  assert.throws(() => generateKey(5000), InvalidKeyError);
  assert.throws(() => generateKey(Number.NaN), InvalidKeyError);
});
