import { Command, flags } from '@oclif/command';
import * as Parser from '@oclif/parser';
import { existsSync, promises as fspromises } from 'fs';
import { CONFIG } from './config';
import { FileInfo } from './models/file-info';
import { Directories } from './models/directories'
import { basename, extname, resolve } from 'path';
import { doesFileHaveExifDate } from './helpers/does-file-have-exif-date';
import { getAllFilesExceptJson } from './helpers/get-all-files-except-json';
import { readPhotoTakenTimeFromGoogleJson } from './helpers/read-photo-taken-time-from-google-json';
import { updateExifMetadata } from './helpers/update-exif-metadata';
import { updateFileModificationDate } from './helpers/update-file-modification-date';
import { copyWithJsonSidecar } from './helpers/copy-with-json-sidecar';

const { readdir, mkdir, copyFile } = fspromises;

class GooglePhotosExif extends Command {
  static description = `Takes in a directory path for an extracted Google Photos Takeout. Extracts all photo/video files (based on the conigured list of file extensions) and places them into an output directory. All files will have their modified timestamp set to match the timestamp specified in Google's JSON metadata files (where present). In addition, for file types that support EXIF, the EXIF "DateTimeOriginal" field will be set to the timestamp from Google's JSON metadata, if the field is not already set in the EXIF metadata.`;

  static flags = {
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    inputDir: flags.string({
      char: 'i',
      description: 'Directory containing the extracted contents of Google Photos Takeout zip file',
      required: true,
    }),
    outputDir: flags.string({
      char: 'o',
      description: 'Directory into which the processed output will be written',
      required: true,
    }),
    errorDir: flags.string({
      char: 'e',
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
    const supportedMediaFileExtensions = CONFIG.supportedMediaFileTypes.map(fileType => fileType.extension.toLowerCase());

    // Populate the FileInfo structure with all files in the source directory, except JSONs)
    this.log(`--- Getting all files in directory ${directories.input} ---`);
    const allFiles = await getAllFilesExceptJson(directories.input, directories.output);
    
    // Print the number of found files by extension
    const allExtensionTypes = new Set();
    for (const fi of allFiles) { allExtensionTypes.add(fi.fileExtensionLowerCased);  }
    const allExtensionTypesSorted = [...allExtensionTypes].sort();
    let totalFilesCount = 0;
    for (const ext of allExtensionTypesSorted) { 
      const count = allFiles.filter( fi => fi.fileExtensionLowerCased === ext ).length;
      totalFilesCount += count;
      const warn = ext != ".json" ? !supportedMediaFileExtensions.includes(<string>ext) ? "*** unsupported extension" : "" : "";
      this.log (`    ${ext}  ${count} files  ${warn}`); 
    }
    this.log (`    Total of ${totalFilesCount} non-JSON files found.`);
      
    // Filter down to the media files only, and copy any files with unsupported extensions or missing JSON to the errors directory so that the user can manually inspect them
    this.log(`--- Finding supported media files (${supportedMediaFileExtensions.join(', ')}) ---`)
    const mediaFiles: FileInfo[] = [];
    let totalMissingJson = 0;
    for (const fi of allFiles)
    {
      if (fi.isMediaFile) mediaFiles.push(fi);
      
      else {
        this.log (`    copying ${fi.fileName} to the errors directory due to unsupported extension.`);
        copyWithJsonSidecar (fi, directories.error);   
      }
      if (!fi.jsonFileExists) {
        totalMissingJson++;
        this.log (`    copying ${fi.fileName} to the errors directory due to missing JSON sidecar.`);
        copyWithJsonSidecar (fi, directories.error);   
      }
    }
    this.log (`--- ${totalFilesCount} total files, ${mediaFiles.length} supported media files, of which ${totalMissingJson} media files' JSON sidecar could not be located. ---`);
  
    // Show the media file counts
    const mediaFileCountsByExtension = new Map<string, number>();
    supportedMediaFileExtensions.forEach(supportedExtension => {
      const count = mediaFiles.filter(mediaFile => mediaFile.fileExtension.toLowerCase() === supportedExtension.toLowerCase()).length;
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
      this.log(`Copying file ${i} of ${mediaFiles.length}: ${mediaFile.filePath} -> ${mediaFile.outputFileName}`);
      await copyFile(mediaFile.filePath, <string>mediaFile.outputFilePath);

      // Process the output file, setting the modified timestamp and/or EXIF metadata where necessary
      const photoTimeTaken = await readPhotoTakenTimeFromGoogleJson(mediaFile);

      if (photoTimeTaken) {
        if (mediaFile.supportsExif) {
          const hasExifDate = await doesFileHaveExifDate(mediaFile.filePath);
          if (!hasExifDate) {
            await updateExifMetadata(mediaFile, photoTimeTaken, directories.error);
            fileNamesWithEditedExif.push(<string>mediaFile.outputFileName);
            this.log(`Wrote "DateTimeOriginal" EXIF metadata to: ${mediaFile.outputFileName}`);
          }
        }

        await updateFileModificationDate(<string>mediaFile.outputFilePath, photoTimeTaken);
      }
    }

    // Log a summary
    this.log(`--- Finished processing media files: ---`);
    mediaFileCountsByExtension.forEach((count, extension) => {
      this.log(`${count} files with extension ${extension}`);
    });
    this.log(`--- The file modified timestamp has been updated on all media files whose JSON sidecar could be found. ---`)
    if (fileNamesWithEditedExif.length > 0) {
      this.log(`--- Found ${fileNamesWithEditedExif.length} files which support EXIF, but had no DateTimeOriginal field. For each of the following files, the DateTimeOriginalField has been updated using the date found in the JSON metadata: ---`);
      fileNamesWithEditedExif.forEach(fileNameWithEditedExif => this.log(fileNameWithEditedExif));
    } else {
      this.log(`--- We did not edit EXIF metadata for any of the files. This could be because all files already had a value set for the DateTimeOriginal field, or because we did not have a corresponding JSON file. ---`);
    }
  }
}

export = GooglePhotosExif
