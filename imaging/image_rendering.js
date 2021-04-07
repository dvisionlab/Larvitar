/** @module imaging/rendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone
 */

// external libraries
import cornerstone from "cornerstone-core";
import { each, has, throttle } from "lodash";

// internal libraries
import { getFileImageId } from "./loaders/fileLoader";
import { csToolsCreateStack } from "./tools/tools.main";
import { larvitar_store } from "./image_store";

/*
 * This module provides the following functions to be exported:
 * clearImageCache(seriesId)
 * renderFileImage(file, elementId)
 * renderWebImage(url, elementId)
 * disableViewport(elementId)
 * unloadViewport(elementId, seriesId)
 * resizeViewport(elementId)
 * renderImage(series, elementId)
 * reloadImage(series, elementId)
 * updateImage(series, elementId, imageIndex)
 * resetViewports([elementIds])
 * updateViewportData(elementId)
 * toggleMouseHandlers(elementId, disableFlag)
 * storeViewportData(params...)
 */

/**
 * Purge the cornestone internal cache
 * If seriesId is passed as argument only imageIds of the series are purged from internal cache
 * @instance
 * @function clearImageCache
 * @param {String} seriesId - The id of the serie
 */
export const clearImageCache = function (seriesId) {
  if (seriesId) {
    each(larvitar_store.state.series[seriesId], function (imageId) {
      cornerstone.imageCache.removeImageLoadObject(imageId);
    });
  } else {
    cornerstone.imageCache.purgeCache();
  }
};

/**
 * Render an image (png or jpg) from File on a html div using cornerstone
 * @instance
 * @function renderWebImage
 * @param {Object} file - The image File object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Function} callback - Optional callback function with image object
 */
export const renderFileImage = function (file, elementId, callback) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
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
      let viewport = cornerstone.getViewport(element);
      viewport.displayedArea.brhc.x = image.width;
      viewport.displayedArea.brhc.y = image.height;
      cornerstone.setViewport(element, viewport);
      cornerstone.fitToWindow(element);

      csToolsCreateStack(element);
      if (callback) {
        callback(image);
      }
    });
  }
};

/**
 * Render an image (png or jpg) from web url on a html div using cornerstone
 * @instance
 * @function renderWebImage
 * @param {String} url - The image data url
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const renderWebImage = function (url, elementId) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
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
 * Unrender an image on a html div using cornerstone
 * @instance
 * @function disableViewport
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const disableViewport = function (elementId) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  toggleMouseHandlers(elementId, true); // flagged true to disable handlers
  cornerstone.disable(element);
};

/**
 * Unrender an image on a html div using cornerstone
 * Remove image from cornerstone cache and remove from store
 * @instance
 * @function unloadViewport
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {String} seriesId - The id of the serie
 */
export const unloadViewport = function (elementId, seriesId) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  toggleMouseHandlers(elementId, true); // flagged true to disable handlers
  cornerstone.disable(element);
  // remove images from cornerstone cache
  each(larvitar_store.state.series[seriesId], function (imageId) {
    cornerstone.imageCache.removeImageLoadObject(imageId);
  });
  larvitar_store.removeSeriesIds(seriesId);
  larvitar_store.deleteViewport(elementId);
};

/**
 * Resize a viewport using cornerstone resize
 * And forcing fit to window
 * @instance
 * @function resizeViewport
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const resizeViewport = function (elementId) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  cornerstone.resize(element, true); // true flag forces fitToWindow
};

/**
 * Render a image frame in a html div using cornerstone
 * @instance
 * @function renderFrame
 * @param {Object} series - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Integer} frameId - Optional frameId, default is 0
 */
export const renderFrame = function (series, elementId, frameId) {
  let t0 = performance.now();
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  cornerstone.enable(element);
  frameId = frameId ? frameId : 0;
  let imageId = series.imageIds[frameId];

  // TODO SET IN STORE METADATA?

  cornerstone.loadImage(imageId).then(function (image) {
    cornerstone.displayImage(element, image);
    cornerstone.fitToWindow(element);
    let t1 = performance.now();
    console.log(`Call to renderFrame took ${t1 - t0} milliseconds.`);
  });
};

/**
 * Cache image and render it in a html div using cornerstone
 * @instance
 * @function renderImage
 * @param {Object} series - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Object} defaultProps - Optional default props
 */
export const renderImage = function (series, elementId, defaultProps) {
  let t0 = performance.now();
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
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

  if (!currentImageId) {
    currentImageId = series.imageIds[0];
    console.warn("imageId not found for imageIndex", imageIndex);
  }

  let rows = series.instances[series.imageIds[0]].metadata["x00280010"];
  let cols = series.instances[series.imageIds[0]].metadata["x00280011"];
  let thickness = series.instances[series.imageIds[0]].metadata["x00180050"];
  let spacing_x = series.instances[series.imageIds[0]].metadata["x00280030"]
    ? series.instances[series.imageIds[0]].metadata["x00280030"][0]
    : null;
  let spacing_y = series.instances[series.imageIds[0]].metadata["x00280030"]
    ? series.instances[series.imageIds[0]].metadata["x00280030"][1]
    : null;

  let wc,
    ww = null;
  if (defaultProps && has(defaultProps, "wc")) {
    wc = defaultProps["wc"];
  } else {
    if (series.instances[series.imageIds[0]].metadata["x00281050"]) {
      wc =
        series.instances[series.imageIds[0]].metadata["x00281050"][0] ||
        series.instances[series.imageIds[0]].metadata["x00281050"];
    }
  }

  if (defaultProps && has(defaultProps, "ww")) {
    ww = defaultProps["ww"];
  } else {
    if (series.instances[series.imageIds[0]].metadata["x00281051"]) {
      ww =
        series.instances[series.imageIds[0]].metadata["x00281051"][0] ||
        series.instances[series.imageIds[0]].metadata["x00281051"];
    }
  }

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
    larvitar_store.set("errorLog", "Invalid Image Metadata");
    return;
  } else {
    larvitar_store.set("errorLog", "");
  }

  // add serie's imageIds into store
  larvitar_store.addSeriesIds(series.seriesUID, series.imageIds);
  let loadingCounter = 0;
  larvitar_store.set("loadingProgress", [elementId, loadingCounter]);
  larvitar_store.set("loadingStatus", [elementId, false]);

  each(series.imageIds, function (imageId) {
    cornerstone.loadAndCacheImage(imageId).then(function (image) {
      if (currentImageId == imageId) {
        cornerstone.displayImage(element, image);
        let viewport = cornerstone.getViewport(element);
        if (ww || wc) {
          viewport.voi.windowWidth = ww ? ww : Math.abs(wc) * 2;
          viewport.voi.windowCenter = wc ? wc : parseInt(ww / 2);
        }
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

        let storedViewport = cornerstone.getViewport(element);

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
          storedViewport,
          defaultWW,
          defaultWC
        );
        larvitar_store.set("loadingStatus", [elementId, true]);
        let t1 = performance.now();
        console.log(`Call to renderImage took ${t1 - t0} milliseconds.`);
      }
      loadingCounter += 1;
      let loadingPercentage = Math.floor(
        (loadingCounter / series.imageIds.length) * 100
      );
      larvitar_store.set("loadingProgress", [elementId, loadingPercentage]);
    });
  });

  csToolsCreateStack(element, series.imageIds, imageIndex - 1);
  toggleMouseHandlers(elementId);
};

/**
 * Reload an image on a html div using cornerstone
 * @instance
 * @function reloadImage
 * @param {Object} series - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const reloadImage = function (series, elementId) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  cornerstone.enable(element);
  let sliceId = larvitar_store.get("viewports", elementId, "sliceId");
  let currentImageId = series.imageIds[sliceId];
  let loadingCounter = 0;
  larvitar_store.set("loadingStatus", [elementId, false]);
  larvitar_store.set("loadingProgress", [elementId, loadingCounter]);

  each(series.imageIds, function (imageId) {
    cornerstone.loadAndCacheImage(imageId).then(function (image) {
      if (currentImageId == imageId) {
        cornerstone.displayImage(element, image);
        let viewport = cornerstone.getViewport(element);
        viewport.voi.windowWidth = larvitar_store.get(
          "viewports",
          elementId,
          "viewport",
          "voi",
          "windowWidth"
        );
        viewport.voi.windowCenter = larvitar_store.get(
          "viewports",
          elementId,
          "viewport",
          "voi",
          "windowCenter"
        );
        csToolsCreateStack(element);
        toggleMouseHandlers(elementId);
        cornerstone.fitToWindow(element);
        larvitar_store.set("loadingStatus", [elementId, true]);
      }
      loadingCounter += 1;
      let loadingPercentage = Math.floor(
        (loadingCounter / series.imageIds.length) * 100
      );
      larvitar_store.set("loadingProgress", [elementId, loadingPercentage]);
    });
  });
};

/**
 * Update the cornerstone image with new imageIndex
 * @instance
 * @function updateImage
 * @param {Object} series - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Number} imageIndex - The index of the image to be rendered
 */
export const updateImage = function (series, elementId, imageIndex) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.log("not element");
    return;
  }
  let index = imageIndex == 0 ? imageIndex : imageIndex - 1;
  cornerstone.loadImage(series.imageIds[index]).then(function (image) {
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
    let viewport = cornerstone.getViewport(element);
    viewport.scale = larvitar_store.get(
      "viewports",
      elementId,
      "default",
      "scale"
    );
    viewport.rotation = larvitar_store.get(
      "viewports",
      elementId,
      "default",
      "rotation"
    );
    viewport.translation.x = larvitar_store.get(
      "viewports",
      elementId,
      "default",
      "translation",
      "x"
    );
    viewport.translation.y = larvitar_store.get(
      "viewports",
      elementId,
      "default",
      "translation",
      "y"
    );
    viewport.voi.windowWidth = larvitar_store.get(
      "viewports",
      elementId,
      "default",
      "voi",
      "windowWidth"
    );
    viewport.voi.windowCenter = larvitar_store.get(
      "viewports",
      elementId,
      "default",
      "voi",
      "windowCenter"
    );

    cornerstone.setViewport(element, viewport);
    cornerstone.fitToWindow(element);
    cornerstone.updateImage(element);

    larvitar_store.set("scale", [elementId, viewport.scale]);
    larvitar_store.set("rotation", [elementId, viewport.rotation]);
    larvitar_store.set("translation", [
      elementId,
      viewport.translation.x,
      viewport.translation.y
    ]);
    larvitar_store.set("contrast", [
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
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const updateViewportData = function (elementId) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let viewport = cornerstone.getViewport(element);
  let activeTool = larvitar_store.get("leftMouseHandler");
  switch (activeTool) {
    case "Wwwc":
      larvitar_store.set("contrast", [
        elementId,
        viewport.voi.windowWidth,
        viewport.voi.windowCenter
      ]);
      break;
    case "Pan":
      larvitar_store.set("translation", [
        elementId,
        viewport.translation.x,
        viewport.translation.y
      ]);
      break;
    case "Zoom":
      larvitar_store.set("scale", [elementId, viewport.scale]);
      break;
    case "Rotate":
      larvitar_store.set("rotation", [elementId, viewport.rotation]);
      break;
    default:
      break;
  }
};

/**
 * Add event handlers to mouse move
 * @instance
 * @function toggleMouseHandlers
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Boolean} disable - If true disable handlers, default is false
 */
export const toggleMouseHandlers = function (elementId, disable) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }

  if (disable) {
    element.removeEventListener("cornerstonetoolsmousedown", mouseDownHandler);
    element.removeEventListener("cornerstonetoolsmousedrag", mouseMoveHandler);
    element.removeEventListener("cornerstonetoolsmouseup", mouseUpHandler);
    element.removeEventListener(
      "cornerstonetoolsmousewheel",
      mouseWheelHandler
    );
    return;
  }

  let throttledSave = throttle(function () {
    updateViewportData(elementId);
  }, 500);

  function mouseMoveHandler() {
    throttledSave();
  }

  function mouseUpHandler() {
    element.removeEventListener("cornerstonetoolsmousemove", mouseMoveHandler);
    element.removeEventListener("cornerstonetoolsmouseup", mouseUpHandler);
    updateViewportData(elementId);
  }

  // remove and add mousedown
  element.removeEventListener("cornerstonetoolsmousedown", mouseDownHandler);
  element.addEventListener("cornerstonetoolsmousedown", mouseDownHandler);

  function mouseDownHandler() {
    // remove and add mousedrag
    element.removeEventListener("cornerstonetoolsmousedrag", mouseMoveHandler);
    element.addEventListener("cornerstonetoolsmousedrag", mouseMoveHandler);

    // remove and add mouseup
    element.removeEventListener("cornerstonetoolsmouseup", mouseUpHandler);
    element.addEventListener("cornerstonetoolsmouseup", mouseUpHandler);
  }

  function mouseWheelHandler(evt) {
    let enabledElement = cornerstone.getEnabledElement(element);
    let cix =
      enabledElement.toolStateManager.toolState.stack.data[0]
        .currentImageIdIndex;
    larvitar_store.set("sliceId", [evt.target.id, cix + 1]);
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
  larvitar_store.set("dimensions", [elementId, rows, cols]);
  larvitar_store.set("spacing", [elementId, spacing_x, spacing_y]);
  larvitar_store.set("thickness", [elementId, thickness]);
  larvitar_store.set("minPixelValue", [elementId, image.minPixelValue]);
  larvitar_store.set("maxPixelValue", [elementId, image.maxPixelValue]);
  larvitar_store.set("minSliceId", [elementId, 1]);
  larvitar_store.set("sliceId", [elementId, imageIndex]);
  larvitar_store.set("maxSliceId", [elementId, numberOfSlices]);
  larvitar_store.set("defaultViewport", [
    elementId,
    viewport.scale,
    viewport.rotation,
    viewport.translation.x,
    viewport.translation.y,
    defaultWW,
    defaultWC
  ]);
  larvitar_store.set("scale", [elementId, viewport.scale]);
  larvitar_store.set("rotation", [elementId, viewport.rotation]);
  larvitar_store.set("translation", [
    elementId,
    viewport.translation.x,
    viewport.translation.y
  ]);
  larvitar_store.set("contrast", [
    elementId,
    viewport.voi.windowWidth,
    viewport.voi.windowCenter
  ]);
};

/**
 * Check if a div tag is a valid DOM HTMLElement
 * @instance
 * @function isElement
 * @param {Object} o - The div tag
 * @return {Boolean} - True if is an element otherwise returns False
 */
export const isElement = function (o) {
  return typeof HTMLElement === "object"
    ? o instanceof HTMLElement //DOM2
    : o &&
        typeof o === "object" &&
        o !== null &&
        o.nodeType === 1 &&
        typeof o.nodeName === "string";
};
