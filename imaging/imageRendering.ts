/** @module imaging/imageRendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone
 */

// external libraries
import cornerstone from "cornerstone-core";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import { each, has } from "lodash";

// internal libraries
import { getPerformanceMonitor } from "./monitors/performance";
import { getFileImageId } from "./loaders/fileLoader";
import { csToolsCreateStack } from "./tools/main";
import { toggleMouseToolsListeners } from "./tools/interaction";
import store, { set as setStore } from "./imageStore";
import { applyColorMap } from "./imageColormaps";
import { isElement } from "./imageUtils";
import {
  Image,
  Instance,
  Series,
  StoreViewport,
  StoreViewportOptions,
  Viewport
} from "./types";

/*
 * This module provides the following functions to be exported:
 * clearImageCache(seriesId)
 * loadAndCacheImage(imageIndex)
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
export const clearImageCache = function (seriesId?: string) {
  if (seriesId) {
    let series = store.get("series");
    if (has(series, seriesId)) {
      each(series[seriesId].imageIds, function (imageId: string) {
        if (cornerstone.imageCache.cachedImages.length > 0) {
          try {
            cornerstone.imageCache.removeImageLoadObject(imageId);
          } catch (e) {
            console.warn("no cached image");
          }
        } else {
          let uri =
            cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId).url;
          cornerstoneDICOMImageLoader.wadouri.dataSetCacheManager.unload(uri);
        }
      });

      store.removeSeriesId(seriesId);
      console.log("Uncached images for ", seriesId);
    }
  } else {
    cornerstone.imageCache.purgeCache();
  }
};

/**
 * Load and cache a single image
 * Add series's imageIds into store
 * @instance
 * @function loadAndCacheImage
 * @param {Object} series the parsed series data
 * @param {number} imageIndex the image index in the imageIds array
 */
export function loadAndCacheImage(
  series: Series,
  imageIndex: number
): Promise<true> {
  const t0 = performance.now();
  // add serie's imageIds into store
  store.addSeriesId(series.seriesUID, series.imageIds);
  const imageId: string | undefined = series.imageIds[imageIndex];

  const cachePromise = new Promise<true>((resolve, reject) => {
    if (imageId) {
      cornerstone.loadAndCacheImage(imageId).then(function () {
        const t1 = performance.now();
        console.log(`Call to cacheImages took ${t1 - t0} milliseconds.`);
        console.log(
          `Cached image with index ${imageIndex} for ${series.seriesUID}`
        );
        resolve(true);
      });
    } else {
      reject(`Error: wrong image index ${imageIndex}, no imageId available`);
    }
  });
  return cachePromise;
}

/**
 * Load and cache all serie's images
 * Add series's imageIds into store
 * @instance
 * @function loadAndCacheImages
 * @param {Object} series the parsed series data
 * @param {Function} callback a callback function
 */
export function loadAndCacheImages(
  series: Series,
  callback: (payload: {
    seriesId: string;
    loading: number;
    series: Series;
  }) => any
) {
  const t0 = performance.now();
  let cachingCounter = 0;
  const response = {
    seriesId: series.seriesUID,
    loading: 0,
    series: {} as Series
  };
  callback(response);
  // add serie's imageIds into store
  store.addSeriesId(series.seriesUID, series.imageIds);
  // add serie's caching progress into store
  setStore(["progress", series.seriesUID, 0]);

  function updateProgress() {
    cachingCounter += 1;
    const cachingPercentage = Math.floor(
      (cachingCounter / series.imageIds.length) * 100
    );
    response.loading = cachingPercentage;
    setStore(["progress", series.seriesUID, cachingPercentage]);
    if (cachingCounter == series.imageIds.length) {
      const t1 = performance.now();
      console.log(`Call to cacheImages took ${t1 - t0} milliseconds.`);
      console.log(`Cached images for ${series.seriesUID}`);
      response.series = series;
    }
  }

  each(series.imageIds, function (imageId: string | undefined, index: number) {
    if (imageId) {
      cornerstone.loadAndCacheImage(imageId).then(function () {
        updateProgress();
        callback(response);
      });
    } else {
      updateProgress();
      console.warn(
        `Stack is not fully loaded, skipping cache for index ${index}`
      );
      callback(response);
    }
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

  let renderPromise = new Promise<true>((resolve, reject) => {
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
      const id: string = isElement(elementId)
        ? element.id
        : (elementId as string);
      setStore(["isPDF", id, true]);
      let t1 = performance.now();
      console.log(`Call to renderDICOMPDF took ${t1 - t0} milliseconds.`);
      image = null;
      fileTag = undefined;
      pdfByteArray = undefined;
      PDF = null;
      resolve(true);
    } else {
      reject("This is not a DICOM with a PDF");
    }
  });
  return renderPromise;
};

/**
 * Render an image (png or jpg) from File on a html div using cornerstone
 * @instance
 * @function renderFileImage
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
        const viewport = cornerstone.getViewport(element) as Viewport;

        if (!viewport) {
          console.error("invalid viewport");
          return;
        }

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
export const disableViewport = function (elementId: string | HTMLElement) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }
  const id: string = isElement(elementId) ? element.id : (elementId as string);
  toggleMouseToolsListeners(id, true);
  cornerstone.disable(element);
  setStore(["ready", id, false]);
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
  defaultProps: StoreViewportOptions
): Promise<true> {
  const t0 = performance.now();
  // get element and enable it
  const element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return new Promise((_, reject) =>
      reject("invalid html element: " + elementId)
    );
  }
  const id: string = isElement(elementId) ? element.id : (elementId as string);
  cornerstone.enable(element);

  setStore(["ready", id, false]);

  let series = { ...seriesStack };
  let data = getSeriesData(series, defaultProps);
  if (!data.imageId) {
    console.warn("error during renderImage: imageId has not been loaded yet.");
    return new Promise((_, reject) => {
      setStore(["pendingSliceId", id, data.imageIndex]);
      reject("error during renderImage: imageId has not been loaded yet.");
    });
  }

  const renderPromise = new Promise<true>((resolve, reject) => {
    // load and display one image (imageId)
    cornerstone.loadImage(data.imageId as string).then(function (image) {
      if (!element) {
        console.error("invalid html element: " + elementId);
        reject("invalid html element: " + elementId);
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

      const viewport = cornerstone.getViewport(element);

      if (!viewport) {
        console.error("viewport not found");
        reject("viewport not found for element: " + elementId);
        return;
      }

      // window width and window level
      // are stored in specific dicom tags
      // (x00281050 and x00281051)
      // if not present check in image object
      if (data.viewport?.voi?.windowWidth === undefined) {
        data.viewport.voi.windowWidth = image.windowWidth;
      }
      if (data.viewport?.voi?.windowCenter === undefined) {
        data.viewport.voi.windowCenter = image.windowCenter;
      }
      if (data.default?.voi?.windowWidth === undefined) {
        data.default.voi.windowWidth = data.viewport.voi.windowWidth;
      }
      if (data.default?.voi?.windowCenter === undefined) {
        data.default.voi.windowCenter = data.viewport.voi.windowCenter;
      }

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
        viewport.translation.x = defaultProps.tr_x;
        viewport.translation.y = defaultProps.tr_y;
        cornerstone.setViewport(element, viewport);
      }

      // color maps
      if (defaultProps && defaultProps.colormap && image.color == false) {
        applyColorMap(defaultProps["colormap"]);
      }

      const storedViewport = cornerstone.getViewport(element);

      if (!storedViewport) {
        console.error("storedViewport not found");
        reject("storedViewport not found for element: " + elementId);
        return;
      }

      storeViewportData(image, element.id, storedViewport as Viewport, data);
      setStore(["ready", element.id, true]);
      const t1 = performance.now();
      console.log(`Call to renderImage took ${t1 - t0} milliseconds.`);

      const uri = cornerstoneDICOMImageLoader.wadouri.parseImageId(
        data.imageId
      ).url;
      cornerstoneDICOMImageLoader.wadouri.dataSetCacheManager.unload(uri);
      //@ts-ignore
      image = null;
      //@ts-ignore
      series = null;
      //@ts-ignore
      data = null;
      resolve(true);
    });
  });

  csToolsCreateStack(element, series.imageIds, (data.imageIndex as number) - 1);
  toggleMouseToolsListeners(id, false);

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
export const updateImage = async function (
  series: Series,
  elementId: string | HTMLElement,
  imageIndex: number,
  cacheImage: boolean
): Promise<void> {
  const element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    throw "not element";
  }

  const id: string = isElement(elementId) ? element.id : (elementId as string);
  const imageId = series.imageIds[imageIndex];
  if (!imageId) {
    setStore(["pendingSliceId", id, imageIndex]);
    throw `Error: wrong image index ${imageIndex}, no imageId available`;
  }

  if (series.is4D) {
    const timestamp = series.instances[imageId].metadata.contentTime;
    const timeId =
      series.instances[imageId].metadata.temporalPositionIdentifier! - 1; // timeId from 0 to N
    setStore(["timeId", id as string, timeId]);
    setStore(["timestamp", id as string, timestamp]);
  }

  if (cacheImage) {
    let t0: number | undefined;
    if (getPerformanceMonitor() === true) {
      t0 = performance.now();
    }

    const image = await cornerstone.loadAndCacheImage(imageId);
    cornerstone.displayImage(element, image);

    if (getPerformanceMonitor() === true) {
      const t1 = performance.now();
      if (t0 !== undefined) {
        // check if t0 is defined before using it
        console.log(`Call to updateImage took ${t1 - t0} milliseconds.`);
      }
    }

    setStore(["sliceId", id, imageIndex]);
    const pendingSliceId = store.get(["viewports", id, "pendingSliceId"]);
    if (imageIndex == pendingSliceId) {
      setStore(["pendingSliceId", id, undefined]);
    }
    setStore(["minPixelValue", id, image.minPixelValue]);
    setStore(["maxPixelValue", id, image.maxPixelValue]);
  } else {
    let t0: number | undefined;
    if (getPerformanceMonitor() === true) {
      t0 = performance.now();
    }

    const image = await cornerstone.loadImage(imageId);
    cornerstone.displayImage(element, image);

    if (getPerformanceMonitor() === true) {
      const t1 = performance.now();
      if (t0 !== undefined) {
        // check if t0 is defined before using it
        console.log(`Call to updateImage took ${t1 - t0} milliseconds.`);
      }
    }

    setStore(["sliceId", id, imageIndex]);
    const pendingSliceId = store.get(["viewports", id, "pendingSliceId"]);
    if (imageIndex == pendingSliceId) {
      setStore(["pendingSliceId", id, undefined]);
    }
    setStore(["minPixelValue", id, image.minPixelValue]);
    setStore(["maxPixelValue", id, image.maxPixelValue]);
  }
};

/**
 * Reset viewport values (scale, translation and wwwc)
 * @instance
 * @function resetViewports
 * @param {Array} elementIds - The array of hmtl div ids
 * @param {Array} keys - The array of viewport sections to resets (default is all)
 */
export const resetViewports = function (
  elementIds: string[],
  keys?: Array<
    "contrast" | "scaleAndTranslation" | "rotation" | "flip" | "zoom"
  >
) {
  each(elementIds, function (elementId: string) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error("invalid html element: " + elementId);
      return;
    }

    const defaultViewport = store.get(["viewports", elementId, "default"]);
    const viewport = cornerstone.getViewport(element);

    if (!viewport) {
      throw new Error("viewport not found");
    }

    if (!keys || keys.find(v => v === "contrast")) {
      viewport.voi.windowWidth = defaultViewport.voi.windowWidth;
      viewport.voi.windowCenter = defaultViewport.voi.windowCenter;
      viewport.invert = defaultViewport.voi.invert;
      setStore([
        "contrast",
        elementId,
        viewport.voi.windowWidth,
        viewport.voi.windowCenter
      ]);
    }

    if (!keys || keys.find(v => v === "scaleAndTranslation")) {
      viewport.scale = defaultViewport.scale;
      setStore(["scale", elementId, viewport.scale]);

      viewport.translation.x = defaultViewport.translation.x;
      viewport.translation.y = defaultViewport.translation.y;
      setStore([
        "translation",
        elementId,
        viewport.translation.x,
        viewport.translation.y
      ]);
    }

    if (!keys || keys.find(v => v === "rotation")) {
      viewport.rotation = defaultViewport.rotation;
      setStore(["rotation", elementId, viewport.rotation]);
    }

    if (!keys || keys.find(v => v === "flip")) {
      viewport.hflip = false;
      viewport.vflip = false;
    }

    if (!keys || keys.find(v => v === "zoom")) {
      viewport.scale = defaultViewport.scale;
      setStore(["scale", elementId, viewport.scale]);
    }

    cornerstone.setViewport(element, viewport);

    if (!keys || keys.find(v => v === "scaleAndTranslation")) {
      cornerstone.fitToWindow(element);
    }
    cornerstone.updateImage(element);
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
  // TODO: understand how to handle synchronized tools
  switch (activeTool) {
    case "Wwwc":
    case "WwwcRegion":
      if (viewportData.voi) {
        setStore([
          "contrast",
          elementId,
          viewportData.voi.windowWidth,
          viewportData.voi.windowCenter
        ]);
      }
      break;
    case "Pan":
      if (viewportData.translation) {
        setStore([
          "translation",
          elementId,
          viewportData.translation.x,
          viewportData.translation.y
        ]);
      }
      break;
    case "Zoom":
      if (viewportData.scale) {
        setStore(["scale", elementId, viewportData.scale]);
      }
      break;
    case "Rotate":
      if (viewportData.rotation) {
        setStore(["rotation", elementId, viewportData.rotation]);
      }
      break;
    case "mouseWheel":
    case "stackscroll":
      const viewport = store.get(["viewports", elementId]);
      const isTimeserie = viewport.isTimeserie;
      if (isTimeserie) {
        const index = viewportData.newImageIdIndex;
        const timeId = viewport.timeIds[index];
        const timestamp = viewport.timestamps[index];
        setStore(["timeId", elementId, timeId]);
        setStore(["timestamp", elementId, timestamp]);
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
  data: ReturnType<typeof getSeriesData>
) {
  setStore(["dimensions", elementId, data.rows, data.cols]);
  setStore(["spacing", elementId, data.spacing_x, data.spacing_y]);
  setStore(["thickness", elementId, data.thickness]);
  setStore(["minPixelValue", elementId, image.minPixelValue]);
  setStore(["maxPixelValue", elementId, image.maxPixelValue]);
  // slice id from 0 to n - 1
  setStore(["minSliceId", elementId, 0]);
  if (data.imageIndex) {
    setStore(["sliceId", elementId, data.imageIndex]);
  }
  const pendingSliceId = store.get(["viewports", elementId, "pendingSliceId"]);
  if (data.imageIndex == pendingSliceId) {
    setStore(["pendingSliceId", elementId, undefined]);
  }

  if (data.isTimeserie) {
    setStore(["minTimeId", elementId, 0]);
    setStore(["timeId", elementId, data.timeIndex || 0]);
    if (data.numberOfSlices && data.numberOfTemporalPositions) {
      setStore(["maxTimeId", elementId, data.numberOfTemporalPositions - 1]);
      let maxSliceId = data.numberOfSlices * data.numberOfTemporalPositions - 1;
      setStore(["maxSliceId", elementId, maxSliceId]);
    }

    setStore(["timestamp", elementId, data.timestamp]);
    setStore(["timestamps", elementId, data.timestamps]);
    setStore(["timeIds", elementId, data.timeIds]);
  } else {
    setStore(["minTimeId", elementId, 0]);
    setStore(["timeId", elementId, 0]);
    setStore(["maxTimeId", elementId, 0]);
    setStore(["timestamp", elementId, 0]);
    setStore(["timestamps", elementId, []]);
    setStore(["timeIds", elementId, []]);
  }

  setStore([
    "defaultViewport",
    elementId,
    viewport.scale || 0,
    viewport.rotation || 0,
    viewport.translation?.x || 0,
    viewport.translation?.y || 0,
    data.default?.voi?.windowWidth,
    data.default?.voi?.windowCenter,
    viewport.invert === true
  ]);
  setStore(["scale", elementId, viewport.scale || 0]);
  setStore(["rotation", elementId, viewport.rotation || 0]);

  setStore([
    "translation",
    elementId,
    viewport.translation?.x || 0,
    viewport.translation?.y || 0
  ]);
  setStore([
    "contrast",
    elementId,
    viewport.voi?.windowWidth || 0,
    viewport.voi?.windowCenter || 0
  ]);
  setStore(["isColor", elementId, data.isColor]);
  setStore(["isMultiframe", elementId, data.isMultiframe]);
  setStore(["isTimeserie", elementId, data.isTimeserie]);
  setStore(["isPDF", elementId, false]);
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
const getSeriesData = function (
  series: Series,
  defaultProps: StoreViewportOptions
) {
  type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
  };
  type SeriesData = StoreViewport;
  const data: RecursivePartial<SeriesData> = {};

  if (series.isMultiframe) {
    data.isMultiframe = true;
    data.numberOfSlices = series.imageIds.length;
    data.imageIndex = 0;
    data.imageId = series.imageIds[data.imageIndex];
    data.isTimeserie = false;
  } else if (series.is4D) {
    data.isMultiframe = false;
    data.isTimeserie = true;
    // check with real indices
    data.numberOfSlices = series.numberOfImages;
    data.numberOfTemporalPositions = series.numberOfTemporalPositions;
    data.imageIndex = 0;
    data.timeIndex = 0;
    data.imageId = series.imageIds[data.imageIndex];
    data.timestamp = series.instances[data.imageId].metadata[
      "x00080033"
    ] as number;
    data.timestamps = [];
    data.timeIds = [];
    each(series.imageIds, function (imageId: string) {
      (data.timestamps as any[]).push(
        series.instances[imageId].metadata.contentTime
      );
      (data.timeIds as any[]).push(
        series.instances[imageId].metadata.temporalPositionIdentifier! - 1 // timeId from 0 to N
      );
    });
  } else {
    data.isMultiframe = false;
    data.isTimeserie = false;
    const numberOfSlices =
      defaultProps && defaultProps.numberOfSlices
        ? defaultProps.numberOfSlices
        : series.imageIds.length;
    data.numberOfSlices = numberOfSlices;
    data.imageIndex =
      defaultProps?.sliceNumber !== undefined && defaultProps?.sliceNumber >= 0 // slice number between 0 and n-1
        ? defaultProps.sliceNumber
        : Math.floor(numberOfSlices / 2);

    data.imageId = series.imageIds[data.imageIndex];
  }
  const instance: Instance | null = data.imageId
    ? series.instances[data.imageId]
    : null;

  data.isColor = series.color as boolean;
  data.isPDF = series.isPDF;
  if (instance) {
    data.rows = instance.metadata.x00280010!;
    data.cols = instance.metadata.x00280011!;
    data.thickness = instance.metadata.x00180050 as number;

    let spacing = instance.metadata.x00280030!;
    data.spacing_x = spacing ? spacing[0] : 1;
    data.spacing_y = spacing ? spacing[1] : 1;
    // window center and window width
    data.viewport = {
      voi: {
        windowCenter:
          defaultProps && defaultProps.wc
            ? defaultProps.wc
            : (instance.metadata.x00281050 as number),
        windowWidth:
          defaultProps && defaultProps.ww
            ? defaultProps.ww
            : (instance.metadata.x00281051 as number)
      }
    };
    data.default = {
      voi: {
        windowCenter:
          defaultProps && has(defaultProps, "defaultWC")
            ? defaultProps.defaultWC
            : data.viewport!.voi!.windowCenter,
        windowWidth:
          defaultProps && has(defaultProps, "defaultWW")
            ? defaultProps.defaultWW
            : data.viewport!.voi!.windowWidth
      }
    };
    if (data.rows == null || data.cols == null) {
      console.warn("invalid image metadata (rows or cols is null)");
      setStore(["errorLog", "Invalid Image Metadata"]);
    } else {
      setStore(["errorLog", ""]);
    }
  } else {
    console.warn(
      `ImageId not found in imageIds with index ${data.imageIndex}.`
    );
  }

  return data as SeriesData;
};
