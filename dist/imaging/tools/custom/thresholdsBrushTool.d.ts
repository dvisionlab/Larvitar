/** @module imaging/tools/custom/thresholdBrushTool
 *  @desc  This file provides functionalities for
 *         a brush tool with thresholds using a
 *         custom cornestone tool
 */
import { MeasurementMouseEvent } from "../types";
import { Image } from "cornerstone-core";
declare const BaseBrushTool: any;
/**
 * @public
 * @class ThresholdsBrushTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image (only pixels inside thresholds)
 * @extends Tools.Base.BaseBrushTool
 */
export default class ThresholdsBrushTool extends BaseBrushTool {
    static [x: string]: any;
    constructor(props?: {});
    /**
     * Event handler for MOUSE_UP during the drawing event loop.
     *
     * @protected
     * @event
     * @param {MeasurementMouseEvent} evt - The event.
     * @returns {void}
     */
    _drawingMouseUpCallback(evt: MeasurementMouseEvent): void;
    /**
     * Paints the data to the labelmap.
     *
     * @protected
     * @param  {MeasurementMouseEvent} evt The data object associated with the event.
     * @returns {void}
     */
    _paint(evt: MeasurementMouseEvent): void;
    increaseSensitivity(): void;
    decreaseSensitivity(): void;
    _calculateThresholdsWithoutMap(image: Image, dicomPixelData: number[], circleArray: number[][], minThreshold: number | null, maxThreshold: number | null): {
        minThreshold: number;
        maxThreshold: number;
        lowerThreshold: number;
        upperThreshold: number;
    };
}
export {};
