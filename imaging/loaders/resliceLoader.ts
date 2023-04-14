/** @module loaders/resliceLoader
 *  @desc This file provides functionalities for
 *        custom Reslice Loader
 */

// external libraries
import cornerstone, { metaData } from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";

// internal libraries
import {
  getImageFrame,
  getLarvitarImageTracker,
  getLarvitarManager
} from "./commonLoader";
import { Image, ImageFrame, MetadataValue } from "../types";

/*
 * This module provides the following functions to be exported:
 * loadReslicedImage(imageId)
 */

/**
 * Custom Loader for WadoImageLoader
 * @instance
 * @function loadReslicedImage
 * @param {String} imageId The Id of the image
 * @returns {Object} custom image object
 */
export const loadReslicedImage = function (imageId: string) {
  let manager = getLarvitarManager();
  let imageTracker = getLarvitarImageTracker();
  let seriesId = imageTracker[imageId];
  let instance = manager[seriesId].instances[imageId];
  var reslicedPixeldata = instance.pixelData;
  return createCustomImage(imageId, instance.metadata, reslicedPixeldata);
};

/* Internal module functions */

/**
 * Create the custom image object for cornerstone from custom image
 * @instance
 * @function createCustomImage
 * @param {String} imageId The Id of the image
 * @param {Object} metadata the metadata object
 * @param {Object} pixelData pixel data object
 * @param {Object} dataSet dataset object
 * @returns {Object} custom image object
 */
let createCustomImage = function (
  imageId: string,
  metadata: { [key: string]: MetadataValue },
  pixelData: Uint8ClampedArray,
  dataSet?: any // TODO-ts check this
) {
  let canvas = window.document.createElement("canvas");
  let lastImageIdDrawn = "";

  let imageFrame = getImageFrame(metadata, dataSet) as ImageFrame;

  // This function uses the pixelData received as argument without manipulating
  // them: if the image is compressed, the decompress function should be called
  // before creating the custom image object (like the multiframe case).
  imageFrame.pixelData = pixelData;

  let pixelSpacing = metadata.x00280030;
  let rescaleIntercept = metadata.x00281052;
  let rescaleSlope = metadata.x00281053;
  let windowCenter = metadata.x00281050;
  let windowWidth = metadata.x00281051;

  function getSizeInBytes() {
    let bytesPerPixel = Math.round(imageFrame.bitsAllocated / 8);
    return (
      imageFrame.rows *
      imageFrame.columns *
      bytesPerPixel *
      imageFrame.samplesPerPixel
    );
  }

  let image: Partial<Image> = {
    imageId: imageId,
    color: cornerstoneWADOImageLoader.isColorImage(
      imageFrame.photometricInterpretation
    ),
    columnPixelSpacing: pixelSpacing
      ? (pixelSpacing as number[])[1]
      : undefined,
    columns: imageFrame.columns,
    height: imageFrame.rows,
    intercept: rescaleIntercept ? (rescaleIntercept as number) : 0,
    invert: imageFrame.photometricInterpretation === "MONOCHROME1",
    minPixelValue: imageFrame.smallestPixelValue,
    maxPixelValue: imageFrame.largestPixelValue,
    render: undefined, // set below
    rowPixelSpacing: pixelSpacing ? (pixelSpacing as number[])[0] : undefined,
    rows: imageFrame.rows,
    sizeInBytes: getSizeInBytes(),
    slope: rescaleSlope ? (rescaleSlope as number) : 1,
    width: imageFrame.columns,
    windowCenter: windowCenter ? (windowCenter as number) : undefined,
    windowWidth: windowWidth ? (windowWidth as number) : undefined,
    decodeTimeInMS: undefined,
    webWorkerTimeInMS: undefined
  };

  // add function to return pixel data
  image.getPixelData = function () {
    if (!imageFrame.pixelData) {
      console.warn('no pixel data for imageId "' + imageId);
      return [];
    }
    return Array.from(imageFrame.pixelData);
  };

  // convert color space
  if (image.color) {
    // setup the canvas context
    canvas.height = imageFrame.rows;
    canvas.width = imageFrame.columns;

    let context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to get canvas context");
    }

    let imageData = context.createImageData(
      imageFrame.columns,
      imageFrame.rows
    );
    cornerstoneWADOImageLoader.convertColorSpace(imageFrame, imageData);

    imageFrame.imageData = imageData;
    imageFrame.pixelData = imageData.data;
  }

  // Setup the renderer TODO check if this is really needed (see comment below)
  if (image.color) {
    image.render = cornerstone.renderColorImage;
    image.getCanvas = function () {
      if (lastImageIdDrawn === imageId) {
        return canvas;
      }

      canvas.height = image.rows || 0;
      canvas.width = image.columns || 0;
      let context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Unable to get canvas context");
      }
      context.putImageData(imageFrame.imageData!, 0, 0);
      lastImageIdDrawn = imageId;
      return canvas;
    };
  } else {
    image.render = undefined; // will be set at need in cornerstone render pipeline, see drawImageSync.js (line 44)
  }

  // calculate min/max to avoid erroneous calculation from getImageFrame function
  let minMax = cornerstoneWADOImageLoader.getMinMax(pixelData);
  image.minPixelValue = minMax.min;
  image.maxPixelValue = minMax.max;

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
    } else {
      console.error(
        "Unable to calculate default window width/center for imageId: " +
          imageId
      );
    }
  }

  // Custom images does not have the "data" attribute becaouse their dataset is
  // not available. The "metadata" attribute is used by the storeImageData
  // function to store custom image pixelData and metadata.
  image.metadata = metadata;

  let promise: Promise<Image> = new Promise(function (resolve) {
    resolve(image as Image);
  });

  // Return an object containing the Promise to cornerstone so it can setup callbacks to be
  // invoked asynchronously for the success/resolve and failure/reject scenarios.
  return {
    promise
  };
};
