/** @module imaging/imageRendering
 *  @desc  This file provides functionalities for
 *         rendering images in html canvas using cornerstone
 */
import { Series, StoreViewportOptions } from "../imaging/types";
/**
 * Cache image and render it in a html div using cornerstone
 * @instance
 * @function renderImage
 * @param {Object} seriesStack - The original series data object
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Object} defaultProps - Optional default props
 * @return {Promise} Return a promise which will resolve when image is displayed
 */
export declare const renderImage: (seriesStack: Series, elementId: string | HTMLElement, defaultProps: StoreViewportOptions) => Promise<true>;
export declare const renderMpr: (seriesStack: Series, axialElementId: string | HTMLElement, coronalElementId: string | HTMLElement, sagittalElementId: string | HTMLElement, defaultProps: StoreViewportOptions) => Promise<unknown>;
