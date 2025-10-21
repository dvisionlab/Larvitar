/** @module imaging/imageLoading
 *  @desc This file provides functionalities for
 *        initialize, configure and update DICOMImageLoader
 */
import { getImageManager } from "../imaging/imageManagers";
import { ImageObject, MetaData } from "../imaging/types";
import { DataSet } from "dicom-parser";
/**
 * Configure DICOMImageLoader
 * @instance
 * @function initializeImageLoader
 * @param {number} maxConcurrency - Optional maximum number of web workers
 */
export declare const initializeImageLoader: (maxConcurrency?: number) => void;
export declare const registerStreamingImageVolume: () => void;
/**
 * Update the allSeriesStack object using DICOMImageLoader fileManager
 * @instance
 * @function updateLoadedStack
 * @param {Object} seriesData - Cornerstone series object
 * @param {Object} allSeriesStack - Dict containing all series objects
 * @param {String} customId - Optional custom id to overwrite seriesUID as default one
 * @param {number} sliceIndex - Optional custom index to overwrite slice index as default one
 */
export declare const updateLoadedStack: (seriesData: ImageObject, allSeriesStack: ReturnType<typeof getImageManager>, customId?: string, sliceIndex?: number) => Promise<void>;
/**
 * Remove invalid tags from metadata
 * @instance
 * @function removeInvalidTags
 * @param {Object} srcMetadata - Source metadata object
 * @returns {Object} Cleaned metadata object with only valid tags
 */
export declare const removeInvalidTags: (srcMetadata: {
    [tagId: string]: any;
}) => any;
/**
 * Get pixel spacing information from the instance metadata
 * @instance
 * @function getPixelSpacingInformation
 * @param {Object} instance - DICOM instance metadata
 * @returns {Object} Pixel spacing information
 */
export default function getPixelSpacingInformation(instance: any): any;
/**
 * Load and cache metadata for the given image ID
 * @instance
 * @function loadAndCacheMetadata
 * @param {string} imageId3D - The image ID for the 3D image
 * @param {DataSet} dataSet - The DICOM data set
 * @param {MetaData} metadata - The metadata object to be cached
 * @returns {void}
 */
export declare const loadAndCacheMetadata: (imageId3D: string, dataSet: DataSet, metadata: MetaData) => void;
