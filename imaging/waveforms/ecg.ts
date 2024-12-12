/** @module waveforms/ecg
 *  @desc This file provides utility functions for
 *        rendering ecg waveforms using plotly.js
 */

// external libraries
import Plotly, { Datum } from "plotly.js-dist-min";

// internal libraries
import { NrrdSeries, Series } from "../types";
import { updateImage } from "../imageRendering";
import store from "../imageStore";
import { getDataFromImageManager } from "../imageManagers";
import { updateStackToolState } from "../imageTools";

/*
 * This module provides the following functions to be exported:
 * getDefaultECGLayout()
 * renderECG(data, divId, colorMarker, numberOfFrames, frameTime, frameId)
 * unrenderECG(divId)
 * syncECGFrame(traceData, seriesId, canvasId, numberOfFrames, divId)
 * updateECGFrame(traceData, frameId, numberOfFrames, divId)
 */

const DEFAULT_ECG_LAYOUT: Partial<Plotly.Layout> = {
  xaxis: {
    rangemode: "tozero",
    showgrid: true,
    gridcolor: "rgba(238,135,51,0.5)",
    dtick: 1,
    tickwidth: 2,
    tickcolor: "#f5f5f5",
    tickformat: ".2f",
    tickfont: {
      color: "#f5f5f5"
    }
  },
  yaxis: {
    rangemode: "nonnegative",
    showgrid: true,
    gridcolor: "rgba(238,135,51,0.5)",
    dtick: 20,
    tick0: 0,
    tickwidth: 2,
    tickcolor: "#f5f5f5",
    tickfont: {
      color: "#f5f5f5"
    }
  },
  showlegend: false,
  paper_bgcolor: "#000000",
  plot_bgcolor: "#000000",
  margin: {
    l: 80,
    r: 80,
    b: 50,
    t: 10,
    pad: 0
  }
};

/**
 * Get default layout for the plotly plot
 * @instance
 * @function getDefaultECGLayout
 * @returns {Object} defaultECGLayout - Default layout for the plotly plot
 */
export const getDefaultECGLayout = function (): Partial<Plotly.Layout> {
  return DEFAULT_ECG_LAYOUT;
};

/**
 * Unrender ECG waveform previously rendered in a div
 * @instance
 * @function unrenderECG
 * @param {string} divId - DivId where waveform is rendered
 */
export const unrenderECG = function (divId: string) {
  Plotly.purge(divId);
};

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
 * @param {Object} customLayout - Custom layout for the plotly plot
 * @returns {Object} traceData - Plotly trace data
 */
export const renderECG = function (
  data: number[],
  divId: string,
  colorMarker: string,
  numberOfFrames: number,
  frameTime: number,
  frameId: number,
  customLayout?: Partial<Plotly.Layout>
): Partial<Plotly.PlotData>[] {
  // convert info using frameTime and numberOfFrames
  const totalTime = (numberOfFrames - 1) * (frameTime * 1e-3);
  const dotX: number = Math.floor((frameId * data.length) / numberOfFrames);
  // build the trace data
  const trace: Partial<Plotly.PlotData> = {
    x: data.map((_, i) => (i * totalTime) / data.length),
    y: data,
    mode: "lines",
    type: "scatter",
    line: {
      width: 1.5,
      shape: "linear"
    }
  };

  // build the marker data
  const marker: Partial<Plotly.PlotData> = {
    x: [dotX],
    y: [data[dotX]],
    mode: "markers",
    type: "scatter",
    marker: {
      size: 12,
      color: colorMarker,
      symbol: "line-ns-open",
      line: {
        width: 3
      }
    }
  };
  // render data and update ranges
  const traceData: Partial<Plotly.PlotData>[] = [trace, marker];
  let LAYOUT: Partial<Plotly.Layout> = customLayout
    ? customLayout
    : DEFAULT_ECG_LAYOUT;
  // fix the range of the x-axis
  LAYOUT.xaxis!.range = [0, totalTime];
  // fix the grid of x-axis using a line for each frame
  LAYOUT.xaxis!.dtick = totalTime / (numberOfFrames - 1);
  Plotly.newPlot(divId, traceData, LAYOUT, {
    responsive: true,
    displayModeBar: false
  });
  return traceData;
};

/**
 * Sync ECG waveform with rendered image on click
 * @instance
 * @function syncECGFrame
 * @param {Object} traceData - Plotly trace data
 * @param {string} seriesId - SeriesId of the image
 * @param {string} canvasId - CanvasId of the image
 * @param {number} numberOfFrames - Number of frames in the image
 * @param {string} divId - DivId to render waveform in
 */
export const syncECGFrame = function (
  traceData: Partial<Plotly.PlotData>[],
  seriesId: string,
  canvasId: string,
  numberOfFrames: number,
  divId: string
) {
  // document.getElementById('myDiv') return HTMLElement. This type doesn't
  // contain method 'on' because this method is added within plotly-latest.min.js.
  const domElement: any = document.getElementById(divId);
  if (domElement) {
    domElement.on("plotly_click", function (data: Plotly.PlotMouseEvent) {
      traceData[1].x = [data.points[0].x];
      traceData[1].y = [data.points[0].y];
      Plotly.extendTraces(divId, {}, [0]);
      const totalTime: number = (traceData[0].x as number[])[
        (traceData[0].x as number[]).length - 1
      ];
      const frameId: number = Math.floor(
        ((data.points[0].x as number) * numberOfFrames - 1) / totalTime
      );
      const series: Series | NrrdSeries | null =
        getDataFromImageManager(seriesId);
      if (series) {
        updateImage(series as Series, canvasId, frameId, false);
        updateStackToolState(canvasId, frameId);
      }
    });
  }

  const canvasElement: any = document.getElementById(canvasId);
  canvasElement.addEventListener("wheel", function (e: WheelEvent) {
    const viewport = store.get(["viewports", canvasId]);
    updateECGMarker(traceData, viewport.sliceId, numberOfFrames, divId);
    updateStackToolState(canvasId, viewport.sliceId);
  });
};

/**
 * Update the ECG waveform on the plot according to new frame time
 * @instance
 * @function updateECGTotalTime
 * @param {Object} traceData - Plotly trace data
 * @param {number} frameId - FrameId of the image
 * @param {number} numberOfFrames - Number of frames in the image
 * @param {string} frameTime - Time interval of each frame in the image
 * @param {string} divId - DivId to render waveform in
 */
export const updateECGTotalTime = function (
  traceData: Partial<Plotly.PlotData>[],
  frameId: number,
  numberOfFrames: number,
  frameTime: number,
  divId: string
) {
  const totalTime = (numberOfFrames - 1) * (frameTime * 1e-3);

  // update the x-axis range and dtick
  const update: Partial<Plotly.Layout> = {
    xaxis: {
      range: [0, totalTime],
      dtick: totalTime / (numberOfFrames - 1),
      rangemode: "tozero",
      showgrid: true,
      gridcolor: "rgba(238,135,51,0.5)",
      tickwidth: 2,
      tickcolor: "#f5f5f5",
      tickformat: ".2f",
      tickfont: {
        color: "#f5f5f5"
      }
    }
  };
  Plotly.relayout(divId, update);

  // @ts-ignore
  traceData[0].x = traceData[0].x!.map(
    (_, i) => (i * totalTime) / traceData[0].x!.length
  );

  const dotX: number = (frameId * totalTime) / (numberOfFrames - 1);
  const index: number = (traceData[0].x as number[]).findIndex(
    (x: number) => x >= dotX
  );
  const dotY: Datum | Datum[] = traceData[0].y![index];
  traceData[1].x = [dotX];
  traceData[1].y = Array.isArray(dotY) ? dotY : [dotY];
  Plotly.extendTraces(divId, {}, [0]);
};

/**
 * Update the ECG waveform dot on the plot
 * @instance
 * @function updateECGMarker
 * @param {Object} traceData - Plotly trace data
 * @param {number} frameId - FrameId of the image
 * @param {number} numberOfFrames - Number of frames in the image
 * @param {string} divId - DivId to render waveform in
 */
export const updateECGMarker = function (
  traceData: Partial<Plotly.PlotData>[],
  frameId: number,
  numberOfFrames: number,
  divId: string
) {
  const totalTime: number = (traceData[0].x as number[])[
    (traceData[0].x as number[]).length - 1
  ];
  const dotX: number = (frameId * totalTime) / (numberOfFrames - 1);
  const index: number = (traceData[0].x as number[]).findIndex(
    (x: number) => x >= dotX
  );
  const dotY: Datum | Datum[] = traceData[0].y![index];
  traceData[1].x = [dotX];
  traceData[1].y = Array.isArray(dotY) ? dotY : [dotY];

  // !! Plotly.animate does not work with "scattegl" trace type
  // @ts-ignore Plotly.animate is not in the types
  Plotly.animate(
    divId,
    {
      data: [{ y: traceData[1].y }], // Updated marker data
      traces: [1] // Index of marker trace
    },
    {
      transition: {
        duration: totalTime / (numberOfFrames - 1) // Must be <= frame duration
      },
      frame: {
        duration: totalTime / (numberOfFrames - 1), // Frame duration
        redraw: false // Redraw the plot, keep this false if you don't need a full redraw
      }
    }
  );
};
