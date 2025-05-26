/** @module loaders/fileLoader
 *  @desc This file provides functionalities for
 *        custom File Loader
 */
/**
 * Get the custom imageId from file loader
 * @instance
 * @function getFileCustomImageId
 * @param {File | ArrayBuffer} data The file object or arrayBuffer to be loaded
 * @return {String} the custom image id
 */
export declare const getFileCustomImageId: (data: File | ArrayBuffer) => string;
/**
 * Reset the Custom File Loader
 * @instance
 * @function resetFileLoader
 */
export declare const resetFileLoader: () => void;
