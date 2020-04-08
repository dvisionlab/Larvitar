/** @module imaging/rendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone
 *  @todo Document
 */

// external libraries
import cornerstone from "cornerstone-core";
import { each } from "lodash";

// internal libraries
import { csToolsCreateStack } from "./image_tools";
import { larvitar_store } from "./image_store";
let store = larvitar_store.state ? larvitar_store : new larvitar_store();

/*
 * This module provides the following functions to be exported:
 * clearImageCache()
 * loadImage(series, elementId)
 * updateImage(series, elementId, imageIndex)
 * resetViewports([elementIds])
 */

/**
 * Purge the cornestone internal cache
 * @instance
 * @function clearImageCache
 */
export const clearImageCache = function () {
  cornerstone.imageCache.purgeCache();
};

/**
 * Reload an image on a html div using cornerstone
 * @instance
 * @function reloadImage
 * @param {Object} series - The original series data object
 * @param {String} elementId - The html div id used for rendering
 */
export const reloadImage = function (series, elementId) {
  let element = document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let viewer = store.get("viewer");
  cornerstone.enable(element);
  let sliceId = store.get(viewer, elementId, "sliceId");
  let currentImageId = series.imageIds[sliceId];

  each(series.imageIds, function (imageId) {
    cornerstone.loadAndCacheImage(imageId).then(function (image) {
      if (currentImageId == imageId) {
        cornerstone.displayImage(element, image);
        let viewport = cornerstone.getViewport(element);
        viewport.voi.windowWidth = store.get(
          viewer,
          elementId,
          "viewport",
          "voi",
          "windowWidth"
        );
        viewport.voi.windowCenter = store.get(
          viewer,
          elementId,
          "viewport",
          "voi",
          "windowCenter"
        );
        csToolsCreateStack(element);
        enableMouseHandlers(elementId);
        cornerstone.fitToWindow(element);
        store.set(viewer, "loadingStatus", [elementId, true]);
      }
    });
  });
};

/**
 * Load an cache image and render it in a html div using cornerstone
 * @instance
 * @function loadImage
 * @param {Object} series - The original series data object
 * @param {String} elementId - The html div id used for rendering
 */
export const loadImage = function (series, elementId) {
  let element = document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  cornerstone.enable(element);

  let imageIndex = Math.floor(series.imageIds.length / 2);
  let currentImageId = series.imageIds[imageIndex];
  let numberOfSlices = series.imageIds.length - 1;
  let rows = series.instances[series.imageIds[0]].metadata["x00280010"];
  let cols = series.instances[series.imageIds[0]].metadata["x00280011"];
  let thickness = series.instances[series.imageIds[0]].metadata["x00180050"];
  let spacing_x = series.instances[series.imageIds[0]].metadata["x00280030"][0];
  let spacing_y = series.instances[series.imageIds[0]].metadata["x00280030"][1];
  let wc =
    series.instances[series.imageIds[0]].metadata["x00281050"][0] ||
    series.instances[series.imageIds[0]].metadata["x00281050"];
  let wl =
    series.instances[series.imageIds[0]].metadata["x00281051"][0] ||
    series.instances[series.imageIds[0]].metadata["x00281051"];

  if (rows == null || cols == null) {
    console.error("invalid image metadata");
    store.set(null, "errorLog", "Invalid Image Metadata");
    return;
  } else {
    store.set(null, "errorLog", "");
  }

  each(series.imageIds, function (imageId) {
    cornerstone.loadAndCacheImage(imageId).then(function (image) {
      if (currentImageId == imageId) {
        cornerstone.displayImage(element, image);
        let viewport = cornerstone.getViewport(element);
        viewport.voi.windowWidth = wl;
        viewport.voi.windowCenter = wc;
        cornerstone.fitToWindow(element);

        csToolsCreateStack(element);
        enableMouseHandlers(elementId);

        storeViewportData(
          image,
          elementId,
          imageIndex,
          numberOfSlices,
          rows,
          cols,
          spacing_x,
          spacing_y,
          thickness,
          viewport
        );
      }
    });
  });
};

/**
 * Update the cornerstone image with new imageIndex
 * @instance
 * @function updateImage
 * @param {Object} series - The original series data object
 * @param {String} elementId - The html div id used for rendering
 * @param {Number} imageIndex - The index of the image to be rendered
 */
export const updateImage = function (series, element, imageIndex) {
  if (!element) {
    return;
  }
  cornerstone.loadImage(series.imageIds[imageIndex]).then(function (image) {
    cornerstone.displayImage(element, image);
  });
};

/**
 * Reset viewport values (scale, translation and wwwc)
 * @instance
 * @function resetViewports
 * @param {Array} elementIds - The array of hmtl div ids
 */
export const resetViewports = function (elementIds) {
  each(elementIds, function (elementId) {
    let element = document.getElementById(elementId);
    if (!element) {
      console.error("invalid html element: " + elementId);
      return;
    }
    let viewer = store.get("viewer");
    let viewport = cornerstone.getViewport(element);
    viewport.scale = store.get(viewer, elementId, "default", "scale");
    viewport.rotation = store.get(viewer, elementId, "default", "rotation");
    viewport.translation.x = store.get(
      viewer,
      elementId,
      "default",
      "translation",
      "x"
    );
    viewport.translation.y = store.get(
      viewer,
      elementId,
      "default",
      "translation",
      "y"
    );
    viewport.voi.windowWidth = store.get(
      viewer,
      elementId,
      "default",
      "voi",
      "windowWidth"
    );
    viewport.voi.windowCenter = store.get(
      viewer,
      elementId,
      "default",
      "voi",
      "windowCenter"
    );

    cornerstone.setViewport(element, viewport);
    cornerstone.fitToWindow(element);
    cornerstone.updateImage(element);

    store.set(viewer, "scale", [elementId, viewport.scale]);
    store.set(viewer, "rotation", [elementId, viewport.rotation]);
    store.set(viewer, "translation", [
      elementId,
      viewport.translation.x,
      viewport.translation.y,
    ]);
    store.set(viewer, "contrast", [
      elementId,
      viewport.voi.windowWidth,
      viewport.voi.windowCenter,
    ]);
  });
};

/**
 * Add event handlers to mouse move
 * @instance
 * @function enableMouseHandlers
 * @param {String} elementId - The html div id used for rendering
 */
export const enableMouseHandlers = function (elementId) {
  let element = document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  element.removeEventListener("mousedown", mouseDownHandler);
  function mouseDownHandler(e) {
    const mouseButton = e.which;
    // get action from global store
    if (mouseButton != 1 || e.target.localName != "canvas") {
      // console.warn("not left mouse or wrong target, return");
      return;
    }
    function mouseMoveHandler() {
      let viewport = cornerstone.getViewport(element);
      let viewportNames = store.get("viewports");
      let viewer = store.get("viewer");
      each(viewportNames, function (viewportName) {
        // sync ww and wc values in store
        store.set(viewer, "contrast", [
          viewportName,
          viewport.voi.windowWidth,
          viewport.voi.windowCenter,
        ]);
      });
      // sync translation values in store
      store.set(viewer, "translation", [
        elementId,
        viewport.translation.x,
        viewport.translation.y,
      ]);
      // sync scale values in store
      store.set(viewer, "scale", [elementId, viewport.scale]);
      // sync rotation values in store
      store.set(viewer, "rotation", [elementId, viewport.rotation]);
    }
    function mouseUpHandler() {
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    }
    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
  }
  element.addEventListener("mousedown", mouseDownHandler);

  // cornerstoneTools wheel tool listener (update sliceId)
  element.addEventListener("cornerstonetoolsmousewheel", (evt) => {
    let viewer = store.get("viewer");
    let enabledElement = cornerstone.getEnabledElement(element);
    let cix =
      enabledElement.toolStateManager.toolState.stack.data[0]
        .currentImageIdIndex;
    store.set(viewer, "currentSliceNumber", [evt.target.id, cix]);
  });
};

/**
 * Store the viewport data into internal storage
 * @instance
 * @function storeViewportData
 * @param {Object} image - The cornerstone image frame
 * @param {String} elementId - The html div id used for rendering
 * @param {Number} imageIndex - The index of the image
 * @param {Number} numberOfSlices - The number of slices of the series
 * @param {Number} rows - The number of rows of the image
 * @param {Number} cols - The number of columns of the image
 * @param {Number} spacing_x - The spacing value for x axis
 * @param {Number} spacing_y - The spacing value for y direction
 * @param {Number} thickness - The thickness value between slices
 * @param {String} viewport - The viewport tag name
 */
export const storeViewportData = function (
  image,
  elementId,
  imageIndex,
  numberOfSlices,
  rows,
  cols,
  spacing_x,
  spacing_y,
  thickness,
  viewport
) {
  let viewer = store.get("viewer");
  store.set(viewer, "dimensions", [elementId, rows, cols]);
  store.set(viewer, "spacing", [elementId, spacing_x, spacing_y]);
  store.set(viewer, "thickness", [elementId, thickness]);
  store.set(viewer, "minPixelValue", [elementId, image.minPixelValue]);
  store.set(viewer, "maxPixelValue", [elementId, image.maxPixelValue]);
  store.set(viewer, "loadingStatus", [elementId, true]);
  store.set(viewer, "minSliceNumber", [elementId, 0]);
  store.set(viewer, "currentSliceNumber", [elementId, imageIndex]);
  store.set(viewer, "maxSliceNumber", [elementId, numberOfSlices]);
  store.set(viewer, "defaultViewport", [
    elementId,
    viewport.scale,
    viewport.translation.x,
    viewport.translation.y,
    viewport.voi.windowWidth,
    viewport.voi.windowCenter,
  ]);
  store.set(viewer, "scale", [elementId, viewport.scale]);
  store.set(viewer, "translation", [
    elementId,
    viewport.translation.x,
    viewport.translation.y,
  ]);
  store.set(viewer, "contrast", [
    elementId,
    viewport.voi.windowWidth,
    viewport.voi.windowCenter,
  ]);
};
