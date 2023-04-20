import { Tags } from 'exiftool-vendored';
import { closeSync, openSync, utimesSync } from 'fs'

export async function updateFileModificationDate(filePath: string, timeTaken: Date): Promise<void> {
  try {
    utimesSync(filePath, timeTaken, timeTaken);
  } catch (error) {
    closeSync(openSync(filePath, 'w'));
  }
}
