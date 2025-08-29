/** @module imaging/parsers/ecg
 *  @desc  This file provides functionalities for
 *         handling ECG signales in DICOM files
 */

import { getDataFromImageManager, getImageManager } from "../imageManagers";
import { MetaData } from "../types";

/*
 * This module provides the following functions to be exported:
 * parseECG(dataSet, tag, nSampling)
 */

/**
 * Generate an array of points representing the ECG signal
 * @function parseECG
 * @param {DataSet} seriesId - the series ID to which the ECG data belongs
 * @param {MetaData} metadata - the metadata object containing the ECG signal data
 * @param {Number} nSampling - the sampling rate
 * @returns {void}
 */
export const parseECG = function (
  seriesId: string,
  metadata: MetaData,
  nSampling: number = 2
): void {
  const rawData = metadata["x50003000"];

  let data: Uint8Array;
  //case Qido retrieved Metadata where metadata["x50003000"] is a base64 string
  if (typeof rawData === "string") {
    try {
      data = base64ToUint8Array(rawData);
    } catch (e) {
      console.error("Invalid Base64 ECG data", e);
      return;
    }
  }
  //case parsed Metadata where metadata["x50003000"] is a byteArray retrieved from the DataSet
  else if (rawData instanceof Uint8Array) {
    data = rawData;
  } else {
    console.warn("ECG data is missing or in an unsupported format.");
    return;
  }

  let points: number[] = [];
  const nCountFrom: number = data.length / 2;
  const nCountTo: number = Math.floor(0.5 + nCountFrom / nSampling);
  let values: number[] = [];
  let nFrom: number = 0;
  for (let nTo: number = 0; nTo < nCountTo; nTo++) {
    let v: number = data[nFrom] + 255 * data[nFrom + 1];
    values.push(v);
    nFrom += nSampling * 2;
  }

  const nMax: number = Math.max(...values);
  const nMin: number = Math.min(...values);

  for (let nTo: number = 0; nTo < nCountTo; nTo++) {
    let data: number = ((values[nTo] - nMin) / (nMax - nMin)) * 100;
    points.push(data);
  }
  let series = getDataFromImageManager(seriesId);
  series!.ecgData = points;
};

/**
 * @function base64ToUint8Array - Converts a Base64 encoded string to a Uint8Array.
 * @param {string} base64 - The Base64 encoded string of the ECG signal data.
 * @returns {Uint8Array} - The function assigns the result to a series object managed elsewhere.
 */
const base64ToUint8Array = function (base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};
