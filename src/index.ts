import {Command, flags} from '@oclif/command';
import * as Parser from '@oclif/parser';
import { existsSync, promises as fspromises } from 'fs';
import { basename, resolve } from 'path';
import { getAllFilesRecursively } from './helpers/get-all-files-recursively';
import { Directories } from './models/directories'
import { getMediaFiles } from './helpers/get-media-files'
import { moveFile } from './helpers/move-file'
import { readPhotoTakenTimeFromGoogleJson } from './helpers/read-photo-taken-time-from-google-json'
import { updateExifMetadata } from './helpers/update-exif-metadata'
import { updateFileModificationDate } from './helpers/update-file-modification-date'
import { doesFileHaveExifDate } from './helpers/does-file-have-exif-date'

const { readdir, mkdir, copyFile } = fspromises;

class GooglePhotosExif extends Command {
  static description = `Takes in a directory containing the contents of a Google Photos Takeout and, for any images that are lacking metadata for the date/time the photo was taken, writes that date to the EXIF metadata from Google's JSON metadata. For gifs / movies, the _file_ modified date is adjusted to account for these formats not including EXIF metadata.`;

  static flags = {
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    inputDir: flags.string({
      char: 's',
      description: 'Directory containing all extracted zips from Google Photos Takeout',
      required: true,
    }),
    outputDir: flags.string({
      char: 'd',
      description: 'Directory into which the processed output will be written',
      required: true,
    }),
  }

  static args: Parser.args.Input  = []

  async run() {
    const { args, flags} = this.parse(GooglePhotosExif);
    const { inputDir, outputDir } = flags;

    try {
      const directories = this.determineDirectoryPaths(inputDir, outputDir);
      await this.prepareDirectories(directories);
      await this.flattenAllFilesIntoSingleDirectory(directories);
      await this.processMediaFiles(directories);
    } catch (error) {
      this.error(error);
      this.exit(1);
    }

    this.log('Done 🎉');
    this.exit(0);
  }

  private determineDirectoryPaths(inputDir: string, outputDir: string): Directories {
    return {
      input: inputDir,
      output: outputDir,
      unprocessed: resolve(outputDir, 'unprocessed'),
      media: resolve(outputDir, 'media'),
      mediaWithUpdatedExif: resolve(outputDir, 'media-with-updated-exif'),
      json: resolve(outputDir, 'json'),
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
      this.log(`--- Creating output root directory: ${directories.output} ---`);
      await mkdir(directories.output);
    }

    this.log(`--- Preparing categorised directories inside the output directory ---`);
    await mkdir(directories.unprocessed);
    await mkdir(directories.media);
    await mkdir(directories.mediaWithUpdatedExif);
    await mkdir(directories.json);
  }

  private async flattenAllFilesIntoSingleDirectory(directories: Directories): Promise<void> {
    this.log('--- Flattening all files from inputDir (including subdirectories) into a single "unprocessed" directory before processing ---')
    const allFiles = await getAllFilesRecursively(directories.input);
    for (const srcFilePath of allFiles) {
      const srcFileName = basename(srcFilePath);
      const destFilePath = resolve(directories.unprocessed, srcFileName);

      this.log(`Copying file: ${srcFilePath}`);
      await copyFile(srcFilePath, destFilePath);
    }
  }

  private async processMediaFiles(directories: Directories): Promise<void> {
    this.log('--- Finding media files ---')
    const mediaFiles = await getMediaFiles(directories);

    const jpegs = mediaFiles.filter(mediaFile => mediaFile.mediaFileExtension.toLowerCase() === '.jpeg' || mediaFile.mediaFileExtension.toLowerCase() === '.jpg');
    const gifs = mediaFiles.filter(mediaFile => mediaFile.mediaFileExtension.toLowerCase() === '.gif');
    const mp4s = mediaFiles.filter(mediaFile => mediaFile.mediaFileExtension.toLowerCase() === '.mp4');
    this.log(`--- Found ${jpegs.length} JPEGs, ${gifs.length} GIFs and ${mp4s.length} MP4s ---`);

    this.log(`--- Processing files. This might take a while... ---`);
    let exifUpdateCount = 0;

    for (const mediaFile of mediaFiles) {

      let exifUpdated = false;
      const photoTimeTaken = await readPhotoTakenTimeFromGoogleJson(mediaFile);

      if (photoTimeTaken) {
        if (mediaFile.supportsExif) {
          const hasExifDate = await doesFileHaveExifDate(mediaFile.mediaFilePath);
          if (!hasExifDate) {
            await updateExifMetadata(mediaFile.mediaFilePath, photoTimeTaken);
            exifUpdated = true;
            this.log(`${mediaFile.mediaFileName}: Wrote "DateTimeOriginal" EXIF metadata`);
          }
        }

        await updateFileModificationDate(mediaFile.mediaFilePath, photoTimeTaken);
      }

      if (exifUpdated) {
        await moveFile(mediaFile.mediaFilePath, directories.mediaWithUpdatedExif);
        exifUpdateCount++;
      } else {
        await moveFile(mediaFile.mediaFilePath, directories.media);
      }

      if (mediaFile.jsonFilePath && mediaFile.jsonFileExists) {
        await moveFile(mediaFile.jsonFilePath, directories.json);
      }

    }

    this.log(`--- Processed ${mediaFiles.length} media files (${jpegs.length} JPEGs, ${gifs.length} GIFs and ${mp4s.length} MP4s) ---`);
    this.log(`--- The file modified timestamp has been updated on all media files ---`)
    this.log(`--- ${exifUpdateCount} files support EXIF, but had no DateTimeOriginal field. These files have been updated with the data found in the JSON metadata. ---`);
  }
}

export = GooglePhotosExif
