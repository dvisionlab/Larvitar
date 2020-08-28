/** @module loaders/fileLoader
 *  @desc This file provides functionalities for
 *        custom File Loader
 *  @todo Document
 */

// external libraries
import cornerstoneFileImageLoader from "cornerstone-file-image-loader";
import { has } from "lodash";

// internal libraries
import { clearImageCache } from "../image_rendering";
import { clearCornerstoneElements } from "../image_tools";

// global variables
export var fileManager = {};

/*
 * This module provides the following functions to be exported:
 * resetFileManager()
 * getFileImageId()
 */

/**
 * Reset the Custom File Loader
 * @instance
 * @function resetFileLoader
 * @param {String} elementId The Id of the html element
 */
export const resetFileLoader = function() {
  clearCornerstoneElements();
  resetFileManager();
  clearImageCache();
};

/**
 * Reset the File Manager store
 * @instance
 * @function resetFileManager
 */
export const resetFileManager = function() {
  fileManager = {};
};

/**
 * Get the file imageId from file loader
 * @instance
 * @function getFileImageId
 * @return {String} current file image id
 */
export const getFileImageId = function(file) {
  const imageId = has(fileManager, file.webkitRelativePath)
    ? fileManager[file.webkitRelativePath]
    : cornerstoneFileImageLoader.fileManager.add(file);
  fileManager[file.webkitRelativePath] = imageId;
  return imageId;
};

/* Internal module functions */
