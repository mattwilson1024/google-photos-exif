import {Command, flags} from '@oclif/command';
import * as Parser from '@oclif/parser';
import { existsSync, promises as fspromises } from 'fs';
import { basename, resolve } from 'path';
import { getAllFilesRecursively } from './helpers/get-all-files-recursively';

const { readdir, mkdir, copyFile } = fspromises;

interface Directories {
  inputDir: string;
  outputDir: string;
  flattenedDir: string;

  untouchedDir: string;
  adjustedDir: string;
  metadataDir: string;
}

class GooglePhotosExif extends Command {
  static description = 'Given a folder containing '

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
      const directories = await this.setupDirectories(inputDir, outputDir);
      await this.flattenAllFilesIntoSingleDirectory(directories);
    } catch (error) {
      this.error(error);
      this.exit(1);
    }

    this.log('Done 🎉');
    this.exit(0);
  }

  private async setupDirectories(inputDir: string, outputDir: string): Promise<Directories> {
    const directories: Directories = {
      inputDir,
      outputDir,
      flattenedDir: resolve(outputDir, 'flattened'),
      untouchedDir: resolve(outputDir, 'untouched'),
      adjustedDir: resolve(outputDir, 'adjusted'),
      metadataDir: resolve(outputDir, 'metadata'),
    };

    if (!inputDir || !existsSync(inputDir)) {
      throw new Error('The input directory must exist');
    }

    if (!outputDir) {
      throw new Error('You must specify an output directory using the --outputDir flag');
    }

    const outputFolderExists = existsSync(outputDir);
    if (outputFolderExists) {
      const outputFolderContents = await readdir(outputDir);
      const outputFolderContentsExcludingDSStore = outputFolderContents.filter(filename => filename !== '.DS_Store');
      const outputFolderIsEmpty = outputFolderContentsExcludingDSStore.length === 0;
      if (!outputFolderIsEmpty) {
        throw new Error('If the output directory already exists, it must be empty');
      }
    } else {
      this.log(`Creating output directory: ${outputDir}`)
      await mkdir(outputDir);
    }

    await mkdir(directories.flattenedDir);
    await mkdir(directories.untouchedDir);
    await mkdir(directories.adjustedDir);
    await mkdir(directories.metadataDir);

    return directories;
  }

  private async flattenAllFilesIntoSingleDirectory(directories: Directories): Promise<void> {
    const allFiles = await getAllFilesRecursively(directories.inputDir);
    for (const srcFilePath of allFiles) {
      const srcFileName = basename(srcFilePath);
      const destFilePath = resolve(directories.flattenedDir, srcFileName);

      this.log(`Copying file: ${srcFilePath}`);
      await copyFile(srcFilePath, destFilePath);
    }
  }
}

export = GooglePhotosExif
