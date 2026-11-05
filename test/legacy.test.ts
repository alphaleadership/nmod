import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DecryptionError, NmodError, decryptV1, decryptV1File } from '../src/index.ts';

function encryptV1(data: Buffer, key: string): Buffer {
  const iv = randomBytes(16);
  const derived = createHash('sha256').update(key).digest();
  const cipher = createCipheriv('aes-256-ctr', derived, iv);
  return Buffer.concat([iv, cipher.update(data), cipher.final()]);
}

const PASSPHRASE = 'legacy passphrase';

test('decryptV1 recovers the original buffer', () => {
  const original = randomBytes(512);
  const encrypted = encryptV1(original, PASSPHRASE);
  assert.deepEqual(decryptV1(encrypted, PASSPHRASE), original);
});

test('decryptV1 accepts the base64 form produced by v1 for strings', () => {
  const original = Buffer.from('ancien message chiffré en v1', 'utf8');
  const encrypted = encryptV1(original, PASSPHRASE);
  const recovered = decryptV1(encrypted.toString('base64'), PASSPHRASE);
  assert.equal(recovered.toString('utf8'), 'ancien message chiffré en v1');
});

test('decryptV1 produces different output with the wrong key', () => {
  const original = Buffer.from('structured content for comparison', 'utf8');
  const encrypted = encryptV1(original, PASSPHRASE);
  assert.notDeepEqual(decryptV1(encrypted, 'wrong'), original);
});

test('decryptV1 rejects short data and empty keys', () => {
  assert.throws(() => decryptV1(randomBytes(8), PASSPHRASE), DecryptionError);
  assert.throws(() => decryptV1(randomBytes(64), ''), NmodError);
});

test('decryptV1File restores a v1 file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nmod-legacy-'));
  try {
    const original = randomBytes(4096);
    const src = join(dir, 'old-v1.dat');
    await writeFile(src, encryptV1(original, PASSPHRASE));

    const out = join(dir, 'restored.dat');
    const dest = await decryptV1File(src, PASSPHRASE, out);
    assert.equal(dest, out);
    assert.deepEqual(await readFile(out), original);

    await assert.rejects(decryptV1File(src, PASSPHRASE, out), NmodError);
    await assert.rejects(decryptV1File(join(dir, 'missing.dat'), PASSPHRASE));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
