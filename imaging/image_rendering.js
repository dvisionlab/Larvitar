/** @module imaging/rendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone
 *  @todo Document
 */

// external libraries
import cornerstone from "cornerstone-core";
import { each, has, throttle } from "lodash";

// internal libraries
import { getFileImageId } from "./loaders/fileLoader";
import { csToolsCreateStack } from "./tools/tools.main";
import { default as larvitar_store } from "./image_store";
let store = larvitar_store.state ? larvitar_store : new larvitar_store();

/*
 * This module provides the following functions to be exported:
 * clearImageCache()
 * loadImage(series, elementId)
 * disableImage(elementId)
 * loadFileImage(file, elementId)
 * loadWebImage(url, elementId)
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
 * Load an image (png or jpg) from File on a html div using cornerstone
 * @instance
 * @function loadWebImage
 * @param {Object} file - The image File object
 * @param {String} elementId - The html div id used for rendering
 */
export const loadFileImage = function (file, elementId) {
  let element = document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }

  if (cornerstone.getEnabledElements().length == 0) {
    cornerstone.enable(element);
  }

  // check if imageId is already stored in fileManager
  const imageId = getFileImageId(file);
  if (imageId) {
    cornerstone.loadImage(imageId).then(function (image) {
      cornerstone.displayImage(element, image);
      cornerstone.fitToWindow(element);
      csToolsCreateStack(element);
    });
  }
};

/**
 * Load an image (png or jpg) from web url on a html div using cornerstone
 * @instance
 * @function loadWebImage
 * @param {String} url - The image data url
 * @param {String} elementId - The html div id used for rendering
 */
export const loadWebImage = function (url, elementId) {
  let element = document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }

  cornerstone.enable(element);
  cornerstone.loadImage(url).then(function (image) {
    cornerstone.displayImage(element, image);
    csToolsCreateStack(element);
  });
};

/**
 * Reload an image on a html div using cornerstone
 * @instance
 * @function disableImage
 * @param {String} elementId - The html div id used for rendering
 */
export const disableImage = function (elementId) {
  let element = document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  cornerstone.disable(element);
};

/**
 * Load an cache image and render it in a html div using cornerstone
 * @instance
 * @function loadImage
 * @param {Object} series - The original series data object
 * @param {String} elementId - The html div id used for rendering
 * @param {Object} defaultProps - Optional default props
 */
export const loadImage = function (series, elementId, defaultProps) {
  let element = document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  cornerstone.enable(element);

  let numberOfSlices = series.imageIds.length;
  let imageIndex =
    defaultProps &&
    has(defaultProps, "sliceNumber") &&
    defaultProps["sliceNumber"] <= series.imageIds.length
      ? defaultProps["sliceNumber"]
      : Math.floor(series.imageIds.length / 2);
  let currentImageId = series.imageIds[imageIndex - 1];
  let rows = series.instances[series.imageIds[0]].metadata["x00280010"];
  let cols = series.instances[series.imageIds[0]].metadata["x00280011"];
  let thickness = series.instances[series.imageIds[0]].metadata["x00180050"];
  let spacing_x = series.instances[series.imageIds[0]].metadata["x00280030"]
    ? series.instances[series.imageIds[0]].metadata["x00280030"][0]
    : null;
  let spacing_y = series.instances[series.imageIds[0]].metadata["x00280030"]
    ? series.instances[series.imageIds[0]].metadata["x00280030"][1]
    : null;
  let wc =
    defaultProps && has(defaultProps, "wc")
      ? defaultProps["wc"]
      : series.instances[series.imageIds[0]].metadata["x00281050"][0] ||
        series.instances[series.imageIds[0]].metadata["x00281050"];
  let ww =
    defaultProps && has(defaultProps, "ww")
      ? defaultProps["ww"]
      : series.instances[series.imageIds[0]].metadata["x00281051"][0] ||
        series.instances[series.imageIds[0]].metadata["x00281051"];

  let defaultWW =
    defaultProps && has(defaultProps, "defaultWW")
      ? defaultProps["defaultWW"]
      : ww;
  let defaultWC =
    defaultProps && has(defaultProps, "defaultWC")
      ? defaultProps["defaultWC"]
      : wc;

  if (rows == null || cols == null) {
    console.error("invalid image metadata");
    store.set(null, "errorLog", "Invalid Image Metadata");
    return;
  } else {
    store.set(null, "errorLog", "");
  }

  each(series.imageIds, function (imageId) {
    cornerstone.loadAndCacheImage(imageId).then(function (image) {
      // HACK to force render re-evaluation (otherwise it remains stuck on GrayScaleRenderer)
      image.render = null;

      if (currentImageId == imageId) {
        cornerstone.displayImage(element, image);
        let viewport = cornerstone.getViewport(element);
        viewport.voi.windowWidth = ww;
        viewport.voi.windowCenter = wc;
        cornerstone.fitToWindow(element);

        if (defaultProps && has(defaultProps, "scale")) {
          let viewport = cornerstone.getViewport(element);
          viewport.scale = defaultProps["scale"];
          cornerstone.setViewport(element, viewport);
        }

        if (
          defaultProps &&
          has(defaultProps, "tr_x") &&
          has(defaultProps, "tr_y")
        ) {
          let viewport = cornerstone.getViewport(element);
          viewport.translation.x = defaultProps["tr_x"];
          viewport.translation.y = defaultProps["tr_y"];
          cornerstone.setViewport(element, viewport);
        }

        csToolsCreateStack(element);
        enableMouseHandlers(elementId, element);

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
          viewport,
          defaultWW,
          defaultWC
        );
      }
    });
  });
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
        enableMouseHandlers(elementId, element);
        cornerstone.fitToWindow(element);
        store.set(viewer, "loadingStatus", [elementId, true]);
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
  cornerstone.loadImage(series.imageIds[imageIndex - 1]).then(function (image) {
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
      viewport.translation.y
    ]);
    store.set(viewer, "contrast", [
      elementId,
      viewport.voi.windowWidth,
      viewport.voi.windowCenter
    ]);
  });
};

/**
 * Update viewport data in store
 * @instance
 * @function updateViewportData
 * @param {String} activeTool - The name of the activetool
 * @param {String} elementId - The html div id used for rendering
 */
export const updateViewportData = function (activeTool, elementId) {
  let element = document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let viewport = cornerstone.getViewport(element);
  let viewportNames = store.get("viewports");
  let viewer = store.get("viewer");
  switch (activeTool) {
    case "Wwwc":
      each(viewportNames, function (viewportName) {
        // sync ww and wc values in store
        store.set(viewer, "contrast", [
          viewportName,
          viewport.voi.windowWidth,
          viewport.voi.windowCenter
        ]);
      });
      break;
    case "Pan":
      store.set(viewer, "translation", [
        elementId,
        viewport.translation.x,
        viewport.translation.y
      ]);
      break;
    case "Zoom":
      store.set(viewer, "scale", [elementId, viewport.scale]);
      break;
    case "Rotate":
      store.set(viewer, "rotation", [elementId, viewport.rotation]);
      break;
    default:
      break;
  }
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

  // remove and add mousedown
  element.removeEventListener("cornerstonetoolsmousedown", mouseDownHandler);
  element.addEventListener("cornerstonetoolsmousedown", mouseDownHandler);

  function mouseDownHandler() {
    let activeTool = store.get("leftMouseHandler");

    let throttledSave = throttle(function () {
      updateViewportData(activeTool, elementId);
    }, 350);

    function mouseMoveHandler() {
      throttledSave();
    }

    // remove and add mousedrag
    element.removeEventListener("cornerstonetoolsmousedrag", mouseMoveHandler);
    element.addEventListener("cornerstonetoolsmousedrag", mouseMoveHandler);

    function mouseUpHandler() {
      element.removeEventListener(
        "cornerstonetoolsmousemove",
        mouseMoveHandler
      );
      element.removeEventListener("cornerstonetoolsmouseup", mouseUpHandler);
      updateViewportData(activeTool, elementId);
    }
    // remove and add mouseup
    element.removeEventListener("cornerstonetoolsmouseup", mouseUpHandler);
    element.addEventListener("cornerstonetoolsmouseup", mouseUpHandler);
  }

  function mouseWheelHandler(evt) {
    let viewer = store.get("viewer");
    let enabledElement = cornerstone.getEnabledElement(element);
    let cix =
      enabledElement.toolStateManager.toolState.stack.data[0]
        .currentImageIdIndex;
    store.set(viewer, "currentSliceNumber", [evt.target.id, cix + 1]);
  }

  element.removeEventListener("cornerstonetoolsmousewheel", mouseWheelHandler);
  element.addEventListener("cornerstonetoolsmousewheel", mouseWheelHandler);
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
 * @param {Number} defaultWW - The default WW value
 * @param {Number} defaultWC - The default WC value
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
  viewport,
  defaultWW,
  defaultWC
) {
  let viewer = store.get("viewer");
  store.set(viewer, "dimensions", [elementId, rows, cols]);
  store.set(viewer, "spacing", [elementId, spacing_x, spacing_y]);
  store.set(viewer, "thickness", [elementId, thickness]);
  store.set(viewer, "minPixelValue", [elementId, image.minPixelValue]);
  store.set(viewer, "maxPixelValue", [elementId, image.maxPixelValue]);
  store.set(viewer, "loadingStatus", [elementId, true]);
  store.set(viewer, "minSliceNumber", [elementId, 1]);
  store.set(viewer, "currentSliceNumber", [elementId, imageIndex]);
  store.set(viewer, "maxSliceNumber", [elementId, numberOfSlices]);
  store.set(viewer, "defaultViewport", [
    elementId,
    viewport.scale,
    viewport.translation.x,
    viewport.translation.y,
    defaultWW,
    defaultWC
  ]);
  store.set(viewer, "scale", [elementId, viewport.scale]);
  store.set(viewer, "translation", [
    elementId,
    viewport.translation.x,
    viewport.translation.y
  ]);
  store.set(viewer, "contrast", [
    elementId,
    viewport.voi.windowWidth,
    viewport.voi.windowCenter
  ]);
};
