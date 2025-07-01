/** @module imaging/imageRendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone
 */
import * as cornerstone from "@cornerstonejs/core";
import { RenderProps, Series } from "../imaging/types";
import { MprViewport } from "./types";
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
export declare const setVolumeForRenderingEngine: (volumeId: string, renderingEngineId: string) => void;
export declare const renderMpr: (series: Series, renderingEngineId: string, options?: RenderProps) => Promise<cornerstone.RenderingEngine>;
/**
 * Unload a MPR rendering engine
 * @instance
 * @function unloadMpr
 * @param {string} renderingEngineId - The unique identifier of the rendering engine to unload
 * @returns {void}
 */
export declare const unloadMpr: (renderingEngineId: string) => void;
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
