import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  Cipher,
  DecryptionError,
  FileExistsError,
  FormatError,
  NmodError,
  decryptFile,
  encryptFile,
} from '../src/index.ts';

const PASSPHRASE = 'file passphrase';
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'nmod-test-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function leftovers(): Promise<string[]> {
  const entries = await readdir(dir);
  return entries.filter((name) => name.includes('.tmp'));
}

test('encryptFile writes a separate .enc file and leaves the source untouched', async () => {
  const src = join(dir, 'note.txt');
  const original = 'Contenu sensible — données confidentielles 🔐';
  await writeFile(src, original, 'utf8');

  const dest = await encryptFile(src, PASSPHRASE);
  assert.equal(dest, `${src}.enc`);
  assert.equal((await readFile(src, 'utf8')), original);

  const encrypted = await readFile(dest);
  assert.ok(!encrypted.includes(Buffer.from(original, 'utf8')));
  assert.deepEqual(await leftovers(), []);
});

test('roundtrips a file with default destinations', async () => {
  const src = join(dir, 'data.bin');
  const original = randomBytes(64 * 1024);
  await writeFile(src, original);

  const enc = await encryptFile(src, PASSPHRASE);
  const restored = await decryptFile(enc, PASSPHRASE, undefined, {
    overwrite: true,
  });
  assert.equal(restored, src);
  assert.deepEqual(await readFile(src), original);
});

test('decryptFile honours an explicit destination', async () => {
  const src = join(dir, 'a.txt');
  const original = 'alice,bob,carol';
  await writeFile(src, original, 'utf8');

  const enc = await encryptFile(src, PASSPHRASE);
  const out = join(dir, 'restored.txt');
  await decryptFile(enc, PASSPHRASE, out);
  assert.equal(await readFile(out, 'utf8'), original);
  assert.equal(await readFile(src, 'utf8'), original);
});

test('decryptFile refuses to overwrite by default', async () => {
  const src = join(dir, 'a.txt');
  await writeFile(src, 'hello', 'utf8');
  const enc = await encryptFile(src, PASSPHRASE);

  await assert.rejects(decryptFile(enc, PASSPHRASE), FileExistsError);
  await assert.rejects(
    decryptFile(enc, PASSPHRASE, src),
    FileExistsError,
  );
});

test('encryptFile refuses to overwrite an existing destination', async () => {
  const src = join(dir, 'a.txt');
  await writeFile(src, 'hello', 'utf8');
  await writeFile(`${src}.enc`, 'existing', 'utf8');

  await assert.rejects(encryptFile(src, PASSPHRASE), FileExistsError);
  const ok = await encryptFile(src, PASSPHRASE, undefined, { overwrite: true });
  assert.ok((await stat(ok)).size > 0);
  assert.notEqual(await readFile(ok, 'utf8'), 'existing');
});

test('decryptFile with the wrong key fails without creating output', async () => {
  const src = join(dir, 'a.txt');
  await writeFile(src, 'top secret', 'utf8');
  const enc = await encryptFile(src, PASSPHRASE);

  const out = join(dir, 'restored.txt');
  await assert.rejects(decryptFile(enc, 'wrong key', out), DecryptionError);
  await assert.rejects(stat(out));
  assert.deepEqual(await leftovers(), []);
});

test('decryptFile rejects non-nmod and truncated files', async () => {
  const plain = join(dir, 'plain.txt');
  await writeFile(plain, 'this is not encrypted data at all, really not', 'utf8');
  await assert.rejects(decryptFile(plain, PASSPHRASE), FormatError);

  const src = join(dir, 'a.txt');
  await writeFile(src, 'a long enough source file to exceed the header size', 'utf8');
  const enc = await encryptFile(src, PASSPHRASE);
  const truncated = join(dir, 'trunc.enc');
  const data = await readFile(enc);
  await writeFile(truncated, data.subarray(0, data.length - 8));
  await assert.rejects(decryptFile(truncated, PASSPHRASE), DecryptionError);

  const tiny = join(dir, 'tiny.enc');
  await writeFile(tiny, data.subarray(0, 40));
  await assert.rejects(decryptFile(tiny, PASSPHRASE), FormatError);
  assert.deepEqual(await leftovers(), []);
});

test('encryptFile reports a missing source', async () => {
  await assert.rejects(
    encryptFile(join(dir, 'missing.txt'), PASSPHRASE),
    (error: unknown) => error instanceof NmodError && error.code === 'ENOENT',
  );
});

test('roundtrips an empty file', async () => {
  const src = join(dir, 'empty.txt');
  await writeFile(src, '');
  const enc = await encryptFile(src, PASSPHRASE);
  const out = join(dir, 'empty.out');
  await decryptFile(enc, PASSPHRASE, out);
  assert.equal((await readFile(out)).length, 0);
});

test('roundtrips a large file through the streaming path', async () => {
  const src = join(dir, 'large.bin');
  const original = randomBytes(5 * 1024 * 1024);
  await writeFile(src, original);
  const enc = await encryptFile(src, PASSPHRASE);
  const out = join(dir, 'large.out');
  await decryptFile(enc, PASSPHRASE, out);
  assert.deepEqual(await readFile(out), original);
});

test('Cipher instance file methods work', async () => {
  const cipher = new Cipher(PASSPHRASE);
  const src = join(dir, 'instance.txt');
  await writeFile(src, 'via instance', 'utf8');
  const enc = await cipher.encryptFile(src);
  const out = join(dir, 'instance.out');
  await cipher.decryptFile(enc, out);
  assert.equal(await readFile(out, 'utf8'), 'via instance');
});
