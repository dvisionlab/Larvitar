/** @module imaging/io
 *  @desc This file provides I/O functionalities on NRRD files and DICOM images
 */

// external libraries
import cornerstone from "cornerstone-core";
import { forEach, find } from "lodash";

// internal libraries
import {
  getMeanValue,
  getDistanceBetweenSlices,
  getTypedArrayFromDataType
} from "./image_utils.js";
import { larvitar_store } from "./image_store";
import { parse } from "./parsers/nrrd";
import { checkMemoryAllocation } from "./monitors/memory";

/*
 * This module provides the following functions to be exported:
 * buildHeader(series)
 * getCachedPixelData(imageId)
 * buildData(series)
 * importNRRDImage(bufferArray)
 */

/**
 * Build the image header from slices' metadata
 * @function buildHeader
 * @param {Object} series - Cornerstone series object
 * @returns {Object} header: image metadata
 */
export const buildHeader = function (series) {
  let header = {};
  header.volume = {};
  header.volume.imageIds = series.imageIds;
  header.volume.seriesId =
    series.instances[series.imageIds[0]].metadata.seriesUID;
  header.volume.rows =
    series.instances[series.imageIds[0]].metadata.rows ||
    series.instances[series.imageIds[0]].metadata.x00280010;
  header.volume.cols =
    series.instances[series.imageIds[0]].metadata.cols ||
    series.instances[series.imageIds[0]].metadata.x00280011;
  header.volume.slope = series.instances[series.imageIds[0]].metadata.slope;
  header.volume.repr = series.instances[series.imageIds[0]].metadata.repr;
  header.volume.intercept =
    series.instances[series.imageIds[0]].metadata.intercept;
  header.volume.imagePosition =
    series.instances[series.imageIds[0]].metadata.imagePosition;
  header.volume.numberOfSlices = series.imageIds.length;

  header.volume.imageOrientation = getMeanValue(
    series,
    "imageOrientation",
    true
  );

  header.volume.pixelSpacing = getMeanValue(series, "pixelSpacing", true);
  // header.volume.maxPixelValue = getMeanValue(series, "maxPixelValue", false);
  // header.volume.minPixelValue = getMeanValue(series, "minPixelValue", false);
  header.volume.sliceThickness = getDistanceBetweenSlices(series, 0, 1);

  forEach(series.imageIds, function (imageId) {
    header[imageId] = series.instances[imageId].metadata;
  });
  return header;
};

/**
 * Get cached pixel data
 * @function getCachedPixelData
 * @param {String} imageId - ImageId of the cached image
 * @returns {Array} Pixel data array or null if not cached
 */

export const getCachedPixelData = function (imageId, callback) {
  let cachedImage = find(cornerstone.imageCache.cachedImages, [
    "imageId",
    imageId
  ]);
  if (cachedImage && cachedImage.image) {
    callback(cachedImage.image.getPixelData());
  } else {
    cornerstone.loadAndCacheImage(imageId).then(function (image) {
      callback(image.getPixelData());
      cornerstone.imageCache.removeImageLoadObject(imageId);
    });
  }
};

/**
 * Build the contiguous typed array from slices
 * @function buildData
 * @param {Object} series - Cornerstone series object
 * @param {Bool} useSeriesData - Flag to force using "series" data instead of cached ones
 * @returns {Array} Contiguous pixel array
 */
export const buildData = function (series, useSeriesData) {
  if (checkMemoryAllocation(series.bytes)) {
    let t0 = performance.now();
    let repr = series.instances[series.imageIds[0]].metadata.repr;
    let rows =
      series.instances[series.imageIds[0]].metadata.rows ||
      series.instances[series.imageIds[0]].metadata.x00280010;
    let cols =
      series.instances[series.imageIds[0]].metadata.cols ||
      series.instances[series.imageIds[0]].metadata.x00280011;
    let len = rows * cols * series.imageIds.length;

    let typedArray = getTypedArrayFromDataType(repr);
    let data = new typedArray(len);
    let offsetData = 0;

    // use input data or cached data
    if (useSeriesData) {
      forEach(series.imageIds, function (imageId) {
        const sliceData = series.instances[imageId].pixelData;
        data.set(sliceData, offsetData);
        offsetData += sliceData.length;
      });
    } else {
      larvitar_store.addSeriesIds(series.seriesUID, series.imageIds);
      forEach(series.imageIds, function (imageId) {
        getCachedPixelData(imageId, function (sliceData) {
          data.set(sliceData, offsetData);
          offsetData += sliceData.length;
        });
      });
    }
    let t1 = performance.now();
    console.log(`Call to buildData took ${t1 - t0} milliseconds.`);
    return data;
  } else {
    throw new Error("Data has not been builded: not enough memory");
  }
};

/**
 * Build the contiguous typed array from slices (async version)
 * @function buildDataAsync
 * @param {Object} series - Cornerstone series object
 * @param {Function} - receive data (contiguous pixel array) as param
 */
export const buildDataAsync = function (series, cb) {
  if (checkMemoryAllocation(series.bytes)) {
    let t0 = performance.now();
    let repr = series.instances[series.imageIds[0]].metadata.repr;
    let rows =
      series.instances[series.imageIds[0]].metadata.rows ||
      series.instances[series.imageIds[0]].metadata.x00280010;
    let cols =
      series.instances[series.imageIds[0]].metadata.cols ||
      series.instances[series.imageIds[0]].metadata.x00280011;
    let len = rows * cols * series.imageIds.length;
    let typedArray = getTypedArrayFromDataType(repr);
    let data = new typedArray(len);
    let offsetData = 0;

    let imageIds = series.imageIds.slice();
    larvitar_store.addSeriesIds(series.seriesUID, series.imageIds);

    function runFillPixelData(data, callback) {
      let imageId = imageIds.shift();
      if (imageId) {
        getCachedPixelData(imageId, function (sliceData) {
          data.set(sliceData, offsetData);
          offsetData += sliceData.length;
          // this does the trick: delay next computation to next tick
          setTimeout(() => {
            runFillPixelData(data, cb);
          }, 0);
        });
      } else {
        let t1 = performance.now();
        console.log(`Call to buildDataAsync took ${t1 - t0} milliseconds.`);
        callback(data);
      }
    }
    runFillPixelData(data, cb);
  } else {
    throw new Error("Data has not been builded: not enough memory");
  }
};

/**
 * Import NRRD image from bufferArray
 * @function importNRRDImage
 * @param {ArrayBuffer} bufferArray - buffer array from nrrd file
 * @returns {Array} Parsed pixel data array
 */
export const importNRRDImage = function (bufferArray) {
  // get the data
  let volume = parse(bufferArray, {});
  return volume;
};
