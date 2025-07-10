/** @module imaging/imageRendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone
 */

// external libraries
import * as cornerstone from "@cornerstonejs/core";
import * as cornerstoneTools from "@cornerstonejs/tools";
import { each } from "lodash";
import { v4 as uuidv4 } from "uuid";

// internal libraries
//import { getPerformanceMonitor } from "./monitors/performance";
//import { getFileImageId, getFileManager } from "./loaders/fileLoader";
//import { csToolsCreateStack } from "../imaging/tools/main";
//import { toggleMouseToolsListeners } from "../imaging/tools/interaction";
import { set as setStore } from "../imaging/imageStore";
//import { applyColorMap } from "../imaging/imageColormaps";
import { isElement } from "../imaging/imageUtils";

import { loadAndCacheMetadata } from "../imaging3d/imageLoading";

import {
  Instance,
  MetaData,
  RenderProps,
  Series,
  StoreViewport
} from "../imaging/types";

import { MprViewport, VideoViewport } from "./types";

import { logger } from "../logger";
import { destroyToolGroup } from "./tools/main";
import { addCineMetadata } from "./metadataProviders/cineMetadataProvider";
import { addImageUrlMetadata } from "./metadataProviders/imageUrlMetadataProvider";
import { addGeneralSeriesMetadata } from "./metadataProviders/generalSeriesProvider";
import { addImagePlaneMetadata } from "./metadataProviders/imagePlaneMetadataProvider";
// import { DEFAULT_TOOLS } from "./tools/default";
// import { initializeFileImageLoader } from "./imageLoading";
// import { generateFiles } from "./parsers/pdf";
// import { setPixelShift } from "./loaders/dsaImageLoader";

/*
 * This module provides the following functions to be exported:
 *
 */

/**
 * Cache image and render it in a html div using cornerstone
 * @instance
 * @function renderImage
 * @param {Object} seriesStack - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {RenderProps} options - Optional rendering options
 * @return {Promise} Return a promise which will resolve when image is displayed
 */
export const renderImage = function (
  seriesStack: Series,
  elementId: string | HTMLElement,
  options?: RenderProps
): Promise<{ success: boolean; renderingEngine: cornerstone.RenderingEngine }> {
  const t0 = performance.now();

  // get element and enable it
  const element = isElement(elementId)
    ? (elementId as HTMLDivElement)
    : (document.getElementById(elementId as string) as HTMLDivElement);
  if (!element) {
    logger.error("invalid html element: " + elementId);
    return new Promise((_, reject) =>
      reject("invalid html element: " + elementId)
    );
  }
  const id: string = isElement(elementId) ? element.id : (elementId as string);

  const renderingEngine = new cornerstone.RenderingEngine("2d");
  const viewportInput = {
    viewportId: id,
    element,
    type: cornerstone.Enums.ViewportType.STACK
  };
  // TODO check if there is an enabledElement with this id
  // otherwise, we will get an error and we will enable it
  renderingEngine.enableElement(viewportInput);
  const viewport = renderingEngine.getViewport(viewportInput.viewportId);

  let series = { ...seriesStack };
  const renderOptions = options ? options : {};
  setStore(["ready", id, false]);
  let data: StoreViewport = getSeriesData(series, renderOptions);

  if (!data.imageId) {
    logger.warn("error during renderImage: imageId has not been loaded yet.");
    return new Promise((_, reject) => {
      setStore(["pendingSliceId", id, data.imageIndex]);
      reject("error during renderImage: imageId has not been loaded yet.");
    });
  }

  const renderPromise = new Promise<{
    success: boolean;
    renderingEngine: cornerstone.RenderingEngine;
  }>((resolve, reject) => {
    // @ts-ignore IViewport does not have a setStack method
    viewport.setStack(series.imageIds, 5);
    viewport.render();
    // TODO FIT TO WINDOW ?
    // TODO VOI
    // TODO DEFAULT PROPS (SCALE, TR, COLORMAP)

    const storedViewport = renderingEngine.getViewport(
      viewportInput.viewportId
    );
    logger.debug("storedViewport", storedViewport);

    if (!storedViewport) {
      logger.error("storedViewport not found");
      reject("storedViewport not found for element: " + elementId);
      return;
    }
    // viewport.csImage è l'istanza di cornerstone.Image

    // TODO modificare lo store
    // storeViewportData(image, element.id, storedViewport as Viewport, data);
    setStore(["ready", element.id, true]);
    //setStore(["seriesUID", element.id, data.seriesUID]);
    const t1 = performance.now();
    logger.debug(`Call to renderImage took ${t1 - t0} milliseconds.`);

    // const uri = cornerstoneDICOMImageLoader.wadouri.parseImageId(
    //   data.imageId
    // ).url;
    // cornerstoneDICOMImageLoader.wadouri.dataSetCacheManager.unload(uri);
    // @ts-ignore
    series = null;
    // @ts-ignore
    data = null;
    resolve({ success: true, renderingEngine });
  });

  return renderPromise;
};

/**
 * Initialize a rendering engine with a renderingEngineId
 * @instance
 * @function initializeRenderingEngine
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to initialize
 * @return {cornerstone.RenderingEngine} Returns the initialized rendering engine
 * @throws {Error} If the rendering engine with the same UID already exists
 */
export const initializeRenderingEngine = function (
  renderingEngineId: string
): cornerstone.RenderingEngine | void {
  const t0 = performance.now();

  // check if the rendering engine is already initialized
  if (cornerstone.getRenderingEngine(renderingEngineId)) {
    logger.warn(
      `Rendering engine with id ${renderingEngineId} is already initialized.`
    );
    return;
  }

  const renderingEngine = new cornerstone.RenderingEngine(renderingEngineId);

  // TODO Store in viewport store?

  const t1 = performance.now();
  logger.debug(
    `Rendering engine initialized with id ${renderingEngineId} in ${
      t1 - t0
    } milliseconds`
  );
  return renderingEngine;
};

/**
 * Destroy a rendering engine by its unique UID
 * @instance
 * @function destroyRenderingEngine
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to destroy
 * @return {void}
 * @throws {Error} If the rendering engine does not exist or has already been destroyed
 */
export const destroyRenderingEngine = function (
  renderingEngineId: string
): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.warn(
      `Rendering engine with id ${renderingEngineId} does not exist or has already been destroyed.`
    );
    return;
  }

  renderingEngine.getViewports().forEach(viewport => {
    const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroupForViewport(
      viewport.id,
      renderingEngineId
    );

    if (toolGroup?.id) {
      destroyToolGroup(toolGroup.id);
    }
  });
  renderingEngine.destroy();

  // TODO remove from viewport store?

  logger.debug(`Rendering engine with id ${renderingEngineId} destroyed.`);
};

/**
 * Initialize volume viewports for a rendering engine
 * @instance
 * @function initializeVolumeViewports
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to initialize
 * @param {MprViewport[]} mprViewports - An array of MprViewport objects to initialize
 * @returns {void}
 */
export const initializeVolumeViewports = function (
  renderingEngineId: string,
  mprViewports: MprViewport[]
): void {
  const t0 = performance.now();
  // get the rendering engine
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }

  // for each viewportId of mprViewports check that the element is available
  each(mprViewports, function (viewport: MprViewport) {
    const element = document.getElementById(viewport.viewportId);
    if (!element) {
      logger.error("invalid html element: " + viewport.viewportId);
      return;
    } else {
      // set in store that the image is loading on this viewport
      setStore(["ready", viewport.viewportId, false]);
    }
  });

  let viewportInputs: cornerstone.Types.PublicViewportInput[] = [];

  each(mprViewports, function (viewport: MprViewport) {
    const viewportInput: cornerstone.Types.PublicViewportInput = {
      viewportId: viewport.viewportId,
      element: document.getElementById(viewport.viewportId) as HTMLDivElement,
      type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
      defaultOptions: {
        orientation: viewport.orientation
      }
    };
    viewportInputs.push(viewportInput);
  });
  // TODO HANDLE MERGE?
  // const volumeViewports = renderingEngine.getVolumeViewports();
  renderingEngine.setViewports(viewportInputs);
  const t1 = performance.now();
  logger.debug(
    `Volume viewports initialized for rendering engine ${renderingEngineId} in ${
      t1 - t0
    } milliseconds`
  );
};

/**
 * Load and cache a volume from a series
 * @instance
 * @function loadAndCacheVolume
 * @param {Series} series - The series object containing imageIds and instances
 * @returns {cornerstone.ImageVolume | cornerstone.Types.IStreamingImageVolume} Returns a promise that resolves to the loaded volume
 */
export const loadAndCacheVolume = async function (
  series: Series
): Promise<cornerstone.ImageVolume | cornerstone.Types.IStreamingImageVolume> {
  const t0 = performance.now();

  //const volumeId = series.uniqueUID || uuidv4();
  const volumeId = uuidv4();

  loadAndCacheMetadata(series.imageIds3D);
  // cornerstone.cache.getVolume(volumeId) ||
  const volume = await cornerstone.volumeLoader.createAndCacheVolume(volumeId, {
    imageIds: series.imageIds3D.map(id => id)
  });

  const t1 = performance.now();
  logger.debug(`Time to load and cache volume: ${t1 - t0} milliseconds`);
  volume.load();
  return volume;
};

/**
 * Set a volume for a rendering engine
 * @instance
 * @function setVolumeForRenderingEngine
 * @param {string} volumeId - The unique identifier of the volume to set
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to set the volume for
 * @returns
 */
export const setVolumeForRenderingEngine = function (
  volumeId: string,
  renderingEngineId: string
) {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }

  cornerstone.setVolumesForViewports(
    renderingEngine,
    [
      {
        volumeId
      }
    ],
    renderingEngine.getVolumeViewports().map(v => v.id)
  );
};

export const renderMpr = function (
  series: Series,
  renderingEngineId: string,
  options?: RenderProps
) {
  const t0 = performance.now();

  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return new Promise((_, reject) =>
      reject(`Rendering engine with id ${renderingEngineId} not found.`)
    );
  }
  const viewports = renderingEngine.getVolumeViewports();
  if (viewports.length === 0) {
    logger.error(
      `No volume viewports found for rendering engine ${renderingEngineId}. Please initialize them first.`
    );
    return new Promise((_, reject) =>
      reject(
        `No volume viewports found for rendering engine ${renderingEngineId}.`
      )
    );
  }

  // const renderOptions = options ? options : {};
  // // TODO: CONTROLLA IMAGE ID NEL CASO DI MPR
  // //let data: StoreViewport = getSeriesData(series, renderOptions);

  const renderPromise = new Promise<void>(async (resolve, _) => {
    // crea o prendi il volume dalla cache
    // const volume =
    //   cornerstone.cache.getVolume(series.uniqueUID) ||
    //   (await loadAndCacheVolume(series));
    // console.log("volume", volume);
    const volume = await loadAndCacheVolume(series);

    setVolumeForRenderingEngine(volume.volumeId, renderingEngineId);
    renderingEngine.renderViewports(viewports.map(v => v.id));

    const t1 = performance.now();

    // TODO modificare lo store
    // storeViewportData(image, element.id, storedViewport as Viewport, data);
    each(viewports, function (viewport: cornerstone.VolumeViewport) {
      setStore(["ready", viewport.id, true]);
    });

    const t2 = performance.now();
    logger.debug(`Time to render volume: ${t2 - t1} milliseconds`);

    // @ts-ignore
    series = null;
    // @ts-ignore
    //data = null;

    resolve();
  });

  return renderPromise;
};

/**
 * Unload a MPR rendering engine
 * @instance
 * @function unloadMpr
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to unload
 * @returns {void}
 */
export const unloadMpr = function (renderingEngineId: string): void {
  // destroy the rendering engine
  // decacha il volume? se associato ad altri?
  destroyRenderingEngine(renderingEngineId);
};

/**
 * Initialize a video viewport for a rendering engine
 * @instance
 * @function initializeVideoViewport
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to initialize
 * @param {VideoViewport} viewport - The VideoViewport object to initialize
 * @returns {void}
 * @throws {Error} If the rendering engine does not exist or has already been destroyed
 */
export const initializeVideoViewport = function (
  renderingEngineId: string,
  viewport: VideoViewport
): void {
  const t0 = performance.now();
  // get the rendering engine
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewportInput: cornerstone.Types.PublicViewportInput = {
    viewportId: viewport.viewportId,
    type: cornerstone.Enums.ViewportType.VIDEO,
    element: document.getElementById(viewport.viewportId) as HTMLDivElement,
    defaultOptions: {
      background: viewport.background
    }
  };
  renderingEngine.enableElement(viewportInput);
  const t1 = performance.now();
  logger.debug(
    `Video viewport initialized for rendering engine ${renderingEngineId} in ${
      t1 - t0
    } milliseconds`
  );
};

/**
 * Get a video URL from a DICOM series
 * @instance
 * @function getVideoUrlFromDicom
 * @param {Series} series - The series object containing imageIds and instances
 * @param {number} index - The index of the image in the series
 * @returns {string | null} Returns a video URL created from the DICOM pixel data or null if not found
 */
export const getVideoUrlFromDicom = function (
  series: Series,
  index: number
): string | null {
  const dataset = series.instances[series.imageIds[index]].dataSet;
  if (!dataset) {
    logger.error("❌ Dataset not found");
    return null;
  }

  const pixelElement = dataset.elements.x7fe00010;
  if (!pixelElement) {
    logger.error("❌ Pixel Data not found in dataset");
    return null;
  }

  const { dataOffset, length } = pixelElement;

  if (pixelElement.fragments?.length) {
    // Just in case there are fragments, we will concatenate them
    const fragmentBuffers = pixelElement.fragments.map(fragment => {
      return dataset.byteArray.slice(
        fragment.position,
        fragment.position + fragment.length
      );
    });

    // Compute the total length of all fragments
    const totalLength = fragmentBuffers.reduce(
      (sum, frag) => sum + frag.length,
      0
    );

    // Create a new Uint8Array to hold the concatenated data
    const fullBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const frag of fragmentBuffers) {
      fullBuffer.set(frag, offset);
      offset += frag.length;
    }
    // Now fullBuffer contains the complete pixel data
    const blob = new Blob([fullBuffer], { type: "video/mp4" });

    // clean the memory
    // // @ts-ignore
    // fragmentBuffers = null;
    // // @ts-ignore
    // fullBuffer = null;
    // // @ts-ignore
    // blob = null;
    return URL.createObjectURL(blob);
  } else {
    // If there are no fragments, we can directly slice the byteArray
    const fullBuffer = dataset.byteArray.slice(dataOffset, dataOffset + length);
    const blob = new Blob([fullBuffer], { type: "video/mp4" });
    // clean the memory
    // // @ts-ignore
    // fullBuffer = null;
    // // @ts-ignore
    // blob = null;
    return URL.createObjectURL(blob);
  }
};

/**
 * Add video metadata to an imageId
 * @instance
 * @function addVideoMetadata
 * @param {string} imageId - The unique identifier of the image to add metadata to
 * @param {MetaData} metadata - The metadata object containing video information
 * @param {string} videoUrl - The URL of the video to associate with the imageId
 * @returns {void}
 * @throws {Error} If the metadata is missing required fields
 */
export const addVideoMetadata = function (
  imageId: string,
  metadata: MetaData,
  videoUrl: string
): void {
  const frameRate = metadata["x00180040"] || 30;
  const frameTime = 1000 / frameRate;

  addCineMetadata(imageId, {
    frameTime,
    numberOfFrames: metadata.numberOfFrames || 1,
    frameRate
  });
  addImageUrlMetadata(imageId, { rendered: videoUrl });
  addGeneralSeriesMetadata(imageId, {
    seriesInstanceUID: metadata.seriesUID!,
    studyInstanceUID: metadata.studyUID!,
    seriesNumber: metadata["x00200011"] || 1,
    seriesDescription: metadata.seriesDescription || "Video Series",
    modality: metadata.seriesModality || "XC",
    seriesDate: metadata.seriesDate || new Date().toISOString().split("T")[0],
    seriesTime: metadata["x00080031"] || new Date().toTimeString().split(" ")[0]
  });
  addImagePlaneMetadata(imageId, {
    frameOfReferenceUID: metadata["x00200052"] || metadata.studyUID!,
    rows: metadata.rows!,
    columns: metadata.cols!,
    imageOrientationPatient: metadata.imageOrientation || [1, 0, 0, 0, 1, 0],
    rowCosines: metadata["x00200037"]?.slice(0, 3) || [1, 0, 0],
    columnCosines: metadata["x00200037"]?.slice(3, 6) || [0, 1, 0],
    imagePositionPatient: metadata.imagePosition || [0, 0, 0],
    sliceThickness: (metadata.sliceThickness as number) || 1,
    sliceLocation: metadata["x00201041"] || 0,
    pixelSpacing: metadata.pixelSpacing || [1, 1],
    rowPixelSpacing: metadata.pixelSpacing ? metadata.pixelSpacing[1] : 1,
    columnPixelSpacing: metadata.pixelSpacing ? metadata.pixelSpacing[0] : 1
  });
};

/**
 * Render a video in a video viewport
 * @instance
 * @function renderVideo
 * @param {Series} series - The series object containing imageIds and instances
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to render the video in
 * @param {number} frameNumber - Optional frame number to set for the video
 * @returns {Promise<void>} Returns a promise that resolves when the video is rendered
 */
export const renderVideo = function (
  series: Series,
  renderingEngineId: string,
  frameNumber?: number
) {
  const imageIndex = 0; // TODO EXPOSE THIS?

  const t0 = performance.now();

  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return new Promise((_, reject) =>
      reject(`Rendering engine with id ${renderingEngineId} not found.`)
    );
  }
  const viewports = renderingEngine.getViewports();
  // check if there is a video viewport
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return new Promise((_, reject) =>
      reject(
        `No video viewport found for rendering engine ${renderingEngineId}.`
      )
    );
  }
  setStore(["ready", videoViewport.id, false]);

  const videoUrl = getVideoUrlFromDicom(series, imageIndex);
  if (!videoUrl) {
    logger.error(
      `No video URL found for series ${series.seriesUID}. Please check the DICOM pixel data.`
    );
    return new Promise((_, reject) =>
      reject(`No video URL found for series ${series.seriesUID}.`)
    );
  }

  const videoMetadata = series.instances[series.imageIds[imageIndex]].metadata;
  if (!videoMetadata) {
    logger.error(
      `No metadata found for series ${series.seriesUID} at image index ${imageIndex}. Please check the DICOM pixel data.`
    );
    return new Promise((_, reject) =>
      reject(
        `No metadata found for series ${series.seriesUID} at image index ${imageIndex}.`
      )
    );
  }

  addVideoMetadata(series.imageIds[imageIndex], videoMetadata, videoUrl);

  const renderPromise = new Promise<void>(async (resolve, _) => {
    const frame = frameNumber || 0; // Default to the first frame if not provided
    videoViewport.setVideo(series.imageIds[imageIndex], frame);
    const t1 = performance.now();
    setStore(["ready", videoViewport.id, true]);
    logger.debug(
      `Video viewport set for rendering engine ${renderingEngineId} in ${
        t1 - t0
      } milliseconds`
    );

    // @ts-ignore
    series = null;
    // @ts-ignore
    //data = null;
    resolve();
  });

  return renderPromise;
};

/**
 * Play a video in a video viewport
 * @instance
 * @function playVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const playVideo = function (renderingEngineId: string): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  setTimeout(() => {
    videoViewport.play();
    logger.debug(
      `Video playback started for rendering engine ${renderingEngineId}.`
    );
  }, 500); // Delay to ensure the video is ready to play
};

/**
 * Set the frame range for a video in a video viewport
 * @instance
 * @function setFrameRange
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number[]} frameRange - An array containing the start and end frame numbers
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const setFrameRange = function (
  renderingEngineId: string,
  frameRange: number[]
): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  videoViewport.setFrameRange(frameRange);
  logger.debug(
    `Frame range set to ${frameRange} for rendering engine ${renderingEngineId}.`
  );
};

/**
 * Set the time for a video in a video viewport
 * @instance
 * @function setTime
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number} timeInSeconds - The time in seconds to set for the video
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const setTime = function (
  renderingEngineId: string,
  timeInSeconds: number
): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  videoViewport.setTime(timeInSeconds);
  logger.debug(
    `Video time set to ${timeInSeconds} seconds for rendering engine ${renderingEngineId}.`
  );
};

/**
 * Set the frame number for a video in a video viewport
 * @instance
 * @function setFrameNumber
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number} frame - The frame number to set
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const setFrameNumber = function (
  renderingEngineId: string,
  frame: number
): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  videoViewport.setFrameNumber(frame);
  logger.debug(
    `Frame number set to ${frame} for rendering engine ${renderingEngineId}.`
  );
};

/**
 * Set the playback rate for a video in a video viewport
 * @instance
 * @function setPlaybackRate
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number} rate - The playback rate to set (default is 1)
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export function setPlaybackRate(renderingEngineId: string, rate: number): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  videoViewport.setPlaybackRate(rate);
  logger.debug(
    `Playback rate set to ${rate} for rendering engine ${renderingEngineId}.`
  );
}

/**
 * Scroll a video in a video viewport
 * @instance
 * @function scrollVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number} delta - The number of frames to scroll (positive or negative)
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export function scrollVideo(
  renderingEngineId: string,
  delta: number = 1
): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  videoViewport.scroll(delta);
  logger.debug(
    `Video scrolled by ${delta} frames for rendering engine ${renderingEngineId}.`
  );
}

/**
 * Toggle video playback in a video viewport
 * @instance
 * @function toggleVideoPlayback
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const toggleVideoPlayback = function (renderingEngineId: string): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first  `
    );
    return;
  }
  videoViewport.togglePlayPause();
};

/**
 * Pause a video in a video viewport
 * @instance
 * @function pauseVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const pauseVideo = function (renderingEngineId: string): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  videoViewport.pause();
  logger.debug(
    `Video playback paused for rendering engine ${renderingEngineId}.`
  );
};

/**
 * Resize a rendering engine
 * @instance
 * @function resizeRenderingEngine
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to resize
 * @returns {void}
 */
export const resizeRenderingEngine = function (
  renderingEngineId: string
): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  if (viewports.length === 0) {
    logger.error(
      `No viewports found for rendering engine ${renderingEngineId}. Please initialize them first.`
    );
    return;
  }
  renderingEngine.resize(true, true); // true flags for fitToWindow and forceResize
};

// /**
//  * Purge the cornestone internal cache
//  * If seriesId is passed as argument only imageIds of the series are purged from internal cache
//  * @instance
//  * @function clearImageCache
//  * @param {String} seriesId - The id of the serie
//  */
// export const clearImageCache = function (seriesId?: string) {
//   if (seriesId) {
//     let series = store.get("series");
//     if (has(series, seriesId)) {
//       each(series[seriesId].imageIds, function (imageId: string) {
//         if (cornerstone.imageCache.cachedImages.length > 0) {
//           try {
//             cornerstone.imageCache.removeImageLoadObject(imageId);
//           } catch (e) {
//             console.warn("no cached image");
//           }
//         } else {
//           let uri =
//             cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId).url;
//           cornerstoneDICOMImageLoader.wadouri.dataSetCacheManager.unload(uri);
//         }
//       });

//       store.removeSeriesId(seriesId);
//       console.log("Uncached images for ", seriesId);
//     }
//   } else {
//     cornerstone.imageCache.purgeCache();
//   }
// };

// /**
//  * Load and cache a single image
//  * Add series's imageIds into store
//  * @instance
//  * @function loadAndCacheImage
//  * @param {Object} series the parsed series data
//  * @param {number} imageIndex the image index in the imageIds array
//  */
// export function loadAndCacheImage(
//   series: Series,
//   imageIndex: number
// ): Promise<true> {
//   const t0 = performance.now();
//   // add serie's imageIds into store
//   store.addSeriesId(series.seriesUID, series.imageIds);
//   const imageId: string | undefined = series.imageIds[imageIndex];

//   const cachePromise = new Promise<true>((resolve, reject) => {
//     //check if it is a metadata-only object
//     if (imageId && series.instances[imageId].metadata.pixelDataLength != 0) {
//       cornerstone.loadAndCacheImage(imageId).then(function () {
//         setStore(["cached", series.larvitarSeriesInstanceUID, imageId, true]);
//         const t1 = performance.now();
//         console.debug(`Call to cacheImages took ${t1 - t0} milliseconds.`);
//         console.debug(
//           `Cached image with index ${imageIndex} for ${series.seriesUID}`
//         );
//         resolve(true);
//       });
//     } else if (series.instances[imageId].metadata.pixelDataLength === 0) {
//       reject(`File ${imageIndex}, has no Pixel Data available`);
//     } else {
//       reject(`Error: wrong image index ${imageIndex}, no imageId available`);
//     }
//   });
//   return cachePromise;
// }

// /**
//  * Load and cache all serie's images
//  * Add series's imageIds into store
//  * @instance
//  * @function loadAndCacheImages
//  * @param {Object} series the parsed series data
//  * @param {Function} callback a callback function
//  */
// export function loadAndCacheImages(
//   series: Series,
//   callback: (payload: {
//     seriesId: string;
//     loading: number;
//     series: Series;
//   }) => any
// ) {
//   const t0 = performance.now();
//   let cachingCounter = 0;
//   const response = {
//     seriesId: series.seriesUID,
//     loading: 0,
//     series: {} as Series
//   };
//   callback(response);
//   // add serie's imageIds into store
//   store.addSeriesId(series.seriesUID, series.imageIds);
//   // add serie's caching progress into store
//   setStore(["progress", series.seriesUID, 0]);

//   function updateProgress() {
//     cachingCounter += 1;
//     const cachingPercentage = Math.floor(
//       (cachingCounter / series.imageIds.length) * 100
//     );
//     response.loading = cachingPercentage;
//     setStore(["progress", series.seriesUID, cachingPercentage]);
//     if (cachingCounter == series.imageIds.length) {
//       const t1 = performance.now();
//       console.debug(`Call to cacheImages took ${t1 - t0} milliseconds.`);
//       console.debug(`Cached images for ${series.seriesUID}`);
//       response.series = series;
//     }
//   }

//   each(series.imageIds, function (imageId: string | undefined, index: number) {
//     //check if it is a metadata-only object
//     if (imageId && series.instances[imageId].metadata.pixelDataLength != 0) {
//       cornerstone.loadAndCacheImage(imageId).then(function () {
//         setStore(["cached", series.larvitarSeriesInstanceUID, imageId, true]);
//         updateProgress();
//         callback(response);
//       });
//     } else if (series.instances[imageId!].metadata.pixelDataLength === 0) {
//       updateProgress();
//       //throw new Error(`File ${index} has no Pixel Data`);
//     } else {
//       updateProgress();
//       console.warn(
//         `Stack is not fully loaded, skipping cache for index ${index}`
//       );
//       callback(response);
//     }
//   });
// }

// /**
//  * Render a PDF from a DICOM Encapsulated PDF
//  * @instance
//  * @function renderDICOMPDF
//  * @param {Object} seriesStack - The original series data object
//  * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
//  * @param {Boolean} convertToImage - An optional flag to convert pdf to image, default is false
//  * @returns {Promise} - Return a promise which will resolve when pdf is displayed
//  */
// export const renderDICOMPDF = function (
//   seriesStack: Series,
//   elementId: string | HTMLElement,
//   convertToImage: boolean = false
// ): Promise<true> {
//   let t0 = performance.now();
//   let element: HTMLElement | null = isElement(elementId)
//     ? (elementId as HTMLElement)
//     : document.getElementById(elementId as string);

//   let renderPromise = new Promise<true>(async (resolve, reject) => {
//     let image: Instance | null = seriesStack.instances[seriesStack.imageIds[0]];
//     const SOPUID = image.dataSet?.string("x00080016");

//     // check sopUID in order to detect pdf report array
//     if (SOPUID === "1.2.840.10008.5.1.4.1.1.104.1") {
//       let fileTag = image.dataSet?.elements.x00420011;

//       if (!fileTag) {
//         throw new Error("No file tag found");
//       }

//       let pdfByteArray = image.dataSet?.byteArray.slice(
//         fileTag.dataOffset,
//         fileTag.dataOffset + fileTag.length
//       );

//       if (!pdfByteArray) {
//         console.error("No pdf byte array found");
//         return;
//       }

//       if (!element) {
//         console.error("invalid html element: " + elementId);
//         return;
//       }

//       let PDF: Blob | null = new Blob([pdfByteArray], {
//         type: "application/pdf"
//       });
//       let fileURL = URL.createObjectURL(PDF);
//       const id: string = isElement(elementId)
//         ? element.id
//         : (elementId as string);
//       // Render using HTML PDF viewer
//       if (convertToImage === false) {
//         element.innerHTML =
//           '<object data="' +
//           fileURL +
//           '" type="application/pdf" width="100%" height="100%"></object>';
//         setStore(["isPDF", id, true]);
//         let t1 = performance.now();
//         console.log(`Call to renderDICOMPDF took ${t1 - t0} milliseconds.`);
//         image = null;
//         fileTag = undefined;
//         pdfByteArray = undefined;
//         PDF = null;
//         resolve(true);
//       } else if (convertToImage === true) {
//         initializeFileImageLoader();
//         let pngFiles = await generateFiles(fileURL);
//         // render first page // TODO: render all pages?
//         renderFileImage(pngFiles[0], elementId).then(() => {
//           let t1 = performance.now();
//           console.log(`Call to renderDICOMPDF took ${t1 - t0} milliseconds.`);
//           image = null;
//           fileTag = undefined;
//           pdfByteArray = undefined;
//           PDF = null;
//           // activate the scroll stack tool
//           if (element) {
//             csToolsCreateStack(element, Object.values(getFileManager()), 0);
//           }
//           toggleMouseToolsListeners(id, false);
//           resolve(true);
//         });
//       }
//     } else {
//       reject("This is not a DICOM with a PDF");
//     }
//   });
//   return renderPromise;
// };

// /**
//  * Unrender an image on a html div using cornerstone
//  * @instance
//  * @function disableViewport
//  * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
//  */
// export const disableViewport = function (elementId: string | HTMLElement) {
//   let element = isElement(elementId)
//     ? (elementId as HTMLElement)
//     : document.getElementById(elementId as string);
//   if (!element) {
//     console.error("invalid html element: " + elementId);
//     return;
//   }
//   toggleMouseToolsListeners(element, true);
//   cornerstone.disable(element);
//   const id: string = isElement(elementId) ? element.id : (elementId as string);
//   setStore(["ready", id, false]);
// };

// /**
//  * Unrender an image on a html div using cornerstone
//  * Remove image from cornerstone cache and remove from store
//  * @instance
//  * @function unloadViewport
//  * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
//  * @param {String} seriesId - The id of the serie
//  */
// export const unloadViewport = function (elementId: string, seriesId: string) {
//   disableViewport(elementId);

//   if (!seriesId) {
//     console.warn(
//       "seriesId not provided, use disableViewport if you do not want to uncache images"
//     );
//   }
//   // remove images from cornerstone cache
//   if (seriesId && has(store.get("series"), seriesId)) {
//     clearImageCache(seriesId);
//   }
//   store.deleteViewport(elementId);
// };

// /**
//  * Resize a viewport using cornerstone resize
//  * And forcing fit to window
//  * @instance
//  * @function resizeViewport
//  * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
//  */
// export const resizeViewport = function (elementId: string | HTMLElement) {
//   let element = isElement(elementId)
//     ? (elementId as HTMLElement)
//     : document.getElementById(elementId as string);
//   if (!element) {
//     console.error("invalid html element: " + elementId);
//     return;
//   }
//   cornerstone.resize(element, true); // true flag forces fitToWindow
// };

// /**
//  * Update the cornerstone image with new imageIndex
//  * @instance
//  * @function updateImage
//  * @param {Object} series - The original series data object
//  * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
//  * @param {Number} imageIndex - The index of the image to be rendered
//  * @param {Boolean} cacheImage - A flag to handle image cache
//  */
// export const updateImage = async function (
//   series: Series,
//   elementId: string | HTMLElement,
//   imageIndex: number,
//   cacheImage: boolean
// ): Promise<void> {
//   const element = isElement(elementId)
//     ? (elementId as HTMLElement)
//     : document.getElementById(elementId as string);
//   if (!element) {
//     throw "not element";
//   }

//   const id: string = isElement(elementId) ? element.id : (elementId as string);
//   const isDSAEnabled = store.get(["viewports", id, "isDSAEnabled"]);
//   const imageId =
//     isDSAEnabled === true
//       ? series.dsa!.imageIds[imageIndex]
//       : series.imageIds[imageIndex];

//   //check if it is a metadata-only object
//   if (
//     series.instances[series.imageIds[imageIndex]].metadata.pixelDataLength != 0
//   ) {
//     if (isDSAEnabled === true) {
//       // get the optional custom pixel shift
//       const pixelShift = store.get(["viewports", id, "pixelShift"]);
//       setPixelShift(pixelShift);
//     }

//     if (!imageId) {
//       setStore(["pendingSliceId", id, imageIndex]);
//       throw `Error: wrong image index ${imageIndex}, no imageId available`;
//     }

//     if (series.is4D) {
//       const timestamp = series.instances[imageId].metadata.contentTime;
//       const timeId =
//         series.instances[imageId].metadata.temporalPositionIdentifier! - 1; // timeId from 0 to N
//       setStore(["timeId", id as string, timeId]);
//       setStore(["timestamp", id as string, timestamp]);
//     }

//     if (cacheImage) {
//       let t0: number | undefined;
//       if (getPerformanceMonitor() === true) {
//         t0 = performance.now();
//       }

//       cornerstone.loadAndCacheImage(imageId).then(function (image) {
//         cornerstone.displayImage(element, image);

//         if (getPerformanceMonitor() === true) {
//           const t1 = performance.now();
//           if (t0 !== undefined) {
//             // check if t0 is defined before using it
//             console.log(
//               `Call to updateImage for viewport ${id} took ${
//                 t1 - t0
//               } milliseconds.`
//             );
//           }
//         }
//         setStore(["cached", series.larvitarSeriesInstanceUID, imageId, true]);
//         setStore(["sliceId", id, imageIndex]);
//         const pendingSliceId = store.get(["viewports", id, "pendingSliceId"]);
//         if (imageIndex == pendingSliceId) {
//           setStore(["pendingSliceId", id, undefined]);
//         }
//         setStore(["minPixelValue", id, image.minPixelValue]);
//         setStore(["maxPixelValue", id, image.maxPixelValue]);
//       });
//     } else {
//       let t0: number | undefined;
//       if (getPerformanceMonitor() === true) {
//         t0 = performance.now();
//       }

//       const image = await cornerstone.loadImage(imageId);
//       cornerstone.displayImage(element, image);

//       if (getPerformanceMonitor() === true) {
//         const t1 = performance.now();
//         if (t0 !== undefined) {
//           // check if t0 is defined before using it
//           console.log(
//             `Call to updateImage for viewport ${id} took ${
//               t1 - t0
//             } milliseconds.`
//           );
//         }
//       }

//       setStore(["sliceId", id, imageIndex]);
//       const pendingSliceId = store.get(["viewports", id, "pendingSliceId"]);
//       if (imageIndex == pendingSliceId) {
//         setStore(["pendingSliceId", id, undefined]);
//       }
//       setStore(["minPixelValue", id, image.minPixelValue]);
//       setStore(["maxPixelValue", id, image.maxPixelValue]);
//     }
//   }
// };

// /**
//  * Reset viewport values (scale, translation and wwwc)
//  * @instance
//  * @function resetViewports
//  * @param {Array} elementIds - The array of hmtl div ids
//  * @param {Array} keys - The array of viewport sections to resets (default is all)
//  */
// export const resetViewports = function (
//   elementIds: string[],
//   keys?: Array<
//     "contrast" | "scaleAndTranslation" | "rotation" | "flip" | "zoom"
//   >
// ) {
//   each(elementIds, function (elementId: string) {
//     const element = document.getElementById(elementId);
//     if (!element) {
//       console.error("invalid html element: " + elementId);
//       return;
//     }

//     const defaultViewport = store.get(["viewports", elementId, "default"]);
//     const viewport = cornerstone.getViewport(element);

//     if (!viewport) {
//       throw new Error("viewport not found");
//     }

//     if (!keys || keys.find(v => v === "contrast")) {
//       viewport.voi.windowWidth = defaultViewport.voi.windowWidth;
//       viewport.voi.windowCenter = defaultViewport.voi.windowCenter;
//       viewport.invert = defaultViewport.voi.invert;
//       setStore([
//         "contrast",
//         elementId,
//         viewport.voi.windowWidth,
//         viewport.voi.windowCenter
//       ]);
//     }

//     if (!keys || keys.find(v => v === "scaleAndTranslation")) {
//       viewport.scale = defaultViewport.scale;
//       setStore(["scale", elementId, viewport.scale]);

//       viewport.translation.x = defaultViewport.translation.x;
//       viewport.translation.y = defaultViewport.translation.y;
//       setStore([
//         "translation",
//         elementId,
//         viewport.translation.x,
//         viewport.translation.y
//       ]);
//     }

//     if (!keys || keys.find(v => v === "rotation")) {
//       viewport.rotation = defaultViewport.rotation;
//       setStore(["rotation", elementId, viewport.rotation]);
//     }

//     if (!keys || keys.find(v => v === "flip")) {
//       viewport.hflip = false;
//       viewport.vflip = false;
//     }

//     if (!keys || keys.find(v => v === "zoom")) {
//       viewport.scale = defaultViewport.scale;
//       setStore(["scale", elementId, viewport.scale]);
//     }

//     cornerstone.setViewport(element, viewport);

//     if (!keys || keys.find(v => v === "scaleAndTranslation")) {
//       cornerstone.fitToWindow(element);
//     }
//     cornerstone.updateImage(element);
//   });
// };

// /**
//  * Update viewport data in store
//  * @instance
//  * @function updateViewportData
//  * @param {string} elementId - The html div id used for rendering or its DOM HTMLElement
//  * @param {Viewport} viewportData - The new viewport data
//  * @param {string} activeTool - The active tool on the viewport
//  */
// export const updateViewportData = function (
//   elementId: string,
//   viewportData: Viewport,
//   activeTool: string
// ) {
//   let element = document.getElementById(elementId as string);
//   if (!element) {
//     console.error("invalid html element: " + elementId);
//     return;
//   }
//   const toolsNames = Object.keys(DEFAULT_TOOLS);
//   const isValidTool = toolsNames.includes(activeTool);
//   if (isValidTool === true) {
//     switch (activeTool) {
//       case "WwwcRegion":
//       case "WwwcRemoveRegion":
//       case "Wwwc":
//       case "Wwwl":
//         if (viewportData.voi) {
//           setStore([
//             "contrast",
//             elementId,
//             viewportData.voi.windowWidth,
//             viewportData.voi.windowCenter
//           ]);
//         }
//         break;
//       case "Pan":
//         if (viewportData.translation) {
//           setStore([
//             "translation",
//             elementId,
//             viewportData.translation.x,
//             viewportData.translation.y
//           ]);
//         }
//         break;
//       case "Zoom":
//         if (viewportData.scale) {
//           setStore(["scale", elementId, viewportData.scale]);
//         }
//         break;
//       case "Rotate":
//         if (viewportData.rotation) {
//           setStore(["rotation", elementId, viewportData.rotation]);
//         }
//         break;
//       case "CustomMouseWheelScroll":
//         const viewport = store.get(["viewports", elementId]);
//         const isTimeserie = viewport.isTimeserie;
//         if (isTimeserie) {
//           const index = viewportData.newImageIdIndex;
//           const timeId = viewport.timeIds[index];
//           const timestamp = viewport.timestamps[index];
//           setStore(["timeId", elementId, timeId]);
//           setStore(["timestamp", elementId, timestamp]);
//         }
//         break;
//       default:
//         // console.warn("unhandled tool: " + activeTool);
//         break;
//     }
//   } else {
//     console.warn("unknown tool: " + activeTool);
//   }
// };

// /**
//  * Store the viewport data into internal storage
//  * @instance
//  * @function storeViewportData
//  * @param {Object} image - The cornerstone image frame
//  * @param {String} elementId - The html div id used for rendering
//  * @param {String} viewport - The viewport tag name
//  * @param {Object} data - The viewport data object
//  */
// export const storeViewportData = function (
//   image: cornerstone.Image,
//   elementId: string,
//   viewport: Viewport,
//   data: ReturnType<typeof getSeriesData>
// ) {
//   setStore(["dimensions", elementId, data.rows, data.cols]);
//   setStore(["spacing", elementId, data.spacing_x, data.spacing_y]);
//   setStore(["thickness", elementId, data.thickness]);
//   setStore(["minPixelValue", elementId, image.minPixelValue]);
//   setStore(["maxPixelValue", elementId, image.maxPixelValue]);
//   setStore(["modality", elementId, data.modality]);
//   // slice id from 0 to n - 1
//   setStore(["minSliceId", elementId, 0]);
//   if (data.imageIndex) {
//     setStore(["sliceId", elementId, data.imageIndex]);
//   }
//   const pendingSliceId = store.get(["viewports", elementId, "pendingSliceId"]);
//   if (data.imageIndex == pendingSliceId) {
//     setStore(["pendingSliceId", elementId, undefined]);
//   }

//   if (data.numberOfSlices) {
//     setStore(["maxSliceId", elementId, data.numberOfSlices - 1]);
//   }

//   if (data.isTimeserie) {
//     setStore([
//       "numberOfTemporalPositions",
//       elementId,
//       data.numberOfTemporalPositions as number
//     ]);
//     setStore(["minTimeId", elementId, 0]);
//     setStore(["timeId", elementId, data.timeIndex || 0]);
//     if (data.numberOfSlices && data.numberOfTemporalPositions) {
//       setStore(["maxTimeId", elementId, data.numberOfTemporalPositions - 1]);
//       let maxSliceId = data.numberOfSlices * data.numberOfTemporalPositions - 1;
//       setStore(["maxSliceId", elementId, maxSliceId]);
//     }

//     setStore(["timestamp", elementId, data.timestamp]);
//     setStore(["timestamps", elementId, data.timestamps]);
//     setStore(["timeIds", elementId, data.timeIds]);
//   } else {
//     setStore(["minTimeId", elementId, 0]);
//     setStore(["timeId", elementId, 0]);
//     setStore(["maxTimeId", elementId, 0]);
//     setStore(["timestamp", elementId, 0]);
//     setStore(["timestamps", elementId, []]);
//     setStore(["timeIds", elementId, []]);
//   }

//   setStore([
//     "defaultViewport",
//     elementId,
//     viewport.scale || 0,
//     viewport.rotation || 0,
//     viewport.translation?.x || 0,
//     viewport.translation?.y || 0,
//     data.default?.voi?.windowWidth,
//     data.default?.voi?.windowCenter,
//     viewport.invert === true
//   ]);
//   setStore(["scale", elementId, viewport.scale || 0]);
//   setStore(["rotation", elementId, viewport.rotation || 0]);

//   setStore([
//     "translation",
//     elementId,
//     viewport.translation?.x || 0,
//     viewport.translation?.y || 0
//   ]);
//   setStore([
//     "contrast",
//     elementId,
//     viewport.voi?.windowWidth || 0,
//     viewport.voi?.windowCenter || 0
//   ]);
//   setStore(["isColor", elementId, data.isColor]);
//   setStore(["isMultiframe", elementId, data.isMultiframe]);
//   if (data.isMultiframe) {
//     setStore(["numberOfFrames", elementId, data.numberOfFrames as number]);
//   }
//   setStore(["isTimeserie", elementId, data.isTimeserie]);
//   setStore(["isPDF", elementId, false]);
//   setStore(["waveform", elementId, data.waveform]);
//   setStore(["dsa", elementId, data.dsa]);
// };

// /**
//  * Invert pixels of an image
//  * @instance
//  * @function invertImage
//  * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
//  */
// export const invertImage = function (elementId: string | HTMLElement) {
//   let element = isElement(elementId)
//     ? (elementId as HTMLElement)
//     : document.getElementById(elementId as string);
//   if (!element) {
//     console.error("invalid html element: " + elementId);
//     return;
//   }
//   let viewport = cornerstone.getViewport(element);

//   if (!viewport) {
//     throw new Error("Viewport is undefined");
//   }

//   viewport.invert = !viewport.invert;
//   cornerstone.setViewport(element, viewport);
// };

// /**
//  * Flip image around horizontal axis
//  * @instance
//  * @function flipImageHorizontal
//  * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
//  */
// export const flipImageHorizontal = function (elementId: string | HTMLElement) {
//   let element = isElement(elementId)
//     ? (elementId as HTMLElement)
//     : document.getElementById(elementId as string);
//   if (!element) {
//     console.error("invalid html element: " + elementId);
//     return;
//   }
//   let viewport = cornerstone.getViewport(element);

//   if (!viewport) {
//     throw new Error("Viewport is undefined");
//   }

//   viewport.hflip = !viewport.hflip;
//   cornerstone.setViewport(element, viewport);
// };

// /**
//  * Flip image around vertical axis
//  * @instance
//  * @function flipImageVertical
//  * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
//  */
// export const flipImageVertical = function (elementId: string | HTMLElement) {
//   let element = isElement(elementId)
//     ? (elementId as HTMLElement)
//     : document.getElementById(elementId as string);
//   if (!element) {
//     console.error("invalid html element: " + elementId);
//     return;
//   }
//   let viewport = cornerstone.getViewport(element);

//   if (!viewport) {
//     throw new Error("Viewport is undefined");
//   }

//   viewport.vflip = !viewport.vflip;
//   cornerstone.setViewport(element, viewport);
// };

// /**
//  * Rotate image by 90° in left direction
//  * @instance
//  * @function rotateImageLeft
//  * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
//  */
// export const rotateImageLeft = function (elementId: string | HTMLElement) {
//   let element = isElement(elementId)
//     ? (elementId as HTMLElement)
//     : document.getElementById(elementId as string);
//   if (!element) {
//     console.error("invalid html element: " + elementId);
//     return;
//   }
//   let viewport = cornerstone.getViewport(element);

//   if (!viewport) {
//     throw new Error("Viewport is undefined");
//   }

//   viewport.rotation -= 90;
//   cornerstone.setViewport(element, viewport);
// };

// /**
//  * Rotate image by 90° in right direction
//  * @instance
//  * @function rotateImageRight
//  * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
//  */
// export const rotateImageRight = function (elementId: string | HTMLElement) {
//   let element = isElement(elementId)
//     ? (elementId as HTMLElement)
//     : document.getElementById(elementId as string);
//   if (!element) {
//     console.error("invalid html element: " + elementId);
//     return;
//   }
//   let viewport = cornerstone.getViewport(element);

//   if (!viewport) {
//     throw new Error("Viewport is undefined");
//   }

//   viewport.rotation += 90;
//   cornerstone.setViewport(element, viewport);
// };

// /**
//  * Update Larvitar manager temporal viewport data
//  * @instance
//  * @function updateTemporalViewportData
//  * @param {Series} seriesStack The Id of the series
//  * @param {String} elementId The Id of the html element
//  */
// export const updateTemporalViewportData = function (
//   seriesStack: Series,
//   elementId: string
// ): void {
//   let series = { ...seriesStack };

//   const data = getTemporalSeriesData(series);
//   if (series.is4D) {
//     setStore([
//       "numberOfTemporalPositions",
//       elementId,
//       data.numberOfTemporalPositions as number
//     ]);
//     setStore(["minTimeId", elementId, 0]);
//     if (data.numberOfSlices && data.numberOfTemporalPositions) {
//       setStore(["maxTimeId", elementId, data.numberOfTemporalPositions - 1]);
//       let maxSliceId = data.numberOfSlices * data.numberOfTemporalPositions - 1;
//       setStore(["maxSliceId", elementId, maxSliceId]);
//     }
//     setStore(["timestamps", elementId, data.timestamps || []]);
//     setStore(["timeIds", elementId, data.timeIds || []]);
//   } else {
//     setStore(["minTimeId", elementId, 0]);
//     setStore(["timeId", elementId, 0]);
//     setStore(["maxTimeId", elementId, 0]);
//     setStore(["timestamp", elementId, 0]);
//     setStore(["timestamps", elementId, []]);
//     setStore(["timeIds", elementId, []]);
//   }
// };

/* Internal module functions */

// /**
//  * Get series metadata from default props and series' metadata
//  * @instance
//  * @function getTemporalSeriesData
//  * @param {Object} series - The parsed data series
//  * @return {Object} data - A data dictionary with temporal parsed tags' values
//  */
// const getTemporalSeriesData = function (series: Series): StoreViewport {
//   type RecursivePartial<T> = {
//     [P in keyof T]?: RecursivePartial<T[P]>;
//   };
//   type SeriesData = StoreViewport;
//   const data: RecursivePartial<SeriesData> = {};
//   if (series.is4D) {
//     data.isMultiframe = false;
//     data.isTimeserie = true;
//     // check with real indices
//     data.numberOfSlices = series.numberOfImages;
//     data.numberOfTemporalPositions = series.numberOfTemporalPositions;
//     data.imageIndex = 0;
//     data.timeIndex = 0;
//     data.imageId = series.imageIds[data.imageIndex];
//     data.timestamp = series.instances[data.imageId].metadata[
//       "x00080033"
//     ] as number;
//     data.timestamps = [];
//     data.timeIds = [];
//     each(series.imageIds, function (imageId: string) {
//       (data.timestamps as any[]).push(
//         series.instances[imageId].metadata.contentTime
//       );
//       (data.timeIds as any[]).push(
//         series.instances[imageId].metadata.temporalPositionIdentifier! - 1 // timeId from 0 to N
//       );
//     });
//   }
//   return data as SeriesData;
// };

/**
 * Get series metadata from default props and series' metadata
 * @instance
 * @function getSeriesData
 * @param {Object} series - The parsed data series
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
