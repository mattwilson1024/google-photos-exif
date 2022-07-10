import { Command, Flags } from '@oclif/core';
import { existsSync, promises as fspromises } from 'fs';
import { CONFIG } from '../../config';
import { doesFileHaveExifDate } from '../../helpers/does-file-have-exif-date';
import { findSupportedMediaFiles } from '../../helpers/find-supported-media-files';
import { readPhotoTakenTimeFromGoogleJson } from '../../helpers/read-photo-taken-time-from-google-json';
import { updateExifMetadata } from '../../helpers/update-exif-metadata';
import { updateFileModificationDate } from '../../helpers/update-file-modification-date';
import { Directories } from '../../models/directories'

const { readdir, mkdir, copyFile } = fspromises;

export default class ProcessPhotos extends Command {
  static description = `Takes in a directory path for an extracted Google Photos Takeout. Extracts all photo/video files (based on the conigured list of file extensions) and places them into an output directory. All files will have their modified timestamp set to match the timestamp specified in Google's JSON metadata files (where present). In addition, for file types that support EXIF, the EXIF "DateTimeOriginal" field will be set to the timestamp from Google's JSON metadata, if the field is not already set in the EXIF metadata.`;

  static examples = [
    `$ google-photos-exif --inputDir ~/takeout --outputDir ~/output --errorDir ~/error`,
  ]

  static flags = {
    version: Flags.version({char: `v`}),
    help: Flags.help({char: `h`}),
    inputDir: Flags.string({
      char: `i`,
      description: `Directory containing the extracted contents of Google Photos Takeout zip file`,
      required: true,
    }),
    outputDir: Flags.string({
      char: `o`,
      description: `Directory into which the processed output will be written`,
      required: true,
    }),
    errorDir: Flags.string({
      char: `e`,
      description: `Directory for any files that have bad EXIF data - including the matching metadata files`,
      required: true,
    }),
  }

  static args = [];

  async run(): Promise<void> {
    const { flags } = await this.parse(ProcessPhotos);
    const { inputDir, outputDir, errorDir } = flags;

    try {
      const directories = this.determineDirectoryPaths(inputDir, outputDir, errorDir);
      await this.prepareDirectories(directories);
      await this.processMediaFiles(directories);
    } catch (error) {
      this.error(error as string);
      this.exit(1);
    }

    this.log('Done 🎉');
    this.exit(0);
  }

  private determineDirectoryPaths(inputDir: string, outputDir: string, errorDir: string): Directories {
    return {
      input: inputDir,
      output: outputDir,
      error: errorDir,
    };
  }

  private async prepareDirectories(directories: Directories): Promise<void> {
    if (!directories.input || !existsSync(directories.input)) {
      throw new Error('The input directory must exist');
    }

    if (!directories.output) {
      throw new Error('You must specify an output directory using the --outputDir flag');
    }

    if (!directories.error) {
      throw new Error('You must specify an error directory using the --errorDir flag');
    }

    await this.checkDirIsEmptyAndCreateDirIfNotFound(directories.output, 'If the output directory already exists, it must be empty');
    await this.checkDirIsEmptyAndCreateDirIfNotFound(directories.error, 'If the error directory already exists, it must be empty');
  }

  private async checkDirIsEmptyAndCreateDirIfNotFound(directoryPath: string, messageIfNotEmpty: string): Promise<void> {
    const folderExists = existsSync(directoryPath);
    if (folderExists) {
      const folderContents = await readdir(directoryPath);
      const folderContentsExcludingDSStore = folderContents.filter(filename => filename !== '.DS_Store');
      const folderIsEmpty = folderContentsExcludingDSStore.length === 0;
      if (!folderIsEmpty) {
        throw new Error(messageIfNotEmpty);
      }
    } else {
      this.log(`--- Creating directory: ${directoryPath} ---`);
      await mkdir(directoryPath);
    }
  }

  private async processMediaFiles(directories: Directories): Promise<void> {
    // Find media files
    const supportedMediaFileExtensions = CONFIG.supportedMediaFileTypes.map(fileType => fileType.extension);
    this.log(`--- Finding supported media files (${supportedMediaFileExtensions.join(', ')}) ---`)
    const mediaFiles = await findSupportedMediaFiles(directories.input, directories.output);

    // Count how many files were found for each supported file extension
    const mediaFileCountsByExtension = new Map<string, number>();
    supportedMediaFileExtensions.forEach(supportedExtension => {
      const count = mediaFiles.filter(mediaFile => mediaFile.mediaFileExtension.toLowerCase() === supportedExtension.toLowerCase()).length;
      mediaFileCountsByExtension.set(supportedExtension, count);
    });

    this.log(`--- Scan complete, found: ---`);
    mediaFileCountsByExtension.forEach((count, extension) => {
      this.log(`${count} files with extension ${extension}`);
    });

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
    this.log(`--- Finished processing media files: ---`);
    mediaFileCountsByExtension.forEach((count, extension) => {
      this.log(`${count} files with extension ${extension}`);
    });
    this.log(`--- The file modified timestamp has been updated on all media files ---`)
    if (fileNamesWithEditedExif.length > 0) {
      this.log(`--- Found ${fileNamesWithEditedExif.length} files which support EXIF, but had no DateTimeOriginal field. For each of the following files, the DateTimeOriginalField has been updated using the date found in the JSON metadata: ---`);
      fileNamesWithEditedExif.forEach(fileNameWithEditedExif => this.log(fileNameWithEditedExif));
    } else {
      this.log(`--- We did not edit EXIF metadata for any of the files. This could be because all files already had a value set for the DateTimeOriginal field, or because we did not have a corresponding JSON file. ---`);
    }
  }
}
