/** @module loaders/file_loader
 *  @desc This file provides functionalities for
 *        custom File Loader
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
 * resetFileLoader()
 * resetFileManager()
 * populateFileManager(file)
 * getFileImageId(file)
 */

/**
 * Reset the Custom File Loader
 * @instance
 * @function resetFileLoader
 */
export const resetFileLoader = function () {
  clearCornerstoneElements();
  resetFileManager();
  clearImageCache();
};

/**
 * Reset the File Manager store
 * @instance
 * @function resetFileManager
 */
export const resetFileManager = function () {
  fileManager = {};
};

/**
 * Populate File Manager
 * @instance
 * @function populateFileManager
 * @return {String} current file image id
 */
export const populateFileManager = function (file) {
  let uuid = file.webkitRelativePath || file.name;
  if (!has(fileManager, uuid)) {
    const imageId = cornerstoneFileImageLoader.fileManager.add(file);
    fileManager[uuid] = imageId;
  }
};

/**
 * Get the file imageId from file loader
 * @instance
 * @function getFileImageId
 * @return {String} current file image id
 */
export const getFileImageId = function (file) {
  let uuid = file.webkitRelativePath || file.name;
  const imageId = has(fileManager, uuid) ? fileManager[uuid] : null;
  return imageId;
};

/* Internal module functions */
