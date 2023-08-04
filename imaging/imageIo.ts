/** @module imaging/imageIo
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
} from "./imageUtils";
import store from "./imageStore";
import { parse } from "./parsers/nrrd";
import { checkMemoryAllocation } from "./monitors/memory";
import { Series, Header, Volume, TypedArray } from "./types";

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
export const buildHeader = function (series: Series) {
  let header: Partial<Header> = {};

  forEach(series.imageIds, function (imageId) {
    header[imageId] = series.instances[imageId].metadata;
  });

  let volume: Partial<Volume> = {};

  volume.imageIds = series.imageIds;
  volume.seriesId = series.instances[series.imageIds[0]].metadata
    .seriesUID as string;
  volume.rows =
    (series.instances[series.imageIds[0]].metadata.rows as number) ||
    (series.instances[series.imageIds[0]].metadata.x00280010 as number);
  volume.cols =
    (series.instances[series.imageIds[0]].metadata.cols as number) ||
    (series.instances[series.imageIds[0]].metadata.x00280011 as number);
  volume.slope = series.instances[series.imageIds[0]].metadata.slope as number;
  volume.repr = series.instances[series.imageIds[0]].metadata.repr as string;
  volume.intercept = series.instances[series.imageIds[0]].metadata
    .intercept as number;
  volume.imagePosition = series.instances[series.imageIds[0]].metadata
    .imagePosition as [number, number];
  volume.numberOfSlices = series.imageIds.length as number;

  // @ts-ignore
  volume.imageOrientation = getMeanValue(
    series,
    "imageOrientation",
    true
  ) as number[];

  // @ts-ignore
  volume.pixelSpacing = getMeanValue(series, "pixelSpacing", true) as [
    number,
    number
  ];
  // volume.maxPixelValue = getMeanValue(series, "maxPixelValue", false);
  // volume.minPixelValue = getMeanValue(series, "minPixelValue", false);
  volume.sliceThickness = getDistanceBetweenSlices(series, 0, 1);

  header.volume = volume as Volume;

  return header as Header;
};

/**
 * Get cached pixel data
 * @function getCachedPixelData
 * @param {String} imageId - ImageId of the cached image
 * @returns {Promise} A promise which will resolve to a pixel data array or fail if an error occurs
 */

export const getCachedPixelData = function (imageId: string) {
  let cachedImage = find(cornerstone.imageCache.cachedImages, [
    "imageId",
    imageId
  ]);
  let promise = new Promise<number[]>((resolve, reject) => {
    if (cachedImage && cachedImage.image) {
      resolve(cachedImage.image.getPixelData());
    } else {
      cornerstone
        .loadImage(imageId)
        .then(image => resolve(image.getPixelData()))
        .catch(err => reject(err));
    }
  });
  return promise;
};

/**
 * Build the contiguous typed array from slices
 * @function buildData
 * @param {Object} series - Cornerstone series object
 * @param {Bool} useSeriesData - Flag to force using "series" data instead of cached ones
 * @returns {Array} Contiguous pixel array
 */
export const buildData = function (series: Series, useSeriesData: boolean) {
  if (checkMemoryAllocation(series.bytes)) {
    let t0 = performance.now();
    let repr = series.instances[series.imageIds[0]].metadata.repr;
    let rows =
      (series.instances[series.imageIds[0]].metadata.rows as number) ||
      (series.instances[series.imageIds[0]].metadata.x00280010 as number);
    let cols =
      (series.instances[series.imageIds[0]].metadata.cols as number) ||
      (series.instances[series.imageIds[0]].metadata.x00280011 as number);
    let len = rows * cols * series.imageIds.length;

    if (!repr) {
      throw new Error("Image representation metadata not found");
    }

    let typedArray = getTypedArrayFromDataType(repr as string);

    if (!typedArray) {
      throw new Error("Image representation not supported");
    }

    let data = new typedArray(len);
    let offsetData = 0;

    // use input data or cached data
    if (useSeriesData) {
      forEach(series.imageIds, function (imageId) {
        const sliceData = series.instances[imageId].pixelData;
        console.log("sliceData", sliceData);
        if (sliceData) {
          data.set(sliceData, offsetData);
          offsetData += sliceData.length;
        }
      });
      let t1 = performance.now();
      console.log(`Call to buildData took ${t1 - t0} milliseconds.`);
      return data;
    } else {
      store.addSeriesId(series.seriesUID, series.imageIds);
      let image_counter = 0;
      forEach(series.imageIds, function (imageId) {
        getCachedPixelData(imageId).then((sliceData: number[]) => {
          data.set(sliceData, offsetData);
          offsetData += sliceData.length;
          image_counter += 1;
          if (image_counter == series.imageIds.length) {
            let t1 = performance.now();
            console.log(`Call to buildData took ${t1 - t0} milliseconds.`);
            return data;
          }
        });
      });
    }
  } else {
    throw new Error("Data has not been builded: not enough memory");
  }
};

/**
 * Build the contiguous typed array from slices (async version)
 * @function buildDataAsync
 * @param {Object} series - Cornerstone series object
 * @param {Number} time - Time(s) to wait for garbage collector
 * @param {Function} resolve - Promise resolve function
 * @param {Function} reject - Promise reject function
 */
export const buildDataAsync = function (
  series: Series,
  time: number,
  resolve: Function, // TODO-ts type
  reject: Function // TODO-ts type
) {
  const memoryAllocation = checkMemoryAllocation(series.bytes);

  if (memoryAllocation) {
    let t0 = performance.now();
    let repr = series.instances[series.imageIds[0]].metadata.repr;
    let rows =
      (series.instances[series.imageIds[0]].metadata.rows as number) ||
      (series.instances[series.imageIds[0]].metadata.x00280010 as number);
    let cols =
      (series.instances[series.imageIds[0]].metadata.cols as number) ||
      (series.instances[series.imageIds[0]].metadata.x00280011 as number);
    let len = rows * cols * series.imageIds.length;

    if (!repr) {
      throw new Error("Image representation metadata not found");
    }

    let typedArray = getTypedArrayFromDataType(repr as string);

    if (!typedArray) {
      throw new Error("Image representation not supported");
    }

    let data = new typedArray(len);
    let offsetData = 0;

    let imageIds = series.imageIds.slice();
    store.addSeriesId(series.seriesUID, series.imageIds);

    // TODO-ts type check
    function runFillPixelData(data: TypedArray) {
      let imageId = imageIds.shift();
      if (imageId) {
        getCachedPixelData(imageId).then(sliceData => {
          data.set(sliceData, offsetData);
          offsetData += sliceData.length;
          // this does the trick: delay next computation to next tick
          setTimeout(() => {
            runFillPixelData(data);
          }, 0);
        });
      } else {
        let t1 = performance.now();
        console.log(`Call to buildDataAsync took ${t1 - t0} milliseconds.`);
        resolve(data);
      }
    }
    runFillPixelData(data);
  } else if (time > 0) {
    setTimeout(function () {
      time = time - 5;
      buildDataAsync(series, time, resolve, reject);
    }, 5000);
  } else {
    reject("Data has not been builded: not enough memory");
  }
};

/**
 * Import NRRD image from bufferArray
 * @function importNRRDImage
 * @param {ArrayBuffer} bufferArray - buffer array from nrrd file
 * @returns {Array} Parsed pixel data array
 */
export const importNRRDImage = function (bufferArray: ArrayBuffer) {
  // get the data
  let volume = parse(bufferArray, { headerOnly: false });
  return volume;
};
