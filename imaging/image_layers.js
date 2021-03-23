/** @module imaging/layers
 *  @desc This file provides functionalities for
 *        rendering image layers using cornerstone stack
 */

// external libraries
import cornerstone from "cornerstone-core";
import { each } from "lodash";

// global module variables
/**
 * Main layer name
 * @var {String} mainLayer
 */
var mainLayer;

/*
 * This module provides the following functions to be exported:
 * loadImageLayers(mainSeries, mainSeriesName, maskSeries, maskSeriesName, elementId)
 * changeOpacityLayer(elementId, layerName, opacity)
 * updateImageLayer(mainSeries, mainSeriesName, maskSeries, element, imageIndexß)
 * getMainLayer()
 */

/**
 * Load an cache image layers and render it in a html div using cornerstone
 * @instance
 * @function loadImageLayers
 * @param {Object} mainSeries - Cornerstone series object
 * @param {String} mainSeriesName - Tag for main series
 * @param {Object} maskSeries - Cornerstone series object
 * @param {String} mainSeriesName - Tag for mask series
 * @param {String} elementId - target HTML element id
 */
export const loadImageLayers = function (
  mainSeries,
  mainSeriesName,
  maskSeries,
  maskSeriesName,
  elementId
) {
  let element = document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  cornerstone.enable(element);
  const layers = buildLayers(
    mainSeries,
    mainSeriesName,
    maskSeries,
    maskSeriesName
  );
  loadLayers(element, layers);
  setTimeout(function () {
    updateImageLayer(
      mainSeries,
      maskSeries,
      element,
      Math.floor(mainSeries.imageIds.length / 2)
    );
  }, 0);
};

/**
 * Change the opacity of a layer
 * @instance
 * @function changeOpacityLayer
 * @param {String} elementId - Target HTML element id
 * @param {String} layerName - Target layer name
 * @param {Number} opacity - New opacity value [0-1]
 */
export const changeOpacityLayer = function (elementId, layerName, opacity) {
  let element = document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let layers = cornerstone.getLayers(element);
  if (!layers) {
    console.error("Invalid layers in active element: " + elementId);
    return;
  }
  let activeLayerId;
  each(layers, function (layer) {
    if (layer.options.name == layerName) {
      layer.options.opacity = opacity;
    } else {
      activeLayerId = layer.layerId;
    }
  });
  cornerstone.updateImage(element);
  cornerstone.setActiveLayer(element, activeLayerId);
};

/**
 * Update the cornerstone image with new imageIndex
 * @instance
 * @function updateImageLayer
 * @param {Object} mainSeries - Cornerstone series object
 * @param {String} mainSeriesName - Tag for main series
 * @param {Object} maskSeries - Cornerstone series object
 * @param {HTMLElement} element - Target html element
 * @param {Number} imageIndex - index of the image to load
 */
export const updateImageLayer = function (
  mainSeries,
  mainSeriesName,
  maskSeries,
  element,
  imageIndex
) {
  let layers = cornerstone.getLayers(element);
  if (!layers) {
    console.error("Invalid layers in active element");
    return;
  }
  each(layers, function (layer) {
    let series = layer.options.name == mainSeriesName ? mainSeries : maskSeries;
    cornerstone
      .loadImage(series.imageIds[imageIndex - 1])
      .then(function (image) {
        cornerstone.setActiveLayer(element, layer.layerId);
        cornerstone.displayImage(element, image);
      });
  });
};

/**
 * Export main layer name
 * @instance
 * @function getMainLayer
 * @returns {String} Name of the main layer
 */
export const getMainLayer = function () {
  return mainLayer;
};

/* Internal module functions */

/**
 * Build the image layers object
 * @inner
 * @function buildLayers
 * @param {Object} mainSeries - Cornerstone series object
 * @param {String} mainSeriesName - Name of the main layer
 * @param {Object} maskSeries - Cornerstone series object
 * @param {String} maskSeriesName - Name of the mask layer
 * @returns {Object} Cornerstone layers object
 */
let buildLayers = function (
  mainSeries,
  mainSeriesName,
  maskSeries,
  maskSeriesName
) {
  const layers = [
    {
      imageIds: mainSeries.imageIds,
      currentImageIdIndex: Math.floor(mainSeries.imageIds.length / 2),
      options: {
        name: mainSeriesName
      }
    },
    {
      imageIds: maskSeries.imageIds,
      currentImageIdIndex: Math.floor(maskSeries.imageIds.length / 2),
      options: {
        name: maskSeriesName,
        opacity: 0.2,
        viewport: {
          colormap: "copper"
        }
      }
    }
  ];
  mainLayer = mainSeriesName;
  return layers;
};

/**
 * Load cache and render image layers
 * @inner
 * @function loadLayers
 * @param {HTMLElement} element - Target HTML element
 * @param {Object} layers - Cornerstone layers object
 */
let loadLayers = function (element, layers) {
  each(layers, function (layer) {
    let imageIndex = Math.floor(layer.imageIds.length / 2);
    let currentImageId = layer.imageIds[imageIndex];
    each(layer.imageIds, function (imageId) {
      cornerstone.loadAndCacheImage(imageId).then(function (image) {
        if (currentImageId == imageId) {
          cornerstone.displayImage(element, image);
          cornerstone.addLayer(element, image, layer.options);
          let viewport = cornerstone.getViewport(element);
          if (layer.options.name == "MRI") {
            viewport.voi.windowWidth = image.windowWidth;
            viewport.voi.windowCenter = image.windowCenter;
          }
        }
      });
    });
  });
};
