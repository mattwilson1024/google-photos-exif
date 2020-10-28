2.0.0 (2020-10-28)
  - major rewrite to avoid flattening all files into one directory before starting (fixes bug where output images may get overwritten if there are multiple files with the same name)
  - simplified output structure (now just writes all output images into the output directory)
  - proper handling of images with a `-edited` suffix 
  - proper handling of images with a number suffix e.g. `foo(1).jpg`
  - improved README to explain the logic around 

0.0.0 (2020-09-19)
  - initial release
