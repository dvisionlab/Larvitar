/**
 * Erase all pixels inside/outside the region defined by `operationData.points`.
 * @param  {} evt The Cornerstone event.
 * @param {}  operationData An object containing the `pixelData` to
 *                          modify, the `segmentIndex` and the `points` array.
 * @returns {null}
 */
export function eraseInsideFreehand(evt: any, operationData: any): null;
/**
 * Erase all pixels outside the region defined by `operationData.points`.
 * @param  {} evt The Cornerstone event.
 * @param  {} operationData An object containing the `pixelData` to
 *                          modify, the `segmentIndex` and the `points` array.
 * @returns {null}
 */
export function eraseOutsideFreehand(evt: any, operationData: any): null;
