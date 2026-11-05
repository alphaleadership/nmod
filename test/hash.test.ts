import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AlgorithmError, hash, hashFile } from '../src/index.ts';

test('sha256 matches the known vector for "abc"', () => {
  assert.equal(
    hash('abc', 'sha256'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

test('sha512 matches the known vector for "abc"', () => {
  assert.equal(
    hash('abc', 'sha512'),
    'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
  );
});

test('blake2b512 matches the known vector for "abc"', () => {
  assert.equal(
    hash('abc', 'blake2b512'),
    'ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923',
  );
});

test('defaults to sha256 and accepts buffers', () => {
  assert.equal(hash('abc'), hash('abc', 'sha256'));
  assert.equal(hash(Buffer.from('abc')), hash('abc'));
});

test('is deterministic and input-sensitive', () => {
  assert.equal(hash('data'), hash('data'));
  assert.notEqual(hash('data'), hash('data2'));
});

test('rejects unsupported algorithms', () => {
  assert.throws(() => hash('x', 'md5' as 'sha256'), AlgorithmError);
});

test('hashFile matches hash of the same bytes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nmod-hash-'));
  try {
    const path = join(dir, 'payload.bin');
    const content = Buffer.from('The quick brown fox jumps over the lazy dog');
    await writeFile(path, content);
    assert.equal(await hashFile(path), hash(content));
    assert.equal(await hashFile(path, 'sha512'), hash(content, 'sha512'));
    await assert.rejects(hashFile(join(dir, 'missing.bin')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
