import { closeSync, openSync, utimesSync } from 'fs'

export async function updateFileModificationDate(filePath: string, timeTaken: string): Promise<void> {
  const time = new Date(timeTaken);

  try {
    utimesSync(filePath, time, time);
  } catch (error) {
    closeSync(openSync(filePath, 'w'));
  }
}
