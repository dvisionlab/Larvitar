/** @module loaders/dicomLoader
 *  @desc This file provides functionalities for
 *        custom DICOM Loader
 */
import type { Series } from "../types";
/**
 * Load and cache images
 * @instance
 * @function cacheImages
 * @param {Object} seriesData The series data
 * @param {Function} callback An optional callback function
 */
export declare const cacheImages: (seriesData: Series, callback: Function) => void;
/**
 * Get the dicom imageId from dicom loader
 * @instance
 * @function getDicomImageId
 * @param {String} dicomLoaderName dicom loader name
 * @return {String} current dicom image id
 */
export declare const getDicomImageId: (dicomLoaderName: string) => string;
