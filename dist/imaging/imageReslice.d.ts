/** @module imaging/imageReslice
 *  @desc  This file provides functionalities for
 *         image reslice in orthogonal directions
 */
import { Series } from "./types";
/**
 * Reslice a serie from native orientation to coronal or sagittal orientation
 * @instance
 * @function resliceSeries
 * @param {Object} seriesData the original series data
 * @param {String} orientation the reslice orientation [coronal or sagittal]
 * @returns {Promise} - Return a promise which will resolve when data is available
 */
export declare function resliceSeries(seriesData: Series, orientation: "axial" | "coronal" | "sagittal"): Promise<unknown>;
