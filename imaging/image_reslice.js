/** @module imaging/reslice
 *  @desc  This file provides functionalities for
 *         image reslice in orthogonal directions
 */

// external libraries
import { v4 as uuidv4 } from "uuid";
import { each, clone } from "lodash";

// internal libraries
import { getReslicedMetadata, getReslicedPixeldata } from "./image_utils";
import { loadAndCacheImages } from "./image_rendering";

// temporary store for custom WADO Image Loader
export var RESLICED_DATA = null;

/*
 * This module provides the following functions to be exported:
 * resliceSeries(seriesId, seriesData, orientation, callback)
 * cleanResliceStore()
 */

/**
 * Reslice a serie from native orientation to coronal or sagittal orientation
 * @instance
 * @function resliceSeries
 * @param {Object} seriesData the original series data
 * @param {String} orientation the reslice orientation [coronal or sagittal]
 * @param {String} seriesId the series id
 * @return {Object} cornerstone data
 */
export function resliceSeries(seriesData, orientation, callback) {
  let reslicedSeries = {};
  let reslicedSeriesId = uuidv4();
  let reslicedMetaData = getReslicedMetadata(
    reslicedSeriesId,
    "axial",
    orientation,
    seriesData,
    "resliceLoader"
  );

  reslicedSeries.imageIds = reslicedMetaData.imageIds;
  reslicedSeries.instances = reslicedMetaData.instances;

  reslicedSeries.currentImageIdIndex = Math.floor(
    reslicedSeries.imageIds.length / 2
  );

  function computeReslice(
    seriesData,
    reslicedSeriesId,
    reslicedSeries,
    callback
  ) {
    let t0 = performance.now();
    each(reslicedSeries.imageIds, function (imageId) {
      let data = getReslicedPixeldata(imageId, seriesData, reslicedSeries);
      reslicedSeries.instances[imageId].pixelData = data;
    });
    reslicedSeries.numberOfImages = reslicedSeries.imageIds.length;
    reslicedSeries.seriesUID = reslicedSeriesId;
    reslicedSeries.seriesDescription = seriesData.seriesDescription;
    RESLICED_DATA = clone(reslicedSeries.instances);
    let t1 = performance.now();
    console.log(`Call to resliceSeries took ${t1 - t0} milliseconds.`);
    callback(reslicedSeries);
  }
  // pre cache and then reslice the data
  loadAndCacheImages(seriesData, function (resp) {
    if (resp.loading == 100) {
      computeReslice(seriesData, reslicedSeriesId, reslicedSeries, callback);
    }
  });
}

/**
 * Clean the temporary store for custom WADO Image Loader
 * @instance
 * @function cleanResliceStore
 */
export function cleanResliceStore() {
  RESLICED_DATA = null;
}
