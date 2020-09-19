import { extname } from 'path';

export function doesFileSupportExif(filePath: string): boolean {
  const extension = extname(filePath);
  return extension.toLowerCase() === '.jpeg' || extension.toLowerCase() === '.jpg';
}
