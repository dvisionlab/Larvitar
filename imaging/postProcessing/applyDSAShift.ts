// external libraries
import cornerstone from "cornerstone-core";
// internal libraries
import { updateImage, redrawImage } from "../imageRendering";
import store from "../imageStore";
import { Series } from "../types";
//applyDSAShift(elementId: string, multiFrameSerie: Series, frameId: number, inputMaskSubPixelShift: number[]): void
/**
 * Apply DSA with Pixel Shift and update the image
 * @function applyDSAShift
 * @param {string} elementId - elementId of the viewer
 * @param {Series} multiFrameSerie - multiframe serie to apply DSA
 * @param {number} frameId - index of the frame to apply DSA
 * @param {number[]} inputMaskSubPixelShift - pixel shift applied to the mask
 * @returns {void}
 */
export const applyDSAShift = function (
  elementId: string,
  multiFrameSerie: Series,
  frameId: number,
  inputMaskSubPixelShift: number[]
): void {
  const t0 = performance.now();
  // set in store the mask subpixel shift
  store.setDSAPixelShift(elementId, inputMaskSubPixelShift);

  // uncache image from cornestone cache
  const imageId = multiFrameSerie.dsa!.imageIds[frameId];
  cornerstone.imageCache.removeImageLoadObject(imageId);

  // update image
  updateImage(multiFrameSerie, elementId, frameId, true);
  redrawImage(elementId);

  const t1 = performance.now();
  console.debug(`Call to DSA applyDSAShift took ${t1 - t0} milliseconds.`);
};
