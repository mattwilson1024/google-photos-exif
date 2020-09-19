import { getAllFilesSingleLevel } from './get-all-files-single-level';
import { extname } from 'path';

export async function findFilesWithExtension(dirToSearch: string, extensionsToInclude: string[]): Promise<string[]> {
  const allFilesInFlattenedDir = await getAllFilesSingleLevel(dirToSearch);
  const flattenedDirIsEmpty = allFilesInFlattenedDir.length === 0;
  if (flattenedDirIsEmpty) {
    throw new Error('The search directory is empty, so there is no work to do. Check that your --inputDir contains all of the Google Takeout data, and that any zips have been extracted before running this tool');
  }

  const matchingFiles = allFilesInFlattenedDir.filter(filePath => {
    const extension = extname(filePath).toLowerCase();
    return extensionsToInclude.map(ext => ext.toLowerCase()).includes(extension);
  });
  return matchingFiles;
}
