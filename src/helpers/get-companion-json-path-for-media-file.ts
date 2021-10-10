import { existsSync } from "fs"
import { basename, dirname, extname, resolve } from 'path'

export function getCompanionJsonPathForMediaFile(mediaFilePath: string): string|null {
  const directoryPath = dirname(mediaFilePath);
  const mediaFileExtension = extname(mediaFilePath);
  let mediaFileNameWithoutExtension = basename(mediaFilePath, mediaFileExtension);

  // Sometimes (if the photo has been edited inside Google Photos) we get files with a `-edited` suffix
  // These images don't have their own .json sidecars - for these we'd want to use the JSON sidecar for the original image
  // so we can ignore the "-edited" suffix if there is one
  mediaFileNameWithoutExtension = mediaFileNameWithoutExtension.replace(/[-]edited$/i, '');

  // The naming pattern for the JSON sidecar files provided by Google Takeout seem to be inconsistent. For `foo.jpg`,
  // the JSON file is sometimes `foo.json` but sometimes it's `foo.jpg.json`. Here we start building up a list of potential
  // JSON filenames so that we can try to find them later
  const potentialJsonFileNames: string[] = [
    `${mediaFileNameWithoutExtension}.json`,
    `${mediaFileNameWithoutExtension}${mediaFileExtension}.json`,
    `${mediaFileNameWithoutExtension}.jpg.json`,   // For videos that accompanied a motion photo
    `${mediaFileNameWithoutExtension}.HEIC.json`,   // For videos that accompanied a motion photo
  ];

  // Another edge case which seems to be quite inconsistent occurs when we have media files containing a number suffix for example "foo(1).jpg"
  // In this case, we don't get "foo(1).json" nor "foo(1).jpg.json". Instead, we strangely get "foo.jpg(1).json".
  // We can use a regex to look for this edge case and add that to the potential JSON filenames to look out for
  const nameWithCounterMatch = mediaFileNameWithoutExtension.match(/(?<name>.*)(?<counter>\(\d+\))$/);
  if (nameWithCounterMatch) {
    const name = nameWithCounterMatch?.groups?.['name'];
    const counter = nameWithCounterMatch?.groups?.['counter'];
    potentialJsonFileNames.push(`${name}${mediaFileExtension}${counter}.json`);
  }

  // Sometimes the media filename ends with extra dash (eg. filename_n-.jpg + filename_n.json)
  const endsWithExtraDash = mediaFileNameWithoutExtension.endsWith('_n-');

  // Sometimes the media filename ends with extra `n` char (eg. filename_n.jpg + filename_.json)
  const endsWithExtraNChar = mediaFileNameWithoutExtension.endsWith('_n');

  // And sometimes the media filename has extra underscore in it (e.g. filename_.jpg + filename.json)
  const endsWithExtraUnderscore = mediaFileNameWithoutExtension.endsWith('_');

  if (endsWithExtraDash || endsWithExtraNChar || endsWithExtraUnderscore) {
    // We need to remove that extra char at the end
    potentialJsonFileNames.push(`${mediaFileNameWithoutExtension.slice(0, -1)}.json`);
  }

  // Now look to see if we have a JSON file in the same directory as the image for any of the potential JSON file names
  // that we identified earlier
  for (const potentialJsonFileName of potentialJsonFileNames) {
    const jsonFilePath = resolve(directoryPath, potentialJsonFileName);
    if (existsSync(jsonFilePath)) {
      return jsonFilePath;
    }
  }

  // If no JSON file was found, just return null - we won't be able to adjust the date timestamps without finding a
  // suitable JSON sidecar file
  return null;
}
