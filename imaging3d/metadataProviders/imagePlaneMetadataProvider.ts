import { metaData } from "@cornerstonejs/core";

// types
import { ImagePlaneMetadata } from "../types";

// Maps to store metadata: imageId → Provider Type
const imagePlaneModuleMap = new Map<string, ImagePlaneMetadata>();

/**
 * Provider function for image plane metadata.
 * This function retrieves the image plane metadata for a given imageId.
 * @instance
 * @function imagePlaneModuleProvider
 * @param {string} type - The type of metadata to retrieve
 * @param {string} imageId - The imageId to retrieve metadata for
 * @returns {ImagePlaneMetadata | undefined} - The metadata for the given imageId, or undefined if not found
 */
function imagePlaneModuleProvider(
  type: string,
  imageId: string
): ImagePlaneMetadata | undefined {
  if (type === "imagePlaneModule") {
    return imagePlaneModuleMap.get(imageId);
  }
  return undefined;
}

/**
 * Registers the image plane metadata provider with the metaData service.
 * This allows the application to retrieve image plane metadata using the specified type.
 * @instance
 * @function registerImagePlaneModuleProvider
 * @returns {void}
 */
export const registerImagePlaneModuleProvider = function (): void {
  metaData.addProvider(imagePlaneModuleProvider);
};

/**
 * Adds image plane metadata for a specific imageId.
 * This function associates the provided image plane metadata with the given imageId.
 * @instance
 * @function addImagePlaneMetadata
 * @param {string} imageId - The unique identifier for the image
 * @param {string} imagePlaneMetadata - The metadata for the image plane, including properties like frameOfReferenceUID, rows, columns, etc.
 * @returns {void}
 */
export const addImagePlaneMetadata = function (
  imageId: string,
  imagePlaneMetadata: ImagePlaneMetadata
): void {
  imagePlaneModuleMap.set(imageId, imagePlaneMetadata);
};
