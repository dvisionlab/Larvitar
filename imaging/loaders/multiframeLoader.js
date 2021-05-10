// external libraries
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import { each, range } from "lodash";

// internal libraries
import {
  getImageFrame,
  getLarvitarImageTracker,
  getLarvitarManager
} from "./commonLoader";
import { dumpDataSet } from "../image_parsing";

// global module variables
let customImageLoaderCounter = 0;

// Local cache used to store multiframe datasets to avoid reading and parsing
// the whole file to show a single frame.
let multiframeDatasetCache = {};
/*
 * This module provides the following functions to be exported:
 * loadMultiFrameImage(elementId)
 * buildMultiFrameImage(seriesId, serie)
 * getMultiFrameImageId(customLoaderName)
 * clearMultiFrameCache()
 */

/**
 * Custom MultiFrame Loader Function
 * @export
 * @function loadMultiFrameImage
 * @param {String} imageId - ImageId tag
 * @returns {Function} Custom Image Creation Function
 */
export const loadMultiFrameImage = function (imageId) {
  let parsedImageId = cornerstoneWADOImageLoader.wadouri.parseImageId(imageId);
  let rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
  let imageTracker = getLarvitarImageTracker();
  let seriesId = imageTracker[rootImageId];
  let manager = getLarvitarManager();
  multiframeDatasetCache[rootImageId] = multiframeDatasetCache[rootImageId]
    ? multiframeDatasetCache[rootImageId]
    : manager[seriesId];
  let metadata =
    multiframeDatasetCache[rootImageId].instances[imageId].metadata;
  return createCustomImage(rootImageId, imageId, parsedImageId.frame, metadata);
};

/**
 * Build the multiframe layout in the larvitar Manager
 * @export
 * @function buildMultiFrameImage
 * @param {String} seriesId - SeriesId tag
 * @param {Object} serie - parsed serie object
 */
export const buildMultiFrameImage = function (seriesId, serie) {
  let t0 = performance.now();
  let manager = getLarvitarManager();
  let imageTracker = getLarvitarImageTracker();
  let numberOfFrames =
    serie.instances[serie.imageIds[0]].metadata.numberOfFrames;
  let frameTime = serie.instances[serie.imageIds[0]].metadata.frameTime;
  let frameDelay = serie.instances[serie.imageIds[0]].metadata.frameDelay
    ? serie.instances[serie.imageIds[0]].metadata.frameDelay
    : 0;

  each(serie.imageIds, function (instanceId) {
    let dataSet = serie.instances[instanceId].dataSet;
    let metadata = serie.instances[instanceId].metadata;
    let imageId = getMultiFrameImageId("multiFrameLoader");
    imageTracker[imageId] = seriesId;

    // check if manager exists for this seriesId
    if (!manager[seriesId]) {
      manager[seriesId] = serie;
      manager[seriesId].imageIds = [];
      manager[seriesId].instances = {};
    }

    each(range(numberOfFrames), function (frameNumber) {
      let frameImageId = imageId + "?frame=" + frameNumber;
      // EXTRACT MULTIFRAME METADATA (x52009230) Per-frame Functional Groups Sequence
      let frameMetadata = { ...metadata };

      dumpDataSet(dataSet, frameMetadata, {
        tags: ["x52009230"],
        frameId: frameNumber
      });

      // store file references
      manager[seriesId].seriesUID = seriesId;
      manager[seriesId].studyUID = metadata["x0020000d"];
      manager[seriesId].modality = metadata["x00080060"];
      manager[seriesId].color = cornerstoneWADOImageLoader.isColorImage(
        metadata["x00280004"]
      );
      manager[seriesId].isMultiframe = true;
      manager[seriesId].currentImageIdIndex = 0;
      manager[seriesId].numberOfFrames = numberOfFrames;
      manager[seriesId].frameTime = frameTime;
      manager[seriesId].frameDelay = frameDelay;
      manager[seriesId].numberOfImages = undefined;
      manager[seriesId].imageIds.push(frameImageId);
      manager[seriesId].instances[frameImageId] = {
        instanceId: instanceId,
        frame: frameNumber,
        metadata: frameMetadata
      };
      manager[seriesId].dataSet = dataSet;
      manager[seriesId].seriesDescription =
        serie.instances[serie.imageIds[0]].metadata.seriesDescription;
    });
  });
  let t1 = performance.now();
  console.log(`Call to buildMultiFrameImage took ${t1 - t0} milliseconds.`);
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
 * Clear the multiframe cache
 * @instance
 * @function clearMultiFrameCache
 */
export const clearMultiFrameCache = function () {
  multiframeDatasetCache = {};
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
let createCustomImage = function (id, imageId, frameIndex, metadata) {
  let dataSet = multiframeDatasetCache[id].dataSet;
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

  let imageFrame = getImageFrame(metadata, dataSet);
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

      let pixelSpacing = metadata.x00280030 ? metadata.x00280030 : 1.0;
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

      let image = {
        imageId: imageId,
        color: cornerstoneWADOImageLoader.isColorImage(
          imageFrame.photometricInterpretation
        ),
        columnPixelSpacing: pixelSpacing[1] ? pixelSpacing[1] : pixelSpacing, // check for specific spacing value
        columns: imageFrame.columns,
        data: dataSet,
        height: imageFrame.rows,
        floatPixelData: undefined,
        intercept: rescaleIntercept ? rescaleIntercept : 0,
        invert: imageFrame.photometricInterpretation === "MONOCHROME1",
        minPixelValue: imageFrame.smallestPixelValue,
        maxPixelValue: imageFrame.largestPixelValue,
        render: undefined, // set below
        rowPixelSpacing: pixelSpacing[0] ? pixelSpacing[0] : pixelSpacing, // check for specific spacing value
        rows: imageFrame.rows,
        sizeInBytes: getSizeInBytes(),
        slope: rescaleSlope ? rescaleSlope : 1,
        width: imageFrame.columns,
        windowCenter: windowCenter,
        windowWidth: windowWidth,
        decodeTimeInMS: undefined, // TODO
        loadTimeInMS: undefined, // TODO
        render: undefined
      };
      // add function to return pixel data
      image.getPixelData = function () {
        return imageFrame.pixelData;
      };

      // convert color space if not isJPEGBaseline8BitColor
      let isJPEGBaseline8BitColor = cornerstoneWADOImageLoader.isJPEGBaseline8BitColor(
        imageFrame,
        transferSyntax
      );

      if (image.color && !isJPEGBaseline8BitColor) {
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

      resolve(image);
    }, reject);
  });

  // Return an object containing the Promise to cornerstone so it can setup callbacks to be
  // invoked asynchronously for the success/resolve and failure/reject scenarios.
  return {
    promise
  };
};

/**
 * This is an override of the cornerstoneWADOImageLoader setPixelDataType function
 * @instance
 * @function setPixelDataType
 * @param {Object} imageFrame The Id of the image
 */
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

// TODO?
// // add a decache callback function to clear out our dataSetCacheManager
// function addDecache(imageLoadObject, imageId) {
//   imageLoadObject.decache = function () {
//     // console.log('decache');
//     const parsedImageId = parseImageId(imageId);

//     cornerstoneWADOImageLoader.dataSetCacheManager.unload(parsedImageId.url);
//   };
// }
