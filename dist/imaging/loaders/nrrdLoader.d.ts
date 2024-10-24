/** @module loaders/nrrdLoader
 *  @desc This file provides functionalities for
 *        custom NRRD Loader
 */
import { ImageLoader } from "cornerstone-core";
import type { NrrdHeader, NrrdInputVolume, NrrdSeries } from "../types";
/**
 * Build the data structure for the provided image orientation
 * @instance
 * @function buildNrrdImage
 * @param {Object} volume The volume object
 * @param {String} seriesId The Id of the series
 * @param {Object} custom_header A custom header object
 * @return {Object} volume data
 */
export declare const buildNrrdImage: (volume: NrrdInputVolume, seriesId: string, custom_header: NrrdHeader) => Partial<NrrdSeries>;
/**
 * Get the custom imageId from custom loader
 * @instance
 * @function getNrrdImageId
 * @param {String} customLoaderName The custom loader name
 * @return {String} the custom image id
 */
export declare const getNrrdImageId: (customLoaderName: string) => string;
/**
 * Custom cornerstone image loader for nrrd files
 * @instance
 * @function loadNrrdImage
 * @param {String} imageId The image id
 * @return {Object} custom image object
 */
export declare const loadNrrdImage: ImageLoader;
/**
 * Retrieve imageId for a slice in the given orientation
 * @instance
 * @function getImageIdFromSlice
 * @param {Integer} sliceNumber The image slice number
 * @param {String} orientation The orientation tag
 * @param {String} seriesId The series id
 * @return {String} image id
 */
export declare const getImageIdFromSlice: (sliceNumber: number, orientation: string, seriesId: string) => string;
/**
 * Retrieve slice number for a the given orientation
 * @instance
 * @function getSliceNumberFromImageId
 * @param {String} imageId The image slice id
 * @param {String} orientation The orientation tag
 * @param {String} seriesId The series id
 * @return {Integer} The image slice number
 */
export declare const getSliceNumberFromImageId: (imageId: string, orientation: string) => number;
/**
 * Get series dimension for each view
 * @instance
 * @function getNrrdSerieDimensions
 * @return {Object} Series dimension for each view
 */
export declare const getNrrdSerieDimensions: () => {
    axial: number[];
    coronal: number[];
    sagittal: number[];
};
