import { existsSync } from 'fs';
import { basename, extname, resolve } from 'path';
import { MediaFileInfo } from '../models/media-file-info';
import { SUPPORTED_MEDIA_FILE_EXTENSIONS } from '../models/supported-media-file-extensions';
import { doesFileSupportExif } from './does-file-support-exif';
import { findFilesWithExtensionRecursively } from './find-files-with-extension-recursively';
import { generateUniqueOutputFileName } from './generate-unique-output-file-name';
import { getCompanionJsonPathForMediaFile } from './get-companion-json-path-for-media-file';

export async function findSupportedMediaFiles(inputDir: string, outputDir: string): Promise<MediaFileInfo[]> {
  const mediaFilePaths = await findFilesWithExtensionRecursively(inputDir, SUPPORTED_MEDIA_FILE_EXTENSIONS);

  const mediaFiles: MediaFileInfo[] = [];
  const allUsedOutputFilesLowerCased: string[] = [];

  for (const mediaFilePath of mediaFilePaths) {
    const mediaFileName = basename(mediaFilePath);
    const mediaFileExtension = extname(mediaFilePath);
    const supportsExif = doesFileSupportExif(mediaFilePath);

    const jsonFilePath = getCompanionJsonPathForMediaFile(mediaFilePath);
    const jsonFileName = jsonFilePath ? basename(jsonFilePath) : null;
    const jsonFileExists = jsonFilePath ? existsSync(jsonFilePath) : false;

    const outputFileName = generateUniqueOutputFileName(mediaFilePath, allUsedOutputFilesLowerCased);
    const outputFilePath = resolve(outputDir, outputFileName);

    mediaFiles.push({
      mediaFilePath,
      mediaFileName,
      mediaFileExtension,
      supportsExif,
      jsonFilePath,
      jsonFileName,
      jsonFileExists,
      outputFileName,
      outputFilePath,
    });
    allUsedOutputFilesLowerCased.push(outputFileName.toLowerCase());
  }

  return mediaFiles;
}
