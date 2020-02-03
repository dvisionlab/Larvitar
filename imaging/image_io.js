// external libraries
import cornerstone from "cornerstone-core";
import { forEach } from "lodash";
import { parse } from "nrrd-js";

// internal libraries
import { getMeanValue, getDistanceBetweenSlices } from "./image_utils.js";
import { populateNrrdManager } from "./nrrdLoader.js";

/*
 * This module provides the following functions to be exported:
 * cacheAndSaveSerie(series)
 * buildHeader(series)
 * buildData(series)
 * importNRRDImage(bufferArray)
 * loadImageWithOrientation(header, volume, seriesId, orientation)
 */

// ---------------------------------
// Save image: build header and data
// ---------------------------------
export const cacheAndSaveSerie = async function(series) {
  // Purge the cache
  cornerstone.imageCache.purgeCache();

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

// --------------------------------------------
// Build the image header from slices' metadata
// --------------------------------------------
export const buildHeader = function(series) {
  let header = {};
  header.volume = {};
  header.volume.imageIds = series.imageIds;
  header.volume.seriesId =
    series.instances[series.imageIds[0]].metadata.seriesUID;
  header.volume.rows = series.instances[series.imageIds[0]].metadata.rows;
  header.volume.cols = series.instances[series.imageIds[0]].metadata.cols;
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

  forEach(series.imageIds, function(imageId) {
    header[imageId] = series.instances[imageId].metadata;
  });
  return header;
};

// --------------------------------------------------
// build the contiguous typed array from slices
// cachedArray is cornerstone.imageCache.cachedImages
// --------------------------------------------------
export const buildData = function(series) {
  let repr = series.instances[series.imageIds[0]].metadata.repr;
  let rows = series.instances[series.imageIds[0]].metadata.rows;
  let cols = series.instances[series.imageIds[0]].metadata.cols;
  let len = rows * cols * series.imageIds.length;

  let data;
  switch (repr) {
    case "Uint8":
      data = new Uint8Array(len);
      break;
    case "Sint8":
      data = new Int8Array(len);
      break;
    case "Uint16":
      data = new Uint16Array(len);
      break;
    case "Sint16":
      data = new Int16Array(len);
      break;
    case "Uint32":
      data = new Uint32Array(len);
      break;
    case "Sint32":
      data = new Int32Array(len);
      break;
    default:
      data = new Uint8Array(len);
      break;
  }
  let offsetData = 0;
  forEach(cornerstone.imageCache.cachedImages, function(cachedImage) {
    const sliceData = cachedImage.image.getPixelData();
    data.set(sliceData, offsetData);
    offsetData += sliceData.length;
  });
  return data;
};

// ----------------------------------------------
// import NRRD image from header and bufferArray
// ----------------------------------------------
export const importNRRDImage = function(bufferArray) {
  // get the data
  let volume = parse(bufferArray);
  return volume;
};

// -----------------------------------------------------------
// Build the data structure for the provided image orientation
// -----------------------------------------------------------
export const loadImageWithOrientation = function(
  header,
  volume,
  seriesId,
  orientation
) {
  let seriesData = populateNrrdManager(header, volume, seriesId, orientation);
  return seriesData;
};
