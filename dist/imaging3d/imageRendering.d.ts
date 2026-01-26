/** @module imaging3d/imageRendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone3D
 */
import * as cornerstone from "@cornerstonejs/core";
import { MetaData, RenderProps, Series, StoreViewport } from "../imaging/types";
import { MprViewport, VideoViewport } from "./types";
/**
 * Cache image and render it in a html div using cornerstone
 * @instance
 * @function renderImage
 * @param {Object} seriesStack - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {RenderProps} options - Optional rendering options
 * @return {Promise} Return a promise which will resolve when image is displayed
 */
export declare const renderImage: (seriesStack: Series, elementId: string | HTMLElement, options?: RenderProps) => Promise<{
    success: boolean;
    renderingEngine: cornerstone.RenderingEngine;
}>;
/**
 * Initialize a rendering engine with a renderingEngineId
 * @instance
 * @function initializeRenderingEngine
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to initialize
 * @return {cornerstone.RenderingEngine} Returns the initialized rendering engine
 * @throws {Error} If the rendering engine with the same UID already exists
 */
export declare const initializeRenderingEngine: (renderingEngineId: string) => cornerstone.RenderingEngine | void;
/**
 * Destroy a rendering engine by its unique UID
 * @instance
 * @function destroyRenderingEngine
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to destroy
 * @return {void}
 * @throws {Error} If the rendering engine does not exist or has already been destroyed
 */
export declare const destroyRenderingEngine: (renderingEngineId: string) => void;
/**
 * Initialize volume viewports for a rendering engine
 * @instance
 * @function initializeVolumeViewports
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to initialize
 * @param {MprViewport[]} mprViewports - An array of MprViewport objects to initialize
 * @returns {void}
 */
export declare const initializeVolumeViewports: (renderingEngineId: string, mprViewports: MprViewport[]) => void;
/**
 * Load and cache a volume from a series
 * @instance
 * @function loadAndCacheVolume
 * @param {Series} series - The series object containing imageIds and instances
 * @returns {cornerstone.ImageVolume | cornerstone.Types.IStreamingImageVolume} Returns a promise that resolves to the loaded volume
 */
export declare const loadAndCacheVolume: (series: Series) => Promise<cornerstone.ImageVolume | cornerstone.Types.IStreamingImageVolume>;
/**
 * Set a volume for a rendering engine
 * @instance
 * @function setVolumeForRenderingEngine
 * @param {string} volumeId - The unique identifier of the volume to set
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to set the volume for
 * @returns
 */
export declare const setVolumeForRenderingEngine: (volumeId: string, renderingEngineId: string) => Promise<void>;
/**
 * Add standard metadata to an imageId
 * @instance
 * @function addStandardMetadata
 * @param {string} imageId - The unique identifier of the image to add metadata to
 * @param {MetaData} metadata - The metadata object containing video information
 * @returns {void}
 * @throws {Error} If the metadata is missing required fields
 */
export declare const addStandardMetadata: (imageId: string, metadata: MetaData) => void;
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
export declare const renderMpr: (seriesStack: Series, renderingEngineId: string, options?: RenderProps) => Promise<{
    success: boolean;
    renderingEngine: cornerstone.RenderingEngine;
}>;
/**
 * Unload a MPR rendering engine
 * @instance
 * @function unloadMpr
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to unload
 * @returns {void}
 */
export declare const unloadMpr: (renderingEngineId: string) => void;
/**
 * Initialize a video viewport for a rendering engine
 * @instance
 * @function initializeVideoViewport
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to initialize
 * @param {VideoViewport} viewport - The VideoViewport object to initialize
 * @returns {void}
 * @throws {Error} If the rendering engine does not exist or has already been destroyed
 */
export declare const initializeVideoViewport: (renderingEngineId: string, viewport: VideoViewport) => void;
/**
 * Get a video URL from a DICOM series
 * @instance
 * @function getVideoUrlFromDicom
 * @param {Series} series - The series object containing imageIds and instances
 * @param {number} index - The index of the image in the series
 * @returns {string | null} Returns a video URL created from the DICOM pixel data or null if not found
 */
export declare const getVideoUrlFromDicom: (series: Series, index: number) => string | null;
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
export declare const addVideoMetadata: (imageId: string, metadata: MetaData, videoUrl: string) => void;
/**
 * Render a video in a video viewport
 * @instance
 * @function renderVideo
 * @param {Series} series - The series object containing imageIds and instances
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to render the video in
 * @param {number} frameNumber - Optional frame number to set for the video
 * @returns {Promise<void>} Returns a promise that resolves when the video is rendered
 */
export declare const renderVideo: (series: Series, renderingEngineId: string, frameNumber?: number) => Promise<void>;
/**
 * Unload a Video rendering engine and remove event listeners
 * @instance
 * @function unloadVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to unload
 * @returns {void}
 */
export declare const unloadVideo: (renderingEngineId: string) => void;
/**
 * Resize a rendering engine
 * @instance
 * @function resizeRenderingEngine
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to resize
 * @returns {void}
 */
export declare const resizeRenderingEngine: (renderingEngineId: string) => void;
/**
 * Reset viewport values (contrast, pan and zoom)
 * @instance
 * @function resetViewports
 * @param {Array} elementIds - The array of hmtl div ids
 * @param {Array} keys - The array of viewport sections to resets (default is all)
 */
export declare const resetViewports: (elementIds: string[], keys?: Array<"contrast" | "pan" | "zoom">) => void;
/**
 * Purge all 3D cached volumes and rendering engines
 * @instance
 * @function purge3DCache
 * @returns {void}
 */
export declare const purge3DCache: () => void;
/**
 * Clear the 3D image cache for a specific series using its uniqueUID
 * @instance
 * @function clear3DImageCache
 * @param {string} uniqueUID - The unique identifier of the series to clear the 3D image cache for
 * @returns {void}
 */
export declare const clear3DImageCache: (uniqueUID: string) => void;
/**
 * Store the viewport data into internal storage
 * @instance
 * @function storeViewportData
 * @param {String} elementId - The html div id used for rendering
 * @param {String} viewport - The viewport tag name
 * @param {Object} data - The viewport data object
 * @returns {void}
 */
export declare const storeViewportData: (elementId: string, viewport: cornerstone.VolumeViewport, data: ReturnType<typeof getSeriesData>) => void;
/**
 * Get series metadata from default props and series' metadata
 * @instance
 * @function getSeriesData
 * @param {Object} series - The parsed data series
 * @param {RenderProps} renderOptions - Optional default properties
 * @return {StoreViewport} data - A data dictionary with parsed tags' values
 */
declare const getSeriesData: (series: Series, renderOptions: RenderProps) => StoreViewport;
export {};
