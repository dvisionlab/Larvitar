/** @module imaging/imageLoading
 *  @desc This file provides functionalities for
 *        initialize, configure and update DICOMImageLoader
 */
import { getImageManager } from "../imaging/imageManagers";
import { ImageObject } from "../imaging/types";
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
export declare const removeInvalidTags: (srcMetadata: {
    [tagId: string]: any;
}) => any;
export default function getPixelSpacingInformation(instance: any): any;
export declare const loadAndCacheMetadata: (imageIds: string[]) => void;
