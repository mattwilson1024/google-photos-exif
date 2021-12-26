import { existsSync } from 'fs';
import { basename, extname, resolve } from 'path';
import { CONFIG } from '../config';
import { FileInfo } from '../models/file-info';
import { doesFileSupportExif } from './does-file-support-exif';
import { getAllFilesRecursively } from './get-all-files-recursively';
import { generateUniqueOutputFileName } from './generate-unique-output-file-name';
import { getCompanionJsonPathForMediaFile } from './get-companion-json-path-for-media-file';

export async function getAllFilesExceptJson(inputDir: string, outputDir: string): Promise<FileInfo[]> {
  const supportedMediaFileExtensions = CONFIG.supportedMediaFileTypes.map(fileType => fileType.extension.toLowerCase());

  let allFilePaths = await getAllFilesRecursively(inputDir);
  const dirIsEmpty = allFilePaths.length === 0;
  if (dirIsEmpty) {
    throw new Error('The search directory is empty, so there is no work to do. Check that your --inputDir contains all of the Google Takeout data, and that any zips have been extracted before running this tool');
  }
  else
    allFilePaths.filter ( element => extname(element).toLowerCase() != ".json" );

  
  const allFiles: FileInfo[] = [];
  const allUsedOutputFilesLowerCased: string[] = [];

  for (const filePath of allFilePaths) {
    const fileName = basename(filePath);
    const fileExtension = extname(filePath);
    if (fileExtension == ".json") continue;
    const fileExtensionLowerCased = fileExtension.toLowerCase();
    const isMediaFile = supportedMediaFileExtensions.includes(fileExtensionLowerCased);    
    const supportsExif = doesFileSupportExif(filePath);

    const jsonFilePath = getCompanionJsonPathForMediaFile(filePath);   // intentionally not including a check for isMediaFile here because some unsupported files may nevertheless contain JSON sidecars
    const jsonFileName = jsonFilePath ? basename(jsonFilePath) : null;
    const jsonFileExists = jsonFilePath ? existsSync(jsonFilePath) : false;
    
    const outputFileName = isMediaFile ? generateUniqueOutputFileName(filePath, allUsedOutputFilesLowerCased) : null;
    const outputFilePath = isMediaFile ? resolve(outputDir, <string>outputFileName) : null;

    allFiles.push({
      filePath,
      fileName,
      fileExtension,
      fileExtensionLowerCased,
      isMediaFile,
      supportsExif,
      jsonFilePath,
      jsonFileName,
      jsonFileExists,
      outputFileName,
      outputFilePath,
    });
    if (outputFileName) allUsedOutputFilesLowerCased.push(outputFileName.toLowerCase());
  }

  return allFiles;
}
