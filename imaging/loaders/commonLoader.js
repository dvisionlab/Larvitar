/** @module loaders/commonLoader
 *  @desc This file provides functionalities for
 *        custom WadoImageLoaders
 */

// external libraries
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import { omit } from "lodash";

// internal libraries
import { buildMultiFrameImage } from "./multiframeLoader";
import { checkMemoryAllocation } from "../monitors/memory";

// global variables
var larvitarManager = {};
var imageTracker = {};

/*
 * This module provides the following functions to be exported:
 * populateLarvitarManager(seriesId, seriesData)
 * getLarvitarManager()
 * getLarvitarImageTracker()
 * resetLarvitarManager()
 * removeSeriesFromLarvitarManager(seriesId)
 * getSeriesDataFromLarvitarManager(seriesId)
 * getImageFrame(metadata, dataSet)
 */

/**
 * This function can be called in order to populate the Larvitar manager
 * @instance
 * @function populateLarvitarManager
 * @param {String} seriesId The Id of the series
 * @param {Object} seriesData The series data
 * @returns {manager} the Larvitar manager
 */
export const populateLarvitarManager = function (seriesId, seriesData) {
  if (checkMemoryAllocation(seriesData.bytes)) {
    let manager = getLarvitarManager();
    if (seriesData.isMultiframe) {
      buildMultiFrameImage(seriesId, seriesData);
    } else {
      manager[seriesId] = seriesData;
    }
    return manager;
  } else {
    throw new Error(
      "Larvitar Manager has not been populated: not enough memory"
    );
  }
};

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
    imagePixelModule =
      cornerstoneWADOImageLoader.wadouri.metaData.getImagePixelModule(dataSet);
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
