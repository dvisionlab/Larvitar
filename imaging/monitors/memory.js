/** @module monitors/memory
 *  @desc This file provides utility functions for
 *        monitoring memory usage
 */

// global module variables
const backingMemory = 100 * 1048576; // 100 MB
var customMemoryLimit = null;

/*
 * This module provides the following functions to be exported:
 * checkMemoryAllocation()
 * getUsedMemory()
 * getAvailableMemory()
 * setAvailableMemory()
 */

/**
 * Check memory allocation and returns false if js Heap size has reached its limit
 * @instance
 * @function checkMemoryAllocation
 * @param {Number} - Number of bytes to allocate
 * @return {Boolean} - Returns a boolean flag to warn the user about memory allocation limit
 */
export const checkMemoryAllocation = function (bytes) {
  if (checkMemorySupport()) {
    let usedMemory = getUsedMemory();
    let availableMemory = getAvailableMemory();
    let isEnough = availableMemory - bytes - usedMemory > 0 ? true : false;
    if (!isEnough) {
      console.log("Total Memory Available is: ", getMB(availableMemory), " MB");
      console.log("Currently Used Memory is: ", getMB(usedMemory), " MB");
      console.log(
        "New memory requested allocation is: ",
        getMB(usedMemory + bytes),
        " MB"
      );
    }
    return isEnough;
  } else {
    console.warn("Check Memory Allocation is not supported");
    return true;
  }
};

/**
 * Check performance.memory browser support and returns used Js Heap Size in Mb
 * @instance
 * @function getUsedMemory
 * @return {Number} - Returns used JSHeapSize in bytes or NaN if not supported
 */
export const getUsedMemory = function () {
  return checkMemorySupport() ? performance.memory.usedJSHeapSize : NaN;
};

/**
 * Check performance.memory browser support and returns available Js Heap Size in Mb
 * @instance
 * @function getAvailableMemory
 * @return {Number} - Returns available JSHeapSize in bytes or NaN if not supported
 */
export const getAvailableMemory = function () {
  if (checkMemorySupport()) {
    return customMemoryLimit
      ? customMemoryLimit
      : performance.memory.jsHeapSizeLimit - backingMemory;
  } else {
    return NaN;
  }
};

/**
 * Check performance.memory browser support and returns available Js Heap Size in Mb
 * @instance
 * @function setAvailableMemory
 * @param {Number} - Number of GB to set as maximum custom memory limit
 */
export const setAvailableMemory = function (value) {
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
const checkMemorySupport = function () {
  return performance.memory ? performance.memory : false;
};

/**
 * Check Browser support.
 * @instance
 * @function getMB
 * @param {Number} bytes - Memory in bytes
 * @return {Number} - Memory in MB
 */
const getMB = function (bytes) {
  return bytes / 1048576;
};
