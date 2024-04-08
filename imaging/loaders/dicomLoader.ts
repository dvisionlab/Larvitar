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
 * loadAndCacheDsaImageStack(seriesData, forceRecache)
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
    }
    // load and cache image stack
    const promises: Promise<cornerstone.Image>[] = imageIds.map(imageId => {
      return cornerstone.loadAndCacheImage(imageId);
    });

    Promise.all(promises).then(() => {
      seriesData.imageIds.forEach(imageId => {
        if (
          cornerstone.metaData.get("overlayPlaneModule", imageId) !== undefined
        ) {
          seriesData.instances[imageId].overlays = cornerstone.metaData.get(
            "overlayPlaneModule",
            imageId
          );
        }
      });

      const t1 = performance.now();
      console.log(
        `Call to loadAndCacheImageStack took ${t1 - t0} milliseconds.`
      );
      resolve();
    });
  });
};

/**
 * Load and cache image stack
 * @instance
 * @function loadAndCacheDsaImageStack
 * @param {Object} seriesData The series data
 * @param {boolean} forceRecache Optional parameter to force recache
 * @return {Promise} Promise object represents the loading and caching of the image stack
 */
export const loadAndCacheDsaImageStack = async function (
  seriesData: Series,
  forceRecache: boolean = false
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const t0 = performance.now();
    // add DSA imageIds to store
    if (seriesData.dsa === undefined) {
      console.warn("DSA image stack is not available");
      reject();
      return;
    }

    if (seriesData.dsa.imageIds.length > 0) {
      const dsaPromises: Promise<cornerstone.Image>[] =
        seriesData.dsa.imageIds.map(imageId => {
          if (forceRecache) {
            cornerstone.imageCache.removeImageLoadObject(imageId);
          }

          return cornerstone.loadAndCacheImage(imageId);
        });
      Promise.all(dsaPromises).then(() => {
        const t1 = performance.now();
        console.log(
          `Call to loadAndCacheDsaImageStack took ${t1 - t0} milliseconds.`
        );
        resolve();
      });
    } else {
      console.warn("DSA image stack is empty");
      reject();
    }
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
