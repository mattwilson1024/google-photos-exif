import { exiftool } from 'exiftool-vendored';
import { isNullOrUndefined } from './is-null-or-undefined';
import { doesFileSupportExif } from './does-file-support-exif'

export async function doesFileHaveExifDate(filePath: string): Promise<boolean> {
  if (!doesFileSupportExif(filePath)) {
    return false;
  }

  const readResult = await exiftool.read(filePath);
  return !isNullOrUndefined(readResult.DateTimeOriginal);
}
