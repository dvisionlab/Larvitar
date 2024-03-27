/**
 * Fill all pixels inside/outside the region defined by `operationData.points`.
 * @param  {} evt The Cornerstone event.
 * @param {}  operationData An object containing the `pixelData` to
 *                          modify, the `segmentIndex` and the `points` array.
 * @returns {null}
 */
export function fillInsideFreehand(evt: any, operationData: any): null;
/**
 * Fill all pixels outside the region defined by `operationData.points`.
 * @param  {} evt The Cornerstone event.
 * @param  {} operationData An object containing the `pixelData` to
 *                          modify, the `segmentIndex` and the `points` array.
 * @returns {null}
 */
export function fillOutsideFreehand(evt: any, operationData: any): null;
