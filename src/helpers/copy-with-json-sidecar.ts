import { promises as fspromises } from 'fs';
import { FileInfo } from '../models/file-info';
import { resolve } from 'path';

const { copyFile } = fspromises;

// Helper function to copy a file and its JSON sidecar, if available, to a destination directory such as the error directory

export async function copyWithJsonSidecar(fileInfo: FileInfo, destDir: string): Promise<void> {
  if (!fileInfo.filePath || !fileInfo.fileName) return;
  
  const destName = fileInfo.outputFileName ? fileInfo.outputFileName : fileInfo.fileName;  // use the outputFileName if set or fall back to the original fileName otherwise

  await copyFile(fileInfo.filePath, resolve(destDir, destName));
  if (fileInfo.jsonFileExists && fileInfo.jsonFileName && fileInfo.jsonFilePath) {
    await copyFile(fileInfo.jsonFilePath, resolve(destDir, fileInfo.jsonFileName));
  }

  return;
}
