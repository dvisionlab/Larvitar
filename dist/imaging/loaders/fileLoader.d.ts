/** @module loaders/fileLoader
 *  @desc This file provides functionalities for
 *        custom File Loader
 */
export declare var fileManager: {
    [key: string]: string;
};
/**
 * Reset the Custom File Loader
 * @instance
 * @function resetFileLoader
 */
export declare const resetFileLoader: () => void;
/**
 * Reset the File Manager store
 * @instance
 * @function resetFileManager
 */
export declare const resetFileManager: () => void;
/**
 * Populate File Manager
 * @instance
 * @function populateFileManager
 * @return {String} current file image id
 */
export declare const populateFileManager: (file: File) => void;
/**
 * Get the file imageId from file loader
 * @instance
 * @function getFileImageId
 * @return {String} current file image id
 */
export declare const getFileImageId: (file: File) => string | null;
/**
 * Return the common data file manager
 * @instance
 * @function getFileManager
 * @returns {Object} the file manager
 */
export declare const getFileManager: () => {
    [key: string]: string;
};
