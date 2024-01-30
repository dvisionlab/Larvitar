/** @module loaders/multiframeLoader
 *  @desc This file is a custom DICOM loader for multiframe images
 */

// external libraries
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import cornerstone, { ImageLoader } from "cornerstone-core";
import { each, find, range } from "lodash";

// internal libraries
import {
  getLarvitarImageTracker,
  getLarvitarManager,
  getSeriesDataFromLarvitarManager
} from "./commonLoader";
import type { DSA, Image, LarvitarManager, Series } from "../types";
import { getMaxPixelValue, getMinPixelValue } from "../imageUtils";
import { applyDSA } from "../postProcessing/applyDSA";

// global module variables
let customImageLoaderCounter = 0;

/*
 * This module provides the following functions to be exported:
 * loadDsaImage(imageId)
 * populateDsaImageIds(seriesId)
 */

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
  let imageTracker = getLarvitarImageTracker();
  let seriesId = imageTracker[rootImageId];
  let manager = getLarvitarManager() as LarvitarManager;

  if (manager) {
    let multiFrameSerie = manager[seriesId] as Series;
    const imageIds: string[] = multiFrameSerie.dsa!.imageIds;
    const index: number = imageIds.indexOf(imageId);
    const inputMaskSubPixelShift = [0, 0];
    const pixelData = applyDSA(multiFrameSerie, index, inputMaskSubPixelShift);
    const srcImage: Image = find(cornerstone.imageCache.cachedImages, {
      imageId: multiFrameSerie.imageIds[index]
    }).image;
    return createCustomImage(imageId, srcImage, pixelData!);
  } else {
    throw new Error("No multiframe dataset found for seriesId: " + seriesId);
  }
};

/**
 * r
 * @export
 * @function populateDsaImageIds
 * @param {String} seriesId - SeriesId tag
 * @param {Object} serie - parsed serie object
 */
export const populateDsaImageIds = function (
  larvitarSeriesInstanceUID: string
) {
  let t0 = performance.now();
  const serie = getSeriesDataFromLarvitarManager(
    larvitarSeriesInstanceUID
  ) as Series;
  if (serie) {
    const numberOfFrames: number = serie.metadata!.numberOfFrames!;
    const imageId: string = getDsaImageId("dsaImageLoader");
    let imageTracker = getLarvitarImageTracker();
    imageTracker[imageId] = larvitarSeriesInstanceUID;
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
    throw new Error(
      "No serie found for seriesId: " + larvitarSeriesInstanceUID
    );
  }

  let t1 = performance.now();
  console.log(`Call to populateDsaImageIds took ${t1 - t0} milliseconds.`);
};

/**
 * Get the custom imageId from custom loader
 * @instance
 * @function getDsaImageId
 * @param {String} customLoaderName The custom loader name
 * @return {String} the custom image id
 */
const getDsaImageId = function (customLoaderName: string) {
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
    const minPixelValue = getMinPixelValue(pixelData);
    const maxPixelValue = getMaxPixelValue(pixelData);
    const windowWidth = (maxPixelValue - minPixelValue) / 2;
    const windowCenter = windowWidth / 2;
    const image: Partial<Image> = {
      imageId: imageId,
      minPixelValue: minPixelValue,
      maxPixelValue: maxPixelValue,
      slope: srcImage.slope,
      intercept: srcImage.intercept,
      windowCenter: windowCenter,
      windowWidth: windowWidth,
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
