import { exiftool } from 'exiftool-vendored';
import { doesFileSupportExif } from './does-file-support-exif';
import { promises as fspromises } from 'fs';
import { FileInfo } from '../models/file-info';
import { resolve } from 'path';

const { unlink, copyFile } = fspromises;

export async function updateExifMetadata(fileInfo: FileInfo, timeTaken: string, errorDir: string): Promise<void> {
  if (!fileInfo.outputFilePath) return;
  if (!doesFileSupportExif(fileInfo.outputFilePath)) {
    return;
  }

  try {
    await exiftool.write(fileInfo.outputFilePath, {
      DateTimeOriginal: timeTaken,
    });
  
    await unlink(`${fileInfo.outputFilePath}_original`); // exiftool will rename the old file to {filename}_original, we can delete that

  } catch (error) {
    await copyFile(fileInfo.outputFilePath,  resolve(errorDir, fileInfo.fileName));
    if (fileInfo.jsonFileExists && fileInfo.jsonFileName && fileInfo.jsonFilePath) {
      await copyFile(fileInfo.jsonFilePath, resolve(errorDir, fileInfo.jsonFileName));
    }
  }
}
