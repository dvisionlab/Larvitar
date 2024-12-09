/** @module imaging/parsers/ecg
 *  @desc  This file provides functionalities for
 *         handling ECG signales in DICOM files
 */

import { DataSet, Element } from "dicom-parser";
import { getSeriesDataFromSeriesManager } from "../imageManagers";

/*
 * This module provides the following functions to be exported:
 * parseECG(dataSet, tag, nSampling)
 */

/**
 * Generate an array of points representing the ECG signal
 * @instance
 * @function parseECG
 * @param {DataSet} dataSet - the DICOM dataset
 * @param {String} tag - the tag of the ECG signal
 * @param {Number} nSampling - the sampling rate
 * @returns {void}
 */
export function parseECG(
  seriesId: string,
  dataSet: DataSet,
  tag: string,
  nSampling: number = 2
): void {
  const element: Element = dataSet.elements[tag];
  let data: Uint8Array = dataSet.byteArray.slice(
    element.dataOffset,
    element.dataOffset + element.length
  );
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
  let series = getSeriesDataFromSeriesManager(seriesId);
  series!.ecgData = points;
}
