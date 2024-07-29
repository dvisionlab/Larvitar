/** @module imaging/imageParsing
 *  @desc  This file provides functionalities for parsing DICOM image files
 */
import { DataSet } from "dicom-parser";
import { ImageObject } from "./types";
import { getLarvitarManager } from "./loaders/commonLoader";
import type { ExtendedMetaDataTypes } from "./MetaDataTypes";
/**
 * Reset series stack object and its internal data
 * @instance
 * @function clearImageParsing
 * @param {Object} seriesStack - Parsed series stack object
 */
export declare const clearImageParsing: (seriesStack: ReturnType<typeof getLarvitarManager> | null) => void;
/**
 * Read dicom files and return allSeriesStack object
 * @instance
 * @function readFiles
 * @param {Array} entries - List of file objects
 * @returns {Promise} - Return a promise which will resolve to a image object list or fail if an error occurs
 */
export declare const readFiles: (entries: File[]) => Promise<unknown>;
/**
 * Read a single dicom file and return parsed object
 * @instance
 * @function readFile
 * @param {File} entry - File object
 * @returns {Promise} - Return a promise which will resolve to a image object or fail if an error occurs
 */
export declare const readFile: (entry: File) => Promise<ImageObject>;
/**
 * Parse metadata from dicom parser dataSet object
 * @instance
 * @function parseDataSet
 * @param {Object} dataSet - dicom parser dataSet object
 * @param {Object} metadata - Initialized metadata object
 * @param {Array} customFilter - Optional filter: {tags:[], frameId: 0}
 */
export declare const parseDataSet: (dataSet: DataSet, metadata: ExtendedMetaDataTypes, customFilter?: {
    tags: string[];
    frameId: number;
}) => void;
