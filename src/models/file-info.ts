export interface FileInfo {
  filePath: string;
  fileName: string;
  fileExtension: string;
  fileExtensionLowerCased: string;  
  isMediaFile: boolean;
  supportsExif: boolean;

  jsonFilePath: string|null;
  jsonFileName: string|null;
  jsonFileExists: boolean;

  outputFileName: string|null;
  outputFilePath: string|null;
}
