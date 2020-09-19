import { basename, resolve } from 'path';
import { promises as fspromises } from 'fs';

const { rename } = fspromises;

export async function moveFile(filePath: string, destinationDirectoryPath: string): Promise<void> {
  const fileName = basename(filePath);
  const destinationFilePath = resolve(destinationDirectoryPath, fileName);
  await rename(filePath, destinationFilePath);
}
