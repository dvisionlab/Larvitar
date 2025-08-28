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

  let ecgDataBytes: Uint8Array;
  //case Qido retrieved Metadata where metadata["x50003000"] is a base64 string
  if (typeof rawData === "string") {
    try {
      ecgDataBytes = base64ToUint8Array(rawData);
    } catch (e) {
      console.error("Invalid Base64 ECG data", e);
      return;
    }
  }
  //case parsed Metadata where metadata["x50003000"] is a byteArray retrieved from the DataSet
  else if (rawData instanceof Uint8Array) {
    ecgDataBytes = rawData;
  } else {
    console.warn("ECG data is missing or in an unsupported format.");
    return;
  }

  const fullWaveform = new Uint16Array(
    ecgDataBytes.buffer,
    ecgDataBytes.byteOffset,
    ecgDataBytes.byteLength / 2
  );

  const downsampledValues: number[] = [];
  for (let i = 0; i < fullWaveform.length; i += nSampling) {
    downsampledValues.push(fullWaveform[i]);
  }
  if (downsampledValues.length === 0) {
    return;
  }

  const nMax = Math.max(...downsampledValues);
  const nMin = Math.min(...downsampledValues);
  const range = nMax - nMin || 1;

  const normalizedPoints = downsampledValues.map(
    v => ((v - nMin) / range) * 100
  );

  const series = getDataFromImageManager(seriesId);

  if (series) {
    series.ecgData = normalizedPoints;
  }
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
