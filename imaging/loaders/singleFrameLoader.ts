/** @module imaging/loaders/singleFrameLoader
 *  @desc  This file is a custom DICOM loader for single frame of multiframe images
 */

// external libraries
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import { ImageLoadObject, ImageLoader } from "cornerstone-core";

// internal libraries
import { logger } from "../../logger";
import type {
  Image,
  ImageFrame,
  ImageObject,
  MetaData,
  SingleFrameCache
} from "../types";
import { getImageFrame } from "./commonLoader";
import { getVOIFromMetadata } from "../imageUtils";
import { getImageManager } from "../imageManagers";

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
 * Get the single frame cache
 * @export
 * @function getSingleFrameCache
 * @param {String} imageId - Optional Image tag
 * @returns {Object} - Single frame cache object
 */
export const getSingleFrameCache = function (imageId?: string): {
  [key: string]: SingleFrameCache;
} {
  if (imageId) {
    return { [imageId]: singleFrameCache[imageId] };
  }
  return singleFrameCache;
};

/**
 * Set the single frame cache
 * @export
 * @function setSingleFrameCache
 * @param {Array} pixelData - Pixel data array
 * @param {MetaData} metadata - Metadata object
 * @returns {ImageObject} - Image object
 */
export const setSingleFrameCache = async function (
  pixelData: Uint8ClampedArray,
  metadata: MetaData
): Promise<ImageObject> {
  const t0 = performance.now();
  const imageId = getSingleFrameImageId("singleFrameLoader");
  try {
    singleFrameCache[imageId] = { pixelData, metadata };
    const t1 = performance.now();
    logger.debug(
      `setSingleFrameCache took ${t1 - t0} milliseconds for image ${imageId}`
    );
    // free memory
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
  if (imageId && singleFrameCache[imageId]) {
    // @ts-ignore: is needed to clear the cache
    singleFrameCache[imageId].pixelData = null;
    // @ts-ignore: is needed to clear the cache
    singleFrameCache[imageId].metadata = null;
    delete singleFrameCache[imageId];
  } else {
    Object.values(singleFrameCache).forEach((element, imageId) => {
      // @ts-ignore: is needed to clear the cache
      element.pixelData = null;
      // @ts-ignore: is needed to clear the cache
      element.metadata = null;
      delete singleFrameCache[imageId];
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

  let options: { [key: string]: any } = {};
  options.preScale = {
    enabled:
      options.preScale && options.preScale.enabled !== undefined
        ? options.preScale.enabled
        : false
  };
  let imageManager = getImageManager();
  const frameIndex = imageManager[metadata.seriesUID!].imageIds.findIndex(
    (imageIdentifier: string) => imageIdentifier === imageId
  ) as number;
  let imageFrame = getImageFrame(metadata);
  const transferSyntax = metadata.x00020010;
  let canvas = window.document.createElement("canvas");

  // Get the scaling parameters from the metadata
  if (options.preScale.enabled) {
    const scalingParameters = cornerstoneDICOMImageLoader.getScalingParameters(
      cornerstone.metaData,
      imageId
    );

    if (scalingParameters) {
      options.preScale = {
        ...options.preScale,
        scalingParameters
      };
    }
  }

  const decodePromise = cornerstoneDICOMImageLoader.decodeImageFrame(
    imageFrame,
    transferSyntax,
    pixelData,
    canvas,
    options
  );

  let promise: Promise<Image> = new Promise((resolve, reject) => {
    decodePromise.then(function handleDecodeResponse(imageFrame: ImageFrame) {
      setPixelDataType(imageFrame);
      let pixelSpacing = metadata.x00280030
        ? metadata.x00280030
        : metadata.x00080060 === "US" &&
            metadata["x00186011"] != undefined &&
            metadata["x00186011"][0].x0018602e != undefined &&
            metadata["x00186011"][0].x0018602c != undefined
          ? ([
              metadata["x00186011"][0].x0018602e * 10, //so that from cm goes to mm
              metadata["x00186011"][0].x0018602c * 10
            ] as [number, number])
          : metadata.x00181164
            ? metadata.x00181164
            : [1, 1];
      let rescaleIntercept = metadata.x00281052;
      let rescaleSlope = metadata.x00281053;
      const { windowWidth, windowCenter } = getVOIFromMetadata(
        metadata,
        frameIndex
      );

      function getSizeInBytes() {
        let bytesPerPixel = Math.round(imageFrame.bitsAllocated! / 8);
        return (
          imageFrame.rows! *
          imageFrame.columns! *
          bytesPerPixel *
          imageFrame.samplesPerPixel!
        );
      }

      let image: Partial<Image> = {
        imageId: imageId, //const imageId = getMultiFrameImageId("singleFrameLoader") `dicomfile:${metadata.x00080018}:${frameIndex}`;
        color: cornerstoneDICOMImageLoader.isColorImage(
          imageFrame.photometricInterpretation
        ),
        columnPixelSpacing: (pixelSpacing as number[])[1],
        columns: imageFrame.columns,
        height: imageFrame.rows,
        floatPixelData: undefined,
        intercept: (rescaleIntercept as number)
          ? (rescaleIntercept as number)
          : 0,
        invert: imageFrame.photometricInterpretation === "MONOCHROME1",
        minPixelValue: imageFrame.smallestPixelValue,
        maxPixelValue: imageFrame.largestPixelValue,
        render: undefined, // set below
        rowPixelSpacing: (pixelSpacing as number[])[0],
        rows: imageFrame.rows,
        sizeInBytes: getSizeInBytes(),
        slope: (rescaleSlope as number) ? (rescaleSlope as number) : 1,
        width: imageFrame.columns,
        windowCenter: windowCenter as number,
        windowWidth: windowWidth as number,
        decodeTimeInMS: undefined, // TODO
        loadTimeInMS: undefined // TODO
      };
      // add function to return pixel data
      // @ts-ignore: is needed to avoid array conversion
      image.getPixelData = function () {
        if (imageFrame.pixelData === undefined) {
          throw new Error("No pixel data for image " + imageId);
        }
        return imageFrame.pixelData;
      };

      // convert color space if not isJPEGBaseline8BitColor
      let isJPEGBaseline8BitColor =
        cornerstoneDICOMImageLoader.isJPEGBaseline8BitColor(
          imageFrame,
          transferSyntax
        );

      if (image.color && !isJPEGBaseline8BitColor) {
        // setup the canvas context
        canvas.height = imageFrame.rows!;
        canvas.width = imageFrame.columns!;

        let context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Unable to get canvas context");
        }

        let imageData: ImageData = context.createImageData(
          imageFrame.columns!,
          imageFrame.rows!
        );
        // context.createImageData will always return an ImageData object with 4 components (RGBA)
        cornerstoneDICOMImageLoader.convertColorSpace(
          imageFrame, // input image frame
          imageData.data, // data buffer to be filled
          true // RGBA FLAG
        );

        imageFrame.imageData = imageData;
        imageFrame.pixelData = imageData.data;
      }

      // Setup the renderer
      if (image.color) {
        image.getCanvas = function () {
          canvas.height = image.rows || 0;
          canvas.width = image.columns || 0;
          let context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Unable to get canvas context");
          }
          context.putImageData(imageFrame.imageData!, 0, 0);
          return canvas;
        };
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

      resolve(image as Image);
    }, reject);
  });
  // Return an object containing the Promise to cornerstone so it can setup callbacks to be
  // invoked asynchronously for the success/resolve and failure/reject scenarios.
  return {
    promise
  };
};

/**
 * This is an override of the cornerstoneDICOMImageLoader setPixelDataType function
 * @instance
 * @function setPixelDataType
 * @param {Object} imageFrame The Id of the image
 */
const setPixelDataType = function (imageFrame: ImageFrame) {
  if (imageFrame.bitsAllocated === 16) {
    if (imageFrame.pixelRepresentation === 0) {
      imageFrame.pixelData = new Uint16Array(
        imageFrame.pixelData as Uint16Array
      );
    } else {
      imageFrame.pixelData = new Int16Array(imageFrame.pixelData as Int16Array);
    }
  } else {
    imageFrame.pixelData = new Uint8Array(imageFrame.pixelData as Uint8Array);
  }
};
