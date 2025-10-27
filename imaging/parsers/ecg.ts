/** @module imaging/parsers/ecg
 *  @desc  This file provides functionalities for
 *         handling ECG signales in DICOM files
 */

import { logger } from "../../logger";
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

  if (!rawData) {
    logger.warn("ECG data (tag x50003000) is missing.");
    return;
  }

  let waveform: Uint16Array;

  try {
    if (typeof rawData === "string") {
      const byteArray = base64ToUint8Array(rawData);
      waveform = new Uint16Array(byteArray.buffer);
    } else if (rawData instanceof Uint16Array) {
      waveform = rawData;
    } else if (rawData instanceof Uint8Array) {
      waveform = new Uint16Array(
        rawData.buffer,
        rawData.byteOffset,
        rawData.length / 2
      );
    } else {
      logger.warn("ECG data is in an unsupported format:", typeof rawData);
      return;
    }
  } catch (e) {
    logger.error("Failed to parse ECG data.", e);
    return;
  }

  const sampledValues: number[] = [];
  for (let i = 0; i < waveform.length; i += nSampling) {
    sampledValues.push(waveform[i]);
  }

  if (sampledValues.length === 0) {
    return;
  }

  const nMin = Math.min(...sampledValues);
  const nMax = Math.max(...sampledValues);
  const range = nMax - nMin;

  const points =
    range === 0
      ? new Array(sampledValues.length).fill(0)
      : sampledValues.map(value => ((value - nMin) / range) * 100);

  const series = getDataFromImageManager(seriesId);
  if (series) {
    series.ecgData = points;
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
