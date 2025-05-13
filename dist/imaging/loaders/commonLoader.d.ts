/** @module loaders/commonLoader
 *  @desc This file provides functionalities for
 *        custom DICOMImageLoaders
 */
import { DataSet } from "dicom-parser";
import type { MetaData } from "../types";
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
