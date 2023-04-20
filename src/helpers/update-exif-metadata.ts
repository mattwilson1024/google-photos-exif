import { exiftool } from 'exiftool-vendored';
import { doesFileSupportExif } from './does-file-support-exif';
import { promises as fspromises } from 'fs';
import { MediaFileInfo } from '../models/media-file-info';
import { resolve } from 'path';
import { APP1Tags } from 'exiftool-vendored/dist/Tags';

const { unlink, copyFile } = fspromises;

export async function updateExifMetadata(fileInfo: MediaFileInfo, metadata: APP1Tags, errorDir: string): Promise<void> {
  if (!doesFileSupportExif(fileInfo.outputFilePath)) {
    return;
  }

  try {
    await exiftool.write(fileInfo.outputFilePath, metadata);
  
    await unlink(`${fileInfo.outputFilePath}_original`); // exiftool will rename the old file to {filename}_original, we can delete that

  } catch (error) {
    await copyFile(fileInfo.outputFilePath,  resolve(errorDir, fileInfo.mediaFileName));
    if (fileInfo.jsonFileExists && fileInfo.jsonFileName && fileInfo.jsonFilePath) {
      await copyFile(fileInfo.jsonFilePath, resolve(errorDir, fileInfo.jsonFileName));
    }
  }
}
