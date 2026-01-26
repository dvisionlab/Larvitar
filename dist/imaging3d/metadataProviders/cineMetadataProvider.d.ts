import { CineMetadata } from "../types";
/**
 * Registers the cine metadata provider with the metaData service.
 * This allows the application to retrieve cine metadata using the specified type.
 * @instance
 * @function registerCineModuleProvider
 * @returns {void}
 */
export declare const registerCineModuleProvider: () => void;
/**
 * Adds cine metadata for a specific imageId.
 * This function associates the provided cine metadata with the given imageId.
 * @instance
 * @function addCineMetadata
 * @param {string} imageId - The unique identifier for the image
 * @param {CineMetadata} cineMetadata - The metadata for the cine module, including properties like frameRate, numberOfFrames, etc.
 * @returns {void}
 */
export declare const addCineMetadata: (imageId: string, cineMetadata: CineMetadata) => void;
