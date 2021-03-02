/** @module imaging/reslice
 *  @desc  This file provides functionalities for
 *         image reslice in orthogonal directions
 *  @todo Document
 */

// external libraries
import { v4 as uuidv4 } from "uuid";
import { each, clone, has } from "lodash";

// internal libraries
import { larvitar_store } from "./image_store";
import { getReslicedMetadata, getReslicedPixeldata } from "./image_utils";

import { cacheImages } from "./loaders/dicomLoader";

// temporary store for custom WADO Image Loader
export var RESLICED_DATA = null;

/*
 * This module provides the following functions to be exported:
 * resliceSeries(seriesId, seriesData, orientation, callback)
 */

/**
 * Reslice a serie from native orientation to coronal or sagittal orientation
 * @instance
 * @function resliceSeries
 * @param {String} seriesId the original series id
 * @param {Object} seriesData the original series data
 * @param {String} orientation the reslice orientation [coronal or sagittal]
 * @param {String} seriesId the series id
 * @return {Object} cornerstone data
 */
export function resliceSeries(seriesId, seriesData, orientation, callback) {
  let reslicedSeries = {};
  let reslicedSeriesId = uuidv4(); // TODO generate it
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
    // TODO CLEAN TEMP RESLICED_DATA
    let t1 = performance.now();
    console.log(`Call to resliceSeries took ${t1 - t0} milliseconds.`);
    callback(reslicedSeries);
  }

  if (!has(larvitar_store.state.series, seriesId)) {
    cacheImages(seriesData, function () {
      // TODO IF NOT NEEDED UNCACHE ORIGINAL IMAGES
      computeReslice(seriesData, reslicedSeriesId, reslicedSeries, callback);
    });
  } else {
    computeReslice(seriesData, reslicedSeriesId, reslicedSeries, callback);
  }
}
