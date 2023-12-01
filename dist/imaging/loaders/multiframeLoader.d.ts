/** @module loaders/multiframeLoader
 *  @desc This file is a custom DICOM loader for multiframe images
 */
import type { Image, Series } from "../types";
/**
 * Custom MultiFrame Loader Function
 * @export
 * @function loadMultiFrameImage
 * @param {String} imageId - ImageId tag
 * @returns {Function} Custom Image Creation Function
 */
export declare const loadMultiFrameImage: (imageId: string) => {
    promise: Promise<Image>;
};
/**
 * Build the multiframe layout in the larvitar Manager
 * @export
 * @function buildMultiFrameImage
 * @param {String} seriesId - SeriesId tag
 * @param {Object} serie - parsed serie object
 */
export declare const buildMultiFrameImage: (larvitarSeriesInstanceUID: string, serie: Series) => void;
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
 * @param {String} seriesId - SeriesId tag
 */
export declare const clearMultiFrameCache: (seriesId: string) => void;
