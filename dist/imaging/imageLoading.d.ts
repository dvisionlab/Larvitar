/** @module imaging/imageLoading
 *  @desc This file provides functionalities for
 *        initialize, configure and update DICOMImageLoader
 */
import { ImageObject } from "./types";
import { getLarvitarManager } from "./loaders/commonLoader";
declare const globalConfig: {
    maxWebWorkers: number;
    startWebWorkersOnDemand: boolean;
    taskConfiguration: {
        decodeTask: {
            loadCodecsOnStartup: boolean;
            initializeCodecsOnStartup: boolean;
            strict: boolean;
        };
    };
};
/**
 * Configure DICOMImageLoader
 * @instance
 * @function initializeImageLoader
 * @param {Object} config - Custom config @default globalConfig
 */
export declare const initializeImageLoader: (config?: typeof globalConfig) => void;
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
 * Update the allSeriesStack object using DICOMImageLoader fileManager
 * @instance
 * @function updateLoadedStack
 * @param {Object} seriesData - Cornerstone series object
 * @param {Object} allSeriesStack - Dict containing all series objects
 * @param {String} customId - Optional custom id to overwrite seriesUID as default one
 * @param {number} sliceIndex - Optional custom index to overwrite slice index as default one
 */
export declare const updateLoadedStack: (seriesData: ImageObject, allSeriesStack: ReturnType<typeof getLarvitarManager>, customId?: string, sliceIndex?: number) => void;
export {};
