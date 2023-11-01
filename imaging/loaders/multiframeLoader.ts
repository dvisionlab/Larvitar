/** @module loaders/multiframeLoader
 *  @desc This file is a custom DICOM loader for multiframe images
 */

// external libraries
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import { each, range } from "lodash";

// internal libraries
import {
  getImageFrame,
  getLarvitarImageTracker,
  getLarvitarManager
} from "./commonLoader";
import { parseDataSet } from "../imageParsing";
import type {
  Image,
  ImageFrame,
  LarvitarManager,
  MetaData,
  Series
} from "../types";
import { metaData } from "cornerstone-core";

// global module variables
let customImageLoaderCounter = 0;

// Local cache used to store multiframe datasets to avoid reading and parsing
// the whole file to show a single frame.
let multiframeDatasetCache: { [key: string]: Series | null } | null = null;
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
export const loadMultiFrameImage = function (imageId: string) {
  let parsedImageId = cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId);
  let rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
  let imageTracker = getLarvitarImageTracker();
  let seriesId = imageTracker[rootImageId];
  let manager = getLarvitarManager() as LarvitarManager;
  if (multiframeDatasetCache === null) {
    multiframeDatasetCache = {};
  }

  if (multiframeDatasetCache[rootImageId]) {
    multiframeDatasetCache[rootImageId] = multiframeDatasetCache[rootImageId];
  } else if (manager) {
    multiframeDatasetCache[rootImageId] = manager[seriesId] as Series;
  } else {
    throw new Error("No multiframe dataset found for seriesId: " + seriesId);
  }

  let metadata =
    multiframeDatasetCache[rootImageId]?.instances[imageId].metadata;
  return createCustomImage(rootImageId, imageId, parsedImageId.frame, metadata);
};

/**
 * Build the multiframe layout in the larvitar Manager
 * @export
 * @function buildMultiFrameImage
 * @param {String} seriesId - SeriesId tag
 * @param {Object} serie - parsed serie object
 */
export const buildMultiFrameImage = function (seriesId: string, serie: Series) {
  let t0 = performance.now();
  let manager = getLarvitarManager();
  let imageTracker = getLarvitarImageTracker();
  let numberOfFrames = serie.metadata!.numberOfFrames!;
  let frameTime = serie.metadata!.frameTime;
  let frameDelay = serie.metadata!.frameDelay ? serie.metadata!.frameDelay : 0;
  let rWaveTimeVector = serie.metadata!.rWaveTimeVector;
  let sopInstanceUID = serie.metadata!["x00080018"] as string;
  let dataSet = serie.dataSet;
  let imageId = getMultiFrameImageId("multiFrameLoader");
  imageTracker[imageId] = seriesId;

  // check if manager exists for this seriesId
  if (!manager[seriesId]) {
    manager[seriesId] = serie;
    manager[seriesId].imageIds = [];
    manager[seriesId].instances = {};
  }

  each(range(numberOfFrames as number), function (frameNumber) {
    let frameImageId = imageId + "?frame=" + frameNumber;
    // EXTRACT MULTIFRAME METADATA (x52009230) Per-frame Functional Groups Sequence
    let frameMetadata = { ...serie.metadata! };

    parseDataSet(dataSet!, frameMetadata, {
      tags: ["x52009230"],
      frameId: frameNumber
    });

    // TODO-ts REMOVE "AS" WHEN METADATA VALUES ARE TYPED
    // store file references
    const managerSeriesId = manager[seriesId] as Series;
    managerSeriesId.seriesUID = seriesId;
    managerSeriesId.studyUID = serie.metadata!["x0020000d"] as string;
    managerSeriesId.modality = serie.metadata!["x00080060"] as string;
    managerSeriesId.color = cornerstoneDICOMImageLoader.isColorImage(
      serie.metadata!["x00280004"]
    );

    managerSeriesId.isMultiframe = true;
    managerSeriesId.currentImageIdIndex = 0;
    managerSeriesId.numberOfFrames = numberOfFrames;
    managerSeriesId.frameTime = frameTime;
    managerSeriesId.frameDelay = frameDelay;
    managerSeriesId.rWaveTimeVector = rWaveTimeVector;
    managerSeriesId.numberOfImages = undefined;
    managerSeriesId.bytes = serie.bytes;
    managerSeriesId.imageIds.push(frameImageId);
    managerSeriesId.instanceUIDs[sopInstanceUID] = imageId;
    managerSeriesId.instances[frameImageId] = {
      instanceId: sopInstanceUID,
      frame: frameNumber,
      metadata: frameMetadata
    };
    managerSeriesId.dataSet = dataSet || null;
    managerSeriesId.seriesDescription = serie.metadata!
      .seriesDescription as string;
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
export const getMultiFrameImageId = function (customLoaderName: string) {
  let imageId = customLoaderName + "://" + customImageLoaderCounter;
  customImageLoaderCounter++;
  return imageId;
};

/**
 * Clear the multiframe cache
 * @instance
 * @function clearMultiFrameCache
 * @param {String} seriesId - SeriesId tag
 */
export const clearMultiFrameCache = function (seriesId: string) {
  each(multiframeDatasetCache, function (image, imageId) {
    if (!image) {
      return;
    }
    if (seriesId == image.seriesUID || !seriesId) {
      if (image.dataSet) {
        // @ts-ignore: modify external type ?
        image.dataSet.byteArray = null;
      }
      image.dataSet = null;
      image.elements = null;
      each(image.instances, function (instance) {
        // @ts-ignore: is needed to clear the cache ?
        instance.metadata = null;
      });
      // @ts-ignore: is needed to clear the cache ?
      image.instances = null;
      multiframeDatasetCache![imageId] = null;
      delete multiframeDatasetCache![imageId];
    }
  });
  if (!seriesId) {
    multiframeDatasetCache = null;
  }
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
  id: string,
  imageId: string,
  frameIndex: number,
  metadata?: MetaData
) {
  let options: { [key: string]: any } = {}; //TODO-ts change any to proper type when available
  // always preScale the pixel array unless it is asked not to
  options.preScale = {
    enabled:
      options.preScale && options.preScale.enabled !== undefined
        ? options.preScale.enabled
        : false
  };

  if (multiframeDatasetCache === null || !multiframeDatasetCache[id]) {
    throw new Error("No multiframe dataset found for id: " + id);
  }

  let dataSet = (multiframeDatasetCache as { [key: string]: Series })[id]
    .dataSet;

  if (!dataSet) {
    throw new Error("No dataset found for id: " + id);
  }

  let pixelDataElement = dataSet.elements.x7fe00010;
  // Extract pixelData of the required frame
  let pixelData: number[];
  try {
    if (pixelDataElement.encapsulatedPixelData) {
      pixelData = cornerstoneDICOMImageLoader.wadouri.getEncapsulatedImageFrame(
        dataSet,
        frameIndex
      );
    } else {
      pixelData = cornerstoneDICOMImageLoader.wadouri.getUncompressedImageFrame(
        dataSet,
        frameIndex
      );
    }
  } catch (error) {
    throw new Error("No pixel data for id: " + id);
  }

  if (!metadata) {
    throw new Error("No metadata for id: " + id);
  }

  let imageFrame = getImageFrame(metadata, dataSet);
  let transferSyntax = dataSet.string("x00020010");

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

      let image: Partial<Image> = {
        imageId: imageId,
        color: cornerstoneDICOMImageLoader.isColorImage(
          imageFrame.photometricInterpretation
        ),
        columnPixelSpacing: (pixelSpacing as number[])[1]
          ? (pixelSpacing as number[])[1]
          : (pixelSpacing as number), // check for specific spacing value
        columns: imageFrame.columns,
        data: dataSet ? dataSet : undefined,
        height: imageFrame.rows,
        floatPixelData: undefined,
        intercept: (rescaleIntercept as number)
          ? (rescaleIntercept as number)
          : 0,
        invert: imageFrame.photometricInterpretation === "MONOCHROME1",
        minPixelValue: imageFrame.smallestPixelValue,
        maxPixelValue: imageFrame.largestPixelValue,
        render: undefined, // set below
        rowPixelSpacing: (pixelSpacing as number[])[0]
          ? (pixelSpacing as number[])[0]
          : (pixelSpacing as number), // check for specific spacing value
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
      image.getPixelData = function () {
        if (imageFrame.pixelData === undefined) {
          throw new Error("No pixel data for image " + imageId);
        }
        return Array.from(imageFrame.pixelData);
      };

      // convert color space if not isJPEGBaseline8BitColor
      let isJPEGBaseline8BitColor =
        cornerstoneDICOMImageLoader.isJPEGBaseline8BitColor(
          imageFrame,
          transferSyntax
        );

      if (image.color && !isJPEGBaseline8BitColor) {
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

        cornerstoneDICOMImageLoader.convertColorSpace(imageFrame, imageData);

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
