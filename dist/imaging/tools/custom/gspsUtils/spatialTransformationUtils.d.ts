import { MetaData } from "../../../types";
import { ViewportComplete } from "../../types";
/**
 * Applies spatial transformations like rotation and flipping to the viewport
   using the DICOM Graphic Layer Module (x00700041, x00700042).
   Considers initial rotation and flip settings.
 * @name applySpatialTransformation
 * @protected
 * @param  {MetaData} metadata //ps metadata
 * @param  {ViewportComplete} viewport //viewport object containing display settings
 *
 * @returns {void}
 */
export declare function applySpatialTransformation(metadata: MetaData, viewport: ViewportComplete): void;
/**
 * Applies zoom and pan transformations to the viewport based on the
   DICOM Displayed Area Selection Sequence (x0070005a). Handles pixel
   origin interpretation, top-left/bottom-right coordinates, pixel spacing,
   and magnification.
 * @name applyZoomPan
 * @protected
 * @param  {MetaData} metadata //ps metadata
 * @param  {ViewportComplete} viewport //viewport properties
 * @param  {HTMLElement} element //
 *
 * @returns {void}
 */
export declare function applyZoomPan(metadata: MetaData, viewport: ViewportComplete, element: HTMLElement): void;
