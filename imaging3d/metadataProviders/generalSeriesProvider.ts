import { metaData } from "@cornerstonejs/core";

// types
import { GeneralSeriesMetadata } from "../types";

// Mappa privata: imageId → cineModule data
const generalSeriesModuleMap = new Map<string, GeneralSeriesMetadata>();

/**
 * Provider function for general series metadata.
 * This function retrieves the general series metadata for a given imageId.
 * @instance
 * @function generalSeriesModuleProvider
 * @param {string} type - The type of metadata to retrieve
 * @param {string} imageId - The imageId to retrieve metadata for
 * @returns {GeneralSeriesMetadata | undefined} - The metadata for the given imageId, or undefined if not found
 */
function generalSeriesModuleProvider(
  type: string,
  imageId: string
): GeneralSeriesMetadata | undefined {
  if (type === "generalSeriesModule") {
    return generalSeriesModuleMap.get(imageId);
  }
  return undefined;
}

/**
 * Registers the general series metadata provider with the metaData service.
 * This allows the application to retrieve general series metadata using the specified type.
 * @instance
 * @function registerGeneralSeriesModuleProvider
 * @returns {void}
 */
export const registerGeneralSeriesModuleProvider = function (): void {
  metaData.addProvider(generalSeriesModuleProvider);
};

/**
 * Adds general series metadata for a specific imageId.
 * This function associates the provided general series metadata with the given imageId.
 * @instance
 * @function addGeneralSeriesMetadata
 * @param {string} imageId - The unique identifier for the image
 * @param {GeneralSeriesMetadata} seriesMetadata - The metadata for the cine module, including properties like frameRate, numberOfFrames, etc.
 * @returns {void}
 */
export const addGeneralSeriesMetadata = function (
  imageId: string,
  seriesMetadata: GeneralSeriesMetadata
): void {
  generalSeriesModuleMap.set(imageId, seriesMetadata);
};
