import { exiftool } from 'exiftool-vendored';
import { doesFileSupportExif } from './does-file-support-exif';
import { promises as fspromises } from 'fs';

const { unlink } = fspromises;

export async function updateExifMetadata(filePath: string, timeTaken: string): Promise<void> {
  if (!doesFileSupportExif(filePath)) {
    return;
  }

  await exiftool.write(filePath, {
    DateTimeOriginal: timeTaken,
  });

  await unlink(`${filePath}_original`); // exiftool will rename the old file to {filename}_original, we can delete that
}
