import {Command, flags} from '@oclif/command';
import * as Parser from '@oclif/parser';
import { existsSync, promises as fspromises } from 'fs';
import { basename, resolve } from 'path';
import { getAllFilesRecursively } from './helpers/get-all-files-recursively';

const { readdir, mkdir, copyFile } = fspromises;

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


}

export = GooglePhotosExif
