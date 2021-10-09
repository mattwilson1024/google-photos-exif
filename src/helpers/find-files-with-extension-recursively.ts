import { extname } from 'path';
import { getAllFilesRecursively } from './get-all-files-recursively';

export async function findFilesWithExtensionRecursively(dirToSearch: string, extensionsToInclude: string[]): Promise<string[]> {
  const allFiles = await getAllFilesRecursively(dirToSearch);
  const dirIsEmpty = allFiles.length === 0;
  if (dirIsEmpty) {
    throw new Error('The search directory is empty, so there is no work to do. Check that your --inputDir contains all of the Google Takeout data, and that any zips have been extracted before running this tool');
  }

  const matchingFiles = allFiles.filter(filePath => {
    const extension = extname(filePath).toLowerCase();
    return extensionsToInclude.map(ext => ext.toLowerCase()).includes(extension.toLowerCase());
  });
  return matchingFiles;
}
