import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { listFiles } from '../src/index.ts';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'nmod-fs-'));
  await mkdir(join(dir, 'sub', 'deep'), { recursive: true });
  await writeFile(join(dir, 'b.txt'), 'b');
  await writeFile(join(dir, 'a.txt'), 'a');
  await writeFile(join(dir, 'sub', 'c.txt'), 'c');
  await writeFile(join(dir, 'sub', 'deep', 'd.txt'), 'd');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

test('listFiles walks the whole tree and returns sorted paths', () => {
  const files = listFiles(dir);
  assert.deepEqual(files, [
    join(dir, 'a.txt'),
    join(dir, 'b.txt'),
    join(dir, 'sub', 'c.txt'),
    join(dir, 'sub', 'deep', 'd.txt'),
  ]);
});

test('listFiles with recursive: false only returns top-level files', () => {
  const files = listFiles(dir, { recursive: false });
  assert.deepEqual(files, [join(dir, 'a.txt'), join(dir, 'b.txt')]);
});

test('listFiles never logs to the console', () => {
  const original = console.log;
  let calls = 0;
  console.log = () => {
    calls += 1;
  };
  try {
    listFiles(dir);
  } finally {
    console.log = original;
  }
  assert.equal(calls, 0);
});

test('listFiles rejects a missing directory', () => {
  assert.throws(() => listFiles(join(dir, 'does-not-exist')), {
    code: 'ENOENT',
  });
});

test('listFiles does not recurse into symlinked directories', async () => {
  try {
    await symlink(join(dir, 'sub'), join(dir, 'link'), 'junction');
  } catch {
    return;
  }
  const files = listFiles(dir);
  assert.ok(files.includes(join(dir, 'link')));
  assert.ok(!files.some((path) => path.includes(`link${sep}`)));
});
