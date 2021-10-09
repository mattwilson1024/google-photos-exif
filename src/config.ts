import { Config } from './models/config-models';

export const CONFIG: Config = {
  supportedMediaFileTypes: [
    { extension: '.jpeg', supportsExif: true },
    { extension: '.jpg',  supportsExif: true },
    { extension: '.heic', supportsExif: true },
    { extension: '.gif',  supportsExif: false },
    { extension: '.mp4',  supportsExif: false },
    { extension: '.png',  supportsExif: false },
    { extension: '.avi',  supportsExif: false },
    { extension: '.mov',  supportsExif: false },
  ],
};
