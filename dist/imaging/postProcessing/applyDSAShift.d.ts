import { Series } from "../types";
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
