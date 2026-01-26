/** @module loaders/multiframeLoader
 *  @desc This file is a custom DICOM loader for multiframe images
 */
import { ImageLoader } from "cornerstone-core";
import type { Series } from "../types";
/**
 * Custom MultiFrame Loader Function
 * @export
 * @function loadMultiFrameImage
 * @param {String} imageId - ImageId tag
 * @returns {Function} Custom Image Creation Function
 */
export declare const loadMultiFrameImage: ImageLoader;
/**
 * Build the multiframe layout in the Image Manager
 * @export
 * @function buildMultiFrameImage
 * @param {String} uniqueUID - the uniqueUID of the series
 * @param {Object} serie - parsed serie object
 */
export declare const buildMultiFrameImage: (uniqueUID: string, serie: Series) => void;
/**
 * Get the custom imageId from custom loader
 * @instance
 * @function getMultiFrameImageId
 * @param {String} customLoaderName The custom loader name
 * @return {String} the custom image id
 */
export declare const getMultiFrameImageId: (customLoaderName: string) => string;
/**
 * Clear the multiframe cache
 * @instance
 * @function clearMultiFrameCache
 * @param {String} uniqueUID - the uniqueUID of the series
 */
export declare const clearMultiFrameCache: (uniqueUID: string) => void;
