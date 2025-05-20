/** @module imaging/imageRendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone
 */

// external libraries
import cornerstone from "cornerstone-core";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import { each, has } from "lodash";

// internal libraries
import { logger } from "../common/logger";
import { getDataFromFileManager, getFileManager } from "./imageManagers";
import { toggleMouseToolsListeners } from "./tools/interaction";
import store, { set as setStore } from "./imageStore";
import { applyColorMap } from "./imageColormaps";
import { isElement } from "./imageUtils";
import {
  Instance,
  RenderProps,
  Series,
  StoreViewport,
  Viewport
} from "./types";
import { DEFAULT_TOOLS } from "../common/default";
import { initializeFileImageLoader } from "./imageLoading";
import { generateFiles } from "./parsers/pdf";
import { resetPixelShift, setPixelShift } from "./loaders/dsaImageLoader";

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
 * renderImage(series, elementId, renderOptions)
 * redrawImage(elementId)
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
 * @param {String} uniqueUID - The uniqueUID of the series
 */
export const clearImageCache = function (uniqueUID?: string) {
  const t0 = performance.now();
  if (uniqueUID) {
    clearStandardImageCache(uniqueUID);
    clearDSAImageCache(uniqueUID);
  } else {
    cornerstone.imageCache.purgeCache();
  }
  const t1 = performance.now();
  logger.debug(`Call to clearImageCache took ${t1 - t0} milliseconds.`);
};

/**
 * Purge the cornestone internal cache for standard series
 * @instance
 * @function clearStandardImageCache
 * @param {String} uniqueUID - The uniqueUID of the series
 */
export const clearStandardImageCache = function (uniqueUID: string) {
  const series = store.get("series");
  const imageIds = series?.[uniqueUID]?.imageIds || [];

  if (imageIds.length === 0) return;

  logger.debug(`Clearing image cache for ${uniqueUID}`);
  for (const imageId of imageIds) {
    clearCornerstoneImageCache(imageId);
  }

  store.removeImageIds(uniqueUID);
};

/**
 * Purge the cornestone internal cache for DSA series
 * @instance
 * @function clearDSAImageCache
 * @param {String} uniqueUID - The uniqueUID of the series
 */
export const clearDSAImageCache = function (uniqueUID: string) {
  const dsaUID = `${uniqueUID}-DSA`;
  const series = store.get("series");
  const dsaImageIds = series?.[dsaUID]?.imageIds || [];

  if (dsaImageIds.length === 0) return;

  logger.debug(`Clearing DSA image cache for ${dsaUID}`);
  for (const imageId of dsaImageIds) {
    clearCornerstoneImageCache(imageId);
  }

  store.removeImageIds(dsaUID);
};

/**
 * Purge the cornestone internal cache for image
 * @instance
 * @function clearCornerstoneImageCache
 * @param {String} imageId - The imageId of the image
 */
const clearCornerstoneImageCache = function (imageId: string) {
  try {
    if (cornerstone.imageCache.cachedImages.length > 0) {
      cornerstone.imageCache.removeImageLoadObject(imageId);
    } else {
      const uri = cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId).url;
      cornerstoneDICOMImageLoader.wadouri.dataSetCacheManager.unload(uri);
    }
  } catch (e) {
    logger.warn(`Failed to clear cache for imageId: ${imageId}`, e);
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
  store.addImageIds(series.uniqueUID, series.imageIds);
  const imageId: string | undefined = series.imageIds[imageIndex];

  const cachePromise = new Promise<true>((resolve, reject) => {
    //check if it is a metadata-only object
    if (imageId && series.instances[imageId].metadata.pixelDataLength != 0) {
      cornerstone.loadAndCacheImage(imageId).then(function () {
        setStore(["cached", series.uniqueUID, imageId, true]);
        const t1 = performance.now();
        logger.debug(`Call to cacheImages took ${t1 - t0} milliseconds.`);
        logger.debug(
          `Cached image with index ${imageIndex} for ${series.uniqueUID}`
        );
        resolve(true);
      });
    } else if (series.instances[imageId].metadata.pixelDataLength === 0) {
      reject(`File ${imageIndex}, has no Pixel Data available`);
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
    seriesId: series.uniqueUID,
    loading: 0,
    series: {} as Series
  };
  callback(response);
  // add serie's imageIds into store
  store.addImageIds(series.uniqueUID, series.imageIds);
  // add serie's caching progress into store
  setStore(["progress", series.uniqueUID, 0]);

  function updateProgress() {
    cachingCounter += 1;
    const cachingPercentage = Math.floor(
      (cachingCounter / series.imageIds.length) * 100
    );
    response.loading = cachingPercentage;
    setStore(["progress", series.uniqueUID, cachingPercentage]);
    if (cachingCounter == series.imageIds.length) {
      const t1 = performance.now();
      logger.debug(`Call to cacheImages took ${t1 - t0} milliseconds.`);
      logger.debug(`Cached images for ${series.uniqueUID}`);
      response.series = series;
    }
  }

  each(series.imageIds, function (imageId: string | undefined, index: number) {
    //check if it is a metadata-only object
    if (imageId && series.instances[imageId].metadata.pixelDataLength != 0) {
      cornerstone.loadAndCacheImage(imageId).then(function () {
        setStore(["cached", series.uniqueUID, imageId, true]);
        updateProgress();
        callback(response);
      });
    } else if (series.instances[imageId!].metadata.pixelDataLength === 0) {
      updateProgress();
      //throw new Error(`File ${index} has no Pixel Data`);
    } else {
      updateProgress();
      logger.warn(
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
 * @param {Boolean} convertToImage - An optional flag to convert pdf to image, default is false
 * @returns {Promise} - Return a promise which will resolve when pdf is displayed
 */
export const renderDICOMPDF = function (
  seriesStack: Series,
  elementId: string | HTMLElement,
  convertToImage: boolean = false
): Promise<true> {
  let t0 = performance.now();
  let element: HTMLElement | null = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);

  if (!element) {
    logger.error("invalid html element: " + elementId);
    return new Promise((_, reject) =>
      reject("invalid html element: " + elementId)
    );
  }
  const id: string = isElement(elementId) ? element.id : (elementId as string);

  // check if there is an enabledElement with this id
  // otherwise, we will get an error and we will enable it
  try {
    cornerstone.getEnabledElement(element);
  } catch (e) {
    toggleMouseToolsListeners(id, false);
    cornerstone.enable(element);
  }

  // this by default is the uniqueId of the rendered stack
  const storedUniqueUID = store.get(["viewports", id, "uniqueUID"]);
  const uniqueUID = seriesStack.uniqueUID || seriesStack.seriesUID;
  const isUniqueUIDChanged = storedUniqueUID !== uniqueUID;
  if (isUniqueUIDChanged) {
    logger.debug(`UniqueUID changed from ${storedUniqueUID} to ${uniqueUID}`);
  }

  let renderPromise = new Promise<true>(async (resolve, reject) => {
    let image: Instance | null = seriesStack.instances[seriesStack.imageIds[0]];
    const SOPUID = image.dataSet?.string("x00080016");

    if (isUniqueUIDChanged) {
      setStore(["uniqueUID", element.id, uniqueUID]);
    }

    // check sopUID in order to detect pdf report array
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
        logger.error("No pdf byte array found");
        return;
      }

      if (!element) {
        logger.error("invalid html element: " + elementId);
        return;
      }

      let PDF: Blob | null = new Blob([pdfByteArray], {
        type: "application/pdf"
      });
      let fileURL = URL.createObjectURL(PDF);
      const id: string = isElement(elementId)
        ? element.id
        : (elementId as string);
      // Render using HTML PDF viewer
      if (convertToImage === false) {
        element.innerHTML =
          '<object data="' +
          fileURL +
          '" type="application/pdf" width="100%" height="100%"></object>';
        setStore(["isPDF", id, true]);
        let t1 = performance.now();
        logger.info(`Call to renderDICOMPDF took ${t1 - t0} milliseconds.`);
        image = null;
        fileTag = undefined;
        pdfByteArray = undefined;
        PDF = null;
        resolve(true);
      } else if (convertToImage === true) {
        initializeFileImageLoader();
        let pngFiles = await generateFiles(fileURL);
        // render first page // TODO: render all pages?
        renderFileImage(pngFiles[0], elementId).then(() => {
          let t1 = performance.now();
          logger.info(`Call to renderDICOMPDF took ${t1 - t0} milliseconds.`);
          image = null;
          fileTag = undefined;
          pdfByteArray = undefined;
          PDF = null;
          // activate the scroll stack tool
          if (element) {
            const fileManager = getFileManager();
            if (fileManager) {
              store.addImageIds(uniqueUID, Object.values(fileManager));
            } else {
              logger.error("FileManager is null");
            }
          }

          resolve(true);
        });
      }
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
): Promise<true> {
  const t0 = performance.now();
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);

  if (!element) {
    logger.error("invalid html element: " + elementId);
    return new Promise((_, reject) =>
      reject("invalid html element: " + elementId)
    );
  }
  const id: string = isElement(elementId) ? element.id : (elementId as string);

  // check if there is an enabledElement with this id
  // otherwise, we will get an error and we will enable it
  try {
    cornerstone.getEnabledElement(element);
  } catch (e) {
    cornerstone.enable(element);
  }

  let renderPromise = new Promise<true>((resolve, _) => {
    // check if imageId is already stored in fileManager
    const imageId = getDataFromFileManager(file as File);
    if (imageId) {
      cornerstone.loadImage(imageId).then(function (image) {
        if (!element) {
          logger.error("invalid html element: " + id);
          return;
        }
        cornerstone.displayImage(element, image);
        const viewport = cornerstone.getViewport(element) as Viewport;

        if (!viewport) {
          logger.error("invalid viewport");
          return;
        }
        if (viewport.displayedArea) {
          viewport.displayedArea.brhc.x = image.width;
          viewport.displayedArea.brhc.y = image.height;
        }
        cornerstone.setViewport(element, viewport);
        cornerstone.fitToWindow(element);

        const t1 = performance.now();
        logger.info(`Call to renderFileImage took ${t1 - t0} milliseconds.`);
        //@ts-ignore
        image = null;
        //@ts-ignore
        file = null;
        resolve(true);
      });
    } else {
      logger.warn("imageId not found in fileManager");
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
      logger.error("invalid html element: " + elementId);
      reject("invalid html element: " + elementId);
      return;
    }
    // check if there is an enabledElement with this id
    // otherwise, we will get an error and we will enable it
    try {
      cornerstone.getEnabledElement(element);
    } catch (e) {
      cornerstone.enable(element);
    }
    cornerstone.loadImage(url).then(function (image) {
      if (!element) {
        logger.error("invalid html element: " + elementId);
        reject("invalid html element: " + elementId);
        return;
      }
      cornerstone.displayImage(element, image);
      resolve(image);
    });
  });
  return renderPromise;
};

/**
 * Unrender an image on a html div using cornerstone
 * Remove mouse listeners
 * Remove uniqueUID from viewport store
 * Remove ready flag from viewport store
 * @instance
 * @function disableViewport
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const disableViewport = function (elementId: string | HTMLElement) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    logger.error("invalid html element: " + elementId);
    return;
  }
  toggleMouseToolsListeners(element, true);
  cornerstone.disable(element);
  const id: string = isElement(elementId) ? element.id : (elementId as string);

  resetPixelShift(id);

  setStore(["uniqueUID", id, undefined]); // remove uniqueUID from viewport store
  setStore(["ready", id, false]); // set ready to false in viewport store
};

/**
 * Unrender an image on a html div using cornerstone
 * Remove mouse listeners
 * Remove uniqueUID from viewport store
 * Remove ready flag from viewport store
 * Remove image from cornerstone cache
 * Delete viewport from store
 * @instance
 * @function unloadViewport
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const unloadViewport = function (elementId: string) {
  const uniqueUID = store.get(["viewports", elementId, "uniqueUID"]);
  if (!uniqueUID) {
    logger.error("no uniqueUID found in store");
    return;
  }
  disableViewport(elementId);
  // remove images from cornerstone cache
  if (has(store.get("series"), uniqueUID)) {
    clearImageCache(uniqueUID);
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
  let id = isElement(elementId)
    ? (elementId as HTMLElement).id
    : (elementId as string);

  let element = document.getElementById(id);
  if (!element) {
    logger.error("invalid html element: " + elementId);
    return;
  }

  const colPixelSpacing = store.get(["viewports", id, "spacing_x"]);
  const rowPixelSpacing = store.get(["viewports", id, "spacing_y"]);

  if (rowPixelSpacing !== colPixelSpacing) {
    const viewport = cornerstone.getViewport(element) as Viewport;
    if (!viewport) {
      logger.error("Unable to get viewport");
      return;
    }
    const width = store.get(["viewports", id, "cols"]);
    const height = store.get(["viewports", id, "rows"]);

    if (width === undefined || height === undefined) {
      logger.error("Viewport dimensions are undefined");
      return;
    }

    viewport.displayedArea = viewport.displayedArea || {
      tlhc: { x: 0, y: 0 },
      brhc: { x: width, y: height },
      presentationSizeMode: "SCALE TO FIT",
      rowPixelSpacing: 1,
      columnPixelSpacing: 1
    };

    cornerstone.setViewport(element, viewport);

    logger.info(
      `Anisotropic pixel spacing with aspect ratio: ${rowPixelSpacing / colPixelSpacing} - viewport updated`
    );
  } else {
    cornerstone.resize(element, true); // true flag forces fitToWindow
  }
};

/**
 * Cache image and render it in a html div using cornerstone
 * @instance
 * @function renderImage
 * @param {Object} seriesStack - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {RenderProps | undefined} options - Optional properties
 * @return {Promise} Return a promise which will resolve when image is displayed
 */
export const renderImage = function (
  seriesStack: Series,
  elementId: string | HTMLElement,
  options?: RenderProps
): Promise<true> {
  const t0 = performance.now();

  // get element and enable it
  const element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    logger.error(`invalid html element: ${elementId}`);
    return new Promise((_, reject) =>
      reject(`invalid html element: ${elementId}`)
    );
  }
  const id: string = isElement(elementId) ? element.id : (elementId as string);
  // check if there is an enabledElement with this id
  // otherwise, we will get an error and we will enable it
  try {
    cornerstone.getEnabledElement(element);
  } catch (e) {
    cornerstone.enable(element);
    // set ready to false since we are loading a new image
    setStore(["ready", id, false]);
    toggleMouseToolsListeners(id, false);
  }

  let series = { ...seriesStack };
  const renderOptions = options ? options : {};
  let data: StoreViewport = getSeriesData(series, renderOptions);
  logger.debug(`Rendering imageIndex: ${data.imageIndex}`);

  if (!data.imageId) {
    logger.warn("error during renderImage: imageId has not been loaded yet.");
    return new Promise((_, reject) => {
      setStore(["pendingSliceId", id, data.imageIndex]);
      reject("error during renderImage: imageId has not been loaded yet.");
    });
  }

  // this by default is the uniqueId of the rendered stack
  const storedUniqueUID = store.get(["viewports", id, "uniqueUID"]);
  const isUniqueUIDChanged = storedUniqueUID !== data.uniqueUID;
  if (isUniqueUIDChanged) {
    logger.debug(
      `uniqueUID changed from ${storedUniqueUID} to ${data.uniqueUID}`
    );
  }

  // DSA ALGORITHM OPTIONS
  const dsaEnabled = store.get(["viewports", id, "isDSAEnabled"]);
  const pixelShift = store.get(["viewports", id, "pixelShift"]);
  if (dsaEnabled === true) {
    data.imageId = series.dsa!.imageIds[data.imageIndex!];
    // get the optional custom pixel shift for DSA images
    if (pixelShift !== undefined) {
      logger.debug(`set pixelShift: ${pixelShift}`);
      setPixelShift(pixelShift);
    }
  }

  const loadImageFunction =
    options && options.cached
      ? cornerstone.loadAndCacheImage
      : cornerstone.loadImage;

  const renderPromise = new Promise<true>((resolve, reject) => {
    //check if it is a metadata-only object
    const pixelDataLengthAllowed = dsaEnabled
      ? true
      : data.imageId &&
      series.instances[data.imageId!].metadata.pixelDataLength != 0;
    if (pixelDataLengthAllowed === true) {
      // load and display one image (imageId)
      loadImageFunction(data.imageId as string).then(function (image) {
        if (!element) {
          logger.error(`invalid html element: ${elementId}`);
          reject(`invalid html element: ${elementId}`);
          return;
        }

        // display the image on the element
        cornerstone.displayImage(element, image);
        logger.debug(`Image has been displayed on the element: ${elementId}`);

        // if cached is true, set the image as cached in the store
        if (renderOptions.cached === true) {
          setStore(["cached", series.uniqueUID, data.imageId as string, true]);
          logger.debug("Image has been cached into store");
        }

        // handle the optional layer
        if (series.layer) {
          series.layer.id = cornerstone.addLayer(
            element,
            image,
            series.layer.options
          );
          logger.debug("Layer has been added to the element");
        }

        // fit the image to the window with standard scaling
        cornerstone.fitToWindow(element);

        // update viewport data with default properties
        const viewport = cornerstone.getViewport(element);
        if (!viewport) {
          logger.error("viewport not found");
          reject("viewport not found for element: " + elementId);
          return;
        }

        // set the optional custom zoom
        if (renderOptions.scale !== undefined) {
          // store default scale value if not specified
          if (data.default?.scale === undefined) {
            data.default!.scale = viewport.scale;
          }
          viewport.scale = renderOptions.scale;
          logger.debug(
            `updating cornerstone viewport with custom scale value: ${renderOptions.scale}`
          );
        }
        // set the optional custom translation
        if (renderOptions.translation !== undefined) {
          // store default translation value if not specified
          if (data.default?.translation === undefined) {
            data.default!.translation = data.default!.translation || {
              x: 0,
              y: 0
            };
            data.default!.translation.x = viewport.translation.x || 0;
            data.default!.translation.y = viewport.translation.y || 0;
          }
          viewport.translation.x = renderOptions.translation.x;
          viewport.translation.y = renderOptions.translation.y;
          logger.debug(
            `updating cornerstone viewport with custom translation values: ${renderOptions.translation.x}, ${renderOptions.translation.y}`
          );
        }
        // set the optional custom rotation
        if (renderOptions.rotation !== undefined) {
          // store default rotation value if not specified
          if (data.default?.rotation === undefined) {
            data.default!.rotation = viewport.rotation || 0;
          }
          viewport.rotation = renderOptions.rotation;
          logger.debug(
            `updating cornerstone viewport with custom rotation value: ${renderOptions.rotation}`
          );
        }
        // set the optional custom contrast
        if (renderOptions.voi !== undefined) {
          viewport.voi.windowWidth = renderOptions.voi.windowWidth;
          viewport.voi.windowCenter = renderOptions.voi.windowCenter;
          logger.debug(
            `updating cornerstone viewport with custom contrast values: ${renderOptions.voi.windowWidth}, ${renderOptions.voi.windowCenter}`
          );
        }

        // if uniqueUID has changed update the value into the store
        if (isUniqueUIDChanged) {
          setStore(["uniqueUID", element.id, data.uniqueUID]);
          if (renderOptions.scale === undefined) {
            viewport.scale = data.default?.scale || viewport.scale;
            logger.debug(
              "updating cornerstone viewport with default scale value: ",
              viewport.scale
            );
          }
          if (renderOptions.translation === undefined) {
            viewport.translation.x = data.default?.translation.x || 0;
            viewport.translation.y = data.default?.translation.y || 0;
            logger.debug(
              "updating cornerstone viewport with default translation values: ",
              viewport.translation.x,
              viewport.translation.y
            );
          }
          if (renderOptions.rotation === undefined) {
            viewport.rotation = data.default?.rotation;
            logger.debug(
              "updating cornerstone viewport with default rotation value: ",
              viewport.rotation
            );
          }
          // if the uniqueUID has changed, update the viewport voi values
          // with the default values from the series
          // if the voi is not defined in the renderOptions
          if (renderOptions.voi === undefined) {
            viewport.voi.windowWidth =
              data.default?.voi?.windowWidth || image.windowWidth;
            viewport.voi.windowCenter =
              data.default?.voi?.windowCenter || image.windowCenter;
            logger.debug(
              "updating cornerstone viewport with default voi values: ",
              viewport.voi.windowWidth,
              viewport.voi.windowCenter
            );
          }
        }
        cornerstone.setViewport(element, viewport);

        // set the optional custom color map
        if (renderOptions.colormap !== undefined) {
          applyColorMap(renderOptions.colormap);
          logger.debug("updating cornerstone viewport with custom colormap");
        }

        storeViewportData(image, element.id, viewport as Viewport, data);
        setStore(["ready", element.id, true]);
        const t1 = performance.now();
        logger.debug(`Call to renderImage took ${t1 - t0} milliseconds.`);

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
    } else {
      setStore(["ready", element.id, true]);
      resolve(true);
    }
  });
  return renderPromise;
};

/**
 * Redraw the cornerstone image
 * @instance
 * @function redrawImage
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export const redrawImage = function (elementId: string): void {
  const element = document.getElementById(elementId);
  if (element) {
    const cornestoneElement = cornerstone.getEnabledElement(element);
    cornerstone.drawImage(cornestoneElement, true);
  } else {
    logger.error("invalid html element: " + elementId);
  }
};

/**
 * !!! DEPRECATED FUNCTION WILL BE REMOVED IN THE FUTURE !!!
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
  const isDSAEnabled = store.get(["viewports", id, "isDSAEnabled"]);
  const imageId =
    isDSAEnabled === true
      ? series.dsa!.imageIds[imageIndex]
      : series.imageIds[imageIndex];

  // check if it is a metadata-only object
  if (
    !isDSAEnabled &&
    imageId &&
    series.instances[imageId].metadata.pixelDataLength === 0
  ) {
    return;
  }

  if (isDSAEnabled === true) {
    // get the optional custom pixel shift
    const pixelShift = store.get(["viewports", id, "pixelShift"]);
    setPixelShift(pixelShift);
  }

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

    cornerstone.loadAndCacheImage(imageId).then(function (image) {
      cornerstone.displayImage(element, image);

      const t1 = performance.now();
      if (t0 !== undefined) {
        // check if t0 is defined before using it
        logger.debug(
          `Call to updateImage for viewport ${id} took ${t1 - t0} milliseconds.`
        );
      }

      setStore(["cached", series.uniqueUID, imageId, true]);
      setStore(["sliceId", id, imageIndex]);
      const pendingSliceId = store.get(["viewports", id, "pendingSliceId"]);
      if (imageIndex == pendingSliceId) {
        setStore(["pendingSliceId", id, undefined]);
      }
      setStore(["minPixelValue", id, image.minPixelValue]);
      setStore(["maxPixelValue", id, image.maxPixelValue]);
    });
  } else {
    let t0: number | undefined;
    t0 = performance.now();

    const image = await cornerstone.loadImage(imageId);
    cornerstone.displayImage(element, image);

    const t1 = performance.now();
    if (t0 !== undefined) {
      // check if t0 is defined before using it
      logger.debug(
        `Call to updateImage for viewport ${id} took ${t1 - t0} milliseconds.`
      );
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
      logger.error("invalid html element: " + elementId);
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
 * @param {string} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Viewport} viewportData - The new viewport data
 * @param {string} activeTool - The active tool on the viewport
 */
export const updateViewportData = function (
  elementId: string,
  viewportData: Viewport,
  activeTool: string
) {
  let element = document.getElementById(elementId as string);
  if (!element) {
    logger.error("invalid html element: " + elementId);
    return;
  }
  const toolsNames = Object.keys(DEFAULT_TOOLS);
  const isValidTool = toolsNames.includes(activeTool);
  if (isValidTool === true) {
    switch (activeTool) {
      case "WwwcRegion":
      case "WwwcRemoveRegion":
      case "Wwwc":
      case "Wwwl":
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
      case "CustomMouseWheelScroll":
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
        // logger.warn("unhandled tool: " + activeTool);
        break;
    }
  } else {
    logger.warn("unknown tool: " + activeTool);
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
  const t0 = performance.now();

  setStore(["dimensions", elementId, data.rows, data.cols]);
  setStore(["spacing", elementId, data.spacing_x, data.spacing_y]);
  setStore(["thickness", elementId, data.thickness]);
  setStore(["minPixelValue", elementId, image.minPixelValue]);
  setStore(["maxPixelValue", elementId, image.maxPixelValue]);
  setStore(["modality", elementId, data.modality]);
  // slice id from 0 to n - 1
  setStore(["minSliceId", elementId, 0]);
  if (data.imageIndex !== undefined) {
    setStore(["sliceId", elementId, data.imageIndex]);
  }
  const pendingSliceId = store.get(["viewports", elementId, "pendingSliceId"]);
  if (data.imageIndex == pendingSliceId) {
    setStore(["pendingSliceId", elementId, undefined]);
  }

  if (data.numberOfSlices !== undefined) {
    setStore(["maxSliceId", elementId, data.numberOfSlices - 1]);
  }

  if (data.isTimeserie) {
    setStore([
      "numberOfTemporalPositions",
      elementId,
      data.numberOfTemporalPositions as number
    ]);
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
    (data.default && data.default.scale) || viewport.scale || 0,
    (data.default && data.default.rotation) || 0,
    (data.default && data.default.translation?.x) || 0,
    (data.default && data.default.translation?.y) || 0,
    (data.default && data.default?.voi?.windowWidth) ||
    viewport.voi?.windowWidth ||
    255,
    (data.default && data.default?.voi?.windowCenter) ||
    viewport.voi?.windowCenter ||
    128,
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
    viewport.voi?.windowWidth || 255,
    viewport.voi?.windowCenter || 128
  ]);
  setStore(["isColor", elementId, data.isColor]);
  setStore(["isMultiframe", elementId, data.isMultiframe]);
  if (data.isMultiframe) {
    setStore(["numberOfFrames", elementId, data.numberOfFrames as number]);
  }
  setStore(["isTimeserie", elementId, data.isTimeserie]);
  setStore(["isPDF", elementId, false]);
  setStore(["waveform", elementId, data.waveform]);
  setStore(["dsa", elementId, data.dsa]);

  logger.debug("---Viewport data stored---");
  logger.debug(store.get(["viewports", elementId]));
  logger.debug("--------------------------");

  const t1 = performance.now();
  logger.debug(`Call to storeViewportData took ${t1 - t0} milliseconds.`);
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
    logger.error("invalid html element: " + elementId);
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
    logger.error("invalid html element: " + elementId);
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
    logger.error("invalid html element: " + elementId);
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
    logger.error("invalid html element: " + elementId);
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
    logger.error("invalid html element: " + elementId);
    return;
  }
  let viewport = cornerstone.getViewport(element);

  if (!viewport) {
    throw new Error("Viewport is undefined");
  }

  viewport.rotation += 90;
  cornerstone.setViewport(element, viewport);
};

/**
 * Update Image manager temporal viewport data
 * @instance
 * @function updateTemporalViewportData
 * @param {Series} seriesStack The Id of the series
 * @param {String} elementId The Id of the html element
 */
export const updateTemporalViewportData = function (
  seriesStack: Series,
  elementId: string
): void {
  let series = { ...seriesStack };

  const data = getTemporalSeriesData(series);
  if (series.is4D) {
    setStore([
      "numberOfTemporalPositions",
      elementId,
      data.numberOfTemporalPositions as number
    ]);
    setStore(["minTimeId", elementId, 0]);
    if (data.numberOfSlices && data.numberOfTemporalPositions) {
      setStore(["maxTimeId", elementId, data.numberOfTemporalPositions - 1]);
      let maxSliceId = data.numberOfSlices * data.numberOfTemporalPositions - 1;
      setStore(["maxSliceId", elementId, maxSliceId]);
    }
    setStore(["timestamps", elementId, data.timestamps || []]);
    setStore(["timeIds", elementId, data.timeIds || []]);
  } else {
    setStore(["minTimeId", elementId, 0]);
    setStore(["timeId", elementId, 0]);
    setStore(["maxTimeId", elementId, 0]);
    setStore(["timestamp", elementId, 0]);
    setStore(["timestamps", elementId, []]);
    setStore(["timeIds", elementId, []]);
  }
};

/* Internal module functions */

/**
 * Get series metadata from default props and series' metadata
 * @instance
 * @function getTemporalSeriesData
 * @param {Object} series - The parsed data series
 * @return {Object} data - A data dictionary with temporal parsed tags' values
 */
const getTemporalSeriesData = function (series: Series): StoreViewport {
  type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
  };
  type SeriesData = StoreViewport;
  const data: RecursivePartial<SeriesData> = {};
  if (series.is4D) {
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
  }
  return data as SeriesData;
};

/**
 * Get series metadata from default props and series' metadata
 * @instance
 * @function getSeriesData
 * @param {Series} series - The parsed data series
 * @param {RenderProps} renderOptions - Optional default properties
 * @return {StoreViewport} data - A data dictionary with parsed tags' values
 */
const getSeriesData = function (
  series: Series,
  renderOptions: RenderProps
): StoreViewport {
  type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
  };
  type SeriesData = StoreViewport;
  const data: RecursivePartial<SeriesData> = {};
  data.uniqueUID = series.uniqueUID || series.seriesUID; //case of resliced series
  data.modality = series.modality;

  if (series.isMultiframe) {
    data.isMultiframe = true;
    data.numberOfSlices = series.imageIds.length;
    data.imageIndex =
      renderOptions.imageIndex !== undefined && renderOptions.imageIndex >= 0
        ? renderOptions.imageIndex
        : 0;
    data.imageId = series.imageIds[data.imageIndex];
    data.isTimeserie = false;
    data.numberOfFrames = series.numberOfFrames;
  } else if (series.is4D) {
    data.isMultiframe = false;
    data.isTimeserie = true;
    data.numberOfSlices = series.numberOfImages;
    data.numberOfTemporalPositions = series.numberOfTemporalPositions;
    data.imageIndex =
      renderOptions.imageIndex !== undefined && renderOptions.imageIndex >= 0
        ? renderOptions.imageIndex
        : 0;
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
    data.numberOfSlices = series.imageIds.length;
    data.imageIndex =
      renderOptions.imageIndex !== undefined && renderOptions.imageIndex >= 0 // slice number between 0 and n-1
        ? renderOptions.imageIndex
        : Math.floor(series.imageIds.length / 2);
    data.imageId = series.imageIds[data.imageIndex];
  }
  const instance: Instance | null = data.imageId
    ? series.instances[data.imageId]
    : null;

  data.isColor = series.color as boolean;
  data.isPDF = series.isPDF;
  data.waveform = series.waveform;
  data.dsa = series.dsa ? true : false;
  if (instance) {
    data.rows = instance.metadata.x00280010!;
    data.cols = instance.metadata.x00280011!;
    data.thickness = instance.metadata.x00180050 as number;

    let spacing = instance.metadata.x00280030!;
    data.spacing_x = spacing ? spacing[0] : 1;
    data.spacing_y = spacing ? spacing[1] : 1;

    // voi contrast value from metadata or renderOptions
    const windowCenter =
      renderOptions.voi !== undefined
        ? renderOptions.voi.windowCenter
        : (instance.metadata.x00281050 as number);
    const windowWidth =
      renderOptions.voi !== undefined
        ? renderOptions.voi.windowWidth
        : (instance.metadata.x00281051 as number);

    // window center and window width
    data.viewport = {
      voi: {
        windowCenter: windowCenter,
        windowWidth: windowWidth
      }
    };
    // store default values for the viewport voi from the series metadata
    data.default = {};
    data.default!.voi = {
      windowCenter: instance.metadata.x00281050 as number,
      windowWidth: instance.metadata.x00281051 as number
    };
    data.default.rotation = 0;
    data.default.translation = { x: 0, y: 0 };

    if (renderOptions.default !== undefined) {
      if (renderOptions.default.scale !== undefined) {
        data.default!.scale = renderOptions.default.scale;
      }
      if (renderOptions.default.translation !== undefined) {
        data.default!.translation!.x = renderOptions.default.translation.x;
        data.default!.translation!.y = renderOptions.default.translation.y;
      }
      if (renderOptions.default.rotation !== undefined) {
        data.default!.rotation = renderOptions.default.rotation;
      }
      if (renderOptions.default.voi !== undefined) {
        data.default!.voi = {
          windowCenter: renderOptions.default.voi.windowCenter,
          windowWidth: renderOptions.default.voi.windowWidth
        };
      }
    }

    if (
      (data.rows == null || data.cols == null) &&
      series.instances[data.imageId!].metadata.pixelDataLength != 0
    ) {
      setStore(["errorLog", "Invalid Image Metadata"]);
      throw new Error("invalid image metadata (rows or cols is null)");
    } else {
      setStore(["errorLog", ""]);
    }
  } else {
    logger.warn(`ImageId not found in imageIds with index ${data.imageIndex}.`);
  }

  return data as SeriesData;
};
