/** @module manager
 *  @desc This file provides functionalities for
 *        handling image managers.
 */

// external libraries
import { each, has, uniqueId } from "lodash";

// internal libraries
import { updateLoadedStack } from "./imageLoading";
import {
  buildMultiFrameImage,
  clearMultiFrameCache
} from "./loaders/multiframeLoader";
import type {
  ImageObject,
  ImageTracker,
  SeriesManager,
  Series,
  GSPSManager,
  FileManager
} from "./types";
import { getFileCustomImageId } from "./loaders/fileLoader";

// global variables
var seriesManager: SeriesManager = null;
var gspsManager: GSPSManager = null;
var imageTracker: ImageTracker = null;
var fileManager: FileManager = null;

/*
 * This module provides the following functions to be exported:
 * updateSeriesManager(imageObject)
 * populateSeriesManager(seriesId, seriesData)
 * getSeriesManager()
 * resetSeriesManager()
 * removeSeriesFromSeriesManager(seriesId)
 * getSeriesDataFromSeriesManager(seriesId)
 * getSopInstanceUIDFromSeriesManager(uniqueUID, imageId)
 */

/**
 * This function can be called in order to populate the Series manager
 * @instance
 * @function populateSeriesManager
 * @param {String} uniqueUID The Id of the manager stack
 * @param {Object} seriesData The series data
 * @returns {manager} the Series manager
 */
export const populateSeriesManager = function (
  uniqueUID: string,
  seriesData: Series
) {
  const metadata = seriesData.instances[seriesData.imageIds[0]]?.metadata;
  if (seriesManager === null) {
    seriesManager = {};
  }
  let data = { ...seriesData };
  if (data.isMultiframe) {
    buildMultiFrameImage(uniqueUID, data);
  } else if (metadata.seriesModality === "pr") {
    const prSeriesInstanceUID = uniqueUID + "_PR";
    seriesManager[prSeriesInstanceUID] = data;
    populateGSPSManager(prSeriesInstanceUID, seriesData);
  } else {
    seriesManager[uniqueUID] = data;
  }
  return seriesManager;
};

/**
 * Update and initialize series manager in order to parse and load a single dicom object
 * @instance
 * @function updateSeriesManager
 * @param {Object} imageObject The single dicom object
 * @param {String} customId - Optional custom id to overwrite seriesUID as default one
 * @param {number} sliceIndex - Optional custom index to overwrite slice index as default one
 */
export const updateSeriesManager = function (
  imageObject: ImageObject,
  customId?: string,
  sliceIndex?: number
) {
  if (seriesManager === null) {
    seriesManager = {};
  }
  let data = { ...imageObject };

  if (data.metadata?.isMultiframe) {
    let seriesId = customId || imageObject.metadata.seriesUID;
    let loadedStack: ReturnType<typeof getSeriesManager> = {};
    updateLoadedStack(data, loadedStack, customId, sliceIndex);
    buildMultiFrameImage(
      seriesId as string,
      loadedStack[seriesId as string] as Series
    );
  } else {
    updateLoadedStack(data, seriesManager, customId, sliceIndex);
  }
  return seriesManager;
};

/**
 * Return the series manager
 * @instance
 * @function getSeriesManager
 * @returns {Object} the series manager
 */
export const getSeriesManager = function () {
  if (seriesManager == null) {
    seriesManager = {};
  }
  return seriesManager;
};

/**
 * Reset the Series Manager
 * @instance
 * @function resetSeriesManager
 */
export const resetSeriesManager = function () {
  each(seriesManager, function (stack) {
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
  seriesManager = null;
  imageTracker = null;
};

/**
 * Remove a stored seriesId from the series Manager
 * @instance
 * @function removeSeriesFromSeriesManager
 * @param {String} seriesId The Id of the series
 */
export const removeSeriesFromSeriesManager = function (seriesId: string) {
  if (seriesManager && seriesManager[seriesId]) {
    if ((seriesManager[seriesId] as Series).isMultiframe) {
      //@ts-ignore for memory leak
      (seriesManager[seriesId] as Series).dataSet.byteArray = null;
      (seriesManager[seriesId] as Series).dataSet = null;
      (seriesManager[seriesId] as Series).elements = null;
      clearMultiFrameCache(seriesId);
    }
    each(seriesManager[seriesId].instances, function (instance) {
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
    seriesManager[seriesId] = null;
    delete seriesManager[seriesId];
  }
};

/**
 * Return the data of a specific seriesId stored in the series Manager
 * @instance
 * @function getSeriesDataFromSeriesManager
 * @param {String} seriesId The Id of the series
 * @return {Object} series manager data
 */
export const getSeriesDataFromSeriesManager = function (seriesId: string) {
  return seriesManager ? seriesManager[seriesId] : null;
};

/**
 * Return the SOP Instance UID of a specific imageId stored in the Series Manager
 * @instance
 * @function getSopInstanceUIDFromSeriesManager
 * @param {String} uniqueUID The Id of the series
 * @param {String} imageId The Id of the image
 * @returns {String} sopInstanceUID
 */
export const getSopInstanceUIDFromSeriesManager = function (
  uniqueUID: string,
  imageId: string
) {
  if (seriesManager === null) {
    return null;
  }
  let series = seriesManager[uniqueUID];
  return Object.keys(series.instanceUIDs).find(
    key => series.instanceUIDs[key] === imageId
  );
};

/**
 * Return the common image tracker
 * @instance
 * @function getImageTracker
 * @returns {Object} the image tracker
 */
export const getImageTracker = function () {
  if (imageTracker == null) {
    imageTracker = {};
  }
  return imageTracker;
};

/**
 * This function can be called in order to populate the GSPS Manager
 * @instance
 * @function populateGSPSManager
 * @param {String} prSeriesInstanceUID The Id of the pr manager stack
 * @param {Object} seriesData The series data
 * @returns {void}
 */
export const populateGSPSManager = function (
  uniqueUID: string,
  seriesData: Series
) {
  Object.keys(seriesData.instances).forEach(imageId => {
    const metadata = seriesData.instances[imageId].metadata;
    const referenceInstanceSeqAttribute = metadata.x00081115?.[0]?.x00081140;
    if (referenceInstanceSeqAttribute) {
      referenceInstanceSeqAttribute.forEach(elem => {
        const instanceUID = elem?.x00081155;
        if (gspsManager == null) {
          gspsManager = {};
        }
        if (instanceUID) {
          gspsManager[instanceUID]
            ? gspsManager[instanceUID]!.push({
                seriesId: uniqueUID,
                imageId: imageId
              })
            : (gspsManager[instanceUID] = [
                { seriesId: uniqueUID, imageId: imageId }
              ]);
        }
      });
    }
  });
};

/**
 * Return the dictionary that maps a sopInstanceUID with an array containing its PS
 * @instance
 * @function getGSPSManager
 * @returns {Object} the GSPS Manager
 */
export const getGSPSManager = function () {
  if (gspsManager == null) {
    gspsManager = {};
  }
  return gspsManager;
};

/**
 * Reset the GSPS Manager
 * @instance
 * @function resetGSPSManager
 */
export const resetGSPSManager = function () {
  if (gspsManager) {
    Object.keys(gspsManager).forEach(key => {
      const instances = gspsManager![key]; // Avoid null warning by asserting non-null
      if (instances && Array.isArray(instances)) {
        instances.forEach(instance => {
          instance.seriesId = null;
          instance.imageId = null;
        });
      }
      gspsManager![key] = null; // Reset the entry to null
    });
    gspsManager = null;
  }
};

/**
 * Populate File Manager
 * @instance
 * @function populateFileManager
 * @param {File | ArrayBuffer} data The file or arrayBuffer to populate
 */
export const populateFileManager = function (data: File | ArrayBuffer) {
  let uuid =
    data instanceof File ? data.webkitRelativePath || data.name : uniqueId();
  if (fileManager == null) {
    fileManager = {};
  }
  if (!has(fileManager, uuid)) {
    const imageId = getFileCustomImageId(data);
    if (imageId) {
      fileManager[uuid] = imageId;
    }
  }
};

/**
 * Return the File manager
 * @instance
 * @function getFileManager
 * @returns {Object} the file manager
 */
export const getFileManager = function () {
  if (fileManager == null) {
    fileManager = {};
  }
  return fileManager;
};

/**
 * Get the data from the File Manager
 * @instance
 * @function getDataFromFileManager
 * @param {File | String} data The file or string to get data from
 * @return {String} current file image id
 */
export const getDataFromFileManager = function (
  data: File | string
): string | null {
  let uuid = data instanceof File ? data.webkitRelativePath || data.name : data;
  return fileManager && has(fileManager, uuid) ? fileManager[uuid] : null;
};

/**
 * Reset the File Manager
 * @instance
 * @function resetFileManager
 */
export const resetFileManager = function () {
  fileManager = null;
};
