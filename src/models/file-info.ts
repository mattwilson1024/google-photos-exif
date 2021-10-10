export interface FileInfo {
  filePath: string;
  fileName: string;
  fileExtension: string;
  isMediaFile: boolean;
  supportsExif: boolean;

  jsonFilePath: string|null;
  jsonFileName: string|null;
  jsonFileExists: boolean;

  outputFileName: string;
  outputFilePath: string;
}
