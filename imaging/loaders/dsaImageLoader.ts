/** @module loaders/multiframeLoader
 *  @desc This file is a custom DICOM loader for multiframe images
 */

// external libraries
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import cornerstone, { ImageLoader } from "cornerstone-core";
import { each, find, range } from "lodash";

// internal libraries
import {
  getImageTracker,
  getImageManager,
  getDataFromImageManager
} from "../imageManagers";
import type { DSA, Image, ImageManager, Series } from "../types";
import { getMinMaxPixelValue } from "../imageUtils";
import { applyDSA } from "../postProcessing/applyDSA";
import { logger } from "../../logger";
import store from "../imageStore";

// global module variables
let customImageLoaderCounter: number = 0;
const defaultPixelShift = undefined;
let PIXEL_SHIFT: number[] | undefined = defaultPixelShift;

/*
 * This module provides the following functions to be exported:
 * resetPixelShift(id)
 * loadDsaImage(imageId)
 * setPixelShift(pixelShift)
 * populateDsaImageIds(seriesId)
 */

/**
 * Reset pixel shift to undefined
 * @export
 * @function loadDsaImage
 * @param {String} elementId - elementId tag
 * @returns {void}
 */
export const resetPixelShift = function (elementId: string) {
  store.setDSAPixelShift(elementId, defaultPixelShift);
  setPixelShift(defaultPixelShift);
};

/**
 * Custom DSA Image Loader Function
 * @export
 * @function loadDsaImage
 * @param {String} imageId - ImageId tag
 * @returns {Function} Custom Image Creation Function
 */
export const loadDsaImage: ImageLoader = function (imageId: string): any {
  let parsedImageId = cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId);
  let rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
  let imageTracker = getImageTracker();
  let seriesId = imageTracker[rootImageId];
  let manager = getImageManager() as ImageManager;

  if (manager) {
    let multiFrameSerie = manager[seriesId] as Series;
    const imageIds: string[] = multiFrameSerie.dsa!.imageIds;
    const index: number = imageIds.indexOf(imageId);

    const pixelData = applyDSA(multiFrameSerie, index, PIXEL_SHIFT);
    const srcImage: Image = find(cornerstone.imageCache.cachedImages, {
      imageId: multiFrameSerie.imageIds[index]
    }).image;

    logger.debug(
      `Load DSA Image with custom loader for imageId: ${imageId} and pixel shift:${PIXEL_SHIFT} `
    );
    return createCustomImage(imageId, srcImage, pixelData);
  } else {
    throw new Error("No multiframe dataset found for seriesId: " + seriesId);
  }
};

/**
 * Update the DSA imageIds for a given seriesId
 * @export
 * @function updateDsaImageIds
 * @param {string} uniqueUID - The unique identifier for the series
 * @return {string} The new imageId
 */
export const updateDsaImageIds = function (uniqueUID: string): string {
  const imageId: string = getDsaImageId("dsaImageLoader");
  let imageTracker = getImageTracker();
  imageTracker[imageId] = uniqueUID;
  return imageId;
};

/**
 * Populate the DSA imageIds for a given seriesId
 * @export
 * @function populateDsaImageIds
 * @param {string} uniqueUID - The unique identifier for the series
 */
export const populateDsaImageIds = function (uniqueUID: string) {
  let t0 = performance.now();
  const serie = getDataFromImageManager(uniqueUID) as Series;
  if (serie) {
    const numberOfFrames: number = serie.metadata!.numberOfFrames!;
    const imageId: string = getDsaImageId("dsaImageLoader");
    let imageTracker = getImageTracker();
    imageTracker[imageId] = uniqueUID;
    let imageIds: string[] = [];
    each(range(numberOfFrames as number), function (frameNumber: number) {
      const frameImageId: string = imageId + "?frame=" + frameNumber;
      imageIds.push(frameImageId);
    });

    const dsa: DSA = {
      imageIds: imageIds,
      x00286101: serie.metadata!.x00286100![0].x00286101,
      x00286102: serie.metadata!.x00286100![0].x00286102,
      x00286110: serie.metadata!.x00286100![0].x00286110,
      x00286112: serie.metadata!.x00286100![0].x00286112,
      x00286114: serie.metadata!.x00286100![0].x00286114,
      x00286120: serie.metadata!.x00286100![0].x00286120,
      x00286190: serie.metadata!.x00286100![0].x00286190,
      x00289416: serie.metadata!.x00286100![0].x00289416,
      x00289454: serie.metadata!.x00286100![0].x00289454
    };
    serie.dsa = dsa;
  } else {
    throw new Error("No serie found for seriesId: " + uniqueUID);
  }

  let t1 = performance.now();
  logger.info(`Call to populateDsaImageIds took ${t1 - t0} milliseconds.`);
};

/**
 * Set the pixel shift for DSA
 * @instance
 * @function setPixelShift
 * @param {Array} pixelShift The pixel shift array
 */
export const setPixelShift = function (pixelShift: number[] | undefined): void {
  PIXEL_SHIFT = pixelShift;
};

/**
 * Get the custom imageId from custom loader
 * @instance
 * @function getDsaImageId
 * @param {String} customLoaderName The custom loader name
 * @return {String} the custom image id
 */
const getDsaImageId = function (customLoaderName: string): string {
  let imageId = customLoaderName + "://" + customImageLoaderCounter;
  customImageLoaderCounter++;
  return imageId;
};

/**
 * Create the custom image object for cornerstone from custom image
 * @instance
 * @function createCustomImage
 * @param {String} imageId The custom image id
 * @param {Object} srcImage The source image object
 * @param {Array} pixelData The pixel data array
 * @return {Object} the custom image object
 */
let createCustomImage = function (
  imageId: string,
  srcImage: Image,
  pixelData: number[]
) {
  let promise: Promise<Image> = new Promise((resolve, _) => {
    const { minPixelValue, maxPixelValue } = getMinMaxPixelValue(pixelData);

    const computedWindowWidth = maxPixelValue - minPixelValue;
    const computedWindowCenter = (maxPixelValue + minPixelValue) / 2;
    const image: Partial<Image> = {
      imageId: imageId,
      minPixelValue: minPixelValue,
      maxPixelValue: maxPixelValue,
      slope: srcImage.slope,
      intercept: srcImage.intercept,
      windowCenter: computedWindowCenter || srcImage.windowCenter,
      windowWidth: computedWindowWidth || srcImage.windowWidth,
      getPixelData: () => pixelData,
      rows: srcImage.rows,
      columns: srcImage.columns,
      height: srcImage.height,
      width: srcImage.width,
      color: srcImage.color,
      columnPixelSpacing: srcImage.columnPixelSpacing,
      rowPixelSpacing: srcImage.rowPixelSpacing,
      sizeInBytes: srcImage.sizeInBytes
    };

    resolve(image as Image);
  });

  return {
    promise
  };
};
