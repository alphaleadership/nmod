export { Cipher, encrypt, decrypt, type CipherOptions, type PlaintextInput } from './cipher.ts';
export {
  encryptFile,
  decryptFile,
  defaultEncryptDest,
  defaultDecryptDest,
  type FileOptions,
} from './files.ts';
export {
  generateKey,
  KEY_BYTES,
  DEFAULT_SCRYPT,
  type KeyInput,
  type ScryptParams,
} from './key.ts';
export { hash, hashFile, HASH_ALGORITHMS, type HashAlgorithm } from './hash.ts';
export { listFiles, type ListFilesOptions } from './fsutil.ts';
export { decryptV1, decryptV1File } from './legacy.ts';
export {
  NmodError,
  DecryptionError,
  InvalidKeyError,
  FormatError,
  AlgorithmError,
  FileExistsError,
  type NmodErrorCode,
} from './errors.ts';
export { HEADER_BYTES, TAG_BYTES, VERSION as FORMAT_VERSION } from './format.ts';

export const VERSION = '2.0.0';
