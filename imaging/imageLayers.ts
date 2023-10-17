/** @module imaging/imageLayers
 *  @desc This file provides functionalities for
 *        rendering image layers using cornerstone stack
 */

// external libraries
import cornerstone from "cornerstone-core";

// internal libraries
import { isElement } from "./imageUtils";
import { Series } from "./types";

/*
 * This module provides the following functions to be exported:
 * buildLayer(series, tag, options)
 * updateLayer(elementId, layerId, options)
 * getActiveLayer(elementId)
 * setActiveLayer(elementId, layerId)
 */

/**
 * Build the image layers object
 * @function buildLayers
 * @param {Object} series - Cornerstone series object
 * @param {String} tag - Tag for the layer
 * @param {Object} options - layer options {opacity:float, colormap: str}
 * @returns {Object} Cornerstone layer object
 */
export const buildLayer = function (
  series: Series,
  tag: string,
  options: { opacity: number; colormap: string }
) {
  let layer = {
    imageIds: series.imageIds,
    currentImageIdIndex: Math.floor(series.imageIds.length / 2),
    options: {
      name: tag,
      opacity: options?.opacity ? options?.opacity : 1.0,
      visible: true,
      viewport: {
        colormap: options?.colormap ? options?.colormap : "gray",
      },
    },
  };
  return layer;
};

/**
 * Change the options of a layer
 * @instance
 * @function updateLayer
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {string} layer - The layer id
 * @param {Object} options - The new layer's options
 */
export const updateLayer = function (
  elementId: string | HTMLElement,
  layerId: string,
  options: { opacity: number; colormap: string }
) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    console.log("not element");
    return;
  }
  let layer = cornerstone.getLayer(element, layerId);
  if (!layer.options) {
    layer["options"] = {};
  }
  if (!layer.viewport) {
    layer["viewport"] = {};
  }
  layer.options.opacity =
    options.opacity != null ? options.opacity : layer.options.opacity;
  layer.viewport.colormap = options.colormap
    ? options.colormap
    : layer.viewport.colormap;
  cornerstone.updateImage(element);
};

/**
 * Get the active layer
 * @instance
 * @function getActiveLayer
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @returns {Object} layer - The active layer object
 */
export const getActiveLayer = function (elementId: string | HTMLElement) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    console.log("not element");
    return;
  }
  return cornerstone.getActiveLayer(element);
};

/**
 * Set the active layer
 * @instance
 * @function setActiveLayer
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {String} layerId - The id of the layer
 */
export const setActiveLayer = function (
  elementId: string | HTMLElement,
  layerId: string
) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    console.log("not element");
    return;
  }
  cornerstone.setActiveLayer(element, layerId);
};
