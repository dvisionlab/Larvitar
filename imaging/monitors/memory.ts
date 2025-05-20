/** @module monitors/memory
 *  @desc This file provides utility functions for
 *        monitoring memory usage
 */

import { logger } from "../../common/logger";
import { getImageManager, removeDataFromImageManager } from "../imageManagers";
import { clearImageCache } from "../imageRendering";
import store from "../imageStore";

// Custom types for chrome
interface Performance {
  memory?: any;
}

// global module variables
const backingMemory = 100 * 1048576; // 100 MB
var customMemoryLimit: number | null = null;

/*
 * This module provides the following functions to be exported:
 * checkAndClearMemory(bytes, [seriesUUIDs])
 * checkMemoryAllocation(bytes)
 * getUsedMemory()
 * getAvailableMemory()
 * setAvailableMemory()
 */

/**
 * Check memory allocation and clear memory if needed
 * @instance
 * @function checkAndClearMemory
 * @param {Number} bytes - Number of bytes to allocate
 * @param {Array} renderedSeriesIds - Rendered Series ids
 */
export const checkAndClearMemory = function (
  bytes: number,
  renderedSeriesIds: string[]
) {
  const isEnough = checkMemoryAllocation(bytes);
  if (isEnough === false) {
    const manager = getImageManager();
    // get all key of manager and create a list
    const uniqueUIDs = Object.keys(manager);
    // create a list of non rendered series ids
    const nonRenderedUniqueIds = uniqueUIDs.filter(
      uniqueUID => !renderedSeriesIds.includes(uniqueUID)
    );
    // remove non rendered series from manager
    nonRenderedUniqueIds.forEach(uniqueUID => {
      removeDataFromImageManager(uniqueUID);
      clearImageCache(uniqueUID);
      store.removeImageIds(uniqueUID);
    });
  }
};

/**
 * Check memory allocation and returns false if js Heap size has reached its limit
 * @instance
 * @function checkMemoryAllocation
 * @param {Number} bytes - Number of bytes to allocate
 * @return {Boolean} - Returns a boolean flag to warn the user about memory allocation limit
 */
export const checkMemoryAllocation = function (bytes: number) {
  if (checkMemorySupport()) {
    let usedMemory = getUsedMemory();
    let availableMemory = getAvailableMemory();
    let isEnough = availableMemory - bytes - usedMemory > 0 ? true : false;
    if (!isEnough) {
      logger.warn("Total Memory Available is: ", getMB(availableMemory), " MB");
      logger.warn("Currently Used Memory is: ", getMB(usedMemory), " MB");
      logger.warn(
        "New memory requested allocation is: ",
        getMB(usedMemory + bytes),
        " MB"
      );
    }
    return isEnough;
  } else {
    logger.warn("Check Memory Allocation is not supported");
    return true;
  }
};

/**
 * Check performance.memory browser support and returns used Js Heap Size in Mb
 * @instance
 * @function getUsedMemory
 * @return {Number} - Returns used JSHeapSize in bytes or NaN if not supported
 */
export const getUsedMemory = function (): number {
  return checkMemorySupport()
    ? (performance as Performance).memory.usedJSHeapSize
    : NaN;
};

/**
 * Check performance.memory browser support and returns available Js Heap Size in Mb
 * @instance
 * @function getAvailableMemory
 * @return {Number} - Returns available JSHeapSize in bytes or NaN if not supported
 */
export const getAvailableMemory = function (): number {
  if (checkMemorySupport()) {
    return customMemoryLimit
      ? customMemoryLimit
      : (performance as Performance).memory.jsHeapSizeLimit - backingMemory;
  } else {
    return NaN;
  }
};

/**
 * Check performance.memory browser support and returns available Js Heap Size in Mb
 * @instance
 * @function setAvailableMemory
 * @param {Number} value - Number of GB to set as maximum custom memory limit
 */
export const setAvailableMemory = function (value: number) {
  customMemoryLimit = value * 1024 * 1024 * 1024;
};

/* Internal module functions */

/**
 * Check Browser support.
 * Firefox and Safari are not supported
 * See: https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
 * @instance
 * @function checkMemorySupport
 * @return {Boolean} - Returns memory object or false if not supported
 */
const checkMemorySupport = function (): boolean {
  return (performance as Performance).memory
    ? (performance as Performance).memory
    : false;
};

/**
 * Check Browser support.
 * @instance
 * @function getMB
 * @param {Number} bytes - Memory in bytes
 * @return {Number} - Memory in MB
 */
const getMB = function (bytes: number): number {
  return bytes / 1048576;
};
