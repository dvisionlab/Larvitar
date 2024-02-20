import cv from "@techstark/opencv-js";
import { Image } from "cornerstone-core";
/**
 * Allows to map a value to range 0,255 (8bit, png)
 * @name mapToRange
 * @protected
 * @param  {number} value //the greyscale value to convert
 * @param  {number} inMin//The min gs value in the image
 * @param  {number} inMax //The max gs value in the image
 *
 * @returns {void}
 */
export declare function mapToRange(value: number, inMin: number, inMax: number): number;
/**
 * calculates thresholds for watershed
 * @name calculateThresholds
 * @protected
 * @param  {Image} image//current image
 * @param  {number[]} dicomPixelData //current image pixel data
 * @param  {number[][]} circleArray //array of coordinates of selected circle
 * @param  {number} minThreshold //min pixel greyscale value in image
 * @param  {number} maxThreshold //max pixel greyscale value in image
 * @returns {void}
 */
export declare function calculateThresholds(image: Image, dicomPixelData: number[], circleArray: number[][], minThreshold: number, maxThreshold: number): {
    minThreshold: number;
    maxThreshold: number;
    lowerThreshold: number;
    upperThreshold: number;
};
/**
 * eliminates the label that appear less than minappearance
 *@name shiftAndZeroOut
 * @protected
 * @param  {number[]} array The marker array
 * @param  {number} minAppearance The pixelDataArray obtained with dicomimage.getPixeldata()
 * @returns {void}
 */
export declare function shiftAndZeroOut(array: number[], minAppearance: number): number[];
/**
 * pre processes the image before WS
 * @name preProcess
 * @protected
 * @param  {cv.Mat} gray The processed image cv.Mat in greyscale values
 * @param  {cv.Mat} src The image cv.Mat
 * @returns {void}
 */
export declare function preProcess(gray: cv.Mat, src: cv.Mat): any[];
/**
 * Post processes the markers after WS //TODO check errors in drawContours
 * @name postProcess
 * @protected
 * @param  {cv.Mat} markers //The mask array retrieved from WS algorithm
 * @param  {cv.Mat} gray
 * @param  {number[]} markersArray
 * @returns {cv.Mat}
 */
export declare function postProcess(markers: cv.Mat, gray: cv.Mat, markersArray: number[]): number[];
/**
 * Allows to calculate stats such as mean and stddev of the selected circle area
 * @name calculateStats
 * @protected
 * @param  {Image} image //the dicom image
 * @param  {number[]} imagePixelData
 * @param  {number[][]} circleArray //The selected circle coordinates Array
 *
 * @returns {void}
 */
export declare function calculateStats(image: Image, imagePixelData: number[], circleArray: number[][]): {
    mean: number;
    stddev: number;
};
