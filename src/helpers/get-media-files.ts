import { Directories } from '../models/directories'
import { MediaFileInfo } from '../models/media-file-info'
import { findFilesWithExtension } from './find-files-with-extension'
import { basename, extname } from 'path'
import { doesFileSupportExif } from './does-file-support-exif'
import { doesFileHaveExifDate } from './does-file-have-exif-date'
import { existsSync } from "fs"
import { getCompanionJsonPathForMediaFile } from './get-companion-json-path-for-media-file'

export async function getMediaFiles(directories: Directories): Promise<MediaFileInfo[]> {
  const supportedMediaFileExtensions = ['.jpeg', '.jpg', '.gif', '.mp4'];

  const mediaFilePaths = await findFilesWithExtension(directories.unprocessed, supportedMediaFileExtensions);

  const mediaFiles: MediaFileInfo[] = [];

  for (const mediaFilePath of mediaFilePaths) {
    const mediaFileName = basename(mediaFilePath);
    const mediaFileExtension = extname(mediaFilePath);

    const supportsExif = doesFileSupportExif(mediaFilePath);
    const hasExifDate = await doesFileHaveExifDate(mediaFilePath);

    const jsonFilePath = getCompanionJsonPathForMediaFile(mediaFilePath);
    const jsonFileName = jsonFilePath ? basename(jsonFilePath) : null;
    const jsonFileExists = jsonFilePath ? existsSync(jsonFilePath) : false;

    mediaFiles.push({
      mediaFilePath,
      mediaFileName,
      mediaFileExtension,
      supportsExif,
      hasExifDate,
      jsonFilePath,
      jsonFileName,
      jsonFileExists,
    });
  }

  return mediaFiles;
}
