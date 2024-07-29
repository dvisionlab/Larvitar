/** @module loaders/commonLoader
 *  @desc This file provides functionalities for
 *        custom DICOMImageLoaders
 */

// external libraries
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import { DataSet } from "dicom-parser";
import { each } from "lodash";
import { updateLoadedStack } from "../imageLoading";
import type {
  ImageObject,
  ImageTracker,
  LarvitarManager,
  MetaData,
  Series,
  InstanceGSPSDict
} from "../types";

// internal libraries
import { buildMultiFrameImage, clearMultiFrameCache } from "./multiframeLoader";

// global variables
var larvitarManager: LarvitarManager = null;
var instanceGSPSDict: InstanceGSPSDict = null;
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
 * getSopInstanceUIDFromLarvitarManager(larvitarSeriesInstanceUID, imageId)
 */

/**
 * Update and initialize larvitar manager in order to parse and load a single dicom object
 * @instance
 * @function updateLarvitarManager
 * @param {Object} imageObject The single dicom object
 * @param {String} customId - Optional custom id to overwrite seriesUID as default one
 * @param {number} sliceIndex - Optional custom index to overwrite slice index as default one
 */
export const updateLarvitarManager = function (
  imageObject: ImageObject,
  customId?: string,
  sliceIndex?: number
) {
  if (larvitarManager === null) {
    larvitarManager = {};
  }
  if (instanceGSPSDict === null) {
    larvitarManager = {};
  }
  let data = { ...imageObject };

  if (data.metadata?.isMultiframe) {
    let seriesId = customId || imageObject.metadata.seriesUID;
    let loadedStack: ReturnType<typeof getLarvitarManager> = {};
    updateLoadedStack(data, loadedStack, customId, sliceIndex);
    buildMultiFrameImage(
      seriesId as string,
      loadedStack[seriesId as string] as Series
    );
  } else {
    updateLoadedStack(data, larvitarManager, customId, sliceIndex);
  }
  return larvitarManager;
};

/**
 * This function can be called in order to populate the Larvitar manager
 * @instance
 * @function populateLarvitarManager
 * @param {String} larvitarSeriesInstanceUID The Id of the manager stack
 * @param {Object} seriesData The series data
 * @returns {manager} the Larvitar manager
 */
export const populateLarvitarManager = function (
  larvitarSeriesInstanceUID: string,
  seriesData: Series
) {
  const metadata = seriesData.instances[seriesData.imageIds[0]].metadata;
  if (larvitarManager === null) {
    larvitarManager = {};
  }
  let data = { ...seriesData };
  if (data.isMultiframe) {
    buildMultiFrameImage(larvitarSeriesInstanceUID, data);
  } else if (metadata.seriesModality === "pr") {
    const prSeriesInstanceUID = larvitarSeriesInstanceUID + "-pr";
    larvitarManager[prSeriesInstanceUID] = data;
    populateInstanceGSPSDict(seriesData);
  } else {
    larvitarManager[larvitarSeriesInstanceUID] = data;
  }
  return larvitarManager;
};

/**
 * This function can be called in order to populate the instance GSPS dictionary
 * @instance
 * @function populateInstanceGSPSDict
 * @param {String} prSeriesInstanceUID The Id of the pr manager stack
 * @param {Object} seriesData The series data
 * @returns {void}
 */
export const populateInstanceGSPSDict = function (seriesData: Series) {
  Object.keys(seriesData.instances).forEach(imageId => {
    const metadata = seriesData.instances[imageId].metadata;
    const referenceInstanceSeqAttribute = metadata.x00081115?.[0]?.x00081140;
    if (referenceInstanceSeqAttribute) {
      referenceInstanceSeqAttribute.forEach(elem => {
        const instanceUID = elem?.x00081155;
        if (instanceUID) {
          if (instanceGSPSDict == null) {
            instanceGSPSDict = {};
          }

          if (!instanceGSPSDict[instanceUID]) {
            instanceGSPSDict[instanceUID] = [metadata.x00080018!];
          } else {
            instanceGSPSDict[instanceUID]!.push(metadata.x00080018!);
          }
        }
      });
    }
  });
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
 * Return the dictionary that maps a sopInstanceUID with an array containing its PS
 * @instance
 * @function getInstanceGSPSDict
 * @returns {Object} the GSPS dictionary
 */
export const getInstanceGSPSDict = function () {
  if (instanceGSPSDict == null) {
    instanceGSPSDict = {};
  }
  return instanceGSPSDict;
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
    if ((stack as Series).isMultiframe) {
      if ((stack as Series).dataSet) {
        //@ts-ignore for memory leak
        (stack as Series).dataSet!.byteArray = null;
      }
      (stack as Series).dataSet = null;
      (stack as Series).elements = null;
      clearMultiFrameCache(stack.seriesUID);
    }
    each(stack.instances, function (instance) {
      if (instance.dataSet) {
        //@ts-ignore for memory leak
        instance.dataSet.byteArray = null;
      }
      instance.dataSet = null;
      instance.file = null;
      //@ts-ignore for memory leak
      instance.metadata = null;
    });
  });
  larvitarManager = null;
  imageTracker = null;
};

/**
 * Reset the Instance GSPS dictionary
 * @instance
 * @function resetInstanceGSPSDict
 */
export const resetInstanceGSPSDict = function () {
  each(instanceGSPSDict, function (array) {
    array = null;
  });

  instanceGSPSDict = null;
};

/**
 * Remove a stored seriesId from the larvitar Manager
 * @instance
 * @function removeSeriesFromLarvitarManager
 * @param {String} seriesId The Id of the series
 */
export const removeSeriesFromLarvitarManager = function (seriesId: string) {
  if (larvitarManager && larvitarManager[seriesId]) {
    if ((larvitarManager[seriesId] as Series).isMultiframe) {
      //@ts-ignore for memory leak
      (larvitarManager[seriesId] as Series).dataSet.byteArray = null;
      (larvitarManager[seriesId] as Series).dataSet = null;
      (larvitarManager[seriesId] as Series).elements = null;
      clearMultiFrameCache(seriesId);
    }
    each(larvitarManager[seriesId].instances, function (instance) {
      if (instance.dataSet) {
        //@ts-ignore for memory leak
        instance.dataSet.byteArray = null;
      }
      instance.dataSet = null;
      instance.file = null;
      //@ts-ignore for memory leak
      instance.metadata = null;
    });
    //@ts-ignore for memory leak
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
export const getImageFrame = function (metadata: MetaData, dataSet: DataSet) {
  let imagePixelModule;

  if (dataSet) {
    imagePixelModule =
      cornerstoneDICOMImageLoader.wadouri.metaData.getImagePixelModule(dataSet);
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

/**
 * Return the SOP Instance UID of a specific imageId stored in the Larvitar Manager
 * @instance
 * @function getSopInstanceUIDFromLarvitarManager
 * @param {String} larvitarSeriesInstanceUID The Id of the series
 * @param {String} imageId The Id of the image
 * @returns {String} sopInstanceUID
 */
export const getSopInstanceUIDFromLarvitarManager = function (
  larvitarSeriesInstanceUID: string,
  imageId: string
) {
  if (larvitarManager === null) {
    return null;
  }
  let series = larvitarManager[larvitarSeriesInstanceUID];
  return Object.keys(series.instanceUIDs).find(
    key => series.instanceUIDs[key] === imageId
  );
};
