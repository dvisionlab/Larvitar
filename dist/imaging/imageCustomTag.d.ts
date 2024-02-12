import { MetaData, Series } from "./types";
import { DataSet } from "dicom-parser";
/**
 * provides sorted original tags, modifies bytearray tags fpor certain VRs
 * (padding if odd value) and sorts new customtags
 * @function sortAndBuildByteArray
 * @param {DataSet} dataSet - dataset original image
 * @param {MetaData} customTags - customized tags
 * @returns {Series} customized series
 */
export declare const sortAndBuildByteArray: (dataSet: DataSet, customTags: MetaData) => {
    sortedTags: {
        [x: string]: import("dicom-parser").Element;
    }[];
    sortedCustomTags: {
        tag: string;
        value: any;
        offset: number;
        index: number;
    }[];
    shiftTotal: number;
};
/**
 * called when metadata are modified with custom values
 * @function customizeByteArray
 * @param {Series} series - series to customize
 * @param {MetaData} customTags - customized tags
 * @returns {Series} customized series
 */
export declare const customizeByteArray: (series: Series, customTags: MetaData) => Series;
