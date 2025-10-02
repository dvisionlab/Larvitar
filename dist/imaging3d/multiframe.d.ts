/** @module imaging3d/multiframe
 *  @desc  This file provides functionalities for
 *        handling multiframe images in the 3D viewer.
 */
/**
 * @instance
 * @function prefetchMetadataInformation
 * @desc Prefetches metadata information for a list of imageIds
 * @param imageIdsToPrefetch - list of imageIds to prefetch metadata information
 * @returns Promise<void>
 */
export declare const prefetchMetadataInformation: (imageIdsToPrefetch: string[]) => Promise<void>;
/**
 * @instance
 * @function convertMultiframeImageIds
 * @desc Converts multiframe imageIds to single frame imageIds
 * @param imageIds - list of imageIds to convert
 * @returns string[] - new list of imageids where each imageid represents a frame
 */
export declare const convertMultiframeImageIds: (imageIds: string[]) => string[];
