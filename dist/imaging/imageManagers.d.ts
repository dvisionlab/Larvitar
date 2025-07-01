/** @module manager
 *  @desc This file provides functionalities for
 *        handling image managers.
 */
import type { ImageObject, ImageManager, Series, GSPSManager, FileManager } from "./types";
/**
 * This function can be called in order to populate the image manager
 * @instance
 * @function populateImageManager
 * @param {String} uniqueUID The Id of the manager stack
 * @param {Object} data The dataset
 * @returns {ImageManager} the Image manager
 */
export declare const populateImageManager: (uniqueUID: string, data: Series) => ImageManager;
/**
 * Update and initialize image manager in order to parse and load a single dicom object
 * @instance
 * @function updateImageManager
 * @param {Object} imageObject The single dicom object
 * @param {String} customId - Optional custom id to overwrite uniqueUID as default one
 * @param {number} sliceIndex - Optional custom index to overwrite slice index as default one
 */
export declare const updateImageManager: (imageObject: ImageObject, customId?: string, sliceIndex?: number) => {
    [key: string]: Series | import("./types").NrrdSeries;
};
/**
 * Return the image manager
 * @instance
 * @function getImageManager
 * @returns {ImageManager} the image manager
 */
export declare const getImageManager: () => {
    [key: string]: Series | import("./types").NrrdSeries;
};
/**
 * Reset the image manager
 * @instance
 * @function resetImageManager
 */
export declare const resetImageManager: () => void;
/**
 * Remove a stored seriesId from the image manager
 * @instance
 * @function removeDataFromImageManager
 * @param {String} seriesId The Id of the series
 */
export declare const removeDataFromImageManager: (uniqueUID: string) => void;
/**
 * Return the data of a specific uniqueUID stored in the Image manager
 * @instance
 * @function getDataFromImageManager
 * @param {String} uniqueUID The unique Id of the dataset
 * @return {Series | null} image manager data
 */
export declare const getDataFromImageManager: (uniqueUID: string) => Series | null;
/**
 * Return the SOP Instance UID of a specific imageId stored in the image manager
 * @instance
 * @function getSopInstanceUIDFromImageManager
 * @param {String} uniqueUID The Id of the series
 * @param {String} imageId The Id of the image
 * @returns {String} sopInstanceUID
 */
export declare const getSopInstanceUIDFromImageManager: (uniqueUID: string, imageId: string) => string | null | undefined;
/**
 * Return the common image tracker
 * @instance
 * @function getImageTracker
 * @returns {Object} the image tracker
 */
export declare const getImageTracker: () => {
    [key: string]: string;
};
/**
 * This function can be called in order to populate the GSPS Manager
 * @instance
 * @function populateGSPSManager
 * @param {String} prUniqueUID The Id of the pr manager stack
 * @param {Object} seriesData The series data
 * @returns {void}
 */
export declare const populateGSPSManager: (prUniqueUID: string, seriesData: Series) => void;
/**
 * Return the dictionary that maps a sopInstanceUID with an array containing its PS
 * @instance
 * @function getGSPSManager
 * @returns {GSPSManager} the GSPS Manager
 */
export declare const getGSPSManager: () => GSPSManager;
/**
 * Reset the GSPS Manager
 * @instance
 * @function resetGSPSManager
 */
export declare const resetGSPSManager: () => void;
/**
 * Populate File Manager
 * @instance
 * @function populateFileManager
 * @param {File | ArrayBuffer} data The file or arrayBuffer to populate
 */
export declare const populateFileManager: (data: File | ArrayBuffer) => void;
/**
 * Return the File manager
 * @instance
 * @function getFileManager
 * @returns {FileManager} the file manager
 */
export declare const getFileManager: () => FileManager;
/**
 * Get the data from the File Manager
 * @instance
 * @function getDataFromFileManager
 * @param {File | String} data The file or string to get data from
 * @return {String} current file image id
 */
export declare const getDataFromFileManager: (data: File | string) => string | null;
/**
 * Reset the File Manager
 * @instance
 * @function resetFileManager
 */
export declare const resetFileManager: () => void;
