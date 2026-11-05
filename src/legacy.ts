import { createDecipheriv, createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { DecryptionError, NmodError } from './errors.ts';

const V1_IV_BYTES = 16;

function toBuffer(data: string | Uint8Array): Buffer {
  if (typeof data === 'string') return Buffer.from(data, 'base64');
  if (data instanceof Uint8Array) return Buffer.from(data);
  throw new TypeError('Data must be a base64 string or a Uint8Array');
}

export function decryptV1(data: string | Uint8Array, key: string): Buffer {
  if (typeof key !== 'string' || key.length === 0) {
    throw new NmodError('v1 key must be a non-empty string', 'INVALID_KEY');
  }
  const buf = toBuffer(data);
  if (buf.length < V1_IV_BYTES + 1) {
    throw new DecryptionError('Data too short to be nmod v1 ciphertext');
  }
  const derived = createHash('sha256').update(key).digest();
  const iv = buf.subarray(0, V1_IV_BYTES);
  const ciphertext = buf.subarray(V1_IV_BYTES);
  try {
    const decipher = createDecipheriv('aes-256-ctr', derived, iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new DecryptionError('v1 decryption failed: corrupted data');
  }
}

export async function decryptV1File(
  src: string,
  key: string,
  dest?: string,
  options: { overwrite?: boolean } = {},
): Promise<string> {
  let data: Buffer;
  try {
    data = await readFile(src);
  } catch (error) {
    throw new NmodError(
      `Cannot read "${src}": ${(error as Error).message}`,
      'ENOENT',
    );
  }
  const target = dest ?? `${src}.dec`;
  if (!(options.overwrite ?? false)) {
    try {
      await stat(target);
      throw new NmodError(
        `Destination already exists: ${target} (pass { overwrite: true } to replace it)`,
        'EEXIST',
      );
    } catch (error) {
      if (error instanceof NmodError) throw error;
    }
  }
  const plaintext = decryptV1(data, key);
  await writeFile(target, plaintext);
  return target;
}
