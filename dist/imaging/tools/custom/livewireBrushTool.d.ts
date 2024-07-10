/** @module imaging/tools/custom/livewireSegmentationTool
 *  @desc  This file provides functionalities for
 *         a brush tool with livewire using a
 *         custom cornerstoneTools
 */
import { Image } from "cornerstone-core";
import { MeasurementMouseEvent } from "../types";
declare const BaseBrushTool: any;
export default class LivewireBrushTool extends BaseBrushTool {
    private gradient;
    private pixelData;
    private lastRenderTimestamp;
    private throttleTime;
    private throttledRenderBrush;
    constructor(props?: {});
    calculateGradient(image: Image, pixelData: number[]): any[];
    dijkstra(image: Image, startX: number, startY: number, endX: number, endY: number): number[][];
    renderToolData(evt: MeasurementMouseEvent): void;
    renderBrush(evt: MeasurementMouseEvent): void;
    _paint(evt: MeasurementMouseEvent): void;
}
export {};
