/** @module imaging/parsers/ecg
 *  @desc  This file provides functionalities for
 *         handling ECG signales in DICOM files
 */
import { MetaData } from "../types";
/**
 * Generate an array of points representing the ECG signal
 * @function parseECG
 * @param {DataSet} seriesId - the series ID to which the ECG data belongs
 * @param {MetaData} metadata - the metadata object containing the ECG signal data
 * @param {Number} nSampling - the sampling rate
 * @returns {void}
 */
export declare const parseECG: (seriesId: string, metadata: MetaData, nSampling?: number) => void;
