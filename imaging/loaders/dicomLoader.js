/** @module loaders/dicomLoader
 *  @desc This file provides functionalities for
 *        custom DICOM Loader
 */

// external libraries
import cornerstone from "cornerstone-core";

// internal libraries
import { loadAndCacheImages } from "../image_rendering";
import { getLarvitarManager } from "./commonLoader";

/*
 * This module provides the following functions to be exported:
 * populateLarvitarManager(seriesId, seriesData, callback)
 * getDicomImageId(dicomLoaderName)
 */

let imageLoaderCounter = 0;

/**
 * This function can be called in order to populate the DICOM manager for a provided orientation
 * @instance
 * @function populateLarvitarManager
 * @param {String} seriesId The Id of the series
 * @param {Object} seriesData The series data
 * @param {Function} callback An optional callback function
 */
export const populateLarvitarManager = function (
  seriesId,
  seriesData,
  callback
) {
  let manager = getLarvitarManager();

  // check if DICOM Manager exists for this seriesId
  if (!manager[seriesId]) {
    manager[seriesId] = {};
  }
  loadAndCacheImages(seriesData, function (data) {
    manager[seriesId] = data;
    imageLoaderCounter += seriesData.imageIds.length;
    if (callback) {
      callback();
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
