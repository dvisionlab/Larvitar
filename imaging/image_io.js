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
import { parse } from "./parsers/nrrd";

/*
 * This module provides the following functions to be exported:
 * buildVolume(series)
 * buildHeader(series)
 * buildData(series)
 * importNRRDImage(bufferArray)
 */

/**
 * Save image as volume: build header and data (use the cache to extract original pixel arrays)
 * @function buildVolume
 * @param {Object} series - Cornerstone series object
 * @returns {Object} {data: pixeldata, header: image metadata}
 */
export const buildVolume = async function (series) {
  // Purge the cache
  cornerstone.imageCache.purgeCache(); // TODO UNDERSTAND THIS
  // Ensure all image of series to be cached
  await Promise.all(
    series.imageIds.map(imageId => {
      return cornerstone.loadAndCacheImage(imageId);
    })
  );
  // At this time all images are cached
  // Now save the serie
  const header = buildHeader(series);
  const data = buildData(series);
  return { data, header };
};

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
  header.volume.maxPixelValue = getMeanValue(series, "maxPixelValue", false);
  header.volume.minPixelValue = getMeanValue(series, "minPixelValue", false);
  header.volume.sliceThickness = getDistanceBetweenSlices(series, 0, 1);

  forEach(series.imageIds, function (imageId) {
    header[imageId] = series.instances[imageId].metadata;
  });
  return header;
};

/**
 * Build the contiguous typed array from slices
 * @function buildData
 * @param {Object} series - Cornerstone series object
 * @param {Bool} useSeriesData - Flag to force using "series" data instead of cached ones
 * @returns {Array} Contiguous pixel array
 */
export const buildData = function (series, useSeriesData) {
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
    forEach(series.imageIds, function (imageId) {
      let cachedImage = find(cornerstone.imageCache.cachedImages, [
        "imageId",
        imageId
      ]);
      const sliceData = cachedImage.image.getPixelData();
      data.set(sliceData, offsetData);
      offsetData += sliceData.length;
    });
  }

  return data;
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
