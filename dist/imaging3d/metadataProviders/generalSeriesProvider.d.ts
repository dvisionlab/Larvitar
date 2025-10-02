import { GeneralSeriesMetadata } from "../types";
/**
 * Registers the general series metadata provider with the metaData service.
 * This allows the application to retrieve general series metadata using the specified type.
 * @instance
 * @function registerGeneralSeriesModuleProvider
 * @returns {void}
 */
export declare const registerGeneralSeriesModuleProvider: () => void;
/**
 * Adds general series metadata for a specific imageId.
 * This function associates the provided general series metadata with the given imageId.
 * @instance
 * @function addGeneralSeriesMetadata
 * @param {string} imageId - The unique identifier for the image
 * @param {GeneralSeriesMetadata} seriesMetadata - The metadata for the cine module, including properties like frameRate, numberOfFrames, etc.
 * @returns {void}
 */
export declare const addGeneralSeriesMetadata: (imageId: string, seriesMetadata: GeneralSeriesMetadata) => void;
