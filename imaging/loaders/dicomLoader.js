/*
 This file provides functionalities for
 custom DICOM Loader
*/

// external libraries
import cornerstone from "cornerstone-core";
import { omit, each } from "lodash";

// internal libraries
import { getReslicedMetadata, getReslicedPixeldata } from "../image_utils";
import { clearImageCache } from "../image_rendering";
import { larvitar_store } from "./image_store";
let store = larvitar_store.state ? larvitar_store : new larvitar_store();

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

// ================================
// Reset the Custom Image Loader ==
// ================================
export const resetImageLoader = function (elementId) {
  store.set(null, "series", []);
  store.set(null, "seriesId", null);
  let element = document.getElementById(elementId);
  if (element) {
    cornerstone.disable(element);
  }
  resetDicomManager();
  clearImageCache();
};

// ================================
// Reset the DICOM Manager store
// ================================
export const resetDicomManager = function () {
  dicomManager = {};
  imageLoaderCounter = 0;
};

// ==================================================
// Remove a stored seriesId from the DICOM Manager ==
// ==================================================
export const removeSeriesFromDicomManager = function (seriesId) {
  if (dicomManager[seriesId]) {
    dicomManager = omit(dicomManager, seriesId);
  }
};

// =====================================================================
// Return the data of a specific seriesId stored in the DICOM Manager ==
// =====================================================================
export const getSeriesData = function (seriesId) {
  return dicomManager[seriesId];
};

// ===================================================
// This function can be called in order to populate ==
// the DICOM manager for a provided orientation ======
// ===================================================
export const populateDicomManager = function (
  seriesId,
  seriesData,
  orientation,
  callback
) {
  // check if DICOM Manager exists for this seriesId
  if (!dicomManager[seriesId]) {
    dicomManager[seriesId] = {};
  }
  dicomManager[seriesId][orientation] = {};

  let viewer = store.get("viewer");
  store.set(viewer, "loadingStatus", [orientation, false]);

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

// ==========================================
// Get the dicom imageId from dicom loader ==
// ==========================================
export const getDicomImageId = function (dicomLoaderName) {
  let imageId = dicomLoaderName + ":" + imageLoaderCounter;
  imageLoaderCounter++;
  return imageId;
};

/* Internal module functions */

// =================================================
// Initialize the native viewport with pixel data ==
// =================================================
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

// ==============================================================
// Build the cornerstone data structure into the DICOM manager ==
// from data (file) for a resliced viewport (orientation) =======
// using the native one (axial) as starting data ================
// ==============================================================
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
