/** @module imaging/imageRendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone
 */

// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import { each, has, reject } from "lodash";

// internal libraries
import { getFileImageId } from "./loaders/fileLoader";
import { csToolsCreateStack } from "./tools/main";
import { toggleMouseToolsListeners } from "./tools/interaction";
import store, { set as setStore } from "./imageStore";
import { applyColorMap } from "./imageColormaps";
import { isElement } from "./imageUtils";
import { Image, Instance, Series, Viewport } from "./types";

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
export const clearImageCache = function (seriesId: string) {
  if (seriesId) {
    let series = store.get("series");
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

      store.removeSeriesIds(seriesId);
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
export function loadAndCacheImages(series: Series, callback: Function) {
  // TODO-ts: better type for callback
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
  store.addSeriesIds(series.seriesUID, series.imageIds);
  // add serie's caching progress into store
  setStore("progress", [series.seriesUID, 0]);
  each(series.imageIds, function (imageId) {
    cornerstone.loadAndCacheImage(imageId).then(function () {
      cachingCounter += 1;
      let cachingPercentage = Math.floor(
        (cachingCounter / series.imageIds.length) * 100
      );
      response.loading = cachingPercentage;
      setStore("progress", [series.seriesUID, cachingPercentage]);
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
 * Render a PDF from a DICOM Encapsulated PDF
 * @instance
 * @function renderDICOMPDF
 * @param {Object} seriesStack - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @returns {Promise} - Return a promise which will resolve when pdf is displayed
 */
export const renderDICOMPDF = function (
  seriesStack: Series,
  elementId: string | HTMLElement
) {
  let t0 = performance.now();
  let element: HTMLElement | null = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);

  let renderPromise = new Promise<void>((resolve, reject) => {
    let image: Instance | null = seriesStack.instances[seriesStack.imageIds[0]];
    const SOPUID = image.dataSet?.string("x00080016");

    if (SOPUID === "1.2.840.10008.5.1.4.1.1.104.1") {
      let fileTag = image.dataSet?.elements.x00420011;

      if (!fileTag) {
        throw new Error("No file tag found");
      }

      let pdfByteArray = image.dataSet?.byteArray.slice(
        fileTag.dataOffset,
        fileTag.dataOffset + fileTag.length
      );

      if (!pdfByteArray) {
        console.error("No pdf byte array found");
        return;
      }

      if (!element) {
        console.error("invalid html element: " + elementId);
        return;
      }

      let PDF: Blob | null = new Blob([pdfByteArray], {
        type: "application/pdf"
      });
      let fileURL = URL.createObjectURL(PDF);
      element.innerHTML =
        '<object data="' +
        fileURL +
        '" type="application/pdf" width="100%" height="100%"></object>';
      setStore("isPDF", [elementId, true]);
      let t1 = performance.now();
      console.log(`Call to renderDICOMPDF took ${t1 - t0} milliseconds.`);
      image = null;
      fileTag = undefined;
      pdfByteArray = undefined;
      PDF = null;
      resolve();
    } else {
      reject("This is not a DICOM with a PDF");
    }
  });
  return renderPromise;
};

/**
 * Render an image (png or jpg) from File on a html div using cornerstone
 * @instance
 * @function renderWebImage
 * @param {Object} file - The image File object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @returns {Promise} - Return a promise which will resolve when image is displayed
 */
export const renderFileImage = function (
  file: File,
  elementId: string | HTMLElement
) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);

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
        if (!element) {
          console.error("invalid html element: " + elementId);
          return;
        }
        cornerstone.displayImage(element, image);
        let viewport = cornerstone.getViewport(element);

        if (!viewport) {
          console.error("invalid viewport");
          return;
        }

        // @ts-ignore: displayArea is not defined in the type definition TODO-ts check this
        viewport.displayedArea.brhc.x = image.width;
        // @ts-ignore
        viewport.displayedArea.brhc.y = image.height;
        cornerstone.setViewport(element, viewport);
        cornerstone.fitToWindow(element);
        // TODO-ts fix this when csToolsCreateStack is typed
        csToolsCreateStack(element, null, null);
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
export const renderWebImage = function (
  url: string,
  elementId: string | HTMLElement
) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  let renderPromise = new Promise<cornerstone.Image>((resolve, reject) => {
    if (!element) {
      console.error("invalid html element: " + elementId);
      reject("invalid html element: " + elementId);
      return;
    }
    cornerstone.enable(element);
    cornerstone.loadImage(url).then(function (image) {
      if (!element) {
        console.error("invalid html element: " + elementId);
        reject("invalid html element: " + elementId);
        return;
      }
      cornerstone.displayImage(element, image);
      // TODO-ts fix this when csToolsCreateStack is typed
      csToolsCreateStack(element, null, null);
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
export const disableViewport = function (elementId: string | HTMLElement) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
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
export const unloadViewport = function (elementId: string, seriesId: string) {
  disableViewport(elementId);

  if (!seriesId) {
    console.warn(
      "seriesId not provided, use disableViewport if you do not want to uncache images"
    );
  }
  // remove images from cornerstone cache
  if (seriesId && has(store.get("series"), seriesId)) {
    clearImageCache(seriesId);
  }
  store.deleteViewport(elementId);
};

/**
 * Resize a viewport using cornerstone resize
 * And forcing fit to window
 * @instance
 * @function resizeViewport
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const resizeViewport = function (elementId: string | HTMLElement) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
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
export const renderImage = function (
  seriesStack: Series,
  elementId: string | HTMLElement,
  // defaultProps: cornerstone.Viewport
  defaultProps: {
    scale?: number;
    colormap?: string;
    tr_x?: number;
    tr_y?: number;
  }
) {
  let t0 = performance.now();
  // get element and enable it
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  cornerstone.enable(element);

  let series = { ...seriesStack };

  setStore("renderingStatus", [elementId, false]);
  let data = getSeriesData(series, defaultProps) as {
    [key: string]: number | string | boolean;
  }; //TODO-ts improve this
  if (!data.imageId) {
    console.warn("Error during renderImage: imageId has not been loaded yet.");
    return;
  }

  let renderPromise = new Promise<void>((resolve, reject) => {
    // load and display one image (imageId)
    cornerstone.loadImage(data.imageId as string).then(function (image) {
      if (!element) {
        console.error("invalid html element: " + elementId);
        reject();
        return;
      }

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

      if (!viewport) {
        console.error("viewport not found");
        reject();
        return;
      }

      // window width and window level
      // are stored in specific dicom tags
      // (x00281050 and x00281051)
      // if not present check in image object
      data.ww = data.ww ? data.ww : image.windowWidth;
      data.wc = data.wc ? data.wc : image.windowCenter;
      data.defaultWW = data.defaultWW ? data.defaultWW : data.ww;
      data.defaultWC = data.defaultWC ? data.defaultWC : data.wc;

      cornerstone.fitToWindow(element);

      if (defaultProps && defaultProps.scale !== undefined) {
        viewport.scale = defaultProps["scale"];
        cornerstone.setViewport(element, viewport);
      }

      if (
        defaultProps &&
        defaultProps.tr_x !== undefined &&
        defaultProps.tr_y !== undefined
      ) {
        viewport.translation.x = defaultProps["tr_x"];
        viewport.translation.y = defaultProps["tr_y"];
        cornerstone.setViewport(element, viewport);
      }

      // color maps
      if (defaultProps && defaultProps.colormap && image.color == false) {
        applyColorMap(defaultProps["colormap"]);
      }

      let storedViewport = cornerstone.getViewport(element);

      if (!storedViewport) {
        console.error("storedViewport not found");
        reject();
        return;
      }

      storeViewportData(image, element.id, storedViewport as Viewport, data);
      setStore("renderingStatus", [element.id, true]);
      let t1 = performance.now();
      console.log(`Call to renderImage took ${t1 - t0} milliseconds.`);

      let uri = cornerstoneWADOImageLoader.wadouri.parseImageId(
        data.imageId
      ).url;
      cornerstoneWADOImageLoader.wadouri.dataSetCacheManager.unload(uri);
      //@ts-ignore
      image = null;
      //@ts-ignore
      series = null;
      //@ts-ignore
      data = null;
      resolve();
    });
  });

  csToolsCreateStack(element, series.imageIds, (data.imageIndex as number) - 1);
  toggleMouseToolsListeners(elementId, false);

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
  series: Series,
  elementId: string | HTMLElement,
  imageIndex: number,
  cacheImage: boolean
) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  let imageId = series.imageIds[imageIndex];

  if (imageId) {
    if (series.is4D) {
      const timestamp = series.instances[imageId].metadata.contentTime;
      const timeId =
        (series.instances[imageId].metadata
          .temporalPositionIdentifier as number) - 1; // timeId from 0 to N
      setStore("timeId", [elementId, timeId]);
      setStore("timestamp", [elementId, timestamp]);
    }

    if (cacheImage) {
      cornerstone.loadAndCacheImage(imageId).then(function (image) {
        if (!element) {
          console.log("not element");
          return;
        }
        cornerstone.displayImage(element, image);
        setStore("sliceId", [elementId, imageIndex]);
        setStore("minPixelValue", [elementId, image.minPixelValue]);
        setStore("maxPixelValue", [elementId, image.maxPixelValue]);
      });
    } else {
      cornerstone.loadImage(imageId).then(function (image) {
        if (!element) {
          console.log("not element");
          return;
        }
        cornerstone.displayImage(element, image);
        setStore("sliceId", [elementId, imageIndex]);
        setStore("minPixelValue", [elementId, image.minPixelValue]);
        setStore("maxPixelValue", [elementId, image.maxPixelValue]);
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
export const resetViewports = function (elementIds: string[]) {
  each(elementIds, function (elementId) {
    let element = document.getElementById(elementId);
    if (!element) {
      console.error("invalid html element: " + elementId);
      return;
    }

    const defaultViewport = store.get(["viewports", elementId, "default"]);

    let viewport = cornerstone.getViewport(element);

    if (!viewport) {
      throw new Error("viewport not found");
    }

    viewport.scale = defaultViewport.scale;
    viewport.rotation = defaultViewport.rotation;
    viewport.translation.x = defaultViewport.translation.x;
    viewport.translation.y = defaultViewport.translation.y;
    viewport.voi.windowWidth = defaultViewport.voi.windowWidth;
    viewport.voi.windowCenter = defaultViewport.voi.windowCenter;
    viewport.hflip = false;
    viewport.vflip = false;
    viewport.invert = false;

    cornerstone.setViewport(element, viewport);
    cornerstone.fitToWindow(element);
    cornerstone.updateImage(element);

    setStore("scale", [elementId, viewport.scale]);
    setStore("rotation", [elementId, viewport.rotation]);
    setStore("translation", [
      elementId,
      viewport.translation.x,
      viewport.translation.y
    ]);
    setStore("contrast", [
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
  elementId: string,
  viewportData: Viewport,
  activeTool: string
) {
  let element = document.getElementById(elementId as string);
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
        setStore("contrast", [
          el.element.id,
          viewportData.voi?.windowWidth,
          viewportData.voi?.windowCenter
        ]);
      });
      break;
    case "Pan":
      setStore("translation", [
        elementId,
        viewportData.translation?.x,
        viewportData.translation?.y
      ]);
      break;
    case "Zoom":
      setStore("scale", [elementId, viewportData.scale]);
      break;
    case "Rotate":
      setStore("rotation", [elementId, viewportData.rotation]);
      break;
    case "mouseWheel":
      const viewport = store.get(["viewports", elementId]);
      const isTimeserie = viewport.isTimeserie;
      if (isTimeserie) {
        const index = viewportData.newImageIdIndex;
        const timeId = viewport.timeIds[index];
        const timestamp = viewport.timestamps[index];
        setStore("timeId", [elementId, timeId]);
        setStore("timestamp", [elementId, timestamp]);
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
export const storeViewportData = function (
  image: cornerstone.Image,
  elementId: string,
  viewport: Viewport,
  data: { [key: string]: any } // TODO-ts what is this?
) {
  setStore("dimensions", [elementId, data.rows, data.cols]);
  setStore("spacing", [elementId, data.spacing_x, data.spacing_y]);
  setStore("thickness", [elementId, data.thickness]);
  setStore("minPixelValue", [elementId, image.minPixelValue]);
  setStore("maxPixelValue", [elementId, image.maxPixelValue]);
  // slice id from 0 to n - 1
  setStore("minSliceId", [elementId, 0]);
  setStore("sliceId", [elementId, data.imageIndex]);
  setStore("maxSliceId", [elementId, data.numberOfSlices - 1]);

  if (data.isTimeserie) {
    setStore("minTimeId", [elementId, 0]);
    setStore("timeId", [elementId, data.timeIndex]);
    setStore("maxTimeId", [elementId, data.numberOfTemporalPositions - 1]);
    let maxSliceId = data.numberOfSlices * data.numberOfTemporalPositions - 1;
    setStore("maxSliceId", [elementId, maxSliceId]);

    setStore("timestamp", [elementId, data.timestamp]);
    setStore("timestamps", [elementId, data.timestamps]);
    setStore("timeIds", [elementId, data.timeIds]);
  }

  setStore("defaultViewport", [
    elementId,
    viewport.scale,
    viewport.rotation,
    viewport.translation?.x,
    viewport.translation?.y,
    data.defaultWW,
    data.defaultWC
  ]);
  setStore("scale", [elementId, viewport.scale]);
  setStore("rotation", [elementId, viewport.rotation]);
  setStore("translation", [
    elementId,
    viewport.translation?.x,
    viewport.translation?.y
  ]);
  setStore("contrast", [
    elementId,
    viewport.voi?.windowWidth,
    viewport.voi?.windowCenter
  ]);
  setStore("isColor", [elementId, data.isColor]);
  setStore("isMultiframe", [elementId, data.isMultiframe]);
  setStore("isTimeserie", [elementId, data.isTimeserie]);
  setStore("isPDF", [elementId, false]);
};

/**
 * Invert pixels of an image
 * @instance
 * @function invertImage
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const invertImage = function (elementId: string | HTMLElement) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let viewport = cornerstone.getViewport(element);

  if (!viewport) {
    throw new Error("Viewport is undefined");
  }

  viewport.invert = !viewport.invert;
  cornerstone.setViewport(element, viewport);
};

/**
 * Flip image around horizontal axis
 * @instance
 * @function flipImageHorizontal
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const flipImageHorizontal = function (elementId: string | HTMLElement) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let viewport = cornerstone.getViewport(element);

  if (!viewport) {
    throw new Error("Viewport is undefined");
  }

  viewport.hflip = !viewport.hflip;
  cornerstone.setViewport(element, viewport);
};

/**
 * Flip image around vertical axis
 * @instance
 * @function flipImageVertical
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const flipImageVertical = function (elementId: string | HTMLElement) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let viewport = cornerstone.getViewport(element);

  if (!viewport) {
    throw new Error("Viewport is undefined");
  }

  viewport.vflip = !viewport.vflip;
  cornerstone.setViewport(element, viewport);
};

/**
 * Rotate image by 90° in left direction
 * @instance
 * @function rotateImageLeft
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const rotateImageLeft = function (elementId: string | HTMLElement) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let viewport = cornerstone.getViewport(element);

  if (!viewport) {
    throw new Error("Viewport is undefined");
  }

  viewport.rotation -= 90;
  cornerstone.setViewport(element, viewport);
};

/**
 * Rotate image by 90° in right direction
 * @instance
 * @function rotateImageRight
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const rotateImageRight = function (elementId: string | HTMLElement) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  let viewport = cornerstone.getViewport(element);

  if (!viewport) {
    throw new Error("Viewport is undefined");
  }

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
let getSeriesData = function (
  series: Series,
  defaultProps: { [key: string]: number | string | boolean }
) {
  let data: { [key: string]: number | string | boolean | Array<any> } = {}; // TODO-ts better type definition
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
    data.timestamp = series.instances[series.imageIds[0]].metadata[
      "x00080033"
    ] as number;
    data.imageId = series.imageIds[data.imageIndex];
    data.timestamps = [];
    data.timeIds = [];
    each(series.imageIds, function (imageId) {
      (data.timestamps as any[]).push(
        series.instances[imageId].metadata.contentTime
      );
      (data.timeIds as any[]).push(
        (series.instances[imageId].metadata
          .temporalPositionIdentifier as number) - 1 // timeId from 0 to N
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
      (defaultProps["sliceNumber"] as number) >= 0 && // slice number between 0 and n-1
      defaultProps["sliceNumber"] < data.numberOfSlices
        ? defaultProps["sliceNumber"]
        : Math.floor((data.numberOfSlices as number) / 2);

    data.imageId = series.imageIds[data.imageIndex as number];
  }
  data.isColor = series.color as boolean;
  data.isPDF = series.isPDF;

  // rows, cols and x y z spacing
  data.rows = series.instances[series.imageIds[0]].metadata[
    "x00280010"
  ] as number;
  data.cols = series.instances[series.imageIds[0]].metadata[
    "x00280011"
  ] as number;
  data.thickness = series.instances[series.imageIds[0]].metadata[
    "x00180050"
  ] as number;

  let spacing = series.instances[series.imageIds[0]].metadata[
    "x00280030"
  ] as number[];
  data.spacing_x = spacing[0];
  data.spacing_y = spacing[1];

  // window center and window width
  data.wc =
    defaultProps && defaultProps.wc !== undefined
      ? defaultProps["wc"]
      : (series.instances[series.imageIds[0]].metadata["x00281050"] as number);

  data.ww =
    defaultProps && defaultProps.ww !== undefined
      ? defaultProps["ww"]
      : (series.instances[series.imageIds[0]].metadata["x00281051"] as number);

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
    console.error("invalid image metadata (rows or cols is null)");
    setStore("errorLog", "Invalid Image Metadata");
  } else {
    setStore("errorLog", "");
  }

  return data;
};