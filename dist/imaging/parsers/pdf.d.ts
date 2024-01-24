/** @module imaging/parsers/pdf
 *  @desc  This file provides functionalities for
 *         managing pdf files using pdfjs-dist library
 */
import { pdfType } from "../types";
/**
 * This module provides the following functions to be exported:
 * convertToPNG(pdf, pageNumber)
 * generateFiles(fileURL)
 */
/**
 * Convert a pdf page to a png image in base64 format
 * @instance
 * @function convertToPNG
 * @param {pdfType} pdf - The pdf object
 * @param {number} pageNumber - The page number to be converted
 * @returns {string} The png image in base64 format
 */
export declare const convertToPNG: (pdf: pdfType, pageNumber: number) => Promise<string>;
/**
 * Generate an array of files from a pdf file
 * @instance
 * @function generateFiles
 * @param {string} fileURL - The url of the pdf file
 * @returns {File[]} An array of files
 */
export declare const generateFiles: (fileURL: string) => Promise<File[]>;
