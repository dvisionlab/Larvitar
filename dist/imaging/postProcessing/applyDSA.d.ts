/** @module imaging/postProcessing/applyDSA
 *  @desc This file provides digital subtraction algorithm for XA images
 */
import { Series } from "../types";
/**
 * Apply DSA to a multiframe serie
 * @function applyDSA
 * @param {Series} multiframeSerie - multiframe serie to apply DSA
 * @param {number} index - index of the frame to apply DSA
 * @param {number[]} inputMaskSubPixelShift - pixel shift applied to the mask
 * @returns {number[]} - pixel data of the frame after DSA
 */
export declare function applyDSA(multiframeSerie: Series, index: number, inputMaskSubPixelShift?: number[]): number[];
/**
 * Apply DSA with Pixel Shift and update the image
 * @function applyDSAShift
 * @param {string} elementId - elementId of the viewer
 * @param {Series} multiFrameSerie - multiframe serie to apply DSA
 * @param {number} frameId - index of the frame to apply DSA
 * @param {number[]} inputMaskSubPixelShift - pixel shift applied to the mask
 * @returns {void}
 */
export declare const applyDSAShift: (elementId: string, multiFrameSerie: Series, frameId: number, inputMaskSubPixelShift: number[]) => void;
