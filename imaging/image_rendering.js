// external libraries
import cornerstone from "cornerstone-core";
import { each } from "lodash";

// internal libraries
import { buildData, buildHeader } from "./image_io";

// global module variables

/*
 * This module provides the following functions to be exported:
 * clearImageCache()
 * cacheAndSaveSeries(series)
 * loadImage(series, elementId)
 * updateImage(series, elementId, imageIndex)
 * resetViewports([elementIds])
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

// ----------------------------------------------------------------
// Reload an image on a html div using cornerstone
// -----------------------------------------------------------------
export const reloadImage = function(series, elementId, sliceId) {
  let element = document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let windowWidth = cornerstone.getViewport(element).voi.windowWidth;
  let windowCenter = cornerstone.getViewport(element).voi.windowCenter;
  cornerstone.enable(element);
  each(series.imageIds, function(imageId) {
    cornerstone.loadAndCacheImage(imageId).then(function(image) {
      if (sliceId == imageId) {
        cornerstone.displayImage(element, image);
        let viewport = cornerstone.getViewport(element);
        viewport.voi.windowWidth = windowWidth;
        viewport.voi.windowCenter = windowCenter;
        cornerstone.fitToWindow(element);
      }
    });
  });
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
        viewport.voi.windowWidth = 400.0;
        viewport.voi.windowCenter = 60.0;
        cornerstone.fitToWindow(element);
      }
    });
  });
};

// ------------------------------------------------
// update the cornerstone image with new imageIndex
// ------------------------------------------------
export const updateImage = function(series, element, imageIndex) {
  if (!element) {
    return;
  }
  cornerstone.loadImage(series.imageIds[imageIndex]).then(function(image) {
    cornerstone.displayImage(element, image);
  });
};

// ---------------------------------------------------
// Reset viewport values (scale, translation and wwwc)
// ---------------------------------------------------
export const resetViewports = function(elementIds, defaultSettings) {
  each(elementIds, function(elementId) {
    let element = document.getElementById(elementId);
    if (!element) {
      console.error("invalid html element: " + elementId);
      return;
    }
    let viewport = cornerstone.getViewport(element);
    viewport.scale = defaultSettings.scale;
    viewport.translation.x = defaultSettings.translation.x;
    viewport.translation.y = defaultSettings.translation.y;
    viewport.voi.windowWidth = defaultSettings.windowWidth;
    viewport.voi.windowCenter = defaultSettings.windowCenter;
    cornerstone.setViewport(element, viewport);
    cornerstone.fitToWindow(element);
    cornerstone.updateImage(element);
  });
};
