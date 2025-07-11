import { metaData } from "@cornerstonejs/core";

// types
import { CineMetadata } from "../types";

// Mappa privata: imageId → cineModule data
const cineModuleMap = new Map<string, CineMetadata>();

/**
 * Provider function for cine metadata.
 * This function retrieves the cine metadata for a given imageId.
 * @instance
 * @function cineModuleProvider
 * @param {string} type - The type of metadata to retrieve
 * @param {string} imageId - The imageId to retrieve metadata for
 * @returns {CineMetadata | undefined} - The metadata for the given imageId, or undefined if not found
 */
function cineModuleProvider(
  type: string,
  imageId: string
): CineMetadata | undefined {
  if (type === "cineModule") {
    return cineModuleMap.get(imageId);
  }
  return undefined;
}

/**
 * Registers the cine metadata provider with the metaData service.
 * This allows the application to retrieve cine metadata using the specified type.
 * @instance
 * @function registerCineModuleProvider
 * @returns {void}
 */
export const registerCineModuleProvider = function (): void {
  metaData.addProvider(cineModuleProvider);
};

/**
 * Adds cine metadata for a specific imageId.
 * This function associates the provided cine metadata with the given imageId.
 * @instance
 * @function addCineMetadata
 * @param {string} imageId - The unique identifier for the image
 * @param {CineMetadata} cineMetadata - The metadata for the cine module, including properties like frameRate, numberOfFrames, etc.
 * @returns {void}
 */
export const addCineMetadata = function (
  imageId: string,
  cineMetadata: CineMetadata
): void {
  cineModuleMap.set(imageId, cineMetadata);
};
