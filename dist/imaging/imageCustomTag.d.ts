/** @module imaging/imageCustomTags
 *  @desc This file provides customization functionalities on DICOM images' Byte Array
 */
import { Instance, MetaData, Series, tags, customTags } from "./types";
import { DataSet } from "dicom-parser";
import { Element } from "dicom-parser";
/**
 * provides sorted original tags and sorted new customtags
 * @function sortAndBuildByteArray
 * @param {DataSet} dataSet - dataset original image
 * @param {MetaData} customTags - customized tags
 * @returns {Series} customized series
 */
export declare const sortTags: (dataSet: DataSet, customTags: MetaData) => {
    sortedTags: tags;
    sortedCustomTags: customTags;
    shiftTotal: number;
};
/**
 * Pre-processes the tag
 * @function preProcessByteArray
 * @param {string | number | number[]} metadata
 *  @param {Instance} image
 *  @param {Element} element
 * @returns {void}
 */
export declare const preProcessTag: (metadata: string | number | number[], image: Instance, element: Element) => void;
/**
 * Pre-processes the Byte Array (padding bytes for certain VR are
 * required if corresponding value is odd)
 * @function preProcessByteArray
 * @param {DataSet} dataSet - customized tags
 * @returns {Series} customized series
 */
export declare const preProcessByteArray: (image: Instance) => void;
/**
 * changes all tags offsets accordingly
 * @function changeOffsets
 * @param {Instance} image
 * @param {number} start -  start tag index to be modified
 * @param {number} end- end tag index to be modified
 * @param {tags}  sortedTags
 * @param {number}  shift - customized tags
 * @returns {Series} customized series
 */
export declare const changeOffsets: (image: Instance, start: number, end: number, sortedTags: tags, shift: number) => void;
/**
 * called when metadata are modified with custom values
 * @function customizeByteArray
 * @param {Series} series - series to customize
 * @param {MetaData} customTags - customized tags
 * @returns {Series} customized series
 */
export declare const customizeByteArray: (series: Series, customTags: MetaData) => Series;
