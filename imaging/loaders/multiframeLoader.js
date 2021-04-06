// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import { each, range } from "lodash";

// internal libraries
import { getImageFrame } from "./commonLoader";
import { clearImageCache } from "../image_rendering";
import { larvitar_store } from "../image_store";
import { dumpDataSet } from "../image_utils";

// global module variables
let customImageLoaderCounter = 0;
export var multiFrameManager = {};
export var multiFrameImageTracker = {};
// Local cache used to store multiframe datasets to avoid reading and parsing
// the whole file to show a single frame.
let multiframeDatasetCache = {};

export const loadMultiFrameImage = function (imageId) {
  let seriesId = multiFrameImageTracker[imageId];
  let parsedImageId = cornerstoneWADOImageLoader.wadouri.parseImageId(imageId);
  let rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;

  if (multiframeDatasetCache[rootImageId]) {
    let metadata = dumpDataSet(
      multiframeDatasetCache[rootImageId],
      null,
      parsedImageId.frame
    );
    return createCustomImage(
      rootImageId,
      imageId,
      parsedImageId.frame,
      metadata
    );
  } else {
    multiframeDatasetCache[rootImageId] = multiFrameManager[seriesId].dataSet;
    // Extract metadata of the whole multiframe object
    let metadata = dumpDataSet(
      multiframeDatasetCache[rootImageId],
      null,
      parsedImageId.frame
    );
    return createCustomImage(
      rootImageId,
      imageId,
      parsedImageId.frame,
      metadata
    );
  }
};

export const buildMultiFrameImage = function (seriesId, serie) {
  larvitar_store.set("manager", "multiFrameManager");

  let numberOfFrames =
    serie.instances[serie.imageIds[0]].metadata.numberOfFrames;

  each(serie.imageIds, function (instanceId) {
    let file = serie.instances[instanceId].file;
    let dataSet = serie.instances[instanceId].dataSet;
    let imageId = getMultiFrameImageId("multiFrameLoader");

    // check if multiFrameManager exists for this seriesId
    if (!multiFrameManager[seriesId]) {
      multiFrameManager[seriesId] = {};
      multiFrameManager[seriesId].imageIds = [];
      multiFrameManager[seriesId].instances = {};
    }

    each(range(numberOfFrames), function (frameNumber) {
      let frameImageId = imageId + "?frame=" + frameNumber;
      multiFrameImageTracker[frameImageId] = seriesId;
      // store file references
      multiFrameManager[seriesId].isMultiframe = true;
      multiFrameManager[seriesId].imageIds.push(frameImageId);
      multiFrameManager[seriesId].instances[frameImageId] = {
        instanceId: instanceId,
        file: file,
        frame: frameNumber
      };
      multiFrameManager[seriesId].file = file;
      multiFrameManager[seriesId].dataSet = dataSet;
    });
  });
};

/**
 * Get the custom imageId from custom loader
 * @instance
 * @function getMultiFrameImageId
 * @param {String} customLoaderName The custom loader name
 * @return {String} the custom image id
 */
export const getMultiFrameImageId = function (customLoaderName) {
  let imageId = customLoaderName + "://" + customImageLoaderCounter;
  customImageLoaderCounter++;
  return imageId;
};

/**
 * Reset the MultiFrame Loader global variables
 * @instance
 * @function resetMultiFrameLoader
 * @param {String} elementId The html id
 */
export const resetMultiFrameLoader = function (elementId) {
  customImageLoaderCounter = 0;
  multiFrameManager = {};
  multiFrameImageTracker = {};
  let element = document.getElementById(elementId);
  if (element) {
    cornerstone.disable(element);
  }
  clearImageCache();
};

export const getSeriesDataFromMultiFrameLoaderLoader = function () {};

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
let createCustomImage = function (id, imageId, frameIndex, metadata) {
  let dataSet = multiframeDatasetCache[id];
  let pixelDataElement = dataSet.elements.x7fe00010;
  // Extract pixelData of the required frame
  let pixelData;
  try {
    if (pixelDataElement.encapsulatedPixelData) {
      pixelData = cornerstoneWADOImageLoader.wadouri.getEncapsulatedImageFrame(
        dataSet,
        frameIndex
      );
    } else {
      pixelData = cornerstoneWADOImageLoader.wadouri.getUncompressedImageFrame(
        dataSet,
        frameIndex
      );
    }
  } catch (error) {
    console.error(error);
  }

  let imageFrame = getImageFrame(metadata);
  let transferSyntax = dataSet.string("x00020010");
  let canvas = window.document.createElement("canvas");

  const decodePromise = cornerstoneWADOImageLoader.decodeImageFrame(
    imageFrame,
    transferSyntax,
    pixelData,
    canvas
  );

  let promise = new Promise((resolve, reject) => {
    decodePromise.then(function handleDecodeResponse(imageFrame) {
      let lastImageIdDrawn = "";

      // This function uses the pixelData received as argument without manipulating
      // them: if the image is compressed, the decompress function should be called
      // before creating the custom image object (like the multiframe case).
      setPixelDataType(imageFrame);

      let pixelSpacing = metadata.x00280030;
      let rescaleIntercept = metadata.x00281052[0];
      let rescaleSlope = metadata.x00281053[0];
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

      let image = {
        imageId: imageId,
        color: cornerstoneWADOImageLoader.isColorImage(
          imageFrame.photometricInterpretation
        ),
        columnPixelSpacing: pixelSpacing ? pixelSpacing[1] : undefined,
        columns: imageFrame.columns,
        height: imageFrame.rows,
        intercept: rescaleIntercept ? rescaleIntercept : 0,
        invert: imageFrame.photometricInterpretation === "MONOCHROME1",
        minPixelValue: imageFrame.smallestPixelValue,
        maxPixelValue: imageFrame.largestPixelValue,
        render: undefined, // set below
        rowPixelSpacing: pixelSpacing ? pixelSpacing[0] : undefined,
        rows: imageFrame.rows,
        sizeInBytes: getSizeInBytes(),
        slope: rescaleSlope ? rescaleSlope : 1,
        width: imageFrame.columns,
        windowCenter: windowCenter ? windowCenter[0] : undefined,
        windowWidth: windowWidth ? windowWidth[0] : undefined,
        decodeTimeInMS: undefined,
        webWorkerTimeInMS: undefined
      };
      // add function to return pixel data
      image.getPixelData = function () {
        return imageFrame.pixelData;
      };

      // convert color space
      if (image.color) {
        // setup the canvas context
        canvas.height = imageFrame.rows;
        canvas.width = imageFrame.columns;

        let context = canvas.getContext("2d");
        let imageData = context.createImageData(
          imageFrame.columns,
          imageFrame.rows
        );
        cornerstoneWADOImageLoader.convertColorSpace(imageFrame, imageData);

        imageFrame.imageData = imageData;
        imageFrame.pixelData = imageData.data;
      }

      // Setup the renderer
      if (image.color) {
        image.render = cornerstone.renderColorImage;
        image.getCanvas = function () {
          if (lastImageIdDrawn === imageId) {
            return canvas;
          }

          canvas.height = image.rows;
          canvas.width = image.columns;
          let context = canvas.getContext("2d");
          context.putImageData(imageFrame.imageData, 0, 0);
          lastImageIdDrawn = imageId;
          return canvas;
        };
      } else {
        image.render = cornerstone.renderGrayscaleImage;
      }

      // calculate min/max if not supplied
      if (
        image.minPixelValue === undefined ||
        image.maxPixelValue === undefined
      ) {
        let minMax = cornerstoneWADOImageLoader.getMinMax(pixelData);
        image.minPixelValue = minMax.min;
        image.maxPixelValue = minMax.max;
      }

      // set the ww/wc to cover the dynamic range of the image if no values are supplied
      if (image.windowCenter === undefined || image.windowWidth === undefined) {
        if (image.color) {
          image.windowWidth = 255;
          image.windowCenter = 128;
        } else {
          let maxVoi = image.maxPixelValue * image.slope + image.intercept;
          let minVoi = image.minPixelValue * image.slope + image.intercept;
          image.windowWidth = maxVoi - minVoi;
          image.windowCenter = (maxVoi + minVoi) / 2;
        }
      }

      // Custom images does not have the "data" attribute becaouse their dataset is
      // not available. The "metadata" attribute is used by the storeImageData
      // function to store custom image pixelData and metadata.
      image.metadata = metadata;

      resolve(image);
    }, reject);
  });

  // Return an object containing the Promise to cornerstone so it can setup callbacks to be
  // invoked asynchronously for the success/resolve and failure/reject scenarios.
  return {
    promise
  };
};

// This is an override of the cornerstoneWADOImageLoader setPixelDataType function
const setPixelDataType = function (imageFrame) {
  if (imageFrame.bitsAllocated === 16) {
    if (imageFrame.pixelRepresentation === 0) {
      imageFrame.pixelData = new Uint16Array(imageFrame.pixelData);
    } else {
      imageFrame.pixelData = new Int16Array(imageFrame.pixelData);
    }
  } else {
    imageFrame.pixelData = new Uint8Array(imageFrame.pixelData);
  }
};
