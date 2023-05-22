/** @module imaging/imageRendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone
 */
import cornerstone from "cornerstone-core";
import { Image, Series, Viewport } from "./types";
/**
 * Purge the cornestone internal cache
 * If seriesId is passed as argument only imageIds of the series are purged from internal cache
 * @instance
 * @function clearImageCache
 * @param {String} seriesId - The id of the serie
 */
export declare const clearImageCache: (seriesId: string) => void;
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
 * @returns {Promise} - Return a promise which will resolve when pdf is displayed
 */
export declare const renderDICOMPDF: (seriesStack: Series, elementId: string | HTMLElement) => Promise<void>;
/**
 * Render an image (png or jpg) from File on a html div using cornerstone
 * @instance
 * @function renderWebImage
 * @param {Object} file - The image File object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @returns {Promise} - Return a promise which will resolve when image is displayed
 */
export declare const renderFileImage: (file: File, elementId: string | HTMLElement) => Promise<unknown> | undefined;
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
 * @instance
 * @function disableViewport
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export declare const disableViewport: (elementId: string | HTMLElement) => void;
/**
 * Unrender an image on a html div using cornerstone
 * Remove image from cornerstone cache and remove from store
 * @instance
 * @function unloadViewport
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {String} seriesId - The id of the serie
 */
export declare const unloadViewport: (elementId: string, seriesId: string) => void;
/**
 * Resize a viewport using cornerstone resize
 * And forcing fit to window
 * @instance
 * @function resizeViewport
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 */
export declare const resizeViewport: (elementId: string | HTMLElement) => void;
/**
 * Cache image and render it in a html div using cornerstone
 * @instance
 * @function renderImage
 * @param {Object} seriesStack - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Object} defaultProps - Optional default props
 * @return {Promise} Return a promise which will resolve when image is displayed
 */
export declare const renderImage: (seriesStack: Series, elementId: string | HTMLElement, defaultProps: {
    scale?: number;
    colormap?: string;
    tr_x?: number;
    tr_y?: number;
}) => Promise<void> | undefined;
/**
 * Update the cornerstone image with new imageIndex
 * @instance
 * @function updateImage
 * @param {Object} series - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Number} imageIndex - The index of the image to be rendered
 * @param {Boolean} cacheImage - A flag to handle image cache
 */
export declare const updateImage: (series: Series, elementId: string | HTMLElement, imageIndex: number, cacheImage: boolean) => void;
/**
 * Reset viewport values (scale, translation and wwwc)
 * @instance
 * @function resetViewports
 * @param {Array} elementIds - The array of hmtl div ids
 */
export declare const resetViewports: (elementIds: string[]) => void;
/**
 * Update viewport data in store
 * @instance
 * @function updateViewportData
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Object} viewportData - The new viewport data
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
export declare const storeViewportData: (image: cornerstone.Image, elementId: string, viewport: Viewport, data: {
    [key: string]: any;
}) => void;
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
