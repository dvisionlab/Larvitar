/** @module loaders/multiframeLoader
 *  @desc This file is a custom DICOM loader for multiframe images
 */
import type { Image } from "../types";
/**
 * Custom DSA Image Loader Function
 * @export
 * @function loadDsaImage
 * @param {String} imageId - ImageId tag
 * @returns {Function} Custom Image Creation Function
 */
export declare const loadDsaImage: (imageId: string) => {
    promise: Promise<Image>;
};
/**
 * r
 * @export
 * @function populateDsaImageIds
 * @param {String} seriesId - SeriesId tag
 * @param {Object} serie - parsed serie object
 */
export declare const populateDsaImageIds: (larvitarSeriesInstanceUID: string) => void;
/**
 * Get the custom imageId from custom loader
 * @instance
 * @function getDsaImageId
 * @param {String} customLoaderName The custom loader name
 * @return {String} the custom image id
 */
export declare const getDsaImageId: (customLoaderName: string) => string;
/**
 * Clear the multiframe cache
 * @instance
 * @function clearMultiFrameCache
 * @param {String} seriesId - SeriesId tag
 */
export declare const clearMultiFrameCache: (seriesId: string) => void;
