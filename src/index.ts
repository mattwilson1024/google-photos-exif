import { Command, flags } from '@oclif/command';
import * as Parser from '@oclif/parser';
import { existsSync, promises as fspromises } from 'fs';
import { doesFileHaveExifDate } from './helpers/does-file-have-exif-date';
import { findSupportedMediaFiles } from './helpers/find-supported-media-files';
import { readPhotoTakenTimeFromGoogleJson } from './helpers/read-photo-taken-time-from-google-json';
import { updateExifMetadata } from './helpers/update-exif-metadata';
import { updateFileModificationDate } from './helpers/update-file-modification-date';
import { Directories } from './models/directories'
import { SUPPORTED_MEDIA_FILE_EXTENSIONS } from './models/supported-media-file-extensions';

const { readdir, mkdir, copyFile } = fspromises;

class GooglePhotosExif extends Command {
  static description = `Takes in a directory path for an extracted Google Photos Takeout. Extracts all JPEGs, GIFs and MP4 files and places them into an output directory. All files will have their modified timestamp set to match the timestamp specified in Google's JSON metadata files (where present). In addition, for file types that support EXIF, the EXIF "DateTimeOriginal" field will be set to the timestamp from Google's JSON metadata, if the field is not already set in the EXIF metadata.`;

  static flags = {
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    inputDir: flags.string({
      char: 's',
      description: 'Directory containing the extracted contents of Google Photos Takeout zip file',
      required: true,
    }),
    outputDir: flags.string({
      char: 'd',
      description: 'Directory into which the processed output will be written',
      required: true,
    }),
    errorDir: flags.string({
      char: 'd',
      description: 'Directory for any files that have bad EXIF data - including the matching metadata files',
      required: true,
    }),
  }

  static args: Parser.args.Input  = []

  async run() {
    const { args, flags} = this.parse(GooglePhotosExif);
    const { inputDir, outputDir, errorDir } = flags;

    try {
      const directories = this.determineDirectoryPaths(inputDir, outputDir, errorDir);
      await this.prepareDirectories(directories);
      await this.processMediaFiles(directories);
    } catch (error) {
      this.error(error);
      this.exit(1);
    }

    this.log('Done 🎉');
    this.exit(0);
  }

  private determineDirectoryPaths(inputDir: string, outputDir: string, errorDir: string): Directories {
    return {
      input: inputDir,
      output: outputDir,
      error: errorDir
    };
  }

  private async prepareDirectories(directories: Directories): Promise<void> {
    if (!directories.input || !existsSync(directories.input)) {
      throw new Error('The input directory must exist');
    }

    if (!directories.output) {
      throw new Error('You must specify an output directory using the --outputDir flag');
    }

    const outputFolderExists = existsSync(directories.output);
    if (outputFolderExists) {
      const outputFolderContents = await readdir(directories.output);
      const outputFolderContentsExcludingDSStore = outputFolderContents.filter(filename => filename !== '.DS_Store');
      const outputFolderIsEmpty = outputFolderContentsExcludingDSStore.length === 0;
      if (!outputFolderIsEmpty) {
        throw new Error('If the output directory already exists, it must be empty');
      }
    } else {
      this.log(`--- Creating output directory: ${directories.output} ---`);
      await mkdir(directories.output);
    }
  }

  private async processMediaFiles(directories: Directories): Promise<void> {
    this.log(`--- Finding supported media files (${SUPPORTED_MEDIA_FILE_EXTENSIONS.join(', ')}) ---`)
    const mediaFiles = await findSupportedMediaFiles(directories.input, directories.output);

    const jpegs = mediaFiles.filter(mediaFile => mediaFile.mediaFileExtension.toLowerCase() === '.jpeg' || mediaFile.mediaFileExtension.toLowerCase() === '.jpg');
    const gifs = mediaFiles.filter(mediaFile => mediaFile.mediaFileExtension.toLowerCase() === '.gif');
    const mp4s = mediaFiles.filter(mediaFile => mediaFile.mediaFileExtension.toLowerCase() === '.mp4');
    const pngs = mediaFiles.filter(mediaFile => mediaFile.mediaFileExtension.toLowerCase() === '.png');
    const avis = mediaFiles.filter(mediaFile => mediaFile.mediaFileExtension.toLowerCase() === '.avi');
    
    this.log(`--- Found ${jpegs.length} JPEGs, ${gifs.length} GIFs, ${pngs.length} PNGs, ${mp4s.length} MP4s and ${avis.length} AVIs ---`);

    this.log(`--- Processing media files ---`);
    const fileNamesWithEditedExif: string[] = [];

    for (let i = 0, mediaFile; mediaFile = mediaFiles[i]; i++) {

      // Copy the file into output directory
      this.log(`Copying file ${i} of ${mediaFiles.length}: ${mediaFile.mediaFilePath} -> ${mediaFile.outputFileName}`);
      await copyFile(mediaFile.mediaFilePath, mediaFile.outputFilePath);

      // Process the output file, setting the modified timestamp and/or EXIF metadata where necessary
      const photoTimeTaken = await readPhotoTakenTimeFromGoogleJson(mediaFile);

      if (photoTimeTaken) {
        if (mediaFile.supportsExif) {
          const hasExifDate = await doesFileHaveExifDate(mediaFile.mediaFilePath);
          if (!hasExifDate) {
            await updateExifMetadata(mediaFile, photoTimeTaken, directories.error);
            fileNamesWithEditedExif.push(mediaFile.outputFileName);
            this.log(`Wrote "DateTimeOriginal" EXIF metadata to: ${mediaFile.outputFileName}`);
          }
        }

        await updateFileModificationDate(mediaFile.outputFilePath, photoTimeTaken);
      }
    }

    // Log a summary
    this.log(`--- Processed ${mediaFiles.length} media files (${jpegs.length} JPEGs, ${gifs.length} GIFs, ${pngs.length} PNGs, ${mp4s.length} MP4s and ${avis.length} AVIs) ---`);
    this.log(`--- The file modified timestamp has been updated on all media files ---`)
    if (fileNamesWithEditedExif.length > 0) {
      this.log(`--- Found ${fileNamesWithEditedExif.length} files which support EXIF, but had no DateTimeOriginal field. For each of the following files, the DateTimeOriginalField has been updated using the date found in the JSON metadata: ---`);
      fileNamesWithEditedExif.forEach(fileNameWithEditedExif => this.log(fileNameWithEditedExif));
    } else {
      this.log(`--- We did not edit EXIF metadata for any of the files. This could be because all files already had a value set for the DateTimeOriginal field, or because we did not have a corresponding JSON file. ---`);
    }
  }
}

export = GooglePhotosExif
