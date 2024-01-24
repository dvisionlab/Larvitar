import cv from "@techstark/opencv-js";
import { Image } from "cornerstone-core";
/**
 * calculates thresholds for watershed
 *@name calculateThresholds
 * @protected
 * @param  {Image} image//current image
 * @param  {number[][]}circleArray //array of coordinates of selected circle
 * @param  {number[]}dicomPixelData //current image pixel data
 * @returns {void}
 */
export declare function calculateThresholds(image: Image, dicomPixelData: number[], circleArray: number[][], minThreshold: number, maxThreshold: number): {
    minThreshold: number;
    maxThreshold: number;
    lowerThreshold: number;
    upperThreshold: number;
};
/**
 * Activates a loader in progress when WS is advancing
 *@name _toggleUIVisibility
 * @protected
 * @param  {boolean} showBrush
 * @param  {boolean} showLoader
 * @returns {void}
 */
export declare function toggleUIVisibility(showBrush: boolean, showLoader: boolean, drawHandlesOnHover: boolean): void;
/**
 * eliminates the label that appear less than minappearance
 *@name shiftAndZeroOut
 * @protected
 * @param  {Mat} array The marker array
 * @param  {Array} minAppearance The pixelDataArray obtained with dicomimage.getPixeldata()
 * @returns {void}
 */
export declare function shiftAndZeroOut(array: number[], minAppearance: number): number[];
/**
 * eliminates the label that appear less than minappearance
 *@name _shiftAndZeroOut
 * @protected
 * @param  {Mat} array The marker array
 * @param  {Array} minAppearance The pixelDataArray obtained with dicomimage.getPixeldata()
 * @returns {void}
 */
export declare function preProcess(gray: cv.Mat, src: cv.Mat): any[];
/**
 * Post processes the markers after WS //TODO check errors in drawContours
 *@name _postProcess
 * @protected
 * @param  {cv.Mat} markers //The mask array retrieved from WS algorithm
 * @returns {cv.Mat}
 */
export declare function postProcess(markers: cv.Mat, gray: cv.Mat, markersArray: number[]): number[];
/**
 * Allows to calculate stats such as mean and stddev of the selected circle area
 *@name  _calculateStats
 * @protected
 * @param  {Image} image //the dicom image
 * @param  {Array} imagePixelData
 * @param  {Array} circleArray //The selected circle coordinates Array
 *
 * @returns {void}
 */
export declare function calculateStats(image: Image, imagePixelData: number[], circleArray: number[][]): {
    mean: number;
    stddev: number;
};
/**
 * Allows to map a value to range 0,255 (8bit, png)
 *@name  mapToRange
 * @protected
 * @param  {number} value //the greyscale value to convert
 * @param  {number} inMin//The min gs value in the image
 * @param  {number} inMax //The max gs value in the image
 *
 * @returns {void}
 */
export declare function mapToRange(value: number, inMin: number, inMax: number): number;
export declare function getMax(arr: number[]): number;
export declare function getMin(arr: number[]): number;
