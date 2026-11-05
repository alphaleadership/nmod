import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  Cipher,
  decrypt,
  decryptFile,
  encrypt,
  encryptFile,
  generateKey,
  hash,
  hashFile,
  listFiles,
  VERSION,
} from '../dist/index.js';

console.log(`aes512 v${VERSION}\n`);

const passphrase = generateKey();
console.log(`generated key: ${passphrase.slice(0, 16)}… (${passphrase.length} chars)`);

const encrypted = encrypt('Secret message 🔐', passphrase);
console.log(`encrypted:     ${encrypted.subarray(0, 12).toString('hex')}… (${encrypted.length} bytes)`);
console.log(`decrypted:     ${decrypt(encrypted, passphrase).toString()}`);

const cipher = new Cipher(passphrase);
const rawKey = new Uint8Array(32).fill(42);
console.log(`raw-key roundtrip: ${new Cipher(rawKey).decrypt(new Cipher(rawKey).encrypt('ok')).toString()}`);
void cipher;

const dir = await mkdtemp(join(tmpdir(), 'nmod-demo-'));
try {
  const src = join(dir, 'document.txt');
  await writeFile(src, 'Confidential report content.', 'utf8');

  const encPath = await encryptFile(src, passphrase);
  const restored = await decryptFile(encPath, passphrase, join(dir, 'restored.txt'));
  console.log(`file:          ${src} -> ${encPath}`);
  console.log(`restored:      ${await readFile(restored, 'utf8')}`);
  console.log(`files:         ${listFiles(dir).map((p) => p.split(/[\\/]/).pop()).join(', ')}`);

  console.log(`sha256:        ${hash('abc')}…`);
  console.log(`hashFile:      ${(await hashFile(src)).slice(0, 16)}…`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
