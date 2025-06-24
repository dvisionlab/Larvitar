// external libraries
import { Image } from "cornerstone-core";
// declare var cv: any;

// internal libraries
import { getMinMaxPixelValue } from "../../../../imageUtils";

/*
 * This module provides the following functions to be exported:
 *  mapToRange
 *  calculateThresholds
 *  shiftAndZeroOut
 *  preProcess
 *  postProcess
 */

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
export function mapToRange(value: number, inMin: number, inMax: number) {
  return ((value - inMin) / (inMax - inMin)) * 255;
}

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
export function calculateThresholds(
  image: Image,
  dicomPixelData: number[],
  circleArray: number[][],
  minThreshold: number,
  maxThreshold: number
) {
  const { mean, stddev } = calculateStats(image, dicomPixelData, circleArray);
  const { minPixelValue, maxPixelValue } = getMinMaxPixelValue(dicomPixelData);

  minThreshold = minThreshold === null ? minPixelValue : minThreshold;
  maxThreshold = maxThreshold === null ? maxPixelValue : maxThreshold;

  const meanNorm = mapToRange(mean, minThreshold, maxThreshold);
  const stdDevNorm = mapToRange(stddev, minThreshold, maxThreshold);

  let xFactor = 1.7;
  xFactor = xFactor;
  let lowerThreshold = meanNorm - xFactor * stdDevNorm;
  let upperThreshold = meanNorm + xFactor * stdDevNorm;
  return { minThreshold, maxThreshold, lowerThreshold, upperThreshold };
}

/**
 * eliminates the label that appear less than minappearance
 *@name shiftAndZeroOut
 * @protected
 * @param  {number[]} array The marker array
 * @param  {number} minAppearance The pixelDataArray obtained with dicomimage.getPixeldata()
 * @returns {void}
 */
export function shiftAndZeroOut(
  array: number[],
  minAppearance: number
): number[] {
  const shiftMap: Record<number, number> = {};
  let shiftValue = 0;

  const shiftedArray: number[] = array.map((num, index) => {
    const count = (shiftMap[num] = (shiftMap[num] || 0) + 1);
    return count >= minAppearance ? shiftValue++ : -1;
  });

  return shiftedArray;
}

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
export function calculateStats(
  image: Image,
  imagePixelData: number[],
  circleArray: number[][]
) {
  let sum = 0;
  let sumSquaredDiff = 0;

  circleArray.forEach(([x, y]) => {
    const value = imagePixelData[y * image.rows + x];

    sum += value;
    sumSquaredDiff += value * value;
  });

  const count = circleArray.length;

  const mean = sum / count;
  const variance = sumSquaredDiff / count - mean * mean;
  const stddev = Math.sqrt(variance);
  return { mean, stddev };
}

// /**
//  * pre processes the image before WS
//  * @name preProcess
//  * @protected
//  * @param  {cv.Mat} gray The processed image cv.Mat in greyscale values
//  * @param  {cv.Mat} src The image cv.Mat
//  * @returns {void}
//  */
// export function preProcess(gray: cv.Mat, src: cv.Mat) {
//   let contours = new cv.MatVector();
//   cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

//   let hierarchy = new cv.Mat();
//   cv.findContours(
//     gray,
//     contours,
//     hierarchy,
//     cv.RETR_CCOMP,
//     cv.CHAIN_APPROX_SIMPLE
//   );
//   // Create an array of contours
//   let contourArray = new Array(gray.rows * gray.cols).fill(0);

//   for (let i = 0; i < contours.size(); i++) {
//     let currentContour = contours.get(i);

//     // Loop through the matrix to extract coordinates and values
//     for (let row = 0; row < currentContour.rows; row++) {
//       for (let col = 0; col < currentContour.cols; col++) {
//         // Get the pixel value at (row, col) in the current Mat
//         // Check if the pixel is on the contour
//         let isOnContour =
//           cv.pointPolygonTest(currentContour, { x: col, y: row }, true) === 0;

//         // Set the corresponding value in contourArray
//         contourArray[row * gray.cols + col] = isOnContour ? 1 : 0;
//       }
//     }

//     // Release the current Mat object
//     currentContour.delete();
//   }

//   // clean up
//   contours.delete();
//   hierarchy.delete();
//   return contourArray;
// }

// /**
//  * Post processes the markers after WS //TODO check errors in drawContours
//  * @name postProcess
//  * @protected
//  * @param  {cv.Mat} markers //The mask array retrieved from WS algorithm
//  * @param  {cv.Mat} gray
//  * @param  {number[]} markersArray
//  * @returns {cv.Mat}
//  */
// export function postProcess(
//   markers: cv.Mat,
//   gray: cv.Mat,
//   markersArray: number[]
// ) {
//   try {
//     // Apply morphological operations to fill gaps and smooth boundaries
//     let kernel = cv.Mat.ones(5, 5, cv.CV_8U);
//     markers.convertTo(markers, cv.CV_8U);
//     cv.morphologyEx(
//       markers,
//       markers,
//       cv.MORPH_CLOSE,
//       kernel,
//       new cv.Point(-1, -1),
//       1
//     );

//     // Find contours in the markers
//     let contours = new cv.MatVector();
//     let hierarchy = new cv.Mat();
//     cv.findContours(
//       markers,
//       contours,
//       hierarchy,
//       cv.RETR_CCOMP,
//       cv.CHAIN_APPROX_SIMPLE
//     );

//     // Filter contours based on area (adjust the threshold as needed)
//     let minContourArea = 100;
//     let filteredContours = [];
//     for (let i = 0; i < contours.size(); i++) {
//       let contour = contours.get(i);
//       let area = cv.contourArea(contour);

//       // Log the area of each contour

//       if (area > minContourArea) {
//         filteredContours.push(contour);
//       }
//     }

//     let contourArray = new Array(gray.rows * gray.cols).fill(0);

//     for (let i = 0; i < filteredContours.length; i++) {
//       let currentContour = filteredContours[i];

//       // Loop through the matrix to extract coordinates and values
//       for (let row = 0; row < currentContour.rows; row++) {
//         for (let col = 0; col < currentContour.cols; col++) {
//           // Get the pixel value at (row, col) in the current Mat
//           // Check if the pixel is on the contour
//           let isOnContour =
//             cv.pointPolygonTest(currentContour, { x: col, y: row }, true) === 0;

//           // Set the corresponding value in contourArray
//           contourArray[row * gray.cols + col] = isOnContour ? 1 : 0;
//           markersArray[row * gray.cols + col] =
//             contourArray[row * gray.cols + col];
//         }
//       }

//       // Release the current Mat object
//       currentContour.delete();
//     }

//     // Release Mats to free memory
//     kernel.delete();
//     contours.delete();
//     hierarchy.delete();

//     return markersArray;
//   } catch (error) {
//     logger.error("Error in postProcess:", error);
//     throw error; // Rethrow the error to propagate it further if needed
//   }
// }
