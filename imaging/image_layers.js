// external libraries
import cornerstone from "cornerstone";
import { each } from "lodash";

// internal libraries
import { enableMouseHandlers } from "./image_rendering.js";

// global module variables

/*
 * This module provides the following functions to be exported:
 * loadImageLayers(mainSeries, mainSeriesName, maskSeries, maskSeriesName, elementId)
 * changeOpacityLayer(elementId, layerName, opacity)
 * updateImageLayer(mainSeries, mainSeriesName, maskSeries, element, imageIndexß)
 */

// ------------------------------------------------------------------------
// Load an cache image layers and render it in a html div using cornerstone
// ------------------------------------------------------------------------
export const loadImageLayers = function(
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
  setTimeout(function() {
    updateImageLayer(
      mainSeries,
      maskSeries,
      element,
      Math.floor(mainSeries.imageIds.length / 2)
    );
  }, 0);
};

// -----------------------------
// Change the opacity of a layer
// -----------------------------
export const changeOpacityLayer = function(elementId, layerName, opacity) {
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
  each(layers, function(layer) {
    if (layer.options.name == layerName) {
      layer.options.opacity = opacity;
    } else {
      activeLayerId = layer.layerId;
    }
  });
  cornerstone.updateImage(element);
  cornerstone.setActiveLayer(element, activeLayerId);
};

// ------------------------------------------------
// Update the cornerstone image with new imageIndex
// ------------------------------------------------
export const updateImageLayer = function(
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
  each(layers, function(layer) {
    let series = layer.options.name == mainSeriesName ? mainSeries : maskSeries;
    cornerstone.loadImage(series.imageIds[imageIndex]).then(function(image) {
      cornerstone.setActiveLayer(element, layer.layerId);
      cornerstone.displayImage(element, image);
    });
  });
};

/* Internal module functions */

// -----------------------------
// Build the image layers object
// -----------------------------
let buildLayers = function(
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
  return layers;
};

// ----------------------------------
// Load cache and render image layers
// ----------------------------------
let loadLayers = function(element, layers) {
  cornerstone.imageCache.purgeCache();
  each(layers, function(layer) {
    let imageIndex = Math.floor(layer.imageIds.length / 2);
    let currentImageId = layer.imageIds[imageIndex];
    each(layer.imageIds, function(imageId) {
      cornerstone.loadAndCacheImage(imageId).then(function(image) {
        if (currentImageId == imageId) {
          cornerstone.displayImage(element, image);
          cornerstone.addLayer(element, image, layer.options);
          let viewport = cornerstone.getViewport(element);
          if (layer.options.name == "MRI") {
            viewport.voi.windowWidth = image.windowWidth;
            viewport.voi.windowCenter = image.windowCenter;
            enableMouseHandlers(element);
          }
        }
      });
    });
  });
};
