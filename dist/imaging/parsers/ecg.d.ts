/** @module imaging/parsers/ecg
 *  @desc  This file provides functionalities for
 *         handling ECG signales in DICOM files
 */
import { DataSet } from "dicom-parser";
/**
 * Generate an array of points representing the ECG signal
 * @instance
 * @function parseECG
 * @param {DataSet} dataSet - the DICOM dataset
 * @param {String} tag - the tag of the ECG signal
 * @param {Number} nSampling - the sampling rate
 * @returns {void}
 */
export declare function parseECG(seriesId: string, dataSet: DataSet, tag: string, nSampling?: number): void;
