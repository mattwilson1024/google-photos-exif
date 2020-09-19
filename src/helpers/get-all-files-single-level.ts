import { promises as fspromises } from 'fs';
import { resolve } from 'path'

const { readdir } = fspromises;

export async function getAllFilesSingleLevel(dir: string): Promise<string[]> {
  const fileNames = await readdir(dir);
  const nonDSStoreFileNames = fileNames.filter(filename => filename !== '.DS_Store');
  return nonDSStoreFileNames.map(fileName => resolve(dir, fileName));
}
