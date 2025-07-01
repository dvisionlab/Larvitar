/** @module imaging/imageLayers
 *  @desc This file provides functionalities for
 *        rendering image layers using cornerstone stack
 */
import { Series } from "./types";
/**
 * Build the image layers object
 * @function buildLayers
 * @param {Object} series - Cornerstone series object
 * @param {String} tag - Tag for the layer
 * @param {Object} options - layer options {opacity:float, colormap: str}
 * @returns {Object} Cornerstone layer object
 */
export declare const buildLayer: (series: Series, tag: string, options: {
    opacity: number;
    colormap: string;
}) => {
    imageIds: string[];
    currentImageIdIndex: number;
    options: {
        name: string;
        opacity: number;
        visible: boolean;
        viewport: {
            colormap: string;
        };
    };
};
/**
 * Change the options of a layer
 * @instance
 * @function updateLayer
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {string} layer - The layer id
 * @param {Object} options - The new layer's options
 */
export declare const updateLayer: (elementId: string | HTMLElement, layerId: string, options: {
    opacity: number;
    colormap: string;
}) => void;
/**
 * Get the active layer
 * @instance
 * @function getActiveLayer
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @returns {Object} layer - The active layer object
 */
export declare const getActiveLayer: (elementId: string | HTMLElement) => import("cornerstone-core").EnabledElementLayer | undefined;
/**
 * Set the active layer
 * @instance
 * @function setActiveLayer
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {String} layerId - The id of the layer
 */
export declare const setActiveLayer: (elementId: string | HTMLElement, layerId: string) => void;
