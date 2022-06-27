/** @module imaging/imageRendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone
 */

// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import { each, has } from "lodash";

// internal libraries
import { getFileImageId } from "./loaders/fileLoader";
import { csToolsCreateStack } from "./tools/main";
import { toggleMouseToolsListeners } from "./tools/interaction";
import { larvitar_store } from "./imageStore";
import { applyColorMap } from "./imageColormaps";
import { isElement } from "./imageUtils";

/*
 * This module provides the following functions to be exported:
 * clearImageCache(seriesId)
 * loadAndCacheImages(seriesData)
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
        if (cornerstone.imageCache.cachedImages.length > 0) {
          try {
            cornerstone.imageCache.removeImageLoadObject(imageId);
          } catch (e) {
            console.warn("no cached image");
          }
        } else {
          let uri =
            cornerstoneWADOImageLoader.wadouri.parseImageId(imageId).url;
          cornerstoneWADOImageLoader.wadouri.dataSetCacheManager.unload(uri);
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
 * @returns {Promise} - Return a promise which will resolve when image is displayed
 */
export const renderFileImage = function (file, elementId) {
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

  let renderPromise = new Promise(resolve => {
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
        resolve(image);
      });
    }
  });
  return renderPromise;
};

/**
 * Render an image (png or jpg) from web url on a html div using cornerstone
 * @instance
 * @function renderWebImage
 * @param {String} url - The image data url
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @returns {Promise} - Return a promise which will resolve when image is displayed
 */
export const renderWebImage = function (url, elementId) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let renderPromise = new Promise(resolve => {
    cornerstone.enable(element);
    cornerstone.loadImage(url).then(function (image) {
      cornerstone.displayImage(element, image);
      csToolsCreateStack(element);
      resolve(image);
    });
  });
  return renderPromise;
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
  // toggleMouseHandlers(elementId, true); // flagged true to disable handlers
  toggleMouseToolsListeners(elementId, true);
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
 * @return {Promise} Return a promise which will resolve when image is displayed
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

  larvitar_store.set("renderingStatus", [elementId, false]);
  let data = getSeriesData(series, defaultProps);
  if (!data.imageId) {
    console.warn("Error during renderImage: imageId has not been loaded yet.");
    return;
  }

  let renderPromise = new Promise(resolve => {
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
      if (
        defaultProps &&
        has(defaultProps, "colormap") &&
        image.color == false
      ) {
        applyColorMap(defaultProps["colormap"]);
      }

      let storedViewport = cornerstone.getViewport(element);
      storeViewportData(image, elementId, storedViewport, data);
      larvitar_store.set("renderingStatus", [elementId, true]);
      let t1 = performance.now();
      console.log(`Call to renderImage took ${t1 - t0} milliseconds.`);

      let uri = cornerstoneWADOImageLoader.wadouri.parseImageId(
        data.imageId
      ).url;
      cornerstoneWADOImageLoader.wadouri.dataSetCacheManager.unload(uri);
      image = null;
      series = null;
      data = null;
      resolve();
    });
  });

  csToolsCreateStack(element, series.imageIds, data.imageIndex - 1);
  toggleMouseToolsListeners(elementId);

  return renderPromise;
};

/**
 * Update the cornerstone image with new imageIndex
 * @instance
 * @function updateImage
 * @param {Object} series - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Number} imageIndex - The index of the image to be rendered
 * @param {Boolean} cacheImage - A flag to handle image cache
 */
export const updateImage = function (
  series,
  elementId,
  imageIndex,
  cacheImage
) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.log("not element");
    return;
  }
  let imageId = series.imageIds[imageIndex];

  if (imageId) {
    if (series.is4D) {
      const timestamp = series.instances[imageId].metadata.contentTime;
      const timeId =
        series.instances[imageId].metadata.temporalPositionIdentifier - 1; // timeId from 0 to N
      larvitar_store.set("timeId", [elementId, timeId]);
      larvitar_store.set("timestamp", [elementId, timestamp]);
    }

    if (cacheImage) {
      cornerstone.loadAndCacheImage(imageId).then(function (image) {
        cornerstone.displayImage(element, image);
        larvitar_store.set("sliceId", [elementId, imageIndex]);
        larvitar_store.set("minPixelValue", [elementId, image.minPixelValue]);
        larvitar_store.set("maxPixelValue", [elementId, image.maxPixelValue]);
      });
    } else {
      cornerstone.loadImage(imageId).then(function (image) {
        cornerstone.displayImage(element, image);
        larvitar_store.set("sliceId", [elementId, imageIndex]);
        larvitar_store.set("minPixelValue", [elementId, image.minPixelValue]);
        larvitar_store.set("maxPixelValue", [elementId, image.maxPixelValue]);
      });
    }
  } else {
    console.warn(
      `Error: wrong image index ${imageIndex}, no imageId available`
    );
  }
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
 * @param {Object} viewportData - The new viewport data
 */
export const updateViewportData = function (
  elementId,
  viewportData,
  activeTool
) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  switch (activeTool) {
    case "Wwwc":
    case "WwwcRegion":
      // sync viewports if needed
      let elements = cornerstone.getEnabledElements();
      each(elements, function (el) {
        larvitar_store.set("contrast", [
          el.element.id,
          viewportData.voi.windowWidth,
          viewportData.voi.windowCenter
        ]);
      });
      break;
    case "Pan":
      larvitar_store.set("translation", [
        elementId,
        viewportData.translation.x,
        viewportData.translation.y
      ]);
      break;
    case "Zoom":
      larvitar_store.set("scale", [elementId, viewportData.scale]);
      break;
    case "Rotate":
      larvitar_store.set("rotation", [elementId, viewportData.rotation]);
      break;
    case "mouseWheel":
      const isTimeserie = larvitar_store.get(
        "viewports",
        elementId,
        "isTimeserie"
      );
      if (isTimeserie) {
        const index = viewportData.newImageIdIndex;
        const timeId = larvitar_store.get("viewports", elementId, "timeIds")[
          index
        ];
        const timestamp = larvitar_store.get(
          "viewports",
          elementId,
          "timestamps"
        )[index];
        larvitar_store.set("timeId", [elementId, timeId]);
        larvitar_store.set("timestamp", [elementId, timestamp]);
      }
      break;
    default:
      break;
  }
};

/**
 * Store the viewport data into internal storage
 * @instance
 * @function storeViewportData
 * @param {Object} image - The cornerstone image frame
 * @param {String} elementId - The html div id used for rendering
 * @param {String} viewport - The viewport tag name
 * @param {Object} data - The viewport data object
 */
export const storeViewportData = function (image, elementId, viewport, data) {
  larvitar_store.set("dimensions", [elementId, data.rows, data.cols]);
  larvitar_store.set("spacing", [elementId, data.spacing_x, data.spacing_y]);
  larvitar_store.set("thickness", [elementId, data.thickness]);
  larvitar_store.set("minPixelValue", [elementId, image.minPixelValue]);
  larvitar_store.set("maxPixelValue", [elementId, image.maxPixelValue]);
  // slice id from 0 to n - 1
  larvitar_store.set("minSliceId", [elementId, 0]);
  larvitar_store.set("sliceId", [elementId, data.imageIndex]);
  larvitar_store.set("maxSliceId", [elementId, data.numberOfSlices - 1]);

  if (data.isTimeserie) {
    larvitar_store.set("minTimeId", [elementId, 0]);
    larvitar_store.set("timeId", [elementId, data.timeIndex]);
    larvitar_store.set("maxTimeId", [
      elementId,
      data.numberOfTemporalPositions - 1
    ]);
    let maxSliceId = data.numberOfSlices * data.numberOfTemporalPositions - 1;
    larvitar_store.set("maxSliceId", [elementId, maxSliceId]);

    larvitar_store.set("timestamp", [elementId, data.timestamp]);
    larvitar_store.set("timestamps", [elementId, data.timestamps]);
    larvitar_store.set("timeIds", [elementId, data.timeIds]);
  }

  larvitar_store.set("defaultViewport", [
    elementId,
    viewport.scale,
    viewport.rotation,
    viewport.translation.x,
    viewport.translation.y,
    data.defaultWW,
    data.defaultWC
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
  larvitar_store.set("isColor", [elementId, data.isColor]);
  larvitar_store.set("isMultiframe", [elementId, data.isMultiframe]);
  larvitar_store.set("isTimeserie", [elementId, data.isTimeserie]);
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
  if (series.isMultiframe) {
    data.isMultiframe = true;
    data.numberOfSlices = series.imageIds.length;
    data.imageIndex = 0;
    data.imageId = series.imageIds[data.imageIndex];
  } else if (series.is4D) {
    data.isMultiframe = false;
    data.isTimeserie = true;
    // check with real indices
    data.numberOfSlices = series.numberOfImages;
    data.numberOfTemporalPositions = series.numberOfTemporalPositions;
    data.imageIndex = 0;
    data.timeIndex = 0;
    data.timestamp = series.instances[series.imageIds[0]].metadata["x00080033"];
    data.imageId = series.imageIds[data.imageIndex];
    data.timestamps = [];
    data.timeIds = [];
    each(series.imageIds, function (imageId) {
      data.timestamps.push(series.instances[imageId].metadata.contentTime);
      data.timeIds.push(
        series.instances[imageId].metadata.temporalPositionIdentifier - 1 // timeId from 0 to N
      );
    });
  } else {
    data.isMultiframe = false;
    data.numberOfSlices =
      defaultProps && has(defaultProps, "numberOfSlices")
        ? defaultProps["numberOfSlices"]
        : series.imageIds.length;

    data.imageIndex =
      defaultProps &&
      has(defaultProps, "sliceNumber") &&
      defaultProps["sliceNumber"] >= 0 && // slice number between 0 and n-1
      defaultProps["sliceNumber"] < data.numberOfSlices
        ? defaultProps["sliceNumber"]
        : Math.floor(data.numberOfSlices / 2);

    data.imageId = series.imageIds[data.imageIndex];
  }
  data.isColor = series.color;

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
