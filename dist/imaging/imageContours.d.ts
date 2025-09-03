/** @module imaging/imageContours
 *  @desc This file provides functionalities to render a set of points on a canvas.
 *        Use this in order to render image contours (e.g. from binary masks).
 */
import { Contours } from "./types";
/**
 * Parse raw data to contours object for each viewport
 * @export
 * @function parseContours
 * @param {Array} contoursData - Raw data
 * @param {Number} pointBatchSize - Number of points that defines a contour segment (default to 2)
 * @param {String} segmentationName - Mask object name
 * @param {Array} viewports - Viewport array ids
 * @returns {Number} Number of array elements consumed
 */
export declare const parseContours: (contoursData: {
    [key: string]: Uint8Array;
}, pointBatchSize: number, segmentationName: string, viewports?: Array<string>) => Contours;
