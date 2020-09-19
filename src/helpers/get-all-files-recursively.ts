import { resolve } from 'path';
import { promises as fspromises } from 'fs';

const { readdir } = fspromises;

export async function getAllFilesRecursively(dir: string): Promise<string[]> {
  const directoryEntries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(directoryEntries.map(directoryEntry => {
    const res = resolve(dir, directoryEntry.name);
    return directoryEntry.isDirectory() ? getAllFilesRecursively(res) : [res];
  }));
  return Array.prototype.concat(...files);
}
