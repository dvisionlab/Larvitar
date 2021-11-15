# Introduction

This guide is primarily for user with prior Larvitar v0.x experience who want to learn about the new features and changes in Larvitar v1.x. While it looks like a lot has changed, a lot of what you know and love about Larvitar is still the same; but we wanted to be as thorough as possibile and provide detailed explanations or examples for every documented change.

# Notable new features

We chose to migrate all functions using callback to promise. Promises are JavaScript objects that represent an eventual completion or failure of an asynchronous operation. A promise is a returned object where you attach callbacks, instead of passing callbacks into a function. the place where you attach the callback after a successful completion of a task is called, .then(). inside this you pass a callback through.

# Breaking changes

- imageIo module:
  -  *getCachedPixelData* now returns a promise which will resolve to a pixel data array or fail if an error occurs
- imageParsing module
  - *readFiles* now returns a promise which will resolve to an image object list or fail if an error occurs
  - *readFile* now returns a promise which will resolve to an image object or fail if an error occurs
  - *dumpDataset* has been renamed to parseDataset [internal API]
  - *dumpFiles* has been renamed to parseFiles [internal API]
  - *dumpFile* has been renamed to parseFile [internal API]
-  imageRendering module
   -  *renderImage* now returns a promise which will resolve when image is displayed
-  imageReslice module
   -  *resliceImage* now returns a promise which will resolve when reslice data is available
-  tools/segmentation module
   -  *addSegmentationMask* now returns a promise which will resolve when segmentation mask is added
