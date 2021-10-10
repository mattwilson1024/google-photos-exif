import { GoogleMetadata } from '../models/google-metadata';
import { promises as fspromises } from "fs"
import { FileInfo } from '../models/file-info'

const { readFile } = fspromises;

export async function readPhotoTakenTimeFromGoogleJson(mediaFile: FileInfo): Promise<string|null> {
  if (!mediaFile.jsonFilePath || !mediaFile.jsonFileExists) {
    return null;
  }

  const jsonContents = await readFile(mediaFile.jsonFilePath, 'utf8');
  const googleJsonMetadata = JSON.parse(jsonContents) as GoogleMetadata;

  if (googleJsonMetadata?.photoTakenTime?.timestamp) {
    const photoTakenTimestamp = parseInt(googleJsonMetadata.photoTakenTime.timestamp, 10);
    const photoTakenDate = new Date(photoTakenTimestamp * 1000);
    return photoTakenDate.toISOString();
  } else {
    return null;
  }
}
