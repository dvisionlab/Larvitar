/** @module imaging/imageColormaps
 *  @desc  This file provides functionalities for
 *         handling colormaps
 */
/**
 * Fill a canvas with pixelData representing the colormap
 * @instance
 * @function getColormapsList
 * @returns {Array} A list of cornerstone colormaps
 */
export declare function getColormapsList(): {
    id: any;
    key: any;
}[];
/**
 * Add a custom color map to cornerstone list
 * @instance
 * @function addColorMap
 * @param {String} colormapId - the new colormap id
 * @param {String} colormapName - the new colormap name
 * @param {Array} colors - array containing 255 rgb colors (ie [[r,g,b], [r,g,b], ...])
 */
export declare function addColorMap(colormapId: string, colormapName: string, colors: Array<Array<number>>): any;
/**
 * Fill a canvas with pixelData representing the colormap
 * @instance
 * @function fillPixelData
 * @param {HTMLCanvasElement} canvas - target canvas
 * @param {String} colormapId - the colormap name
 */
export declare function fillPixelData(canvas: HTMLCanvasElement, colormapId: string): void;
/**
 * Apply a color map on a viewport
 * @instance
 * @function applyColorMap
 * @param {String} colormapId - the colormap name
 * @param {Array} viewportNames - List of viewports where to apply preset
 */
export declare function applyColorMap(colormapId: string, viewportNames?: Array<string>): any;
/**
 * Converts an HSV  (Hue, Saturation, Value) color to RGB (Red, Green, Blue) color value
 * @param {Number} hue A number representing the hue color value
 * @param {Number} sat A number representing the saturation color value
 * @param {Number} val A number representing the value color value
 * @returns {Number[]} An RGB color array
 */
export declare function HSVToRGB(hue: number, sat: number, val: number): number[];
