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

// Todo: Check all the formats that Apple Photos supports:  .jpg, .png, .webp, .gif, some RAW files, .mpg, .mod, .mmv, .tod, .wmv, .asf, .avi, .divx, .mov, .m4v, .3gp, .3g2, .mp4, .m2t, .m2ts, .mts, and .mkv files.
