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
  getLarvitarManager,
  getSeriesDataFromLarvitarManager
} from "./commonLoader";
import { parseDataSet } from "../imageParsing";
import type {
  DSA,
  Image,
  ImageFrame,
  LarvitarManager,
  MetaData,
  NrrdSeries,
  Series
} from "../types";

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
 * Custom DSA Image Loader Function
 * @export
 * @function loadDsaImage
 * @param {String} imageId - ImageId tag
 * @returns {Function} Custom Image Creation Function
 */
export const loadDsaImage = function (imageId: string) {
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

  console.log("render using custom loader", imageId);

  let metadata =
    multiframeDatasetCache[rootImageId]?.instances[imageId].metadata;
  return createCustomImage(rootImageId, imageId, parsedImageId.frame, metadata);
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
export const getDsaImageId = function (customLoaderName: string) {
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
