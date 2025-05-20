/** @module imaging/loaders/singleFrameLoader
 *  @desc  This file is a custom DICOM loader for single frame of multiframe images
 */

// external libraries
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import { ImageLoadObject, ImageLoader } from "cornerstone-core";

// internal libraries
import { logger } from "../../common/logger";
import type { Image, ImageObject, MetaData, SingleFrameCache } from "../types";

// global module variables
let customImageLoaderCounter = 0;
let singleFrameCache: { [key: string]: SingleFrameCache } = {};

/*
 * This module provides the following functions to be exported:
 * setSingleFrameCache(pixelData, metadata)
 * clearSingleFrameCache(imageId)
 * loadSingleFrameImage(imageId)
 */

/**
 * Set the single frame cache
 * @export
 * @function setSingleFrameCache
 * @param {Array} data - Pixel data array
 * @param {MetaData} metadata - Metadata object
 * @returns {ImageObject} - Image object
 */
export const setSingleFrameCache = async function (
  data: Uint8ClampedArray,
  metadata: MetaData
): Promise<ImageObject> {
  const t0 = performance.now();
  const imageId = getSingleFrameImageId("singleFrameLoader");
  try {
    let array = await convertRGBToRGBA(data);
    let pixelData = new Uint8Array(array);
    singleFrameCache[imageId] = { pixelData, metadata };
    const t1 = performance.now();
    logger.debug(
      `setSingleFrameCache took ${t1 - t0} milliseconds for image ${imageId}`
    );
    // free memory
    // @ts-ignore: is needed to clear the cache
    array = null;
    // @ts-ignore: is needed to clear the cache
    data = null;
    // @ts-ignore: is needed to clear the cache
    pixelData = null;
    return {
      instanceUID: metadata.instanceUID as string,
      metadata: metadata,
      imageId: imageId
    };
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

/**
 * Clear single frame cache
 * @export
 * @function clearSingleFrameCache
 * @param {String} imageId - Optional Image tag
 */
export const clearSingleFrameCache = function (imageId?: string): void {
  if (imageId) {
    // @ts-ignore: is needed to clear the cache
    singleFrameCache[imageId].pixelData = null;
    // @ts-ignore: is needed to clear the cache
    singleFrameCache[imageId].metadata = null;
    delete singleFrameCache[imageId];
  } else {
    Object.values(singleFrameCache).forEach(element => {
      // @ts-ignore: is needed to clear the cache
      element.pixelData = null;
      // @ts-ignore: is needed to clear the cache
      element.metadata = null;
    });
    singleFrameCache = {};
  }
};

/**
 * Custom MultiFrame Loader Function
 * @export
 * @function loadSingleFrameImage
 * @param {String} imageId - ImageId tag
 * @returns {Function} Custom Image Creation Function
 */
export const loadSingleFrameImage: ImageLoader = function (
  imageId: string
): ImageLoadObject {
  // check if the imageId is in the cache
  if (!singleFrameCache[imageId]) {
    throw new Error(`Image ${imageId} not found in SingleFrameCache Manager`);
  }
  return createCustomImage(imageId);
};

// internal methods

/**
 * Convert RGB pixel data to RGBA pixel data
 * @function convertRGBToRGBA
 * @param {ArrayBuffer} data - RGB pixel data in ArrayBuffer format
 * @returns {Promise<Uint8ClampedArray>} - RGBA pixel data
 */
const convertRGBToRGBA = function (
  data: ArrayBuffer
): Promise<Uint8ClampedArray> {
  let blob: Blob = new Blob([data], { type: "image/jpeg" });
  let imgUrl = URL.createObjectURL(blob);
  let img = new Image();
  return new Promise<Uint8ClampedArray>(resolve => {
    img.onload = function () {
      // Create a canvas to draw the image
      let canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      let ctx = canvas.getContext("2d");
      ctx!.drawImage(img, 0, 0);

      // Extract pixel data
      let imageData = ctx!.getImageData(0, 0, img.width, img.height);

      // clean up memory
      // @ts-ignore: is needed to clear the cache
      blob = null;
      // @ts-ignore: is needed to clear the cache
      img = null;
      // @ts-ignore: is needed to clear the cache
      data = null;
      // @ts-ignore: is needed to clear the cache
      canvas = null;
      // @ts-ignore: is needed to clear the cache
      ctx = null;
      // @ts-ignore: is needed to clear the cache
      imgUrl = null;
      URL.revokeObjectURL(imgUrl);
      // resolve the promise
      resolve(imageData.data);
    };
    img.src = imgUrl;
  });
};

/**
 * Get the custom imageId from custom loader
 * @instance
 * @function getSingleFrameImageId
 * @param {String} customLoaderName The custom loader name
 * @return {String} the custom image id
 */
const getSingleFrameImageId = function (customLoaderName: string): string {
  let imageId = customLoaderName + "://" + customImageLoaderCounter;
  customImageLoaderCounter++;
  return imageId;
};

/**
 * Create the custom image object for cornerstone from custom image
 * @instance
 * @function createCustomImage
 * @param {String} imageId the imageId tag
 * @returns {Object} custom image object
 */
const createCustomImage = function (imageId: string): ImageLoadObject {
  const { metadata, pixelData } = singleFrameCache[imageId];

  let promise: Promise<Image> = new Promise((resolve, _) => {
    let pixelSpacing = metadata.x00280030
      ? metadata.x00280030
      : metadata.x00080060 === "US" &&
        metadata["x00186011"] != undefined &&
        metadata["x00186011"][0].x0018602e != undefined &&
        metadata["x00186011"][0].x0018602c != undefined
        ? [
          metadata["x00186011"][0].x0018602e * 10, //so that from cm goes to mm
          metadata["x00186011"][0].x0018602c * 10
        ]
        : metadata.x00181164
          ? metadata.x00181164
          : [1, 1];
    let rescaleIntercept = metadata.x00281052;
    let rescaleSlope = metadata.x00281053;
    let windowCenter = metadata.x00281050;
    let windowWidth = metadata.x00281051;
    let transferSyntax = metadata.x00020010;
    let canvas = window.document.createElement("canvas");

    function getSizeInBytes() {
      let bytesPerPixel = Math.round(metadata.x00280100! / 8);
      return (
        metadata.x00280010! *
        metadata.x00280011! *
        bytesPerPixel *
        metadata.x00280002!
      );
    }
    let image: Partial<Image> = {
      imageId: imageId, //const imageId = getMultiFrameImageId("singleFrameLoader") `dicomfile:${metadata.x00080018}:${frameIndex}`;
      color: cornerstoneDICOMImageLoader.isColorImage(metadata.x00280004),
      columnPixelSpacing: (pixelSpacing as number[])[1],
      columns: metadata.x00280011!,
      height: metadata.x00280010!,
      floatPixelData: undefined,
      intercept: rescaleIntercept ? (rescaleIntercept as number) : 0,
      invert: metadata.x00280004 === "MONOCHROME1",
      minPixelValue: metadata.x00280106,
      maxPixelValue: metadata.x00280107,
      render: undefined, // set below
      rowPixelSpacing: (pixelSpacing as number[])[0],
      rows: metadata.x00280010,
      sizeInBytes: getSizeInBytes(),
      slope: rescaleSlope ? (rescaleSlope as number) : 1,
      width: metadata.x00280011!,
      windowCenter: windowCenter as number,
      windowWidth: windowWidth as number,
      decodeTimeInMS: undefined, // TODO
      loadTimeInMS: undefined // TODO
    };
    // add function to return pixel data
    // @ts-ignore: is needed to avoid array conversion
    image.getPixelData = function () {
      if (pixelData === undefined) {
        throw new Error("No pixel data for image " + imageId);
      }
      return pixelData;
    };

    let isJPEGBaseline8BitColor = false;
    // convert color space if not isJPEGBaseline8BitColor
    if (
      metadata.x00280100! === 8 &&
      transferSyntax === "1.2.840.10008.1.2.4.50" &&
      (metadata.x00280002 === 3 || metadata.x00280002 === 4)
    ) {
      isJPEGBaseline8BitColor = true;
    }

    if (image.color && !isJPEGBaseline8BitColor) {
      // setup the canvas context
      canvas.height = metadata.x00280010!;
      canvas.width = metadata.x00280011!;

      let context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to get canvas context");
      }

      let imageData = context.createImageData(
        metadata.x00280011!,
        metadata.x00280010!
      );

      cornerstoneDICOMImageLoader.convertColorSpace(
        { photometricInterpretation: metadata.x00280004, pixelData: pixelData },
        imageData
      );

      // Setup the renderer
      if (image.color) {
        image.getCanvas = function () {
          canvas.height = image.rows || 0;
          canvas.width = image.columns || 0;
          let context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Unable to get canvas context");
          }
          context.putImageData(imageData!, 0, 0);
          return canvas;
        };
      }
    }

    // calculate min/max if not supplied
    if (
      image.minPixelValue === undefined ||
      image.maxPixelValue === undefined
    ) {
      let minMax = cornerstoneDICOMImageLoader.getMinMax(pixelData);
      image.minPixelValue = minMax.min;
      image.maxPixelValue = minMax.max;
    }

    // set the ww/wc to cover the dynamic range of the image if no values are supplied
    if (image.windowCenter === undefined || image.windowWidth === undefined) {
      if (image.color) {
        image.windowWidth = 255;
        image.windowCenter = 128;
      } else if (
        image.maxPixelValue &&
        image.minPixelValue &&
        image.slope &&
        image.intercept
      ) {
        let maxVoi = image.maxPixelValue * image.slope + image.intercept;
        let minVoi = image.minPixelValue * image.slope + image.intercept;
        image.windowWidth = maxVoi - minVoi;
        image.windowCenter = (maxVoi + minVoi) / 2;
      }
    }

    clearSingleFrameCache(imageId);

    resolve(image as Image);
  });
  // Return an object containing the Promise to cornerstone so it can setup callbacks to be
  // invoked asynchronously for the success/resolve and failure/reject scenarios.
  return {
    promise
  };
};
