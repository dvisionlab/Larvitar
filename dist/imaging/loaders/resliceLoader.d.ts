/** @module loaders/resliceLoader
 *  @desc This file provides functionalities for
 *        custom Reslice Loader
 */
import type { Image } from "../types";
/**
 * Custom Loader for DICOMImageLoader
 * @instance
 * @function loadReslicedImage
 * @param {String} imageId The Id of the image
 * @returns {Object} custom image object
 */
export declare const loadReslicedImage: (imageId: string) => {
    promise: Promise<Image>;
};
