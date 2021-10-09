import { extname } from 'path';
import { CONFIG } from '../config';

export function doesFileSupportExif(filePath: string): boolean {
  const extension = extname(filePath);
  const mediaFileType = CONFIG.supportedMediaFileTypes.find(fileType => fileType.extension.toLowerCase() === extension.toLowerCase());
  return mediaFileType?.supportsExif ?? false;
}
