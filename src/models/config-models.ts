export interface Config {
  supportedMediaFileTypes: IMediaFileType[];
}

export interface IMediaFileType {
  extension: string;
  supportsExif: boolean;
}
