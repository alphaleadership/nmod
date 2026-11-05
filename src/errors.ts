export type NmodErrorCode =
  | 'DECRYPT_FAILED'
  | 'INVALID_KEY'
  | 'BAD_FORMAT'
  | 'BAD_ALGORITHM'
  | 'EEXIST'
  | 'ENOENT';

export class NmodError extends Error {
  readonly code: NmodErrorCode;

  constructor(message: string, code: NmodErrorCode) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class DecryptionError extends NmodError {
  constructor(message = 'Decryption failed: wrong key or corrupted data') {
    super(message, 'DECRYPT_FAILED');
  }
}

export class InvalidKeyError extends NmodError {
  constructor(message: string) {
    super(message, 'INVALID_KEY');
  }
}

export class FormatError extends NmodError {
  constructor(message: string) {
    super(message, 'BAD_FORMAT');
  }
}

export class AlgorithmError extends NmodError {
  constructor(message: string) {
    super(message, 'BAD_ALGORITHM');
  }
}

export class FileExistsError extends NmodError {
  constructor(message: string) {
    super(message, 'EEXIST');
  }
}
