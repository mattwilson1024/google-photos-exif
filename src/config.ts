import { Config } from './models/config-models';

export const CONFIG: Config = {
  supportedMediaFileTypes: [
    { extension: '.avi',  supportsExif: false },
    { extension: '.dng', supportsExif: true },
    { extension: '.gif',  supportsExif: false },
    { extension: '.heic', supportsExif: true },
    { extension: '.jpeg', supportsExif: true },
    { extension: '.jpg',  supportsExif: true },
    { extension: '.m4v',  supportsExif: false },
    { extension: '.mov',  supportsExif: true },
    { extension: '.mp4',  supportsExif: false },
    { extension: '.png',  supportsExif: true },
    { extension: '.webp',  supportsExif: true },    
  ],
};
