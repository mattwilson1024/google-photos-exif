# google-photos-exif

A tool to fix missing date taken EXIF metadata from Google Photos takeout

## Table of Contents

* [Quick Start](#quick-start)
* [Background](#background)
* [Structure of Google Takeout Export](#structure-of-google-takeout-export)
* [What inputs do I need to provide?](#what-inputs-do-i-need-to-provide)
* [What does the tool do?](#what-does-the-tool-do)
* [Disclaimer?](#disclaimer)


## Quick Start

Example usage (based on Mac paths):

```
yarn
yarn start --inputDir /Users/someone/Desktop/takeout --outputDir /Users/someone/Desktop/output
```


## Background

I wrote this tool to help me overcome some issues that I had when trying to make use of photos exported from Google Photos using [Google Takeout](https://takeout.google.com/).

My goal was to extract all photos from my Google Photos account and incorporate them into a master photo library on my Mac. This library is organised into a date-based folder structure, with images being automatically moved into the correct structure using [Silent Sifter](https://www.vector15.com/silentsifter/).

Silent Sifter provides a fast way to organise images into folders based on the timestamps embedded in the image metadata or failing that, the file modification timestamps.  

Whilst it is great that I was able to use Google Takeout to extract all of my stored images from Google Photos at once, I found that some images were landing in the wrong place due to missing `DateTimeOriginal` EXIF timestamps. This tool aims to eliminate some of those issues by writing missing `DateTimeOriginal` timestamps into the EXIF files where possible. 

## Structure of Google Takeout export

At the time of writing (September 2020), Google Takeout provides you with multiple zip files (e.g. 2GB each), each structured in a way that is fairly unintuitive and tricky to make use of directly.

If you were to take each zip and extract them you might find something similar to this: 

```
Extracted Takeout Zip 1
  Google Photos
    2020-09-01
      IMG1001.jpg
      IMG1001.jpg.json
    2020-09-02
      IMG1002.jpg.json
      metadata.json
    2020-09-04
      IMG1003.jpg
      IMG1003.json
    SomeAlbumName
      IMG1004.jpg
      IMG1005.jpg
    archive_browser.html
Extracted Takeout Zip 2
  Google Photos
    2006-01-01
      IMG0305.jpg.json
  archive_browser.html
```

There are some interesting challenges to note here:

1. Each zip contains folders for certain dates and/or album names. These folders contain a mixture of image files and JSON metadata files
2. The date based folders don't always contain perfect pairs of images and JSON files, sometimes you get one without the other (I'm not sure if there is any guarantee that these are not split across the separate zip files but it feels somewhat random to the untrained eye)
3. The naming convention for the JSON files seems inconsistent. For an image named `IMG123.jpg`, sometimes you get `IMG123.jpg.json` but sometimes it's just `IMG123.json` 
4. From what I can tell, the embedded metadata (e.g. EXIF / IPTC) in the image files is _not_ updated if changes are made within Google Photos, for example if the dates are updated using the Google Photos UI. Instead, Google's metadata comes out in the accompanying JSON files.
5. Whilst most of my images contained reasonable EXIF timestamps for the time they were taken (written by the phone's camera), a small number did not. My guess is that these images originated from other sources (e.g. they were shared with me or imported into the library by other means, and the source did not include a timestamp in the EXIF metadata)
6. Some file formats such as GIFs or MP4 videos don't have this metadata and thus also get sorted into the wrong place when run through tools that organise images based on the metadata timestamps.

## What inputs do I need to provide?

The tool takes in two parameters:

1. an `inputDir` directory path containing the Google takeout files.

This needs to be a single directory containing _all_ of the _extracted_ zips from Google takeout. It is required that each zip has been extracted first (it won't process zip files), and that the resultant folders have all been placed together somewhere in side the `inputDir`.

For example:
```
Input
  Takeout 1
    Google Photos
      2020-01-01
      ...
  Takeout 2
    Google Photos
      2017-04-03
      ...
```

2. an `outputDir` directory path, which is where the tool will write its output

This needs to be an empty directory anywhere on disk.

## What does the tool do?

The tool will do the following:
1. Copy _all_ files from the (nested) `inputDir` into a flat/single-level folder in `outputDir/unprocessed`. By flattening the structure, the tool will be able to find matching pairs of files (e.g. IMG123.jpg and IMG123.jpg.json). Some files will get overwritten in the output dir such as metadata.json but these aren't used by the tool anyway.
2. Find all "media" files in the `unprocessed` dir. Currently this is limited to the following file formats: `JPEG`, `JPG`, `GIF`, `MP4`
3. For each media file:
    a. look for a corresponding JSON file and if found, read the `photoTakenTime` field
    b. if the file format supports EXIF (e.g. JPEG files), read the metadata and, if it is missing the `DateTimeOriginal` field, attempt to populate it with the `photoTakenTime` from the corresponding JSON file
    c. for all media files (including JPEGs, but also files that don't support EXIF such as GIF/MP4), update the file's `date last modified` to the `photoTakenTime` from the corresponding JSON file if possible
4. Move the processed media files from `unprocessed` into one of two output directories:
    - `outputDir/media-with-updated-exif` if the EXIF field has been written in step 3b
    - `outputDir/media` otherwise (for example, if the image already had a date stored in EXIF `DateTimeOriginal`, there is no JSON file, or the JSON file does not contain a date)
5. Move the corresponding JSON files that go along with processed media files into a separate output directory:
    - `outputDir/json`
6. Leave any unused files in `outputDir/unprocessed`

## Disclaimer

This tool was only written for the purpose of solving my own personal requirements. 

I decided to make this public on GitHub because:
 - it was useful for me, so maybe it'll be useful for others in the future
 - future me might be thankful if I ever need to do this again

With that said, please bear in mind that this tool won't be actively maintained and your mileage may vary. I'm sure it's far from perfect so if you choose to use it please proceed with caution and be careful to verify the results! I hope it's helpful.
