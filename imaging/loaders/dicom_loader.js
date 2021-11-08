/** @module loaders/dicom_loader
 *  @desc This file provides functionalities for
 *        custom DICOM Loader
 */

// internal libraries
import { loadAndCacheImages } from "../image_rendering";

/*
 * This module provides the following functions to be exported:
 * cacheImages(seriesData, callback)
 * getDicomImageId(dicomLoaderName)
 */

let imageLoaderCounter = 0;

/**
 * Load and cache images
 * @instance
 * @function cacheImages
 * @param {Object} seriesData The series data
 * @param {Function} callback An optional callback function
 */
export const cacheImages = function (seriesData, callback) {
  loadAndCacheImages(seriesData, function (resp) {
    if (resp.loading == 100) {
      imageLoaderCounter += seriesData.imageIds.length;
    }
    if (callback) {
      callback(resp);
    }
  });
};

/**
 * Get the dicom imageId from dicom loader
 * @instance
 * @function getDicomImageId
 * @param {String} dicomLoaderName dicom loader name
 * @return {String} current dicom image id
 */
export const getDicomImageId = function (dicomLoaderName) {
  let imageId = dicomLoaderName + ":" + imageLoaderCounter;
  imageLoaderCounter++;
  return imageId;
};
