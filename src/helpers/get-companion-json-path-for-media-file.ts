import { existsSync } from "fs"
import { basename, dirname, extname, resolve } from 'path'

export function getCompanionJsonPathForMediaFile(mediaFilePath: string): string|null {
  const directoryPath = dirname(mediaFilePath);
  const mediaFileExtension = extname(mediaFilePath);
  const mediaFileNameWithoutExtension = basename(mediaFilePath, mediaFileExtension);

  // Sometimes (if the photo has been edited inside Google Photos) we get files with a `-edited` suffix
  // These won't have their own `.json` sidecar, but if we have a JSON file for the unedited version that'll be what we want
  const mediaFileNameWithoutExtensionOrEditedSuffix = mediaFileNameWithoutExtension.replace(/[-]edited$/i, '');

  // The JSON files have varying extensions, sometimes it's just `.json` but sometimes it's more like `.jpg.json`
  // Look to see if there is a JSON file with either naming pattern
  const jsonPathIncludingMediaExt = resolve(directoryPath, `${mediaFileNameWithoutExtensionOrEditedSuffix}${mediaFileExtension}.json`);
  const jsonPathExcludingMediaExt = resolve(directoryPath, `${mediaFileNameWithoutExtensionOrEditedSuffix}.json`);

  if (existsSync(jsonPathIncludingMediaExt)) {
    return jsonPathIncludingMediaExt;
  } else if (existsSync(jsonPathExcludingMediaExt)) {
    return jsonPathExcludingMediaExt;
  } else {
    return null;
  }
}
