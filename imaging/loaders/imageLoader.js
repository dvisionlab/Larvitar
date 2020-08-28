/** @module loaders/imageLoader
 *  @desc This file provides functionalities for
 *        custom Image Loader
 *  @todo Document
 */

// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneFileImageLoader from "cornerstone-file-image-loader";
import { has } from "lodash";

// internal libraries
import { clearImageCache } from "../image_rendering";

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
export const resetFileLoader = function(elementId) {
  let element = document.getElementById(elementId);
  if (element) {
    cornerstone.disable(element);
  }
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
  const imageId = has(fileManager, file.name)
    ? fileManager[file.name]
    : cornerstoneFileImageLoader.fileManager.add(file);
  fileManager[file.name] = imageId;
  return imageId;
};

/* Internal module functions */
