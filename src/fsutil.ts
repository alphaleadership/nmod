import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface ListFilesOptions {
  recursive?: boolean;
}

function walk(directory: string, recursive: boolean, output: string[]): void {
  const entries = readdirSync(directory, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (recursive) walk(path, recursive, output);
    } else {
      output.push(path);
    }
  }
}

export function listFiles(
  directory: string,
  options: ListFilesOptions = {},
): string[] {
  const recursive = options.recursive ?? true;
  const output: string[] = [];
  walk(directory, recursive, output);
  output.sort();
  return output;
}
