/** @module loaders/commonLoader
 *  @desc This file provides functionalities for
 *        custom WadoImageLoaders
 */

// external libraries
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";

// internal libraries
import {
  getNrrdImageId,
  nrrdManager,
  getSeriesDataFromNrrdLoader
} from "./nrrdLoader";
import {
  getDicomImageId,
  getSeriesDataFromDicomLoader,
  dicomManager
} from "./dicomLoader";
import { fileManager } from "./fileLoader";
import { larvitar_store } from "../image_store";

/*
 * This module provides the following functions to be exported:
 * getLarvitarManager()
 * getLarvitarImageLoader()
 * getSeriesData(loaderName, seriesId)
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
  let managerType = larvitar_store.get(["manager"]);
  let manager;

  switch (managerType) {
    case "dicomManager":
      manager = dicomManager;
      break;
    case "nrrdManager":
      manager = nrrdManager;
      break;
    case "fileManager":
      manager = fileManager;
      break;
    default:
      console.warn("no matching manager");
      manager = {};
  }

  return manager;
};

/**
 * Return the common active image loader
 * @instance
 * @function getLarvitarImageLoader
 * @returns {Object} the active image loader
 */
export const getLarvitarImageLoader = function () {
  let managerType = larvitar_store.get(["manager"]);
  let loader;

  switch (managerType) {
    case "dicomManager":
      loader = "dicomLoader";
      break;
    case "nrrdManager":
      loader = "nrrdLoader";
      break;
    case "fileManager":
      loader = "fileLoader";
      break;
    default:
      console.warn("no matching loader");
      loader = {};
  }
  return loader;
};

/**
 * Return the data of a specific seriesId stored in a custom Loader Manager
 * @instance
 * @function getSeriesData
 * @param {String} seriesId The Id of the series
 * @param {String} loaderName The name of the current loader
 * @returns {Object} series data of a specific seriesId
 */
export const getSeriesData = function (seriesId, loaderName) {
  let data;
  switch (loaderName) {
    case "dicomLoader":
      data = getSeriesDataFromDicomLoader(seriesId);
      break;
    case "nrrdLoader":
      data = getSeriesDataFromNrrdLoader(seriesId);
      break;
    default:
      console.warn("no matching loader");
      data = null;
  }
  return data;
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
    imagePixelModule = cornerstoneWADOImageLoader.wadouri.getImagePixelModule(
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
