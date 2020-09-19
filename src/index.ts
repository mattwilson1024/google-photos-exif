import {Command, flags} from '@oclif/command';
import * as Parser from '@oclif/parser';
import { existsSync, promises as fspromises } from 'fs';
import { basename, dirname, extname, resolve } from 'path';
import { getAllFilesRecursively } from './helpers/get-all-files-recursively';
import { getAllFilesSingleLevel } from './helpers/get-all-files-single-level';
import { exiftool } from 'exiftool-vendored';
import { isNullOrUndefined } from './helpers/is-null-or-undefined';
import { GoogleMetadata } from './models/google-metadata';

const { readdir, readFile, mkdir, copyFile, unlink, rename } = fspromises;

interface Directories {
  input: string;
  output: string;
  flattened: string;

  untouched: string;
  modified: string;
  json: string;
}

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
      await this.processJPEGs(directories);
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
      flattened: resolve(outputDir, 'flattened'),
      untouched: resolve(outputDir, 'untouched'),
      modified: resolve(outputDir, 'modified'),
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
      this.log(`Creating output root directory: ${directories.output}`);
      await mkdir(directories.output);
    }

    this.log(`Creating flattened, untouched, modified and json directories inside the output directory`);
    await mkdir(directories.flattened);
    await mkdir(directories.untouched);
    await mkdir(directories.modified);
    await mkdir(directories.json);
  }

  private async flattenAllFilesIntoSingleDirectory(directories: Directories): Promise<void> {
    this.log('--- Flattening all files from inputDir (including subdirectories) into a single directory ---')
    const allFiles = await getAllFilesRecursively(directories.input);
    for (const srcFilePath of allFiles) {
      const srcFileName = basename(srcFilePath);
      const destFilePath = resolve(directories.flattened, srcFileName);

      this.log(`Copying file: ${srcFilePath}`);
      await copyFile(srcFilePath, destFilePath);
    }
  }

  private async findFilesWithExtension(directories: Directories, fileExtensionsToFind: string[]): Promise<string[]> {
    const allFilesInFlattenedDir = await getAllFilesSingleLevel(directories.flattened);
    const flattenedDirIsEmpty = allFilesInFlattenedDir.length === 0;
    if (flattenedDirIsEmpty) {
      throw new Error('The "flattened" directory is empty, so there is no work to do. Check that your --inputDir contains all of the Google Takeout data, and that any zips have been extracted before running this tool');
    }

    const matchingFiles = allFilesInFlattenedDir.filter(filePath => {
      const extension = extname(filePath).toLowerCase();
      return fileExtensionsToFind.map(ext => ext.toLowerCase()).includes(extension);
    });
    return matchingFiles;
  }

  private async processJPEGs(directories: Directories): Promise<void> {
    const allJpegFiles = await this.findFilesWithExtension(directories, ['.jpeg', '.jpg']);

    this.log(allJpegFiles[0]);

    this.log(`--- Reading metadata for ${allJpegFiles.length} JPEGs. This might take a while... ---`);
    const jpegsWithDate: string[] = [];
    const jpegsWithNoDate: string[] = [];
    for (const filePath of allJpegFiles) {
      const readResult = await exiftool.read(filePath);

      const isMissingDateTimeOriginalMetadata = isNullOrUndefined(readResult.DateTimeOriginal);
      if (isMissingDateTimeOriginalMetadata) {
        jpegsWithNoDate.push(filePath);
      } else {
        jpegsWithDate.push(filePath);
      }
    }

    if (jpegsWithNoDate.length > 0) {
      this.log(`--- Found ${jpegsWithNoDate.length} JPEG files with no "DateTimeOriginal" metadata. ---`);
    } else {
      this.log(`--- Good news, all of the JPEG files already contain "DateTimeOriginal" metadata :) ---`);
    }

    for (const jpegPath of allJpegFiles) {
      const imageFileName = basename(jpegPath);
      const jsonPath = this.getCompanionJsonPathForMediaFile(jpegPath);
      const jsonFileExists = jsonPath && existsSync(jsonPath);
      const jsonFileName = jsonPath ? basename(jsonPath) : null;

      const shouldModify = jpegsWithNoDate.includes(jpegPath) && jsonFileExists;
      if (shouldModify && jsonPath) {
        const jsonFileName = basename(jsonPath);
        const jsonContents = await readFile(jsonPath, 'utf8');
        const googleJsonMetadata = JSON.parse(jsonContents) as GoogleMetadata;

        if (googleJsonMetadata?.photoTakenTime?.timestamp) {
          const photoTakenTimestamp = parseInt(googleJsonMetadata.photoTakenTime.timestamp, 10);
          const photoTakenDate = new Date(photoTakenTimestamp * 1000);
          const photoTakenISO = photoTakenDate.toISOString();
          await exiftool.write(jpegPath, {
            DateTimeOriginal: photoTakenISO,
            FileModifyDate: photoTakenISO,
          });

          await unlink(`${jpegPath}_original`); // exiftool will rename the old file to {filename}_original, we can delete that
          this.log(`${imageFileName}: Updated EXIF DateTimeOriginal to ${photoTakenISO} (from ${jsonFileName})`);
        } else {
          this.log(`${imageFileName}: Not updated because no photoTakenTimestamp was found in ${jsonFileName}.`);
        }
      }

      // Move the JPEG out into either the modified or untouched directory depending on whether or not we made any changes to it
      const jpegFinalDestinationPath = shouldModify ? resolve(directories.modified, imageFileName) : resolve(directories.untouched, imageFileName);
      await rename(jpegPath, jpegFinalDestinationPath);

      // Move the JSON file to the metadata dir now that we are done with it
      if (jsonPath && jsonFileExists && jsonFileName) {
        const jsonFinalDestinationPath = resolve(directories.json, jsonFileName);
        await rename(jsonPath, jsonFinalDestinationPath);
      }
    }
  }

  private getCompanionJsonPathForMediaFile(imagePath: string): string|null {
    const directoryPath = dirname(imagePath);
    const imageExtension = extname(imagePath);
    const imageFileNameWithoutExtension = basename(imagePath, imageExtension);

    const jsonPathIncludingJpg = resolve(directoryPath, `${imageFileNameWithoutExtension}${imageExtension}.json`);
    const jsonPathExcludingJpg = resolve(directoryPath, `${imageFileNameWithoutExtension}.json`);

    if (existsSync(jsonPathIncludingJpg)) {
      return jsonPathIncludingJpg;
    } else if (existsSync(jsonPathExcludingJpg)) {
      return jsonPathExcludingJpg;
    }
    return null;
  }

}

export = GooglePhotosExif
