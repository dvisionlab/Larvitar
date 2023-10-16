/**
 * This is a custom version of setLabelMap3D from cs tools source code
 * This let us implement a non-blocking version of the for loop that loads 3d labelmaps on a volume
 * @ronzim
 */
import { EnabledElement } from "cornerstone-core";
/**
 * Takes a 16-bit encoded `ArrayBuffer` and stores it as a `Labelmap3D` for the
 * `BrushStackState` associated with the element.
 *
 * @param  {HTMLElement|string} elementOrEnabledElementUID The cornerstone
 *                                                  enabled element or its UUID.
 * @param  {ArrayBuffer} buffer
 * @param  {number} labelmapIndex The index to store the labelmap under.
 * @param  {Object[]} metadata = [] Any metadata about the segments.
 * @param  {number[][]} [segmentsOnLabelmapArray] An array of array of segments on each imageIdIndex.
 *                       If not present, is calculated.
 * @param  {colorLUTIndex} [colorLUTIndex = 0] The index of the colorLUT to use to render the segmentation.
 * @returns {null}
 */
declare function setLabelmap3DForElement(elementOrEnabledElementUID: EnabledElement | string, buffer: ArrayBuffer, labelmapIndex: number, metadata: Object[] | undefined, segmentsOnLabelmapArray: number[][], colorLUTIndex?: number): Promise<unknown>;
/**
 * Takes an 16-bit encoded `ArrayBuffer` and stores it as a `Labelmap3D` for
 * the `BrushStackState` associated with the firstImageId.
 *
 * @param  {HTMLElement|string} firstImageId  The firstImageId of the series to
 *                                            store the segmentation on.
 * @param  {ArrayBuffer} buffer
 * @param  {number} labelmapIndex The index to store the labelmap under.
 * @param  {Object[]} metadata = [] Any metadata about the segments.
 * @param  {number} numberOfFrames The number of frames, required to set up the
 *                                 relevant labelmap2D views.
 * @param  {number[][]} [segmentsOnLabelmapArray] An array of array of segments on each imageIdIndex.
 *                       If not present, is calculated.
 * @param  {colorLUTIndex} [colorLUTIndex = 0] The index of the colorLUT to use to render the segmentation.
 * @returns {null}
 */
declare function setLabelmap3DByFirstImageId(firstImageId: string, buffer: ArrayBuffer, labelmapIndex: number, metadata: Object[] | undefined, numberOfFrames: number, segmentsOnLabelmapArray: number[][], colorLUTIndex?: number): Promise<unknown>;
export { setLabelmap3DByFirstImageId, setLabelmap3DForElement };
