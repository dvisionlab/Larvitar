/** @module loaders/dicomLoader
 *  @desc This file provides functionalities for
 *        custom DICOM Loader
 */

// internal libraries
import { loadAndCacheImages } from "../image_rendering";
import { getLarvitarManager } from "./commonLoader";

/*
 * This module provides the following functions to be exported:
 * cacheImages(seriesId, seriesData, callback)
 * getDicomImageId(dicomLoaderName)
 */

let imageLoaderCounter = 0;

/**
 * Load and cache images and then store in manager if ready
 * @instance
 * @function cacheImages
 * @param {String} seriesId The Id of the series
 * @param {Object} seriesData The series data
 * @param {Function} callback An optional callback function
 */
export const cacheImages = function (seriesId, seriesData, callback) {
  let manager = getLarvitarManager();
  loadAndCacheImages(seriesData, function (resp) {
    if (resp.loading == 100) {
      if (manager[seriesId]) {
        manager[seriesId] = resp.series;
      }
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
