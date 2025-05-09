/** @module imaging/imageReslice
 *  @desc  This file provides functionalities for
 *         image reslice in orthogonal directions
 */

// external libraries
import { v4 as uuidv4 } from "uuid";
import { each } from "lodash";

// internal libraries
import { logger } from "../logger";
import { getReslicedMetadata, getReslicedPixeldata } from "./imageUtils";
import { getImageTracker, getImageManager } from "./imageManagers";
import store from "./imageStore";
import { Series } from "./types";

/*
 * This module provides the following functions to be exported:
 * resliceSeries(seriesId, seriesData, orientation)
 */

/**
 * Reslice a serie from native orientation to coronal or sagittal orientation
 * @instance
 * @function resliceSeries
 * @param {Object} seriesData the original series data
 * @param {String} orientation the reslice orientation [coronal or sagittal]
 * @returns {Promise} - Return a promise which will resolve when data is available
 */
export function resliceSeries(
  seriesData: Series,
  orientation: "axial" | "coronal" | "sagittal"
) {
  let reslicePromise = new Promise(resolve => {
    let reslicedSeries: Partial<Series> = {};
    let reslicedSeriesId = uuidv4();
    let reslicedMetaData = getReslicedMetadata(
      reslicedSeriesId,
      "axial",
      orientation,
      seriesData,
      "resliceLoader"
    );

    reslicedSeries.imageIds = reslicedMetaData.imageIds;
    // @ts-ignore fix incompatibilities between these types
    reslicedSeries.instances = reslicedMetaData.instances;

    reslicedSeries.currentImageIdIndex = Math.floor(
      reslicedSeries.imageIds.length / 2
    );

    function computeReslice(
      seriesData: Series,
      reslicedSeriesId: string,
      reslicedSeries: Series
    ) {
      let t0 = performance.now();
      let imageTracker = getImageTracker();
      let manager = getImageManager();
      each(reslicedSeries.imageIds, function (imageId: string) {
        reslicedSeries.instances[imageId].pixelData = getReslicedPixeldata(
          imageId,
          seriesData,
          reslicedSeries
        ) as Uint16Array;
        imageTracker[imageId] = reslicedSeriesId;
      });
      store.addImageIds(reslicedSeriesId, reslicedSeries.imageIds);
      reslicedSeries.numberOfImages = reslicedSeries.imageIds.length;
      reslicedSeries.seriesUID = reslicedSeriesId;
      reslicedSeries.seriesDescription = seriesData.seriesDescription;
      reslicedSeries.orientation = orientation;
      manager[reslicedSeriesId] = reslicedSeries;
      //@ts-ignore deprecated
      manager[seriesData.uniqueUID][orientation] = reslicedSeriesId;
      let t1 = performance.now();
      logger.info(`Call to resliceSeries took ${t1 - t0} milliseconds.`);
      resolve(reslicedSeries);
    }
    // reslice the data
    computeReslice(seriesData, reslicedSeriesId, reslicedSeries as Series);
  });
  return reslicePromise;
}
