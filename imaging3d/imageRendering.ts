/** @module imaging3d/imageRendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone3D
 */

// external libraries
import * as cornerstone from "@cornerstonejs/core";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";
import * as cornerstoneTools from "@cornerstonejs/tools";
import { each, forEach } from "lodash";
import { v4 as uuidv4 } from "uuid";

// internal libraries
import store, { set as setStore } from "../imaging/imageStore";
import { isElement } from "../imaging/imageUtils";

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

/*
 * This module provides the following functions to be exported:
 * renderImage(seriesStack, elementId, options)
 * initializeRenderingEngine(renderingEngineId)
 * destroyRenderingEngine(renderingEngineId)
 * initializeVolumeViewports(renderingEngineId, mprViewports)
 * loadAndCacheVolume(series)
 * setVolumeForRenderingEngine(volumeId, renderingEngineId)
 * addStandardMetadata(imageId, metadata)
 * renderMpr(seriesStack, renderingEngineId, options)
 * unloadMpr(renderingEngineId)
 * initializeVideoViewport(renderingEngineId, viewport)
 * getVideoUrlFromDicom(series, index)
 * addVideoMetadata(imageId, metadata, videoUrl)
 * renderVideo(series, renderingEngineId, frameNumber)
 * unloadVideo(renderingEngineId)
 * resizeRenderingEngine(renderingEngineId)
 * resetViewports(elementIds, keys)
 * purge3DCache()
 * storeViewportData(elementId, viewport, data)
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
    viewport.setStack(series.imageIds, 0);
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

// TODO UNLOAD STANDARD IMAGE, NOT USED AT THE MOMENT

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
    toolGroup?.removeViewports(renderingEngineId, viewport.id);
    if (toolGroup?.id) {
      destroyToolGroup(toolGroup.id);
    }
    renderingEngine.disableElement(viewport.id);
  });

  renderingEngine.destroy();

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
    logger.debug(
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

  const volumeId = uuidv4();
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
export const setVolumeForRenderingEngine = async function (
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

  await cornerstone.setVolumesForViewports(
    renderingEngine,
    [
      {
        volumeId
      }
    ],
    renderingEngine.getVolumeViewports().map(v => v.id)
  );
};

/**
 * Add standard metadata to an imageId
 * @instance
 * @function addStandardMetadata
 * @param {string} imageId - The unique identifier of the image to add metadata to
 * @param {MetaData} metadata - The metadata object containing video information
 * @returns {void}
 * @throws {Error} If the metadata is missing required fields
 */
export const addStandardMetadata = function (
  imageId: string,
  metadata: MetaData
): void {
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
 * Render a multiplanar reconstruction (MPR) view
 * @instance
 * @function renderMpr
 * @param {Object} seriesStack - The original series data object
 * @param {String} renderingEngineId - The unique identifier of the rendering engine to render the MPR in
 * @param {RenderProps} options - Optional rendering options
 * @return {Promise} Return a promise which will resolve when MPR is displayed
 * @throws {Error} If the rendering engine does not exist or has no volume viewports
 */
export const renderMpr = async function (
  seriesStack: Series,
  renderingEngineId: string,
  options?: RenderProps
): Promise<{ success: boolean; renderingEngine: cornerstone.RenderingEngine }> {
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

  let series = { ...seriesStack };
  const renderOptions = options ? options : {};
  let data: StoreViewport = getSeriesData(series, renderOptions);

  const renderPromise = new Promise<{
    success: boolean;
    renderingEngine: cornerstone.RenderingEngine;
  }>(async (resolve, reject) => {
    const volume = await loadAndCacheVolume(series);
    const t1 = performance.now();
    logger.debug(`Time to load and cache volume: ${t1 - t0} milliseconds`);

    await setVolumeForRenderingEngine(volume.volumeId, renderingEngineId);
    //renderingEngine.renderViewports(viewports.map(v => v.id));
    each(viewports, function (viewport: cornerstone.VolumeViewport) {
      storeViewportData(
        viewport.id,
        viewport as cornerstone.VolumeViewport,
        data
      );
      // Render the image
      viewport.render();

      setStore(["ready", viewport.id, true]);
    });

    const t2 = performance.now();
    logger.debug(`Time to render volume: ${t2 - t1} milliseconds`);

    if (renderOptions.cached === false) {
      // Unload the dataset from the cache
      // This is needed to free memory if the imageId is not cached
      forEach(series.imageIds3D, imageId => {
        const uri =
          cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId).url;
        logger.debug(`Unloading imageId: ${imageId} from cache`);
        cornerstoneDICOMImageLoader.wadouri.dataSetCacheManager.unload(uri);
      });
    }

    // @ts-ignore
    series = null;
    // @ts-ignore
    data = null;

    resolve({ success: true, renderingEngine });
  });

  // Wait for the render promise to complete
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
  // get a viewport from the rendering engine
  // in order to remove the imageIds from the cache
  let renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getVolumeViewports();
  if (viewports.length === 0) {
    logger.error(
      `No volume viewports found for rendering engine ${renderingEngineId}. Please initialize them first.`
    );
    return;
  }

  const viewport = viewports[0]; // Get the first viewport to access imageIds
  const imageIds3D = viewport.getImageIds();

  const volumeId = viewport.getVolumeId();
  // cache from cornerstone core
  let volume = cornerstone.cache.getVolume(volumeId);
  if (volume) {
    logger.debug(`Unloading volume: ${volumeId} from cache`);
    volume.removeFromCache();
    try {
      volume.destroy();
    } catch (error) {
      logger.debug(`Error destroying volume: ${error}`);
    }
  }

  if (imageIds3D && imageIds3D.length > 0) {
    forEach(imageIds3D, imageId => {
      const uri = cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId).url;
      logger.debug(`Unloading imageId: ${imageId} from cache`);
      cornerstoneDICOMImageLoader.wadouri.dataSetCacheManager.unload(uri);
      cornerstone.cache.removeImageLoadObject(imageId, { force: true });
    });
  }

  destroyRenderingEngine(renderingEngineId);
  // @ts-ignore for garbage collection
  renderingEngine = null;
  // @ts-ignore for garbage collection
  volume = null;
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
): Promise<void> {
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
  addStandardMetadata(series.imageIds[imageIndex], videoMetadata);
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

    videoViewport.element.addEventListener(
      cornerstone.Enums.Events.STACK_NEW_IMAGE,
      renderFrameEvent
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
 * Unload a Video rendering engine and remove event listeners
 * @instance
 * @function unloadVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to unload
 * @returns {void}
 */
export const unloadVideo = function (renderingEngineId: string): void {
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
  const element = videoViewport.element;
  element.removeEventListener(
    cornerstone.Enums.Events.STACK_NEW_IMAGE,
    renderFrameEvent
  );

  // disable the element
  renderingEngine.disableElement(videoViewport.id);

  // destroy the rendering engine
  destroyRenderingEngine(renderingEngineId);
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

/**
 * Reset viewport values (contrast, pan and zoom)
 * @instance
 * @function resetViewports
 * @param {Array} elementIds - The array of hmtl div ids
 * @param {Array} keys - The array of viewport sections to resets (default is all)
 */
export const resetViewports = function (
  elementIds: string[],
  keys?: Array<"contrast" | "pan" | "zoom">
) {
  each(elementIds, function (elementId: string) {
    const viewport =
      cornerstone.getEnabledElementByViewportId(elementId).viewport;
    if (!keys || keys?.includes("zoom")) {
      viewport.setZoom(1);
    }
    if (!keys || keys?.includes("pan")) {
      viewport.setPan([0, 0]);
    }
    if (!keys || keys?.includes("contrast")) {
      const defaultVoiRange = viewport.getDefaultProperties(
        viewport.getCurrentImageId()
      ).voiRange;
      viewport.setProperties({ voiRange: defaultVoiRange });
    }

    //TODO - add reset rotation

    viewport.render();
  });
};

/**
 * Purge all 3D cached volumes and rendering engines
 * @instance
 * @function purge3DCache
 * @returns {void}
 */
export const purge3DCache = function (): void {
  const renderingEngines = cornerstone.getRenderingEngines();
  each(renderingEngines, function (re: cornerstone.RenderingEngine) {
    const viewports = re.getVolumeViewports();
    if (viewports.length > 0) {
      unloadMpr(re.id);
    }
  });
};

/**
 * Clear the 3D image cache for a specific series using its uniqueUID
 * @instance
 * @function clear3DImageCache
 * @param {string} uniqueUID - The unique identifier of the series to clear the 3D image cache for
 * @returns {void}
 */
export const clear3DImageCache = function (uniqueUID: string): void {
  const series = store.get("series");
  const imageIds3D = series?.[uniqueUID]?.imageIds3D || [];

  if (imageIds3D.length === 0) return;

  logger.debug(`Clearing 3Dimage cache for ${uniqueUID}`);
  for (const imageId of imageIds3D) {
    const uri = cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId).url;
    logger.debug(`Unloading imageId3D: ${imageId} from 3Dcache`);
    try {
      cornerstoneDICOMImageLoader.wadouri.dataSetCacheManager.unload(uri);
      cornerstone.cache.removeImageLoadObject(imageId, { force: true });
    } catch (e) {
      logger.debug(`Failed to clear 3D cache for imageId: ${imageId}`, e);
    }
  }
};

/**
 * Store the viewport data into internal storage
 * @instance
 * @function storeViewportData
 * @param {String} elementId - The html div id used for rendering
 * @param {String} viewport - The viewport tag name
 * @param {Object} data - The viewport data object
 * @returns {void}
 */
export const storeViewportData = function (
  elementId: string,
  viewport: cornerstone.VolumeViewport,
  data: ReturnType<typeof getSeriesData>
): void {
  setStore(["dimensions", elementId, data.rows, data.cols]);
  setStore(["spacing", elementId, data.spacing_x, data.spacing_y]);
  setStore(["thickness", elementId, data.thickness]);
  //setStore(["minPixelValue", elementId, image.minPixelValue]);
  //setStore(["maxPixelValue", elementId, image.maxPixelValue]);
  setStore(["modality", elementId, data.modality]);
  // slice id from 0 to n - 1
  setStore(["minSliceId", elementId, 0]);
  if (data.imageIndex) {
    setStore(["sliceId", elementId, data.imageIndex]);
  }
  const pendingSliceId = store.get(["viewports", elementId, "pendingSliceId"]);
  if (data.imageIndex == pendingSliceId) {
    setStore(["pendingSliceId", elementId, undefined]);
  }

  if (data.numberOfSlices) {
    setStore(["maxSliceId", elementId, data.numberOfSlices - 1]);
  }

  setStore(["camera", elementId, viewport.getCamera()]);
  setStore(["mpr", elementId, viewport]);

  setStore(["isColor", elementId, data.isColor]);
  setStore(["isMultiframe", elementId, data.isMultiframe]);
  if (data.isMultiframe) {
    setStore(["numberOfFrames", elementId, data.numberOfFrames as number]);
  }
  setStore(["isTimeserie", elementId, data.isTimeserie]);
  setStore(["isPDF", elementId, false]);
  setStore(["waveform", elementId, data.waveform]);
  setStore(["dsa", elementId, data.dsa]);
};

// Helper functions

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

/**
 * Event handler for rendering a frame in a video viewport
 * @instance
 * @function renderFrameEvent
 * @param {any} event - The event object containing the viewport details
 * @returns {void}
 */
const renderFrameEvent = function (event: any): void {
  const frame = event.detail.viewport.getFrameNumber();
  setStore(["sliceId", event.detail.viewport.id, frame]);
};

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
