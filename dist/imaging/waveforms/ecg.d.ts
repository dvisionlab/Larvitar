/** @module waveforms/ecg
 *  @desc This file provides utility functions for
 *        rendering ecg waveforms using plotly.js
 */
import Plotly from "plotly.js-dist-min";
/**
 * Render ECG waveform in a div
 * @instance
 * @function renderECG
 * @param {number[]} data - ECG waveform data
 * @param {string} divId - DivId to render waveform in
 * @param {string} colorMarker - Color of the marker
 * @param {number} numberOfframes - Number of frames in the image
 * @param {number} frameTime - Time interval of each frame in the image
 * @param {number} frameId - FrameId of the image to be rendered
 * @returns {Object} trace_data - Plotly trace data
 */
export declare const renderECG: (data: number[], divId: string, colorMarker: string, numberOfFrames: number, frameTime: number, frameId?: number) => Partial<Plotly.PlotData>[];
/**
 * Sync ECG waveform with rendered image on click
 * @instance
 * @function syncECGFrame
 * @param {Object} trace_data - Plotly trace data
 * @param {string} seriesId - SeriesId of the image
 * @param {string} canvasId - CanvasId of the image
 * @param {number} numberOfFrames - Number of frames in the image
 * @param {string} divId - DivId to render waveform in
 */
export declare const syncECGFrame: (trace_data: Partial<Plotly.PlotData>[], seriesId: string, canvasId: string, numberOfFrames: number, divId: string) => void;
/**
 * Sync ECG waveform with rendered image on click
 * @instance
 * @function updateECGFrame
 * @param {Object} trace_data - Plotly trace data
 * @param {number} frameId - FrameId of the image
 * @param {number} numberOfFrames - Number of frames in the image
 * @param {string} divId - DivId to render waveform in
 */
export declare const updateECGFrame: (trace_data: Partial<Plotly.PlotData>[], frameId: number, numberOfFrames: number, divId: string) => void;
