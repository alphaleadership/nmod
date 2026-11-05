import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { AlgorithmError, NmodError } from './errors.ts';

export type HashAlgorithm = 'sha256' | 'sha512' | 'blake2b512';

export const HASH_ALGORITHMS: readonly HashAlgorithm[] = Object.freeze([
  'sha256',
  'sha512',
  'blake2b512',
]);

function assertAlgorithm(algorithm: string): asserts algorithm is HashAlgorithm {
  if (!HASH_ALGORITHMS.includes(algorithm as HashAlgorithm)) {
    throw new AlgorithmError(
      `Unsupported hash algorithm "${algorithm}". Supported: ${HASH_ALGORITHMS.join(', ')}`,
    );
  }
}

export function hash(
  data: string | Uint8Array,
  algorithm: HashAlgorithm = 'sha256',
): string {
  assertAlgorithm(algorithm);
  const input = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  return createHash(algorithm).update(input).digest('hex');
}

export async function hashFile(
  path: string,
  algorithm: HashAlgorithm = 'sha256',
): Promise<string> {
  assertAlgorithm(algorithm);
  const digest = createHash(algorithm);
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(path);
    stream.on('error', (error) => {
      reject(
        new NmodError(
          `Cannot read "${path}": ${error.message}`,
          'ENOENT',
        ),
      );
    });
    stream.on('data', (chunk) => digest.update(chunk));
    stream.on('end', () => resolve());
  });
  return digest.digest('hex');
}
