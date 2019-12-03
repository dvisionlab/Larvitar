// external libraries
import cornerstone from "cornerstone";
import { each } from "lodash";

// internal libraries
import { buildData, buildHeader } from "./image_io";
import { getMainLayer } from "./image_layers.js";

// global module variables

/*
 * This module provides the following functions to be exported:
 * clearImageCache()
 * cacheAndSaveSeries(series)
 * loadImage(series, elementId)
 * updateImage(series, elementId, imageIndex)
 * enableMouseHandlers(element)
 */

// -----------------------------------
// Purge the cornestone internal cache
// -----------------------------------
export const clearImageCache = function() {
  cornerstone.imageCache.purgeCache();
};

// ----------------------------------------------------
// Load, cache and save an image serie
// for each dicom series:
// clear the cache
// store each image in cornerstone cache
// build header and data
// you cant cache more than one series at the same time
// you need to call this method series by series
// -----------------------------------------------------
export const cacheAndSaveSeries = async function(series) {
  // Purge the cache
  cornerstone.imageCache.purgeCache();

  await Promise.all(
    series.imageIds.map(imageId => {
      return cornerstone.loadAndCacheImage(imageId);
    })
  );
  // At this time all images are cached
  // Now save the serie
  const cachedData = cornerstone.imageCache.cachedImages;
  const header = buildHeader(series, cachedData);
  const data = buildData(series, cachedData);
  return { data, header };
};

// -----------------------------------------------------------------
// Load an cache image and render it in a html div using cornerstone
// -----------------------------------------------------------------
export const loadImage = function(series, elementId) {
  let element = document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  cornerstone.enable(element);
  let imageIndex = Math.floor(series.imageIds.length / 2);
  let currentImageId = series.imageIds[imageIndex];
  cornerstone.imageCache.purgeCache();
  each(series.imageIds, function(imageId) {
    cornerstone.loadAndCacheImage(imageId).then(function(image) {
      if (currentImageId == imageId) {
        cornerstone.displayImage(element, image);
        let viewport = cornerstone.getViewport(element);
        viewport.voi.windowWidth = image.windowWidth;
        viewport.voi.windowCenter = image.windowCenter;
        enableMouseHandlers(element);
      }
    });
  });
};

// ------------------------------------------------
// update the cornerstone image with new imageIndex
// ------------------------------------------------
export const updateImage = function(series, element, imageIndex) {
  cornerstone.loadImage(series.imageIds[imageIndex]).then(function(image) {
    cornerstone.displayImage(element, image);
  });
};

// ------------------------------------------------
// add event handlers to mouse move to adjust WW/WL
// ------------------------------------------------
export const enableMouseHandlers = function(element) {
  let viewport = cornerstone.getViewport(element);
  // reset previous handler
  element.removeEventListener("mousedown", mouseDownHandler);

  function mouseDownHandler(e) {
    let layers = cornerstone.getLayers(element);
    if (layers) {
      each(layers, function(layer) {
        if (layer.options.name == getMainLayer()) {
          cornerstone.setActiveLayer(element, layer.layerId);
        }
      });
    }

    let lastX = e.pageX;
    let lastY = e.pageY;
    function mouseMoveHandler(e) {
      const deltaX = e.pageX - lastX;
      const deltaY = e.pageY - lastY;
      lastX = e.pageX;
      lastY = e.pageY;

      viewport.voi.windowWidth += deltaX / viewport.scale;
      viewport.voi.windowCenter += deltaY / viewport.scale;
      cornerstone.setViewport(element, viewport);

      //Update canvas gui
      document.getElementById("ww-wc").textContent =
        "WW/WC: " +
        Math.round(viewport.voi.windowWidth) +
        "/" +
        Math.round(viewport.voi.windowCenter);
    }
    function mouseUpHandler() {
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    }
    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
  }
  element.addEventListener("mousedown", mouseDownHandler);

  //Update canvas gui
  document.getElementById("ww-wc").textContent =
    "WW/WC: " +
    Math.round(viewport.voi.windowWidth) +
    "/" +
    Math.round(viewport.voi.windowCenter);
};
