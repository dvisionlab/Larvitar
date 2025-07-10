import { metaData } from "@cornerstonejs/core";

// types
import { ImageUrlMetadata } from "../types";

// Maps to store metadata: imageId → Provider Type
const imageUrlModuleMap = new Map<string, ImageUrlMetadata>();

/**
 * Provider function for image URL metadata.
 * This function retrieves the image URL metadata for a given imageId.
 * @instance
 * @function imageUrlModuleProvider
 * @param {string} type - The type of metadata to retrieve
 * @param {string} imageId - The imageId to retrieve metadata for
 * @returns {ImageUrlMetadata | undefined} - The metadata for the given imageId, or undefined if not found
 */
const imageUrlModuleProvider = function (
  type: string,
  imageId: string
): ImageUrlMetadata | undefined {
  if (type === "imageUrlModule") {
    return imageUrlModuleMap.get(imageId);
  }
  return undefined;
};

/**
 * Registers the image URL metadata provider with the metaData service.
 * This allows the application to retrieve image URL metadata using the specified type.
 * @instance
 * @function registerImageUrlModuleProvider
 * @returns {void}
 */
export const registerImageUrlModuleProvider = function (): void {
  metaData.addProvider(imageUrlModuleProvider);
};

/**
 * Adds image URL metadata for a specific imageId.
 * This function associates the provided image URL metadata with the given imageId.
 * @instance
 * @function addImageUrlMetadata
 * @param {string} imageId - The unique identifier for the image
 * @param {string} imageUrlMetadata - The metadata for the image URL, including properties like rendered, thumbnail, etc.
 * @returns {void}
 */
export const addImageUrlMetadata = function (
  imageId: string,
  imageUrlMetadata: ImageUrlMetadata
): void {
  imageUrlModuleMap.set(imageId, imageUrlMetadata);
};
