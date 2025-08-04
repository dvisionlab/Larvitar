/** @module loaders/commonLoader
 *  @desc This file provides functionalities for
 *        custom DICOMImageLoaders
 */
import { DataSet } from "dicom-parser";
import type { ImageFrame, MetaData } from "../types";
/**
 * Compute and return image frame
 * @instance
 * @function getImageFrame
 * @param {MetaData} metadata metadata object
 * @param {DataSet} dataSet dicom dataset
 * @returns {Object} specific image frame
 */
export declare const getImageFrame: (metadata: MetaData, dataSet?: DataSet) => ImageFrame;
