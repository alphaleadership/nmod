import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { DecryptionError, FormatError } from './errors.ts';
import {
  decryptFile as decryptFileStream,
  defaultDecryptDest,
  defaultEncryptDest,
  encryptFile as encryptFileStream,
  type FileOptions,
} from './files.ts';
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
  type ScryptParams,
} from './key.ts';

export interface CipherOptions {
  scrypt?: Partial<ScryptParams>;
}

export type PlaintextInput = string | Uint8Array;

function toBuffer(data: PlaintextInput): Buffer {
  if (typeof data === 'string') return Buffer.from(data, 'utf8');
  if (data instanceof Uint8Array) return Buffer.from(data);
  throw new TypeError('Data must be a string or a Uint8Array');
}

export class Cipher {
  private readonly key: KeyInput;
  private readonly options: CipherOptions;

  constructor(key: KeyInput, options: CipherOptions = {}) {
    assertKeyInput(key);
    this.key = key;
    this.options = options;
  }

  encrypt(data: PlaintextInput): Buffer {
    const plaintext = toBuffer(data);
    const prepared = prepareEncryptionKey(this.key, this.options.scrypt);
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', prepared.key, iv, {
      authTagLength: TAG_BYTES,
    });
    const header = encodeHeader({
      version: VERSION,
      scrypt: prepared.params !== null,
      salt: prepared.salt,
      params: prepared.params,
      iv,
    });
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return Buffer.concat([header, ciphertext, cipher.getAuthTag()]);
  }

  decrypt(data: Uint8Array): Buffer {
    const buf = toBuffer(data);
    if (buf.length < HEADER_BYTES) {
      throw new FormatError(
        `Data too short to be nmod v2 ciphertext (${buf.length} bytes)`,
      );
    }
    const header = decodeHeader(buf);
    if (buf.length < HEADER_BYTES + TAG_BYTES) {
      throw new FormatError(
        `Data too short to be nmod v2 ciphertext (${buf.length} bytes)`,
      );
    }
    const key = openEncryptionKey(this.key, header.salt, header.params);
    const decipher = createDecipheriv('aes-256-gcm', key, header.iv, {
      authTagLength: TAG_BYTES,
    });
    decipher.setAuthTag(buf.subarray(buf.length - TAG_BYTES));
    try {
      const ciphertext = buf.subarray(HEADER_BYTES, buf.length - TAG_BYTES);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch {
      throw new DecryptionError();
    }
  }

  encryptFile(src: string, dest?: string, options?: FileOptions): Promise<string> {
    return encryptFileStream(
      src,
      this.key,
      dest ?? defaultEncryptDest(src),
      options ?? {},
      this.options,
    );
  }

  decryptFile(src: string, dest?: string, options?: FileOptions): Promise<string> {
    return decryptFileStream(
      src,
      this.key,
      dest ?? defaultDecryptDest(src),
      options ?? {},
    );
  }
}

export function encrypt(data: PlaintextInput, key: KeyInput, options?: CipherOptions): Buffer {
  return new Cipher(key, options).encrypt(data);
}

export function decrypt(data: Uint8Array, key: KeyInput, options?: CipherOptions): Buffer {
  return new Cipher(key, options).decrypt(data);
}
