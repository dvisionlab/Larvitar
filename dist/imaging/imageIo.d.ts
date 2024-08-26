/** @module imaging/imageIo
 *  @desc This file provides I/O functionalities on NRRD files and DICOM images
 */
import { Series, Header, TypedArray } from "./types";
/**
 * Build the image header from slices' metadata
 * @function buildHeader
 * @param {Object} series - Cornerstone series object
 * @returns {Object} header: image metadata
 */
export declare const buildHeader: (series: Series) => Header;
/**
 * Get cached pixel data
 * @function getCachedPixelData
 * @param {String} imageId - ImageId of the cached image
 * @returns {Promise} A promise which will resolve to a pixel data array or fail if an error occurs
 */
export declare const getCachedPixelData: (imageId: string) => Promise<number[]>;
/**
 * Build the contiguous typed array from slices
 * @function buildData
 * @param {Object} series - Cornerstone series object
 * @param {Bool} useSeriesData - Flag to force using "series" data instead of cached ones
 * @returns {Array} Contiguous pixel array
 */
export declare const buildData: (series: Series, useSeriesData: boolean) => Uint8Array | Int8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | undefined;
/**
 * Build the contiguous typed array from slices (async version)
 * @function buildDataAsync
 * @param {Object} series - Cornerstone series object
 * @param {Number} time - Time(s) to wait for garbage collector
 * @param {Function} resolve - Promise resolve function
 * @param {Function} reject - Promise reject function
 */
export declare const buildDataAsync: (series: Series, time: number, resolve: (response: TypedArray) => void, reject: (response: string) => void) => void;
/**
 * Import NRRD image from bufferArray
 * @function importNRRDImage
 * @param {ArrayBuffer} bufferArray - buffer array from nrrd file
 * @returns {Array} Parsed pixel data array
 */
export declare const importNRRDImage: (bufferArray: ArrayBuffer) => Object;
/**
 * Export image rendered in a canvas to base64
 * @function exportImageToBase64
 * @param elementId - Id of the div element containing the canvas
 * @returns {String | null} base64 image (png full quality) or null if canvas does not exist
 */
export declare const exportImageToBase64: (elementId: string, imageType: string) => string | null;
/**
 * Export image rendered in a canvas to base64
 * @function exportImageToBase64OriginalSizes
 * @param imageId - Id of the original image element
 * @returns {String | null} base64 image (png full quality) or null if canvas does not exist
 */
export declare const exportImageToBase64OriginalSizes: (imageId: string) => string;
/**
 * maps image pixel value in base64
 * @function mapToRange
 * @param value - Id of the original image element
 * @param inMin - Min greyscale value in the image
 * @param inMax - Max greyscale value in the image
 * @returns {number} image pixel value in base64
 */
export declare function mapToRange(value: number, inMin: number, inMax: number): number;
