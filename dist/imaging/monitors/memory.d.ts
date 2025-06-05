/** @module monitors/memory
 *  @desc This file provides utility functions for
 *        monitoring memory usage
 */
/**
 * Check memory allocation and clear memory if needed
 * @instance
 * @function checkAndClearMemory
 * @param {Number} bytes - Number of bytes to allocate
 * @param {Array} renderedSeriesIds - Rendered Series ids
 */
export declare const checkAndClearMemory: (bytes: number, renderedSeriesIds: string[]) => void;
/**
 * Check memory allocation and returns false if js Heap size has reached its limit
 * @instance
 * @function checkMemoryAllocation
 * @param {Number} bytes - Number of bytes to allocate
 * @return {Boolean} - Returns a boolean flag to warn the user about memory allocation limit
 */
export declare const checkMemoryAllocation: (bytes: number) => boolean;
/**
 * Check performance.memory browser support and returns used Js Heap Size in Mb
 * @instance
 * @function getUsedMemory
 * @return {Number} - Returns used JSHeapSize in bytes or NaN if not supported
 */
export declare const getUsedMemory: () => number;
/**
 * Check performance.memory browser support and returns available Js Heap Size in Mb
 * @instance
 * @function getAvailableMemory
 * @return {Number} - Returns available JSHeapSize in bytes or NaN if not supported
 */
export declare const getAvailableMemory: () => number;
/**
 * Check performance.memory browser support and returns available Js Heap Size in Mb
 * @instance
 * @function setAvailableMemory
 * @param {Number} value - Number of GB to set as maximum custom memory limit
 */
export declare const setAvailableMemory: (value: number) => void;
