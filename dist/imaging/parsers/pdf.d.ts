/** @module imaging/parsers/pdf
 *  @desc  This file provides functionalities for
 *         managing pdf files using PDFium
 */
/**
 * Generate an array of files from a pdf file
 * @instance
 * @function generateFiles
 * @param {string} fileURL - The url of the pdf file
 * @returns {File[]} An array of files
 */
export declare const generateFiles: (fileURL: string) => Promise<File[]>;
