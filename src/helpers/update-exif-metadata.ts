import { exiftool } from 'exiftool-vendored'
import { doesFileSupportExif } from './does-file-support-exif'

export async function updateExifMetadata(filePath: string, timeTaken: string): Promise<void> {
  if (!doesFileSupportExif(filePath)) {
    return;
  }

  await exiftool.write(filePath, {
    DateTimeOriginal: timeTaken,
  });
}
