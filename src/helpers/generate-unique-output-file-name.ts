import { basename, extname } from 'path';

/**
 * Given the name of a file that we want to copy to the output directory, generate a unique output filename.
 * The function takes in the filename that we wish to copy and an array of all output files so far (all converted to lower case).
 *
 * If the filename doesn't already exist in the array, it just returns the original file name.
 *
 * If the filename already exists (e.g. its a duplicate), then add a numbered suffix to the end, counting up until
 * the resultant filename is unique.
 *
 * For example if the array contains `picture.jpg` and `picture_1.jpg` then this will return `picture_2.jpg`
 */
export function generateUniqueOutputFileName(filePath: string, allUsedFileNamesLowerCased: string[]): string {
  const originalFileName = basename(filePath);
  const originalFileExtension = extname(filePath);
  const originalFileNameWithoutExtension = basename(filePath, originalFileExtension);
  let counter = 1;

  let outputFileName = originalFileName;
  while (allUsedFileNamesLowerCased.includes(outputFileName.toLowerCase())) {
    outputFileName = `${originalFileNameWithoutExtension}_${counter}${originalFileExtension}`;
    counter++;
  }
  return outputFileName;
}
