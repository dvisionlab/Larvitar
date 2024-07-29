import { DataSet, Element } from "dicom-parser";
import type { MetaDataTypes } from "./MetaDataTypes";
/**
 * Parse a DICOM Tag according to its type
 * @instance
 * @function parseTag
 * @param {Object} dataSet - The parsed dataset object from dicom parser
 * @param {String} propertyName - The tag name
 * @param {Object} element - The parsed dataset element
 * @return {String} - The DICOM Tag value
 */
export declare function parseTag<T>(dataSet: DataSet, propertyName: string, //x0000000 string
element: Element): Element | T | undefined;
export declare function getNestedObject(item: Element, nestedArray: MetaDataTypes[]): void;
/**
 * Extract tag value according to its value rapresentation, see
 * {@link http://dicom.nema.org/dicom/2013/output/chtml/part05/sect_6.2.html}
 * @instance
 * @function getTagValue
 * @param {Object} dataSet - the dataset
 * @param {String} tag - the desired tag key
 * @return {Number | Array | String} - the desired tag value
 */
export declare const getTagValue: (dataSet: DataSet, tag: string) => any;
