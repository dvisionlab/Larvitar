/** @module loaders/dicomLoader
 *  @desc This file provides functionalities for
 *        custom DICOM Loader
 */
import type { Series } from "../types";
/**
 * Load and cache a single image
 * @instance
 * @function cacheImage
 * @param {Object} seriesData The series data
 * @param {number} imageIndex The image index in the imageIds array
 */
export declare const cacheImage: (seriesData: Series, imageIndex: number) => Promise<true>;
/**
 * Load and cache images
 * @instance
 * @function cacheImages
 * @param {Object} seriesData The series data
 * @param {Function} callback Optional callback function
 */
export declare const cacheImages: (seriesData: Series, callback?: Function) => Promise<void>;
/**
 * Load and cache image stack
 * @instance
 * @function loadAndCacheImageStack
 * @param {Object} seriesData The series data
 * @return {Promise} Promise object represents the loading and caching of the image stack
 */
export declare const loadAndCacheImageStack: (seriesData: Series) => Promise<void>;
/**
 * Load and cache image stack
 * @instance
 * @function loadAndCacheDsaImageStack
 * @param {Object} seriesData The series data
 * @param {boolean} forceRecache Optional parameter to force recache
 * @return {Promise} Promise object represents the loading and caching of the image stack
 */
export declare const loadAndCacheDsaImageStack: (seriesData: Series, forceRecache?: boolean) => Promise<void>;
/**
 * Get the dicom imageId from dicom loader
 * @instance
 * @function getDicomImageId
 * @param {String} dicomLoaderName dicom loader name
 * @return {String} current dicom image id
 */
export declare const getDicomImageId: (dicomLoaderName: string) => string;
