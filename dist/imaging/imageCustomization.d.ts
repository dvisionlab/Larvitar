/** @module imaging/imageCustomTags
 *  @desc This file provides customization functionalities on DICOM images' Byte Array
 */
import { MetaData, Series } from "./types";
/**
 * called when metadata are modified with custom values
 * @function customizeByteArray
 * @param {Series} series - series to customize
 * @param {MetaData} customTags - customized tags
 * @returns {Series} customized series
 */
export declare const customizeByteArray: (series: Series, customTags: MetaData) => Series;
