# aes512

[![npm version](https://img.shields.io/npm/v/aes512.svg)](https://www.npmjs.com/package/aes512)
[![CI](https://github.com/alphaleadership/nmod/actions/workflows/ci.yml/badge.svg)](https://github.com/alphaleadership/nmod/actions/workflows/ci.yml)

Authenticated **AES-256-GCM** encryption toolkit for Node.js: keys, strings, files (streaming), hashing and a legacy v1 reader.

- **Authenticated encryption** — a wrong key or any tampering is detected, never silently corrupted.
- **Zero dependencies** — built only on `node:crypto` / `node:fs`.
- **Streaming file encryption** — large files are processed chunk by chunk, written atomically (temp file + rename).
- **TypeScript** — full type declarations shipped.
- **ESM** — requires Node.js ≥ 22.12.

> Documentation also available in [French](./README.fr.md).

## Install

```bash
npm install aes512
```

## Quick start

```js
import {
  generateKey, Cipher, encrypt, decrypt,
  encryptFile, decryptFile, hash, hashFile, listFiles,
} from 'aes512';

// 1. Keys
const passphrase = generateKey();            // random base64url string (32 bytes of entropy)
const rawKey = new Uint8Array(32);           // 32 raw bytes = fast path (no KDF)

// 2. Strings / buffers
const blob = encrypt('Top secret 🤫', passphrase);
const plain = decrypt(blob, passphrase);     // Buffer('Top secret 🤫')

// 3. Files (streaming, atomic)
await encryptFile('report.pdf', passphrase);          // -> report.pdf.enc
await decryptFile('report.pdf.enc', passphrase);      // -> report.pdf (refuses to overwrite unless { overwrite: true })

// 4. Hashing
hash('abc', 'sha256');                       // hex digest
await hashFile('report.pdf', 'blake2b512');

// 5. Utilities
listFiles('./data');                         // sorted, recursive, no console noise
```

## API

### `generateKey(bytes = 32): string`

Returns a cryptographically random `base64url` string representing `bytes` bytes (16–4096). Use it as a passphrase.

### Key handling rules

| Key type | Behaviour |
| --- | --- |
| `string` | Treated as a **passphrase**: derived with **scrypt** using a random 16-byte salt stored in each header (cost parameters tunable via `new Cipher(pass, { scrypt: { logN } })`). |
| `Uint8Array` of exactly 32 bytes | Used **directly** as the AES-256 key (fast path, no KDF). |
| anything else | Throws `InvalidKeyError`. |

### `new Cipher(key, options?)`

- `encrypt(data: string | Uint8Array): Buffer` — returns the framed v2 blob (header + ciphertext + auth tag).
- `decrypt(data: Uint8Array): Buffer` — throws `DecryptionError` on wrong key/tampering, `FormatError` on foreign data.
- `encryptFile(src, dest?, { overwrite }?): Promise<string>` — default destination: `src + '.enc'`.
- `decryptFile(src, dest?, { overwrite }?): Promise<string>` — default destination: `src` without `.enc` (or `src + '.dec'`).

Standalone equivalents: `encrypt(data, key, options?)`, `decrypt(blob, key, options?)`, `encryptFile(src, key, dest?, options?, cipherOptions?)`, `decryptFile(src, key, dest?, options?)`.

### `hash(data, algorithm = 'sha256'): string` · `hashFile(path, algorithm?): Promise<string>`

Algorithms: `sha256` (default), `sha512`, `blake2b512`. Returns a lowercase hex digest.

### `listFiles(dir, { recursive = true }): string[]`

Recursively lists files (sorted, deterministic). Symlinked directories are not followed. Never logs to the console.

### Legacy v1

Files encrypted with **v1** (`aes256` package, AES-256-CTR) can still be read:

```js
import { decryptV1, decryptV1File } from 'aes512';

const old = decryptV1(v1BufferOrBase64, 'old-passphrase');
await decryptV1File('legacy.dat', 'old-passphrase', 'legacy.out');
```

> v1 used unauthenticated CTR: a wrong key produces garbage instead of an error. Prefer v2 for anything new.

### Errors

All errors extend `NmodError` and carry a `code`:

| Class | Code | Meaning |
| --- | --- | --- |
| `DecryptionError` | `DECRYPT_FAILED` | Wrong key, tampered or truncated ciphertext (GCM tag mismatch). |
| `FormatError` | `BAD_FORMAT` | Not nmod v2 data (bad magic/version/length). |
| `InvalidKeyError` | `INVALID_KEY` | Malformed key/passphrase passed to the API. |
| `AlgorithmError` | `BAD_ALGORITHM` | Unsupported hash algorithm. |
| `FileExistsError` | `EEXIST` | Destination exists and `overwrite: true` was not set. |
| `NmodError` | `ENOENT` | Source file/directory cannot be read. |

## File format (v2)

| Field | Size | Content |
| --- | --- | --- |
| magic | 4 | ASCII `NMOD` |
| version | 1 | `2` |
| flags | 1 | bit 0 = scrypt KDF in use |
| salt | 16 | scrypt salt (random, zero for raw keys) |
| logN, r, p | 3 | scrypt cost parameters |
| IV | 12 | GCM nonce |
| ciphertext | * | AES-256-GCM ciphertext |
| tag | 16 | GCM authentication tag |

Total overhead: **53 bytes**.

## Security notes

- Encryption is **authenticated** (AES-256-GCM): wrong keys and bit-flips are rejected before any output is written.
- File writes are **atomic**: output goes to a temp file in the destination folder, then is renamed; failed operations clean up and never touch existing files.
- Nothing is overwritten unless you pass `{ overwrite: true }`.
- Prefer random keys from `generateKey()`; if you pick your own passphrase, make it long — scrypt slows down guessing but cannot fix a weak secret.

## Migrating from v1

| v1 | v2 |
| --- | --- |
| `createCipher(key).cryptfiles(path)` (in-place) | `encryptFile(path, key)` (writes `path.enc`, source untouched) |
| `createCipher(key).decryptfiles(path)` | `decryptFile(path.enc, key)` |
| `cipher.crypt(data)` / `cipher.decrypt(data)` | `encrypt(data, key)` / `decrypt(blob, key)` |
| `getkey(length)` (weak `Math.random`) | `generateKey(bytes)` (`crypto.randomBytes`) |
| `hash` class (iterated AES) | `hash(data, 'sha256' \| 'sha512' \| 'blake2b512')` |
| `dir(path)` | `listFiles(path)` |
| v1 ciphertext | `decryptV1` / `decryptV1File` |

Old v1 ciphertexts are **not** readable by `decrypt` — use the `decryptV1*` helpers.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # node --test (44 tests)
npm run build       # esbuild bundle + type declarations
npm run demo        # examples/basic.mjs against the build
```

## License

MIT
