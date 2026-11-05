import { createReadStream, createWriteStream } from 'node:fs';
import { open, rename, rm, stat } from 'node:fs/promises';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { CipherGCM, DecipherGCM } from 'node:crypto';
import { dirname, basename, join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { CipherOptions } from './cipher.ts';
import { DecryptionError, FileExistsError, FormatError, NmodError } from './errors.ts';
import {
  decodeHeader,
  encodeHeader,
  HEADER_BYTES,
  IV_BYTES,
  TAG_BYTES,
  VERSION,
} from './format.ts';
import {
  assertKeyInput,
  openEncryptionKey,
  prepareEncryptionKey,
  type KeyInput,
} from './key.ts';

export interface FileOptions {
  overwrite?: boolean;
}

function tagAppender(cipher: CipherGCM): Transform {
  return new Transform({
    transform(chunk, _encoding, callback) {
      callback(null, chunk);
    },
    flush(callback) {
      try {
        this.push(cipher.getAuthTag());
        callback();
      } catch (error) {
        callback(error as Error);
      }
    },
  });
}

async function assertSource(path: string): Promise<void> {
  let info;
  try {
    info = await stat(path);
  } catch (error) {
    throw new NmodError(
      `Cannot read "${path}": ${(error as Error).message}`,
      'ENOENT',
    );
  }
  if (!info.isFile()) {
    throw new NmodError(`Not a regular file: ${path}`, 'BAD_FORMAT');
  }
}

async function assertDestination(dest: string, overwrite: boolean): Promise<void> {
  try {
    await stat(dest);
  } catch {
    return;
  }
  if (!overwrite) {
    throw new FileExistsError(
      `Destination already exists: ${dest} (pass { overwrite: true } to replace it)`,
    );
  }
}

function tempPathFor(dest: string): string {
  return join(
    dirname(dest),
    `.${basename(dest)}.${randomBytes(6).toString('hex')}.tmp`,
  );
}

function isAuthFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /unable to authenticate|unsupported state|bad decrypt/i.test(error.message);
}

function prependHeader(header: Buffer): Transform {
  let sent = false;
  return new Transform({
    transform(chunk, _encoding, callback) {
      if (!sent) {
        sent = true;
        this.push(header);
      }
      callback(null, chunk);
    },
    flush(callback) {
      if (!sent) this.push(header);
      callback();
    },
  });
}

export function defaultEncryptDest(src: string): string {
  return `${src}.enc`;
}

export function defaultDecryptDest(src: string): string {
  return src.endsWith('.enc') ? src.slice(0, -4) : `${src}.dec`;
}

async function encryptStream(
  src: string,
  dest: string,
  key: KeyInput,
  options: FileOptions,
  cipherOptions: CipherOptions,
): Promise<string> {
  await assertSource(src);
  await assertDestination(dest, options.overwrite ?? false);

  const prepared = prepareEncryptionKey(key, cipherOptions.scrypt);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', prepared.key, iv, {
    authTagLength: TAG_BYTES,
  }) as CipherGCM;
  const header = encodeHeader({
    version: VERSION,
    scrypt: prepared.params !== null,
    salt: prepared.salt,
    params: prepared.params,
    iv,
  });

  const temp = tempPathFor(dest);
  try {
    await pipeline(
      createReadStream(src),
      cipher,
      prependHeader(header),
      tagAppender(cipher),
      createWriteStream(temp),
    );
    await rename(temp, dest);
    return dest;
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

async function decryptStream(
  src: string,
  dest: string,
  key: KeyInput,
  options: FileOptions,
): Promise<string> {
  await assertSource(src);
  await assertDestination(dest, options.overwrite ?? false);

  const handle = await open(src, 'r');
  try {
    const info = await handle.stat();
    if (info.size < HEADER_BYTES + TAG_BYTES) {
      throw new FormatError(
        `File too short to be nmod v2 ciphertext (${info.size} bytes)`,
      );
    }
    const headerBuf = Buffer.alloc(HEADER_BYTES);
    await handle.read(headerBuf, 0, HEADER_BYTES, 0);
    const header = decodeHeader(headerBuf);
    const keyBuf = openEncryptionKey(key, header.salt, header.params);
    const tag = Buffer.alloc(TAG_BYTES);
    await handle.read(tag, 0, TAG_BYTES, info.size - TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', keyBuf, header.iv, {
      authTagLength: TAG_BYTES,
    }) as DecipherGCM;
    decipher.setAuthTag(tag);

    const hasCiphertext = info.size - TAG_BYTES > HEADER_BYTES;
    const source = hasCiphertext
      ? createReadStream(src, {
          start: HEADER_BYTES,
          end: info.size - TAG_BYTES - 1,
        })
      : Readable.from([]);

    const temp = tempPathFor(dest);
    try {
      await pipeline(source, decipher, createWriteStream(temp));
      await rename(temp, dest);
      return dest;
    } catch (error) {
      await rm(temp, { force: true });
      if (isAuthFailure(error)) throw new DecryptionError();
      throw error;
    }
  } finally {
    await handle.close();
  }
}

export async function encryptFile(
  src: string,
  key: KeyInput,
  dest?: string,
  options: FileOptions = {},
  cipherOptions: CipherOptions = {},
): Promise<string> {
  assertKeyInput(key);
  return encryptStream(
    src,
    dest ?? defaultEncryptDest(src),
    key,
    options,
    cipherOptions,
  );
}

export async function decryptFile(
  src: string,
  key: KeyInput,
  dest?: string,
  options: FileOptions = {},
): Promise<string> {
  assertKeyInput(key);
  return decryptStream(
    src,
    dest ?? defaultDecryptDest(src),
    key,
    options,
  );
}
