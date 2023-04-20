import { GoogleMetadata } from '../models/google-metadata';
import { promises as fspromises } from "fs"
import { MediaFileInfo } from '../models/media-file-info'
import { Tags } from 'exiftool-vendored/dist/Tags';

const { readFile } = fspromises;

export async function readMetadataFromGoogleJson(mediaFile: MediaFileInfo): Promise<[Tags|null, Date|null]> {
  if (!mediaFile.jsonFilePath || !mediaFile.jsonFileExists) {
    return [null, null];
  }

  let metadata: Tags = {};
  let timeTaken: Date|null = null;
  const jsonContents = await readFile(mediaFile.jsonFilePath, 'utf8');
  const googleJsonMetadata = JSON.parse(jsonContents) as GoogleMetadata;

  if (googleJsonMetadata?.photoTakenTime?.timestamp) {
    const photoTakenTimestamp = parseInt(googleJsonMetadata.photoTakenTime.timestamp, 10);
    timeTaken = new Date(photoTakenTimestamp * 1000);
    metadata.DateTimeOriginal = timeTaken.toISOString();
  }

  if (googleJsonMetadata?.geoData?.altitude != 0 ||
    googleJsonMetadata?.geoData?.latitude != 0 ||
    googleJsonMetadata?.geoData?.longitude != 0)
  {
    const geoData = googleJsonMetadata.geoData;
    metadata.GPSAltitude = geoData.altitude;
    if (geoData.latitude >= 0) {
      metadata.GPSLatitude = geoData.latitude;
      metadata.GPSLatitudeRef = 'N';
    } else {
      metadata.GPSLatitude = -geoData.latitude;
      metadata.GPSLatitudeRef = 'S';
    }
    if (geoData.longitude >= 0) {
      metadata.GPSLongitude = geoData.longitude;
      metadata.GPSLongitudeRef = 'E';
    } else {
      metadata.GPSLongitude = -geoData.longitude;
      metadata.GPSLongitudeRef = 'W';
    }
  }

  return [metadata, timeTaken];
}
