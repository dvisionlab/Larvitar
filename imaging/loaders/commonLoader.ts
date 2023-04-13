/** @module loaders/commonLoader
 *  @desc This file provides functionalities for
 *        custom WadoImageLoaders
 */

// external libraries
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import { DataSet } from "dicom-parser";
import { each } from "lodash";
import { updateLoadedStack } from "../imageLoading";
import {
  ImageObject,
  ImageTracker,
  LarvitarManager,
  MetadataValue,
  Series
} from "../types";

// internal libraries
import { buildMultiFrameImage, clearMultiFrameCache } from "./multiframeLoader";

// global variables
var larvitarManager: LarvitarManager = null;
var imageTracker: ImageTracker = null;

/*
 * This module provides the following functions to be exported:
 * updateLarvitarManager(imageObject)
 * populateLarvitarManager(seriesId, seriesData)
 * getLarvitarManager()
 * getLarvitarImageTracker()
 * resetLarvitarManager()
 * removeSeriesFromLarvitarManager(seriesId)
 * getSeriesDataFromLarvitarManager(seriesId)
 * getImageFrame(metadata, dataSet)
 */

/**
 * Update and initialize larvitar manager in order to parse and load a single dicom object
 * @instance
 * @function updateLarvitarManager
 * @param {Object} imageObject The single dicom object
 * @param {String} customId - Optional custom id to overwrite seriesUID as default one
 */
export const updateLarvitarManager = function (
  imageObject: ImageObject,
  customId?: string
) {
  if (larvitarManager === null) {
    larvitarManager = {};
  }

  let data = { ...imageObject };

  if (data.metadata?.isMultiframe) {
    let seriesId = customId || imageObject.metadata.seriesUID;
    updateLoadedStack(data, larvitarManager, customId);
    buildMultiFrameImage(
      seriesId as string,
      larvitarManager[seriesId as string]
    );
  } else {
    updateLoadedStack(data, larvitarManager, customId);
  }
  return larvitarManager;
};

/**
 * This function can be called in order to populate the Larvitar manager
 * @instance
 * @function populateLarvitarManager
 * @param {String} seriesId The Id of the series
 * @param {Object} seriesData The series data
 * @returns {manager} the Larvitar manager
 */
export const populateLarvitarManager = function (
  seriesId: string,
  seriesData: Series
) {
  if (larvitarManager === null) {
    larvitarManager = {};
  }
  let data = { ...seriesData };
  if (data.isMultiframe) {
    buildMultiFrameImage(seriesId, data);
  } else {
    larvitarManager[seriesId] = data;
  }
  return larvitarManager;
};

/**
 * Return the common data loader manager
 * @instance
 * @function getLarvitarManager
 * @returns {Object} the loader manager
 */
export const getLarvitarManager = function () {
  if (larvitarManager == null) {
    larvitarManager = {};
  }
  return larvitarManager;
};

/**
 * Return the common image tracker
 * @instance
 * @function getLarvitarImageTracker
 * @returns {Object} the image tracker
 */
export const getLarvitarImageTracker = function () {
  if (imageTracker == null) {
    imageTracker = {};
  }
  return imageTracker;
};

/**
 * Reset the Larvitar Manager store
 * @instance
 * @function resetLarvitarManager
 */
export const resetLarvitarManager = function () {
  each(larvitarManager, function (stack) {
    if (stack.isMultiframe) {
      if (stack.dataSet) {
        stack.dataSet.byteArray = null;
      }
      stack.dataSet = null;
      stack.elements = null;
      clearMultiFrameCache(stack.seriesUID);
    }
    each(stack.instances, function (instance) {
      if (instance.dataSet) {
        instance.dataSet.byteArray = null;
      }
      instance.dataSet = null;
      instance.file = null;
      instance.metadata = null;
    });
  });
  larvitarManager = null;
  imageTracker = null;
};

/**
 * Remove a stored seriesId from the larvitar Manager
 * @instance
 * @function removeSeriesFromLarvitarManager
 * @param {String} seriesId The Id of the series
 */
export const removeSeriesFromLarvitarManager = function (seriesId: string) {
  if (larvitarManager && larvitarManager[seriesId]) {
    if (larvitarManager[seriesId].isMultiframe) {
      larvitarManager[seriesId].dataSet.byteArray = null;
      larvitarManager[seriesId].dataSet = null;
      larvitarManager[seriesId].elements = null;
      clearMultiFrameCache(seriesId);
    }
    each(larvitarManager[seriesId].instances, function (instance) {
      if (instance.dataSet) {
        instance.dataSet.byteArray = null;
      }
      instance.dataSet = null;
      instance.file = null;
      instance.metadata = null;
    });
    larvitarManager[seriesId] = null;
    delete larvitarManager[seriesId];
  }
};

/**
 * Return the data of a specific seriesId stored in the DICOM Manager
 * @instance
 * @function getSeriesDataFromLarvitarManager
 * @param {String} seriesId The Id of the series
 * @return {Object} larvitar manager data
 */
export const getSeriesDataFromLarvitarManager = function (seriesId: string) {
  return larvitarManager ? larvitarManager[seriesId] : null;
};

/**
 * Compute and return image frame
 * @instance
 * @function getImageFrame
 * @param {Object} metadata metadata object
 * @param {Object} dataSet dicom dataset
 * @returns {Object} specific image frame
 */
export const getImageFrame = function (
  metadata: { [key: string]: MetadataValue },
  dataSet: DataSet
) {
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
    pixelData: undefined, // populated later after decoding,
    ImageData: undefined
  };
};
