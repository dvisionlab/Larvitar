import { Image, Viewport } from "cornerstone-core";
import { MetaData } from "../../../types";
/**
  * Applies the Modality LUT or rescale operation to map stored pixel values
    to meaningful output values using DICOM attributes (x00283000, x00281052, x00281053).
    Handles both LUT Sequence and linear rescale.
 * @name applyModalityLUT
 * @protected
 * @param  {MetaData} metadata //ps metadata
 * @param  {ImageParameters} image //image parameters
 * @param  {Viewport} viewport //viewport data
 *
 * @returns {void}
 */
export declare function applyModalityLUT(metadata: MetaData, image: Image, viewport: Viewport): void;
/**
 * Applies the Softcopy VOI LUT (Window Width and Window Center) to the viewport
   based on the DICOM metadata (attributes: x00281050, x00281051, x00283010).
   Handles both explicit VOI LUT Sequence and window settings.
 * @name applySoftcopyLUT
 * @protected
 * @param  {MetaData} metadata //ps metadata
 * @param  {Viewport} viewport //viewport data
 *
 * @returns {void}
 */
export declare function applySoftcopyLUT(metadata: MetaData, viewport: Viewport): void;
/**
 * Applies the Presentation LUT Sequence or shape to the viewport,
   modifying the display output as per DICOM attributes (x20500010, x20500020).
   Supports both LUT application and inversion logic.
 * @name applySoftcopyPresentationLUT
 * @protected
 * @param  {MetaData} metadata //ps metadata
 * @param  {Viewport} viewport //viewport data
 *
 * @returns {void}
 */
export declare function applySoftcopyPresentationLUT(metadata: MetaData, viewport: Viewport): void;
