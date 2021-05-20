/** @module imaging/rendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone
 */

// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import { each, has, throttle } from "lodash";

// internal libraries
import { getFileImageId } from "./loaders/fileLoader";
import { csToolsCreateStack } from "./tools/tools.main";
import { larvitar_store } from "./image_store";
import { applyColorMap } from "./image_colormaps";

/*
 * This module provides the following functions to be exported:
 * clearImageCache(seriesId)
 * loadAndCacheImages(seriesData, callback)
 * renderFileImage(file, elementId)
 * renderWebImage(url, elementId)
 * disableViewport(elementId)
 * unloadViewport(elementId, seriesId)
 * resizeViewport(elementId)
 * renderImage(series, elementId, defaultProps)
 * updateImage(series, elementId, imageIndex)
 * resetViewports([elementIds])
 * updateViewportData(elementId)
 * toggleMouseHandlers(elementId, disableFlag)
 * storeViewportData(params...)
 * isElement(o)
 * invertImage(elementId)
 * flipImageHorizontal(elementId)
 * flipImageVertical(elementId)
 * rotateImageLeft(elementId)
 * rotateImageRight(elementId)
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
    let series = larvitar_store.get("series");
    if (has(series, seriesId)) {
      each(series[seriesId].imageIds, function (imageId) {
        try {
          cornerstone.imageCache.removeImageLoadObject(imageId);
        } catch (e) {
          console.warn("no cached image");
        }
      });
      larvitar_store.removeSeriesIds(seriesId);
      console.log("Uncached images for ", seriesId);
    }
  } else {
    cornerstone.imageCache.purgeCache();
  }
};

/**
 * Load and cache all serie's images
 * Add series's imageIds into store
 * @instance
 * @function loadAndCacheImages
 * @param {Object} series the parsed series data
 * @param {Function} callback a callback function
 */
export function loadAndCacheImages(series, callback) {
  let t0 = performance.now();
  let cachingCounter = 0;
  if (series.isMultiframe) {
    // console.warn("Do not cache multiframe images for performance issues");
    return;
  }
  let response = {
    seriesId: series.seriesUID,
    loading: 0,
    series: {}
  };
  callback(response);
  // add serie's imageIds into store
  larvitar_store.addSeriesIds(series.seriesUID, series.imageIds);
  // add serie's caching progress into store
  larvitar_store.set("progress", [series.seriesUID, 0]);
  each(series.imageIds, function (imageId) {
    cornerstone.loadAndCacheImage(imageId).then(function () {
      cachingCounter += 1;
      let cachingPercentage = Math.floor(
        (cachingCounter / series.imageIds.length) * 100
      );
      response.loading = cachingPercentage;
      larvitar_store.set("progress", [series.seriesUID, cachingPercentage]);
      if (cachingCounter == series.imageIds.length) {
        let t1 = performance.now();
        console.log(`Call to cacheImages took ${t1 - t0} milliseconds.`);
        console.log("Cached images for ", series.seriesUID);
        response.series = series;
      }
      callback(response);
    });
  });
}

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
  disableViewport(elementId);

  if (!seriesId) {
    console.warn(
      "seriesId not provided, use disableViewport if you do not want to uncache images"
    );
  }
  // remove images from cornerstone cache
  if (seriesId && has(larvitar_store.get("series"), seriesId)) {
    clearImageCache(seriesId);
  }
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
 * Cache image and render it in a html div using cornerstone
 * @instance
 * @function renderImage
 * @param {Object} seriesStack - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Object} defaultProps - Optional default props
 */
export const renderImage = function (seriesStack, elementId, defaultProps) {
  let t0 = performance.now();

  // get element and enable it
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  cornerstone.enable(element);

  let series = { ...seriesStack };

  let seriesInStore = larvitar_store.get("series");

  if (!has(seriesInStore, series.seriesUID)) {
    larvitar_store.addSeriesIds(series.seriesUID, series.imageIds);
  }

  // default to 0 if multiframe and frameId is null
  let frameId = series.isMultiframe ? 1 : null;

  larvitar_store.set("renderingStatus", [elementId, false]);
  let data = getSeriesData(series, frameId, defaultProps);

  // load and display one image (imageId)
  cornerstone.loadImage(data.imageId).then(function (image) {
    cornerstone.displayImage(element, image);

    if (series.layer) {
      // assign the image to its layer and return its id
      series.layer.id = cornerstone.addLayer(
        element,
        image,
        series.layer.options
      );
    }

    let viewport = cornerstone.getViewport(element);

    // window width and window level
    // are stored in specific dicom tags
    // (x00281050 and x00281051)
    // if not present check in image object
    data.ww = data.ww ? data.ww : image.windowWidth;
    data.wc = data.wc ? data.wc : image.windowCenter;
    data.defaultWW = data.defaultWW ? data.defaultWW : data.ww;
    data.defaultWC = data.defaultWC ? data.defaultWC : data.wc;

    cornerstone.fitToWindow(element);

    if (defaultProps && has(defaultProps, "scale")) {
      viewport.scale = defaultProps["scale"];
      cornerstone.setViewport(element, viewport);
    }

    if (
      defaultProps &&
      has(defaultProps, "tr_x") &&
      has(defaultProps, "tr_y")
    ) {
      viewport.translation.x = defaultProps["tr_x"];
      viewport.translation.y = defaultProps["tr_y"];
      cornerstone.setViewport(element, viewport);
    }

    // color maps
    if (defaultProps && has(defaultProps, "colormap") && image.color == false) {
      applyColorMap(defaultProps["colormap"]);
    }

    let storedViewport = cornerstone.getViewport(element);
    storeViewportData(
      image,
      elementId,
      data.imageIndex,
      data.numberOfSlices,
      data.rows,
      data.cols,
      data.spacing_x,
      data.spacing_y,
      data.thickness,
      storedViewport,
      data.defaultWW,
      data.defaultWC
    );
    larvitar_store.set("renderingStatus", [elementId, true]);
    let t1 = performance.now();
    console.log(`Call to renderImage took ${t1 - t0} milliseconds.`);

    let uri = cornerstoneWADOImageLoader.wadouri.parseImageId(data.imageId).url;
    cornerstoneWADOImageLoader.wadouri.dataSetCacheManager.unload(uri);
    image = null;
    series = null;
    data = null;
  });

  csToolsCreateStack(element, series.imageIds, data.imageIndex - 1);
  toggleMouseHandlers(elementId);
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

    viewport.hflip = false;
    viewport.vflip = false;
    viewport.invert = false;

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
      // sync viewports if needed
      let elements = cornerstone.getEnabledElements();
      each(elements, function (el) {
        larvitar_store.set("contrast", [
          el.element.id,
          viewport.voi.windowWidth,
          viewport.voi.windowCenter
        ]);
      });
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

// internal functions for mouse move handlers
let throttledSave = throttle(function (elementId) {
  updateViewportData(elementId);
}, 500);
function mouseMoveHandler(evt) {
  throttledSave(evt.srcElement.id);
}

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
    element.removeEventListener("cornerstonetoolsmousedrag", mouseMoveHandler);
    element.removeEventListener(
      "cornerstonetoolsmousewheel",
      mouseWheelHandler
    );
    return;
  }

  element.addEventListener("cornerstonetoolsmousedrag", mouseMoveHandler);

  function mouseWheelHandler(evt) {
    let enabledElement = cornerstone.getEnabledElement(element);
    let cix =
      enabledElement.toolStateManager.toolState.stack.data[0]
        .currentImageIdIndex;
    larvitar_store.set("sliceId", [evt.target.id, cix + 1]);
  }
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

/**
 * Invert pixels of an image
 * @instance
 * @function invertImage
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const invertImage = function (elementId) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let viewport = cornerstone.getViewport(element);
  viewport.invert = !viewport.invert;
  cornerstone.setViewport(element, viewport);
};

/**
 * Flip image around horizontal axis
 * @instance
 * @function flipImageHorizontal
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const flipImageHorizontal = function (elementId) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let viewport = cornerstone.getViewport(element);
  viewport.hflip = !viewport.hflip;
  cornerstone.setViewport(element, viewport);
};

/**
 * Flip image around vertical axis
 * @instance
 * @function flipImageVertical
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const flipImageVertical = function (elementId) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let viewport = cornerstone.getViewport(element);
  viewport.vflip = !viewport.vflip;
  cornerstone.setViewport(element, viewport);
};

/**
 * Rotate image by 90° in left direction
 * @instance
 * @function rotateImageLeft
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const rotateImageLeft = function (elementId) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let viewport = cornerstone.getViewport(element);
  viewport.rotation -= 90;
  cornerstone.setViewport(element, viewport);
};

/**
 * Rotate image by 90° in right direction
 * @instance
 * @function rotateImageRight
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const rotateImageRight = function (elementId) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let viewport = cornerstone.getViewport(element);
  viewport.rotation += 90;
  cornerstone.setViewport(element, viewport);
};

/* Internal module functions */

/**
 * Get series metadata from default props and series' metadata
 * @instance
 * @function getSeriesData
 * @param {Object} series - The parsed data series
 * @param {Object} defaultProps - Optional default properties
 * @return {Object} data - A data dictionary with parsed tags' values
 */
let getSeriesData = function (series, defaultProps) {
  let data = {};
  // image index
  if (series.isMultiframe) {
    data.numberOfSlices = series.imageIds.length;
    data.imageIndex = 1;
    data.imageId = series.imageIds[0];
  } else {
    data.numberOfSlices = series.imageIds.length;
    data.imageIndex =
      defaultProps &&
      has(defaultProps, "sliceNumber") &&
      defaultProps["sliceNumber"] <= series.imageIds.length
        ? defaultProps["sliceNumber"]
        : Math.floor(series.imageIds.length / 2);
    data.imageId =
      data.imageIndex > 0
        ? series.imageIds[data.imageIndex - 1]
        : series.imageIds[0];
  }

  // rows, cols and x y z spacing
  data.rows = series.instances[series.imageIds[0]].metadata["x00280010"];
  data.cols = series.instances[series.imageIds[0]].metadata["x00280011"];
  data.thickness = series.instances[series.imageIds[0]].metadata["x00180050"];
  data.spacing_x = series.instances[series.imageIds[0]].metadata["x00280030"]
    ? series.instances[series.imageIds[0]].metadata["x00280030"][0]
    : null;
  data.spacing_y = series.instances[series.imageIds[0]].metadata["x00280030"]
    ? series.instances[series.imageIds[0]].metadata["x00280030"][1]
    : null;

  // window center and window width
  data.wc =
    defaultProps && has(defaultProps, "wc")
      ? defaultProps["wc"]
      : series.instances[series.imageIds[0]].metadata["x00281050"];

  data.ww =
    defaultProps && has(defaultProps, "ww")
      ? defaultProps["ww"]
      : series.instances[series.imageIds[0]].metadata["x00281051"];

  // default values for reset
  data.defaultWW =
    defaultProps && has(defaultProps, "defaultWW")
      ? defaultProps["defaultWW"]
      : data.ww;
  data.defaultWC =
    defaultProps && has(defaultProps, "defaultWC")
      ? defaultProps["defaultWC"]
      : data.wc;

  if (data.rows == null || data.cols == null) {
    console.error("invalid image metadata");
    larvitar_store.set("errorLog", "Invalid Image Metadata");
    return;
  } else {
    larvitar_store.set("errorLog", "");
  }

  return data;
};
