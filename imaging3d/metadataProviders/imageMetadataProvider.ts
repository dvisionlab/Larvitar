const metadata: { [key: string]: any } = {};

/**
 * Provider function for image metadata.
 * @instance
 * @function add
 * @param {string} imageId - The imageId to retrieve metadata for
 * @param metadata - The metadata to add for the imageId
 * @returns {void}
 */
const add = function (imageId: string, metadata: any): void {
  metadata[imageId] = metadata;
};

/**
 * Retrieves metadata for a given imageId.
 * @instance
 * @function get
 * @param {string} type - The type of metadata to retrieve
 * @param {string} imageId - The imageId to retrieve metadata for
 * @returns {any} - The metadata for the given imageId, or undefined if not found
 */
const get = function (type: string, imageId: string): any {
  if (type === "metadata") {
    return metadata[imageId];
  }
};

export const imageMetadataProvider = { add, get };
