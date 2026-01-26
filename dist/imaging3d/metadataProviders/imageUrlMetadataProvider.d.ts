import { ImageUrlMetadata } from "../types";
/**
 * Registers the image URL metadata provider with the metaData service.
 * This allows the application to retrieve image URL metadata using the specified type.
 * @instance
 * @function registerImageUrlModuleProvider
 * @returns {void}
 */
export declare const registerImageUrlModuleProvider: () => void;
/**
 * Adds image URL metadata for a specific imageId.
 * This function associates the provided image URL metadata with the given imageId.
 * @instance
 * @function addImageUrlMetadata
 * @param {string} imageId - The unique identifier for the image
 * @param {string} imageUrlMetadata - The metadata for the image URL, including properties like rendered, thumbnail, etc.
 * @returns {void}
 */
export declare const addImageUrlMetadata: (imageId: string, imageUrlMetadata: ImageUrlMetadata) => void;
