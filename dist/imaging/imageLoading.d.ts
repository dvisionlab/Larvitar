/** @module imaging/imageLoading
 *  @desc This file provides functionalities for
 *        initialize, configure and update DICOMImageLoader
 */
import { ImageObject } from "./types";
import { getLarvitarManager } from "./loaders/commonLoader";
/**
 * Configure DICOMImageLoader
 * @instance
 * @function initializeImageLoader
 * @param {number} maxConcurrency - Optional maximum number of web workers
 */
export declare const initializeImageLoader: (maxConcurrency?: number) => void;
/**
 * Configure cornerstoneWebImageLoader
 * @instance
 * @function initializeWebImageLoader
 */
export declare const initializeWebImageLoader: () => void;
/**
 * Configure cornerstoneFileImageLoader
 * @instance
 * @function initializeFileImageLoader
 */
export declare const initializeFileImageLoader: () => void;
/**
 * Register custom NRRD ImageLoader
 * @instance
 * @function registerNRRDImageLoader
 */
export declare const registerNRRDImageLoader: () => void;
/**
 * Register custom Reslice ImageLoader
 * @instance
 * @function registerResliceLoader
 */
export declare const registerResliceLoader: () => void;
/**
 * Register custom MultiFrame ImageLoader
 * @instance
 * @function registerMultiFrameImageLoader
 */
export declare const registerMultiFrameImageLoader: () => void;
/**
 * Register custom DSA ImageLoader
 * @instance
 * @function registerDsaImageLoader
 */
export declare const registerDsaImageLoader: () => void;
/**
 * Update the allSeriesStack object using DICOMImageLoader fileManager
 * @instance
 * @function updateLoadedStack
 * @param {Object} seriesData - Cornerstone series object
 * @param {Object} allSeriesStack - Dict containing all series objects
 * @param {String} customId - Optional custom id to overwrite seriesUID as default one
 * @param {number} sliceIndex - Optional custom index to overwrite slice index as default one
 */
export declare const updateLoadedStack: (seriesData: ImageObject, allSeriesStack: ReturnType<typeof getLarvitarManager>, customId?: string, sliceIndex?: number) => void;
