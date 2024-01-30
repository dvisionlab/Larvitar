/** @module loaders/dicomLoader
 *  @desc This file provides functionalities for
 *        custom DICOM Loader
 */

// external libraries
import cornerstone from "cornerstone-core";

// internal libraries
import { loadAndCacheImage, loadAndCacheImages } from "../imageRendering";
import store from "../imageStore";
import type { Series, CachingResponse } from "../types";

/*
 * This module provides the following functions to be exported:
 * cacheImage(seriesData, imageIndex)
 * loadAndCacheImageStack(seriesData)
 * unloadAndRecacheImageStackDSA(seriesData)
 * cacheImages(seriesData, callback)
 * getDicomImageId(dicomLoaderName)
 */

let imageLoaderCounter = 0;

/**
 * Load and cache a single image
 * @instance
 * @function cacheImage
 * @param {Object} seriesData The series data
 * @param {number} imageIndex The image index in the imageIds array
 */

export const cacheImage = async function (
  seriesData: Series,
  imageIndex: number
) {
  return loadAndCacheImage(seriesData, imageIndex);
};

/**
 * Load and cache images
 * @instance
 * @function cacheImages
 * @param {Object} seriesData The series data
 * @param {Function} callback Optional callback function
 */
export const cacheImages = async function (
  seriesData: Series,
  callback?: Function
) {
  loadAndCacheImages(seriesData, function (resp: CachingResponse) {
    if (resp.loading == 100) {
      imageLoaderCounter += seriesData.imageIds.length;
    }
    if (callback) {
      callback(resp);
    }
  });
};

/**
 * Unload DSA Image Stack and Recache Image Stack for DSA
 * @instance
 * @function unloadAndRecacheImageStackDSA
 * @param {Object} seriesData The series data
 * @return {Promise} Promise object represents the loading and caching of the image stack
 */
export const unloadAndRecacheImageStackDSA = async function (
  seriesData: Series
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const t0 = performance.now();
    // add DSA imageIds to store
    if (seriesData.dsa === undefined) {
      console.warn("DSA image stack is not available");
      reject();
      return;
    }
    let promises: Promise<cornerstone.Image>[] = new Array(
      seriesData.dsa.imageIds.length
    );

    async function cacheImageStack(imageIds: string[], index: number) {
      if (index < imageIds.length) {
        const imageId = imageIds[index];
        if (imageId) {
          await cornerstone.imageCache.removeImageLoadObject(imageId);
          await cornerstone.loadAndCacheImage(imageId).then(promise => {
            promises[index] = Promise.resolve(promise);
          });
        } else {
          console.warn(
            `Stack is not fully loaded, skipping cache for index ${index}`
          );
        }
        await cacheImageStack(imageIds, index + 1);
      }
    }
    await cacheImageStack(seriesData.dsa.imageIds, 0);
    await Promise.all(promises);

    const t1 = performance.now();
    console.debug(
      `Call to unloadAndRecacheImageStackDSA took ${t1 - t0} milliseconds.`
    );
    resolve();
  });
};

/**
 * Load and cache image stack
 * @instance
 * @function loadAndCacheImageStack
 * @param {Object} seriesData The series data
 * @return {Promise} Promise object represents the loading and caching of the image stack
 */
export const loadAndCacheImageStack = async function (
  seriesData: Series
): Promise<void> {
  return new Promise(async (resolve, _) => {
    const t0 = performance.now();
    store.addSeriesId(seriesData.seriesUID, seriesData.imageIds);
    let imageIds = seriesData.imageIds;
    // add DSA imageIds to store
    if (seriesData.dsa !== undefined) {
      const dsaSeriesUID = seriesData.seriesUID + "-DSA";
      store.addSeriesId(dsaSeriesUID, seriesData.dsa.imageIds);
      imageIds = imageIds.concat(seriesData.dsa.imageIds);
    }
    let promises: Promise<cornerstone.Image>[] = new Array(imageIds.length);

    async function cacheImageStack(imageIds: string[], index: number) {
      if (index < imageIds.length) {
        const imageId = imageIds[index];
        if (imageId) {
          await cornerstone.loadAndCacheImage(imageId).then(promise => {
            promises[index] = Promise.resolve(promise);
          });
        } else {
          console.warn(
            `Stack is not fully loaded, skipping cache for index ${index}`
          );
        }
        await cacheImageStack(imageIds, index + 1);
      }
    }
    await cacheImageStack(imageIds, 0);
    await Promise.all(promises);

    const t1 = performance.now();
    console.log(`Call to loadAndCacheImageStack took ${t1 - t0} milliseconds.`);
    resolve();
  });
};

/**
 * Get the dicom imageId from dicom loader
 * @instance
 * @function getDicomImageId
 * @param {String} dicomLoaderName dicom loader name
 * @return {String} current dicom image id
 */
export const getDicomImageId = function (dicomLoaderName: string) {
  let imageId = dicomLoaderName + ":" + imageLoaderCounter;
  imageLoaderCounter++;
  return imageId;
};
