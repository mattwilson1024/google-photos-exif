export interface MediaFileInfo {
  mediaFilePath: string;
  mediaFileName: string;
  mediaFileExtension: string;

  supportsExif: boolean;
  hasExifDate: boolean;

  jsonFilePath: string|null;
  jsonFileName: string|null;
  jsonFileExists: boolean;
}
