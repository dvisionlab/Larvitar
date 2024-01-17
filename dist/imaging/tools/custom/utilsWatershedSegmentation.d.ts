/**
 * calculates thresholds for watershed
 *@name calculateThresholds
 * @protected
 * @param  {Image} image//current image
 * @param  {number[][]}circleArray //array of coordinates of selected circle
 * @param  {number[]}dicomPixelData //current image pixel data
 * @returns {void}
 */
export function calculateThresholds(image: new (width?: number | undefined, height?: number | undefined) => HTMLImageElement, dicomPixelData: number[], circleArray: number[][], minThreshold: any, maxThreshold: any): void;
/**
 * Activates a loader in progress when WS is advancing
 *@name _toggleUIVisibility
 * @protected
 * @param  {boolean} showBrush
 * @param  {boolean} showLoader
 * @returns {void}
 */
export function toggleUIVisibility(showBrush: boolean, showLoader: boolean, drawHandlesOnHover: any): void;
/**
 * eliminates the label that appear less than minappearance
 *@name shiftAndZeroOut
 * @protected
 * @param  {Mat} array The marker array
 * @param  {Array} minAppearance The pixelDataArray obtained with dicomimage.getPixeldata()
 * @returns {void}
 */
export function shiftAndZeroOut(array: Mat, minAppearance: any[]): void;
/**
 * eliminates the label that appear less than minappearance
 *@name _shiftAndZeroOut
 * @protected
 * @param  {Mat} array The marker array
 * @param  {Array} minAppearance The pixelDataArray obtained with dicomimage.getPixeldata()
 * @returns {void}
 */
export function preProcess(gray: any, src: any): void;
/**
 * Post processes the markers after WS //TODO check errors in drawContours
 *@name _postProcess
 * @protected
 * @param  {cv.Mat} markers //The mask array retrieved from WS algorithm
 * @returns {cv.Mat}
 */
export function postProcess(markers: cv.Mat): cv.Mat;
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
export function calculateStats(image: new (width?: number | undefined, height?: number | undefined) => HTMLImageElement, imagePixelData: any[], circleArray: any[]): void;
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
export function mapToRange(value: number, inMin: number, inMax: number): void;
export function getMax(arr: any): number;
export function getMin(arr: any): number;
