import { Config } from './models/config-models';

export const CONFIG: Config = {
  supportedMediaFileTypes: [
    { extension: '.avi',  supportsExif: false },
    { extension: '.dng', supportsExif: false },
    { extension: '.gif',  supportsExif: false },
    { extension: '.heic', supportsExif: true },
    { extension: '.jpeg', supportsExif: true },
    { extension: '.jpg',  supportsExif: true },
    { extension: '.m4v',  supportsExif: false },
    { extension: '.mov',  supportsExif: true },
    { extension: '.mp4',  supportsExif: false },
    { extension: '.png',  supportsExif: false },
    { extension: '.webp',  supportsExif: false },    
  ],
};
