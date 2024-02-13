/** @module imaging/imageCustomTags
 *  @desc This file provides customization functionalities on DICOM images' Byte Array
 */
import { Instance, MetaData, Series } from "./types";
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
    sortedTags: {
        [x: string]: Element;
    }[];
    sortedCustomTags: {
        tag: string;
        value: string;
        offset: number;
        index: number;
    }[];
    shiftTotal: number;
};
/**
 * Pre-processes the Byte Array (padding bytes for certain VR are
 * required if correspopnding value is odd)
 * @function preProcessByteArray
 * @param {DataSet} dataSet - customized tags
 * @returns {Series} customized series
 */
export declare const preProcessByteArray: (image: Instance) => void;
/**
 * called when metadata are modified with custom values
 * @function customizeByteArray
 * @param {Series} series - series to customize
 * @param {MetaData} customTags - customized tags
 * @returns {Series} customized series
 */
export declare const customizeByteArray: (series: Series, customTags: MetaData) => Series;
