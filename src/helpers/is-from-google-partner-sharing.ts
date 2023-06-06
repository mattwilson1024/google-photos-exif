import { GoogleMetadata } from "../models/google-metadata"; 
import { promises as fspromises } from "fs"
import { MediaFileInfo } from '../models/media-file-info'

const { readFile } = fspromises;

export async function isFromGooglePartnerSharing(mediaFile: MediaFileInfo): Promise<boolean> {
  if (!mediaFile.jsonFilePath || !mediaFile.jsonFileExists) {
    return false;
  }

  const jsonContents = await readFile(mediaFile.jsonFilePath, 'utf8');
  const googleJsonMetadata = JSON.parse(jsonContents) as GoogleMetadata;

  if (googleJsonMetadata?.googlePhotosOrigin?.fromPartnerSharing) {
    return true;
  } else {
    return false;
  }
}
