/** @module loaders/dicomLoader
 *  @desc This file provides functionalities for
 *        custom DICOM Loader
 *  @todo Document
 */

// external libraries
import cornerstone from "cornerstone-core";
import { omit, each } from "lodash";

// internal libraries
import { getReslicedMetadata, getReslicedPixeldata } from "../image_utils";
import { clearImageCache } from "../image_rendering";
import { larvitar_store } from "../image_store";

// global variables
export var dicomManager = {};
let imageLoaderCounter = 0;
/*
 * This module provides the following functions to be exported:
 * cacheAndSaveSerie(series)
 * removeSeriesFromDicomManager(seriesId)
 * getSeriesData(seriesId)
 * resetDicomManager()
 * resetImageLoader(elementId)
 * getDicomImageId(dicomLoaderName)
 */

/**
 * Reset the Custom Image Loader
 * @instance
 * @function resetImageLoader
 * @param {String} elementId The Id of the html element
 */
export const resetImageLoader = function (elementId) {
  larvitar_store.set(null, "series", []);
  larvitar_store.set(null, "seriesId", null);
  let element = document.getElementById(elementId);
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
 * @function getSeriesData
 * @param {String} seriesId The Id of the series
 * @return {Object} dicom manager data
 */
export const getSeriesData = function (seriesId) {
  return dicomManager[seriesId];
};

/**
 * This function can be called in order to populate the DICOM manager for a provided orientation
 * @instance
 * @function populateDicomManager
 * @param {String} seriesId The Id of the series
 * @param {Object} seriesData The series data
 * @param {String} orientation The orientation string
 * @param {Function} callback A callback function
 */
export const populateDicomManager = function (
  seriesId,
  seriesData,
  orientation,
  callback
) {
  // set dicomManager as active manager
  larvitar_store.set(null, "manager", "dicomManager");

  // check if DICOM Manager exists for this seriesId
  if (!dicomManager[seriesId]) {
    dicomManager[seriesId] = {};
  }
  dicomManager[seriesId][orientation] = {};

  let viewer = larvitar_store.get("viewer");
  larvitar_store.set(viewer, "loadingStatus", [orientation, false]);

  if (orientation == "axial") {
    initializeMainViewport(seriesData, function (data) {
      dicomManager[seriesId]["axial"] = data;
      imageLoaderCounter += seriesData.imageIds.length;
      callback();
    });
  } else {
    dicomManager[seriesId][orientation] = initializeReslicedViewport(
      seriesId,
      orientation
    );
    callback();
  }
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

/* Internal module functions */

/**
 * Initialize the native viewport with pixel data
 * @instance
 * @function initializeMainViewport
 * @param {Object} series the series data
 * @param {Function} callback a callback function
 */
function initializeMainViewport(series, callback) {
  cornerstone.imageCache.purgeCache();
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

/**
 * Build the cornerstone data structure into the DICOM manager
 * from data (file) for a resliced viewport (orientation)
 * using the native one (axial) as starting data
 * @instance
 * @function initializeReslicedViewport
 * @param {String} seriesId the series id
 * @param {String} orientation the orientation tag
 * @return {Object} cornerstone data
 */
function initializeReslicedViewport(seriesId, orientation) {
  let seriesData = dicomManager[seriesId]["axial"];
  if (!seriesData) {
    console.error("Main viewport data is missing!");
    return null;
  }
  // build the DICOM Manager instance for this orientation
  dicomManager[seriesId][orientation] = {};
  let reslicedSeriesId = seriesId + "_" + orientation;

  // get the resliced metadata from native one
  let reslicedData = getReslicedMetadata(
    reslicedSeriesId,
    "axial",
    orientation,
    seriesData,
    "resliceLoader"
  );

  dicomManager[seriesId][orientation].imageIds = reslicedData.imageIds;
  dicomManager[seriesId][orientation].instances = reslicedData.instances;

  // populate nrrdManager with the pixelData information
  each(dicomManager[seriesId][orientation].imageIds, function (imageId) {
    let data = getReslicedPixeldata(
      imageId,
      seriesData,
      dicomManager[seriesId][orientation]
    );
    dicomManager[seriesId][orientation].instances[imageId].pixelData = data;
  });

  // set currentImageIdIndex to the middle slice
  let imageIds = dicomManager[seriesId][orientation].imageIds;
  let middleSlice = Math.floor(imageIds.length / 2);
  dicomManager[seriesId][orientation].currentImageIdIndex = middleSlice;
  return dicomManager[seriesId][orientation];
}
