import { exiftool } from 'exiftool-vendored'

export async function updateFileModificationDate(filePath: string, timeTaken: string): Promise<void> {
  await exiftool.write(filePath, {
    FileModifyDate: timeTaken,
  });
}
