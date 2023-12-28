/** @module loaders/commonLoader
 *  @desc This file provides functionalities for
 *        custom DICOMImageLoaders
 */
import { DataSet } from "dicom-parser";
import type { ImageObject, MetaData, Series } from "../types";
/**
 * Update and initialize larvitar manager in order to parse and load a single dicom object
 * @instance
 * @function updateLarvitarManager
 * @param {Object} imageObject The single dicom object
 * @param {String} customId - Optional custom id to overwrite seriesUID as default one
 * @param {number} sliceIndex - Optional custom index to overwrite slice index as default one
 */
export declare const updateLarvitarManager: (imageObject: ImageObject, customId?: string, sliceIndex?: number) => {
    [key: string]: import("../types").NrrdSeries | Series;
};
/**
 * This function can be called in order to populate the Larvitar manager
 * @instance
 * @function populateLarvitarManager
 * @param {String} larvitarSeriesInstanceUID The Id of the manager stack
 * @param {Object} seriesData The series data
 * @returns {manager} the Larvitar manager
 */
export declare const populateLarvitarManager: (larvitarSeriesInstanceUID: string, seriesData: Series) => {
    [key: string]: import("../types").NrrdSeries | Series;
};
/**
 * Return the common data loader manager
 * @instance
 * @function getLarvitarManager
 * @returns {Object} the loader manager
 */
export declare const getLarvitarManager: () => {
    [key: string]: import("../types").NrrdSeries | Series;
};
/**
 * Return the common image tracker
 * @instance
 * @function getLarvitarImageTracker
 * @returns {Object} the image tracker
 */
export declare const getLarvitarImageTracker: () => {
    [key: string]: string;
};
/**
 * Reset the Larvitar Manager store
 * @instance
 * @function resetLarvitarManager
 */
export declare const resetLarvitarManager: () => void;
/**
 * Remove a stored seriesId from the larvitar Manager
 * @instance
 * @function removeSeriesFromLarvitarManager
 * @param {String} seriesId The Id of the series
 */
export declare const removeSeriesFromLarvitarManager: (seriesId: string) => void;
/**
 * Return the data of a specific seriesId stored in the DICOM Manager
 * @instance
 * @function getSeriesDataFromLarvitarManager
 * @param {String} seriesId The Id of the series
 * @return {Object} larvitar manager data
 */
export declare const getSeriesDataFromLarvitarManager: (seriesId: string) => import("../types").NrrdSeries | Series | null;
/**
 * Compute and return image frame
 * @instance
 * @function getImageFrame
 * @param {Object} metadata metadata object
 * @param {Object} dataSet dicom dataset
 * @returns {Object} specific image frame
 */
export declare const getImageFrame: (metadata: MetaData, dataSet: DataSet) => {
    samplesPerPixel: any;
    photometricInterpretation: any;
    planarConfiguration: any;
    rows: any;
    columns: any;
    bitsAllocated: any;
    pixelRepresentation: any;
    smallestPixelValue: any;
    largestPixelValue: any;
    redPaletteColorLookupTableDescriptor: any;
    greenPaletteColorLookupTableDescriptor: any;
    bluePaletteColorLookupTableDescriptor: any;
    redPaletteColorLookupTableData: any;
    greenPaletteColorLookupTableData: any;
    bluePaletteColorLookupTableData: any;
    pixelData: undefined;
    ImageData: undefined;
};
/**
 * Return the SOP Instance UID of a specific imageId stored in the Larvitar Manager
 * @instance
 * @function getSopInstanceUIDFromLarvitarManager
 * @param {String} larvitarSeriesInstanceUID The Id of the series
 * @param {String} imageId The Id of the image
 * @returns {String} sopInstanceUID
 */
export declare const getSopInstanceUIDFromLarvitarManager: (larvitarSeriesInstanceUID: string, imageId: string) => string | null | undefined;
