/** @module imaging/loaders/singleFrameLoader
 *  @desc  This file is a custom DICOM loader for single frame of multiframe images
 */
import { ImageLoader } from "cornerstone-core";
import type { ImageObject, MetaData, SingleFrameCache } from "../types";
/**
 * Get the single frame cache
 * @export
 * @function getSingleFrameCache
 * @param {String} imageId - Optional Image tag
 * @returns {Object} - Single frame cache object
 */
export declare const getSingleFrameCache: (imageId?: string) => {
    [key: string]: SingleFrameCache;
};
/**
 * Set the single frame cache
 * @export
 * @function setSingleFrameCache
 * @param {Array} pixelData - Pixel data array
 * @param {MetaData} metadata - Metadata object
 * @returns {ImageObject} - Image object
 */
export declare const setSingleFrameCache: (pixelData: Uint8ClampedArray, metadata: MetaData) => Promise<ImageObject>;
/**
 * Clear single frame cache
 * @export
 * @function clearSingleFrameCache
 * @param {String} imageId - Optional Image tag
 */
export declare const clearSingleFrameCache: (imageId?: string) => void;
/**
 * Custom MultiFrame Loader Function
 * @export
 * @function loadSingleFrameImage
 * @param {String} imageId - ImageId tag
 * @returns {Function} Custom Image Creation Function
 */
export declare const loadSingleFrameImage: ImageLoader;
