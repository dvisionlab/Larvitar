import { ImagePlaneMetadata } from "../types";
/**
 * Registers the image plane metadata provider with the metaData service.
 * This allows the application to retrieve image plane metadata using the specified type.
 * @instance
 * @function registerImagePlaneModuleProvider
 * @returns {void}
 */
export declare const registerImagePlaneModuleProvider: () => void;
/**
 * Adds image plane metadata for a specific imageId.
 * This function associates the provided image plane metadata with the given imageId.
 * @instance
 * @function addImagePlaneMetadata
 * @param {string} imageId - The unique identifier for the image
 * @param {string} imagePlaneMetadata - The metadata for the image plane, including properties like frameOfReferenceUID, rows, columns, etc.
 * @returns {void}
 */
export declare const addImagePlaneMetadata: (imageId: string, imagePlaneMetadata: ImagePlaneMetadata) => void;
