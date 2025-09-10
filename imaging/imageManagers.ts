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
  ImageManager,
  Series,
  GSPSManager,
  FileManager
} from "./types";
import { getFileCustomImageId } from "./loaders/fileLoader";
import { logger } from "../logger";
import { clearSingleFrameCache } from "./loaders/singleFrameLoader";

// global variables
var imageManager: ImageManager = null;
var gspsManager: GSPSManager = null;
var imageTracker: ImageTracker = null;
var fileManager: FileManager = null;

/*
 * This module provides the following functions to be exported:
 * updateImageManager(imageObject)
 * populateImageManager(uniqueUID, seriesData)
 * getImageManager()
 * resetImageManager()
 * removeDataFromImageManager(uniqueUID)
 * getDataFromImageManager(uniqueUID)
 * getSopInstanceUIDFromImageManager(uniqueUID, imageId)
 */

/**
 * This function can be called in order to populate the image manager
 * @instance
 * @function populateImageManager
 * @param {String} uniqueUID The Id of the manager stack
 * @param {Object} data The dataset
 * @returns {ImageManager} the Image manager
 */
export const populateImageManager = function (
  uniqueUID: string,
  data: Series
): ImageManager {
  const metadata = data.instances[data.imageIds[0]]?.metadata;
  if (imageManager === null) {
    imageManager = {};
  }
  let _data = { ...data };
  if (_data.isMultiframe) {
    buildMultiFrameImage(uniqueUID, _data);
  } else if (metadata.seriesModality === "pr") {
    const prUniqueUID = uniqueUID + "_PR";
    imageManager[prUniqueUID] = _data;
    populateGSPSManager(prUniqueUID, _data);
  } else {
    imageManager[uniqueUID] = _data;
  }
  return imageManager;
};

/**
 * Update and initialize image manager in order to parse and load a single dicom object
 * @instance
 * @function updateImageManager
 * @param {Object} imageObject The single dicom object
 * @param {String} customId - Optional custom id to overwrite uniqueUID as default one
 * @param {number} sliceIndex - Optional custom index to overwrite slice index as default one
 */
export const updateImageManager = function (
  imageObject: ImageObject,
  customId?: string,
  sliceIndex?: number
) {
  if (imageManager === null) {
    imageManager = {};
  }
  let data = { ...imageObject };
  if (data.metadata?.isMultiframe && data.file && data.dataSet) {
    let uniqueUID = customId || imageObject.metadata.uniqueUID;
    let loadedStack: ReturnType<typeof getImageManager> = {};
    updateLoadedStack(data, loadedStack, customId, sliceIndex);
    buildMultiFrameImage(
      uniqueUID as string,
      loadedStack[uniqueUID as string] as Series
    );
  } else {
    updateLoadedStack(data, imageManager, customId, sliceIndex);
  }
  return imageManager;
};

/**
 * Return the image manager
 * @instance
 * @function getImageManager
 * @returns {ImageManager} the image manager
 */
export const getImageManager = function () {
  if (imageManager == null) {
    imageManager = {};
  }
  return imageManager;
};

/**
 * Reset the image manager
 * @instance
 * @function resetImageManager
 */
export const resetImageManager = function () {
  let t0 = performance.now();
  each(imageManager, function (stack) {
    if ((stack as Series).isMultiframe) {
      if ((stack as Series).dataSet) {
        //@ts-ignore for memory leak
        (stack as Series).dataSet!.byteArray = null;
      }
      (stack as Series).dataSet = null;
      (stack as Series).elements = null;
      clearMultiFrameCache(stack.uniqueUID);
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
  imageManager = null;
  imageTracker = null;
  clearSingleFrameCache();
  let t1 = performance.now();
  logger.debug(
    "Call to resetImageManager took " + (t1 - t0) + " milliseconds."
  );
};

/**
 * Remove a stored seriesId from the image manager
 * @instance
 * @function removeDataFromImageManager
 * @param {String} uniqueUID The Id of the series
 */
export const removeDataFromImageManager = function (uniqueUID: string) {
  if (imageManager && imageManager[uniqueUID]) {
    if (imageManager[uniqueUID].isMultiframe) {
      if (imageManager[uniqueUID].dataSet) {
        //@ts-ignore for memory leak
        imageManager[uniqueUID].dataSet.byteArray = null;
      }
      (imageManager[uniqueUID] as Series).dataSet = null;
      (imageManager[uniqueUID] as Series).elements = null;

      clearMultiFrameCache(uniqueUID);
    }
    each(imageManager[uniqueUID].instances, function (instance, imageId) {
      clearSingleFrameCache(imageId);
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
    imageManager[uniqueUID] = null;
    delete imageManager[uniqueUID];
  }
};

/**
 * Return the data of a specific uniqueUID stored in the Image manager
 * @instance
 * @function getDataFromImageManager
 * @param {String} uniqueUID The unique Id of the dataset
 * @return {Series | null} image manager data
 */
export const getDataFromImageManager = function (
  uniqueUID: string
): Series | null {
  return imageManager ? (imageManager[uniqueUID] as Series) : null;
};

/**
 * Return the SOP Instance UID of a specific imageId stored in the image manager
 * @instance
 * @function getSopInstanceUIDFromImageManager
 * @param {String} uniqueUID The Id of the series
 * @param {String} imageId The Id of the image
 * @returns {String} sopInstanceUID
 */
export const getSopInstanceUIDFromImageManager = function (
  uniqueUID: string,
  imageId: string
): string | null | undefined {
  if (imageManager === null) {
    return null;
  }
  let series = imageManager[uniqueUID];
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
 * @param {String} prUniqueUID The Id of the pr manager stack
 * @param {Object} seriesData The series data
 * @returns {void}
 */
export const populateGSPSManager = function (
  prUniqueUID: string,
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
                seriesId: prUniqueUID,
                imageId: imageId
              })
            : (gspsManager[instanceUID] = [
                { seriesId: prUniqueUID, imageId: imageId }
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
 * @returns {GSPSManager} the GSPS Manager
 */
export const getGSPSManager = function (): GSPSManager {
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
  const t0 = performance.now();
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
  const t1 = performance.now();
  logger.debug("Call to resetGSPSManager took " + (t1 - t0) + " milliseconds.");
};

/**
 * Populate File Manager
 * @instance
 * @function populateFileManager
 * @param {File | ArrayBuffer} data The file or arrayBuffer to populate
 */
export const populateFileManager = function (data: File | ArrayBuffer): void {
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
 * @returns {FileManager} the file manager
 */
export const getFileManager = function (): FileManager {
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
  const t0 = performance.now();
  if (fileManager) {
    fileManager = null;
  }
  const t1 = performance.now();
  logger.debug("Call to resetFileManager took " + (t1 - t0) + " milliseconds.");
};
