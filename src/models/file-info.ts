export interface FileInfo {
  mediaFilePath: string;
  mediaFileName: string;
  mediaFileExtension: string;
  isMediaFile: boolean;
  supportsExif: boolean;

  jsonFilePath: string|null;
  jsonFileName: string|null;
  jsonFileExists: boolean;

  outputFileName: string;
  outputFilePath: string;
}
