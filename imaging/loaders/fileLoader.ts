/** @module loaders/fileLoader
 *  @desc This file provides functionalities for
 *        custom File Loader
 */

// external libraries
import cornerstoneFileImageLoader from "cornerstone-file-image-loader";

// internal libraries
import { clearImageCache } from "../imageRendering";
import { clearCornerstoneElements } from "../imageTools";
import { resetFileManager } from "../imageManagers";

/*
 * This module provides the following functions to be exported:
 * getFileCustomImageId(file)
 * resetFileLoader()
 */

/**
 * Get the custom imageId from file loader
 * @instance
 * @function getFileCustomImageId
 * @param {File | ArrayBuffer} data The file object or arrayBuffer to be loaded
 * @return {String} the custom image id
 */
export const getFileCustomImageId = function (
  data: File | ArrayBuffer
): string {
  // check if file is a File
  if (data instanceof File) {
    return cornerstoneFileImageLoader.fileManager.add(data);
  } else if (data instanceof ArrayBuffer) {
    return cornerstoneFileImageLoader.fileManager.addBuffer(data);
  } else {
    throw new Error("Invalid data type");
  }
};

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
