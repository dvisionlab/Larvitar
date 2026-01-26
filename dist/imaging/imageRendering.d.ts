/** @module imaging/imageRendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone
 */
import cornerstone from "cornerstone-core";
import { DisplayedArea, RenderProps, Series, StoreViewport, Viewport } from "./types";
import { ViewportComplete } from "./tools/types";
/**
 * Purge the cornestone internal cache
 * If seriesId is passed as argument only imageIds of the series are purged from internal cache
 * @instance
 * @function clearImageCache
 * @param {String} uniqueUID - The uniqueUID of the series
 */
export declare const clearImageCache: (uniqueUID?: string) => void;
/**
 * Purge the cornestone internal cache for standard series
 * @instance
 * @function clearStandardImageCache
 * @param {String} uniqueUID - The uniqueUID of the series
 */
export declare const clearStandardImageCache: (uniqueUID: string) => void;
/**
 * Purge the cornestone internal cache for DSA series
 * @instance
 * @function clearDSAImageCache
 * @param {String} uniqueUID - The uniqueUID of the series
 */
export declare const clearDSAImageCache: (uniqueUID: string) => void;
/**
 * Load and cache a single image
 * Add series's imageIds into store
 * @instance
 * @function loadAndCacheImage
 * @param {Object} series the parsed series data
 * @param {number} imageIndex the image index in the imageIds array
 */
export declare function loadAndCacheImage(series: Series, imageIndex: number): Promise<true>;
/**
 * Load and cache all serie's images
 * Add series's imageIds into store
 * @instance
 * @function loadAndCacheImages
 * @param {Object} series the parsed series data
 * @param {Function} callback a callback function
 */
export declare function loadAndCacheImages(series: Series, callback: (payload: {
    seriesId: string;
    loading: number;
    series: Series;
}) => any): void;
/**
 * Render a PDF from a DICOM Encapsulated PDF
 * @instance
 * @function renderDICOMPDF
 * @param {Object} seriesStack - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Boolean} convertToImage - An optional flag to convert pdf to image, default is false
 * @returns {Promise} - Return a promise which will resolve when pdf is displayed
 */
export declare const renderDICOMPDF: (seriesStack: Series, elementId: string | HTMLElement, convertToImage?: boolean) => Promise<true>;
/**
 * Render an image (png or jpg) from File on a html div using cornerstone
 * @instance
 * @function renderFileImage
 * @param {Object} file - The image File object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @returns {Promise} - Return a promise which will resolve when image is displayed
 */
export declare const renderFileImage: (file: File, elementId: string | HTMLElement) => Promise<true>;
/**
 * Render an image (png or jpg) from web url on a html div using cornerstone
 * @instance
 * @function renderWebImage
 * @param {String} url - The image data url
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @returns {Promise} - Return a promise which will resolve when image is displayed
 */
export declare const renderWebImage: (url: string, elementId: string | HTMLElement) => Promise<cornerstone.Image>;
/**
 * Unrender an image on a html div using cornerstone
 * Remove mouse listeners
 * Remove uniqueUID from viewport store
 * Remove ready flag from viewport store
 * @instance
 * @function disableViewport
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export declare const disableViewport: (elementId: string | HTMLElement) => void;
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
export declare const unloadViewport: (elementId: string) => void;
/**
 * Resize a viewport using cornerstone resize
 * And forcing fit to window
 * @instance
 * @function resizeViewport
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export declare const resizeViewport: (elementId: string | HTMLElement) => void;
/**
 * Check if the displayed image is anisotropic (row pixel spacing !== col pixel spacing)
 * @instance
 * @function isAnisotropic
 * @param {String | StoreViewport} idOrViewport - The html div id or the viewport used for rendering
 * @returns {Boolean}
 */
export declare function isAnisotropic(idOrViewport: string | StoreViewport): boolean;
/**
 * Retrieves Anisotropic Viewport displayedArea properties
 * @instance
 * @function getAnisotropicDisplayedArea
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {ViewportComplete | StoreViewport} viewport - The viewport
 * @returns {DisplayedArea}
 */
export declare const getAnisotropicDisplayedArea: (id: string, viewport: ViewportComplete | StoreViewport) => DisplayedArea | undefined;
/**
 * Cache image and render it in a html div using cornerstone
 * @instance
 * @function renderImage
 * @param {Object} seriesStack - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {RenderProps | undefined} options - Optional properties
 * @return {Promise} Return a promise which will resolve when image is displayed
 */
export declare const renderImage: (seriesStack: Series, elementId: string | HTMLElement, options?: RenderProps, signal?: AbortSignal) => Promise<true>;
/**
 * Redraw the cornerstone image
 * @instance
 * @function redrawImage
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export declare const redrawImage: (elementId: string) => void;
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
export declare const updateImage: (series: Series, elementId: string | HTMLElement, imageIndex: number, cacheImage: boolean) => Promise<void>;
/**
 * Reset viewport values (scale, translation and wwwc)
 * @instance
 * @function resetViewports
 * @param {Array} elementIds - The array of hmtl div ids
 * @param {Array} keys - The array of viewport sections to resets (default is all)
 */
export declare const resetViewports: (elementIds: string[], keys?: Array<"contrast" | "scaleAndTranslation" | "rotation" | "flip" | "zoom">) => void;
/**
 * Update viewport data in store
 * @instance
 * @function updateViewportData
 * @param {string} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Viewport} viewportData - The new viewport data
 * @param {string} activeTool - The active tool on the viewport
 */
export declare const updateViewportData: (elementId: string, viewportData: Viewport, activeTool: string) => void;
/**
 * Store the viewport data into internal storage
 * @instance
 * @function storeViewportData
 * @param {Object} image - The cornerstone image frame
 * @param {String} elementId - The html div id used for rendering
 * @param {String} viewport - The viewport tag name
 * @param {Object} data - The viewport data object
 */
export declare const storeViewportData: (image: cornerstone.Image, elementId: string, viewport: Viewport, data: ReturnType<typeof getSeriesData>) => void;
/**
 * Invert pixels of an image
 * @instance
 * @function invertImage
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export declare const invertImage: (elementId: string | HTMLElement) => void;
/**
 * Flip image around horizontal axis
 * @instance
 * @function flipImageHorizontal
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export declare const flipImageHorizontal: (elementId: string | HTMLElement) => void;
/**
 * Flip image around vertical axis
 * @instance
 * @function flipImageVertical
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export declare const flipImageVertical: (elementId: string | HTMLElement) => void;
/**
 * Rotate image by 90° in left direction
 * @instance
 * @function rotateImageLeft
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export declare const rotateImageLeft: (elementId: string | HTMLElement) => void;
/**
 * Rotate image by 90° in right direction
 * @instance
 * @function rotateImageRight
 * @param {Object} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export declare const rotateImageRight: (elementId: string | HTMLElement) => void;
/**
 * Update Image manager temporal viewport data
 * @instance
 * @function updateTemporalViewportData
 * @param {Series} seriesStack The Id of the series
 * @param {String} elementId The Id of the html element
 */
export declare const updateTemporalViewportData: (seriesStack: Series, elementId: string) => void;
/**
 * Get series metadata from default props and series' metadata
 * @instance
 * @function getSeriesData
 * @param {Series} series - The parsed data series
 * @param {RenderProps} renderOptions - Optional default properties
 * @return {StoreViewport} data - A data dictionary with parsed tags' values
 */
declare const getSeriesData: (series: Series, renderOptions: RenderProps) => StoreViewport;
export {};
