import { FormatError } from './errors.ts';
import {
  MAX_SCRYPT_LOGN,
  MIN_SCRYPT_LOGN,
  SALT_BYTES,
  type ScryptParams,
} from './key.ts';

export const MAGIC = Buffer.from('NMOD', 'ascii');
export const VERSION = 2;
export const IV_BYTES = 12;
export const TAG_BYTES = 16;
export const HEADER_BYTES = MAGIC.length + 1 + 1 + SALT_BYTES + 1 + 1 + 1 + IV_BYTES;
export const FLAG_SCRYPT = 0b0000_0001;

export interface Header {
  version: number;
  scrypt: boolean;
  salt: Buffer;
  params: ScryptParams | null;
  iv: Buffer;
}

export function encodeHeader(header: Header): Buffer {
  const buf = Buffer.alloc(HEADER_BYTES);
  MAGIC.copy(buf, 0);
  buf.writeUInt8(header.version, MAGIC.length);
  buf.writeUInt8(header.scrypt ? FLAG_SCRYPT : 0, MAGIC.length + 1);
  header.salt.copy(buf, MAGIC.length + 2);
  const offset = MAGIC.length + 2 + SALT_BYTES;
  if (header.scrypt && header.params !== null) {
    buf.writeUInt8(header.params.logN, offset);
    buf.writeUInt8(header.params.r, offset + 1);
    buf.writeUInt8(header.params.p, offset + 2);
  }
  header.iv.copy(buf, offset + 3);
  return buf;
}

export function decodeHeader(buf: Buffer): Header {
  if (buf.length < HEADER_BYTES) {
    throw new FormatError(
      `Data too short for a v2 header (${buf.length} < ${HEADER_BYTES} bytes)`,
    );
  }
  if (!buf.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new FormatError('Not nmod v2 data: bad magic bytes');
  }
  const version = buf.readUInt8(MAGIC.length);
  if (version !== VERSION) {
    throw new FormatError(`Unsupported nmod version: ${version}`);
  }
  const flags = buf.readUInt8(MAGIC.length + 1);
  const salt = Buffer.from(buf.subarray(MAGIC.length + 2, MAGIC.length + 2 + SALT_BYTES));
  const offset = MAGIC.length + 2 + SALT_BYTES;
  const scrypt = (flags & FLAG_SCRYPT) !== 0;
  let params: ScryptParams | null = null;
  if (scrypt) {
    const logN = buf.readUInt8(offset);
    const r = buf.readUInt8(offset + 1);
    const p = buf.readUInt8(offset + 2);
    if (logN < MIN_SCRYPT_LOGN || logN > MAX_SCRYPT_LOGN || r < 1 || p < 1) {
      throw new FormatError('Invalid scrypt parameters in header');
    }
    params = { logN, r, p };
  }
  const iv = Buffer.from(buf.subarray(offset + 3, offset + 3 + IV_BYTES));
  return { version, scrypt, salt, params, iv };
}
