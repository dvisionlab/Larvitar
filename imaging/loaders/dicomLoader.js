/** @module loaders/dicomLoader
 *  @desc This file provides functionalities for
 *        custom DICOM Loader
 */

// external libraries
import cornerstone from "cornerstone-core";
import { omit, each } from "lodash";

// internal libraries
import { clearImageCache, isElement } from "../image_rendering";
import { larvitar_store } from "../image_store";

// global variables
export var dicomManager = {};
let imageLoaderCounter = 0;
/*
 * This module provides the following functions to be exported:
 * resetImageLoader(elementId)
 * resetDicomManager()
 * removeSeriesFromDicomManager(seriesId)
 * getSeriesDataFromDicomLoader(seriesId)
 * populateDicomManager(seriesId, seriesData, callback)
 * getDicomImageId(dicomLoaderName)
 * cacheImages(seriesData, callback)
 */

/**
 * Reset the Custom Image Loader
 * @instance
 * @function resetImageLoader
 * @param {String} elementId The Id of the html element or its DOM HTMLElement
 */
export const resetImageLoader = function (elementId) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (element) {
    cornerstone.disable(element);
  }
  resetDicomManager();
  clearImageCache();
};

/**
 * Reset the DICOM Manager store
 * @instance
 * @function resetDicomManager
 */
export const resetDicomManager = function () {
  dicomManager = {};
  imageLoaderCounter = 0;
};

/**
 * Remove a stored seriesId from the DICOM Manager
 * @instance
 * @function removeSeriesFromDicomManager
 * @param {String} seriesId The Id of the series
 */
export const removeSeriesFromDicomManager = function (seriesId) {
  if (dicomManager[seriesId]) {
    dicomManager = omit(dicomManager, seriesId);
  }
};

/**
 * Return the data of a specific seriesId stored in the DICOM Manager
 * @instance
 * @function getSeriesDataFromDicomLoader
 * @param {String} seriesId The Id of the series
 * @return {Object} dicom manager data
 */
export const getSeriesDataFromDicomLoader = function (seriesId) {
  return dicomManager[seriesId];
};

/**
 * This function can be called in order to populate the DICOM manager for a provided orientation
 * @instance
 * @function populateDicomManager
 * @param {String} seriesId The Id of the series
 * @param {Object} seriesData The series data
 * @param {Function} callback A callback function
 */
export const populateDicomManager = function (seriesId, seriesData, callback) {
  // set dicomManager as active manager
  larvitar_store.set("manager", "dicomManager");

  // check if DICOM Manager exists for this seriesId
  if (!dicomManager[seriesId]) {
    dicomManager[seriesId] = {};
  }
  cacheImages(seriesData, function (data) {
    dicomManager[seriesId] = data;
    imageLoaderCounter += seriesData.imageIds.length;
    callback();
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

/**
 * Initialize the series data with pixel data
 * @instance
 * @function cacheImages
 * @param {Object} series the series data
 * @param {Function} callback a callback function
 */
export function cacheImages(series, callback) {
  let counter = 0;
  each(series.imageIds, function (imageId) {
    cornerstone.loadAndCacheImage(imageId).then(function (image) {
      series.instances[imageId].pixelData = image.getPixelData();
      counter++;
      if (counter == series.imageIds.length) {
        callback(series);
      }
    });
  });
}
