/** @module loaders/multiframeLoader
 *  @desc This file is a custom DICOM loader for multiframe images
 */
import { ImageLoader } from "cornerstone-core";
/**
 * Reset pixel shift to undefined
 * @export
 * @function loadDsaImage
 * @param {String} elementId - elementId tag
 * @returns {void}
 */
export declare const resetPixelShift: (elementId: string) => void;
/**
 * Custom DSA Image Loader Function
 * @export
 * @function loadDsaImage
 * @param {String} imageId - ImageId tag
 * @returns {Function} Custom Image Creation Function
 */
export declare const loadDsaImage: ImageLoader;
/**
 * Populate the DSA imageIds for a given seriesId
 * @export
 * @function populateDsaImageIds
 * @param {string} uniqueUID - The unique identifier for the series
 */
export declare const populateDsaImageIds: (uniqueUID: string) => void;
/**
 * Set the pixel shift for DSA
 * @instance
 * @function setPixelShift
 * @param {Array} pixelShift The pixel shift array
 */
export declare const setPixelShift: (pixelShift: number[] | undefined) => void;
