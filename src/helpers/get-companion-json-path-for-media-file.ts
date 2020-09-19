import { basename, dirname, extname, resolve } from 'path'
import { existsSync } from "fs"

export function getCompanionJsonPathForMediaFile(mediaFilePath: string): string|null {
  const directoryPath = dirname(mediaFilePath);
  const mediaFileExtension = extname(mediaFilePath);
  const mediaFileNameWithoutExtension = basename(mediaFilePath, mediaFileExtension);

  const jsonPathIncludingMediaExt = resolve(directoryPath, `${mediaFileNameWithoutExtension}${mediaFileExtension}.json`);
  const jsonPathExcludingMediaExt = resolve(directoryPath, `${mediaFileNameWithoutExtension}.json`);

  if (existsSync(jsonPathIncludingMediaExt)) {
    return jsonPathIncludingMediaExt;
  } else if (existsSync(jsonPathExcludingMediaExt)) {
    return jsonPathExcludingMediaExt;
  } else {
    return null;
  }
}
