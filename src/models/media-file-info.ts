export interface MediaFileInfo {
  mediaFilePath: string;
  mediaFileName: string;
  mediaFileExtension: string;
  supportsExif: boolean;

  jsonFilePath: string|null;
  jsonFileName: string|null;
  jsonFileExists: boolean;

  outputFileName: string;
  outputFilePath: string;
  outputFileFolder: string;
}
