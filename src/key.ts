import { randomBytes, scryptSync } from 'node:crypto';
import { InvalidKeyError } from './errors.ts';

export const KEY_BYTES = 32;
export const SALT_BYTES = 16;

export type KeyInput = string | Uint8Array;

export interface ScryptParams {
  logN: number;
  r: number;
  p: number;
}

export const DEFAULT_SCRYPT: Readonly<ScryptParams> = Object.freeze({
  logN: 14,
  r: 8,
  p: 1,
});

export const MIN_SCRYPT_LOGN = 1;
export const MAX_SCRYPT_LOGN = 20;

export interface PreparedEncryptionKey {
  key: Buffer;
  salt: Buffer;
  params: ScryptParams | null;
}

function isScryptParams(value: unknown): value is ScryptParams {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Number.isInteger(v.logN) &&
    Number.isInteger(v.r) &&
    Number.isInteger(v.p) &&
    (v.logN as number) >= MIN_SCRYPT_LOGN &&
    (v.logN as number) <= MAX_SCRYPT_LOGN &&
    (v.r as number) >= 1 &&
    (v.r as number) <= 255 &&
    (v.p as number) >= 1 &&
    (v.p as number) <= 255
  );
}

export function generateKey(bytes = KEY_BYTES): string {
  if (!Number.isInteger(bytes) || bytes < 16 || bytes > 4096) {
    throw new InvalidKeyError(
      `generateKey(bytes): expected an integer between 16 and 4096, got ${String(bytes)}`,
    );
  }
  return randomBytes(bytes).toString('base64url');
}

export function assertKeyInput(key: unknown): asserts key is KeyInput {
  if (key instanceof Uint8Array) {
    if (key.byteLength !== KEY_BYTES) {
      throw new InvalidKeyError(
        `Raw key must be exactly ${KEY_BYTES} bytes, got ${key.byteLength}`,
      );
    }
    return;
  }
  if (typeof key === 'string') {
    if (key.length === 0) {
      throw new InvalidKeyError('Passphrase must be a non-empty string');
    }
    if (key.length > 4096) {
      throw new InvalidKeyError('Passphrase must be at most 4096 characters');
    }
    return;
  }
  throw new InvalidKeyError(
    `Key must be a string passphrase or a ${KEY_BYTES}-byte Uint8Array`,
  );
}

export function mergeScryptParams(
  overrides?: Partial<ScryptParams>,
): ScryptParams {
  const params: ScryptParams = { ...DEFAULT_SCRYPT, ...overrides };
  if (!isScryptParams(params)) {
    throw new InvalidKeyError(
      `Invalid scrypt parameters: ${JSON.stringify(params)}`,
    );
  }
  return params;
}

export function prepareEncryptionKey(
  key: KeyInput,
  scryptOverrides?: Partial<ScryptParams>,
): PreparedEncryptionKey {
  if (key instanceof Uint8Array) {
    return {
      key: Buffer.from(key),
      salt: Buffer.alloc(SALT_BYTES),
      params: null,
    };
  }
  const params = mergeScryptParams(scryptOverrides);
  const salt = randomBytes(SALT_BYTES);
  return {
    key: deriveKey(key, salt, params),
    salt,
    params,
  };
}

export function deriveKey(
  passphrase: string,
  salt: Buffer,
  params: ScryptParams,
): Buffer {
  return scryptSync(passphrase, salt, KEY_BYTES, {
    N: 2 ** params.logN,
    r: params.r,
    p: params.p,
    maxmem: 512 * 1024 * 1024,
  });
}

export function openEncryptionKey(
  key: KeyInput,
  salt: Buffer,
  params: ScryptParams | null,
): Buffer {
  if (key instanceof Uint8Array) {
    return Buffer.from(key);
  }
  if (params === null) {
    throw new InvalidKeyError(
      'A passphrase was provided but the data was encrypted with a raw key',
    );
  }
  return deriveKey(key, salt, params);
}
