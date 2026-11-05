import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  Cipher,
  DecryptionError,
  FormatError,
  InvalidKeyError,
  decrypt,
  encrypt,
} from '../src/index.ts';

const PASSPHRASE = 'correct horse battery staple';

test('roundtrips a UTF-8 string', () => {
  const cipher = new Cipher(PASSPHRASE);
  const input = 'Bonjour à tous ! 🚀 Ω≈ç√∫';
  const encrypted = cipher.encrypt(input);
  assert.ok(Buffer.isBuffer(encrypted));
  assert.equal(cipher.decrypt(encrypted).toString('utf8'), input);
});

test('roundtrips binary data', () => {
  const key = new Uint8Array(32).fill(7);
  const cipher = new Cipher(key);
  const input = randomBytes(1024);
  const encrypted = cipher.encrypt(input);
  assert.deepEqual(cipher.decrypt(encrypted), input);
});

test('roundtrips an empty payload', () => {
  const cipher = new Cipher(PASSPHRASE);
  const encrypted = cipher.encrypt('');
  const decrypted = cipher.decrypt(encrypted);
  assert.equal(decrypted.length, 0);
});

test('ciphertext is not deterministic', () => {
  const cipher = new Cipher(PASSPHRASE);
  const a = cipher.encrypt('same input');
  const b = cipher.encrypt('same input');
  assert.notDeepEqual(a, b);
});

test('standalone encrypt/decrypt match the class', () => {
  const encrypted = encrypt('payload', PASSPHRASE);
  assert.equal(decrypt(encrypted, PASSPHRASE).toString('utf8'), 'payload');
});

test('rejects the wrong passphrase', () => {
  const encrypted = encrypt('secret', 'right-key');
  assert.throws(() => decrypt(encrypted, 'wrong-key'), DecryptionError);
});

test('rejects the wrong raw key', () => {
  const keyA = new Uint8Array(32).fill(1);
  const keyB = new Uint8Array(32).fill(2);
  const encrypted = encrypt('secret', keyA);
  assert.throws(() => decrypt(encrypted, keyB), DecryptionError);
});

test('rejects tampered ciphertext', () => {
  const encrypted = encrypt('secret payload', PASSPHRASE);
  const tampered = Buffer.from(encrypted);
  const index = 40 + Math.floor(Math.random() * (tampered.length - 56));
  tampered[index] = (tampered[index]! ^ 0xff) & 0xff;
  assert.throws(() => decrypt(tampered, PASSPHRASE), DecryptionError);
});

test('rejects a tampered auth tag', () => {
  const encrypted = encrypt('secret payload', PASSPHRASE);
  const tampered = Buffer.from(encrypted);
  tampered[tampered.length - 1] = (tampered[tampered.length - 1]! ^ 0x01) & 0xff;
  assert.throws(() => decrypt(tampered, PASSPHRASE), DecryptionError);
});

test('rejects non-nmod data', () => {
  const garbage = randomBytes(200);
  garbage.write('NOTNMOD', 0, 'ascii');
  assert.throws(() => decrypt(garbage, PASSPHRASE), FormatError);
  assert.throws(() => decrypt(randomBytes(10), PASSPHRASE), FormatError);
});

test('rejects truncated ciphertext', () => {
  const encrypted = encrypt('secret payload', PASSPHRASE);
  assert.throws(
    () => decrypt(encrypted.subarray(0, encrypted.length - 10), PASSPHRASE),
    DecryptionError,
  );
  assert.throws(
    () => decrypt(encrypted.subarray(0, 20), PASSPHRASE),
    FormatError,
  );
});

test('validates keys at construction time', () => {
  assert.throws(() => new Cipher(''), InvalidKeyError);
  assert.throws(() => new Cipher(new Uint8Array(16)), InvalidKeyError);
  assert.throws(() => new Cipher(42 as unknown as string), InvalidKeyError);
});

test('raw keys and passphrases are interchangeable per instance', () => {
  const raw = randomBytes(32);
  const a = new Cipher(raw).encrypt('data');
  const b = new Cipher(Buffer.from(raw)).decrypt(a);
  assert.equal(b.toString('utf8'), 'data');
  const p1 = new Cipher(PASSPHRASE, { scrypt: { logN: 12 } }).encrypt('data');
  const p2 = new Cipher(PASSPHRASE, { scrypt: { logN: 12 } }).decrypt(p1);
  assert.equal(p2.toString('utf8'), 'data');
});
