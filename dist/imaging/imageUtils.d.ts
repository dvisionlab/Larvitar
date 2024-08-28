/** @module imaging/imageUtils
 *  @desc This file provides utility functions for
 *        manipulating image pixels and image metadata
 */
import type { CustomDataSet, MetaData, ReslicedInstance, Series } from "./types";
import { MetaDataTypes } from "./MetaDataTypes";
/**
 * @typedef {Object} CornerstoneSeries
 * @property {Array} imageIds Array of the instances imageIds
 * @property {Array} instances Array of instances
 * @property {Number} currentImageIndex Currently loaded image id index in the imageIds array
 */
/**
 * Return computed 3D normal from two 3D vectors
 * @instance
 * @function getNormalOrientation
 * @param {Array} el - The image_orientation dicom tag
 */
export declare const getNormalOrientation: (el: [number, number, number, number, number, number]) => number[];
/**
 * Get the min pixel value from pixelData
 * @instance
 * @function getMinPixelValue
 * @param {Array} pixelData - Pixel data array
 */
export declare const getMinPixelValue: (pixelData: number[]) => number;
/**
 * Get the max pixel value from pixelData
 * @instance
 * @function getMaxPixelValue
 * @param {Array} pixelData - Pixel data array
 */
export declare const getMaxPixelValue: (pixelData: number[]) => number;
/**
 * Create the pixel representation string (type and length) from dicom tags
 * @instance
 * @function getPixelRepresentation
 * @param {Object} dataSet - The dataset
 * @returns {String} The pixel representation in the form Sint / Uint + bytelength
 */
export declare const getPixelRepresentation: (dataSet: CustomDataSet) => string;
/**
 * Get a typed array from a representation type
 * @instance
 * @function getTypedArrayFromDataType
 * @param {Object} dataType - The data type
 * @returns {TypedArray} The typed array
 */
export declare const getTypedArrayFromDataType: (dataType: string) => Uint8ArrayConstructor | Uint16ArrayConstructor | Float32ArrayConstructor | Int8ArrayConstructor | Int16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Float64ArrayConstructor | null;
/**
 * Sort the array of images ids of a series trying with:
 * - content time order, if the series has cardiacNumberOfImages tag > 1
 * - position order, if series has needed patient position tags
 * - instance order, if series has instance numbers tags
 * The priority of the method depends on the instanceSortPriority value
 * @instance
 * @function getSortedStack
 * @param {Object} seriesData - The dataset
 * @param {Array} sortPriorities - An array which represents the priority tasks
 * @param {Bool} returnSuccessMethod - Boolean for returning the success method
 * @return {Object} The sorted stack
 */
export declare const getSortedStack: (seriesData: Series, sortPriorities: Array<"imagePosition" | "contentTime" | "instanceNumber">, returnSuccessMethod: boolean) => string[];
/**
 * Sort the array of instanceUIDs according to imageIds sorted using sortSeriesStack
 * @instance
 * @function getSortedUIDs
 * @param {Object} seriesData - The dataset
 * @return {Object} The sorted instanceUIDs
 */
export declare const getSortedUIDs: (seriesData: Series) => {
    [key: string]: string;
};
/**
 * Generate a randomUUID in the form 'uy0x2qz9jk9co642cjfus'
 * @instance
 * @function randomId
 * @return {String} - Random uid
 */
export declare const randomId: () => string;
/**
 * Get the mean value of a specified dicom tag in a serie
 * @instance
 * @function getMeanValue
 * @param {Object} series - The cornerstone series object
 * @param {Object} tag - The target tag key
 * @param {Bool} isArray - True if tag value is an array
 * @return {Number} - Tag mean value
 */
export declare const getMeanValue: (series: Series, tag: keyof MetaData, isArray: boolean) => number | number[];
/**
 * Compute resliced metadata from a cornerstone data structure
 * @instance
 * @function getReslicedMetadata
 * @param {String} reslicedSeriesId - The id of the resliced serie
 * @param {String} fromOrientation - Source orientation (eg axial, coronal or sagittal)
 * @param {String} toOrientation - Target orientation (eg axial, coronal or sagittal)
 * @param {Object} seriesData - The original series data
 * @param {String} imageLoaderName - The registered loader name
 * @return {Object} - Cornerstone series object, filled only with metadata
 */
export declare const getReslicedMetadata: (reslicedSeriesId: string, fromOrientation: "axial" | "coronal" | "sagittal", toOrientation: "axial" | "coronal" | "sagittal", seriesData: Series, imageLoaderName: string) => {
    imageIds: string[];
    instances: {
        [key: string]: ReslicedInstance;
    };
    currentImageIdIndex: number;
};
/**
 * Compute cmpr metadata from pyCmpr data (generated using Scyther {@link https://github.com/dvisionlab/Scyther})
 * @instance
 * @function getCmprMetadata
 * @param {String} reslicedSeriesId - The id of the resliced serie
 * @param {String} imageLoaderName - The registered loader name
 * @param {Object} header - The header of the resliced serie from Scyther
 * @return {Object} - Cornerstone series object, filled only with metadata
 */
export declare const getCmprMetadata: (reslicedSeriesId: string, imageLoaderName: string, header: any) => {
    imageIds: string[];
    instances: {
        [key: string]: ReslicedInstance;
    };
};
/**
 * Get pixel data for a single resliced slice, from cornerstone data structure
 * @instance
 * @function getReslicedPixeldata
 * @param {String} imageId - The id of the resulting image
 * @param {Object} originalData - The original series data (source)
 * @param {Object} reslicedData - The resliced series data (target)
 * @return {Object} - A single resliced slice pixel array
 */
export declare const getReslicedPixeldata: (imageId: string, originalData: Series, reslicedData: Series) => Uint8Array | Float64Array | Int8Array | Uint16Array | Int16Array | Int32Array | Uint32Array | Float32Array;
/**
 * Get distance between two slices
 * @instance
 * @function getDistanceBetweenSlices
 * @param {Object} seriesData - The series data
 * @param {Number} sliceIndex1 - The first slice index
 * @param {Number} sliceIndex2 - The second slice index
 * @return {Number} - The distance value
 */
export declare const getDistanceBetweenSlices: (seriesData: Series, sliceIndex1: number, sliceIndex2: number) => number | undefined;
/**
 * @instance
 * @function getImageMetadata
 * @param {String} seriesId - The seriesUID
 * @param {String} instanceUID - The SOPInstanceUID
 * @param {number} frameId - Optional FrameId
 * @return {Array} - List of metadata objects: tag, name and value
 */
export declare const getImageMetadata: (seriesId: string, instanceUID: string, frameId?: number) => ({
    tag: string;
    name: string;
    value: string | number | number[] | MetaDataTypes[] | null | undefined;
} | undefined)[];
/**
 * Check if a div tag is a valid DOM HTMLElement
 * @instance
 * @function isElement
 * @param {Object} o - The div tag
 * @return {Boolean} - True if is an element otherwise returns False
 */
export declare const isElement: (o: any) => any;
