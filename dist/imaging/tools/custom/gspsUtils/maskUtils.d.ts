import { Image } from "cornerstone-core";
import { MetaData, Series } from "../../../types";
import { ViewportComplete } from "../../types";
/**
 * This function retrieves and applies a display shutter based on DICOM metadata,
   supporting rectangular, circular, and polygonal shutters (shape x00181600).
 * @name retrieveDisplayShutter
 * @protected
 * @param  {MetaData} metadata //ps metadata
 * @param  {HTMLElement} element //HTML element associated with the image display
 * @param  {Image} image //the dicom image
 * @param  {HTMLCanvasElement} canvas //canvas where the shutter effect will be applied
 * @param  {ViewportComplete} viewport //viewport settings
 *
 * @returns {void}
 */
export declare function retrieveDisplayShutter(metadata: MetaData, element: HTMLElement, image: Image, canvas: HTMLCanvasElement, viewport: ViewportComplete): void;
/**
 * Enables and updates the Digital Subtraction Angiography (DSA) mask on
   multi-frame series, ensuring the appropriate frame is displayed.
 * @name applyMask
 * @protected
 * @param  {Series} serie //the original series data
 * @param  {HTMLElement} element //the html div id used for rendering or its DOM HTMLElement
 *
 * @returns {void}
 */
export declare function applyMask(serie: Series, element: HTMLElement): void;
