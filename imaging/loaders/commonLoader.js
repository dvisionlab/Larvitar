/** @module loaders/commonLoader
 *  @desc This file provides functionalities for
 *        custom WadoImageLoaders
 */

// external libraries
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import { omit } from "lodash";

// internal libraries
import { getNrrdImageId } from "./nrrdLoader";
import { getDicomImageId } from "./dicomLoader";
import { getMultiFrameImageId } from "./multiframeLoader";

// global variables
var larvitarManager = {};
var imageTracker = {};

/*
 * This module provides the following functions to be exported:
 * getLarvitarManager()
 * getLarvitarImageTracker()
 * resetLarvitarManager()
 * removeSeriesFromLarvitarManager(seriesId)
 * getSeriesDataFromLarvitarManager(seriesId)
 * getCustomImageId(loaderName)
 * getImageFrame(metadata, dataSet)
 */

/**
 * Return the common data loader manager
 * @instance
 * @function getLarvitarManager
 * @returns {Object} the loader manager
 */
export const getLarvitarManager = function () {
  return larvitarManager;
};

/**
 * Return the common image tracker
 * @instance
 * @function getLarvitarImageTracker
 * @returns {Object} the image tracker
 */
export const getLarvitarImageTracker = function () {
  return imageTracker;
};

/**
 * Reset the Larvitar Manager store
 * @instance
 * @function resetLarvitarManager
 */
export const resetLarvitarManager = function () {
  larvitarManager = {};
  imageTracker = {};
};

/**
 * Remove a stored seriesId from the larvitar Manager
 * @instance
 * @function removeSeriesFromLarvitarManager
 * @param {String} seriesId The Id of the series
 */
export const removeSeriesFromLarvitarManager = function (seriesId) {
  if (larvitarManager[seriesId]) {
    larvitarManager = omit(larvitarManager, seriesId);
  }
};

/**
 * Return the data of a specific seriesId stored in the DICOM Manager
 * @instance
 * @function getSeriesDataFromLarvitarManager
 * @param {String} seriesId The Id of the series
 * @return {Object} larvitar manager data
 */
export const getSeriesDataFromLarvitarManager = function (seriesId) {
  return larvitarManager[seriesId];
};

/**
 * Generate a custom ImageId from loader name
 * @instance
 * @function getCustomImageId
 * @param {String} loaderName The name of the current loader
 * @returns {String} custom Image Id
 */
export const getCustomImageId = function (loaderName) {
  let imageId;
  switch (loaderName) {
    case "dicomLoader":
      imageId = getDicomImageId(loaderName);
      break;
    case "resliceLoader":
      imageId = getDicomImageId(loaderName);
      break;
    case "nrrdLoader":
      imageId = getNrrdImageId(loaderName);
      break;
    case "multiFrameLoader":
      imageId = getMultiFrameImageId(loaderName);
      break;
    default:
      console.warn("no matching loader");
      imageId = null;
  }
  return imageId;
};

/**
 * Compute and return image frame
 * @instance
 * @function getImageFrame
 * @param {Object} metadata metadata object
 * @param {Object} dataSet dicom dataset
 * @returns {Object} specific image frame
 */
export const getImageFrame = function (metadata, dataSet) {
  let imagePixelModule;

  if (dataSet) {
    imagePixelModule = cornerstoneWADOImageLoader.wadouri.metaData.getImagePixelModule(
      dataSet
    );
  } else {
    imagePixelModule = {
      samplesPerPixel: metadata.x00280002,
      photometricInterpretation: metadata.x00280004,
      planarConfiguration: metadata.x00280006,
      rows: metadata.x00280010,
      columns: metadata.x00280011,
      bitsAllocated: metadata.x00280100,
      pixelRepresentation: metadata.x00280103,
      smallestPixelValue: metadata.x00280106,
      largestPixelValue: metadata.x00280107,
      redPaletteColorLookupTableDescriptor: metadata.x00281101,
      greenPaletteColorLookupTableDescriptor: metadata.x00281102,
      bluePaletteColorLookupTableDescriptor: metadata.x00281103,
      redPaletteColorLookupTableData: metadata.x00281201,
      greenPaletteColorLookupTableData: metadata.x00281202,
      bluePaletteColorLookupTableData: metadata.x00281203
    };
  }

  return {
    samplesPerPixel: imagePixelModule.samplesPerPixel,
    photometricInterpretation: imagePixelModule.photometricInterpretation,
    planarConfiguration: imagePixelModule.planarConfiguration,
    rows: imagePixelModule.rows,
    columns: imagePixelModule.columns,
    bitsAllocated: imagePixelModule.bitsAllocated,
    pixelRepresentation: imagePixelModule.pixelRepresentation, // 0 = unsigned,
    smallestPixelValue: imagePixelModule.smallestPixelValue,
    largestPixelValue: imagePixelModule.largestPixelValue,
    redPaletteColorLookupTableDescriptor:
      imagePixelModule.redPaletteColorLookupTableDescriptor,
    greenPaletteColorLookupTableDescriptor:
      imagePixelModule.greenPaletteColorLookupTableDescriptor,
    bluePaletteColorLookupTableDescriptor:
      imagePixelModule.bluePaletteColorLookupTableDescriptor,
    redPaletteColorLookupTableData:
      imagePixelModule.redPaletteColorLookupTableData,
    greenPaletteColorLookupTableData:
      imagePixelModule.greenPaletteColorLookupTableData,
    bluePaletteColorLookupTableData:
      imagePixelModule.bluePaletteColorLookupTableData,
    pixelData: undefined // populated later after decoding
  };
};
