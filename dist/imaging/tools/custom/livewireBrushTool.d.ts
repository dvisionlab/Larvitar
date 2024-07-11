/** @module imaging/tools/custom/livewireSegmentationTool
 *  @desc  This file provides functionalities for
 *         a brush tool with livewire using a
 *         custom cornerstoneTools
 */
import { MeasurementMouseEvent } from "../types";
declare const BaseBrushTool: any;
export default class LivewireBrushTool extends BaseBrushTool {
    private gradient;
    private pixelData;
    private lastRenderTimestamp;
    private throttleTime;
    private throttledRenderBrush;
    constructor(props?: {});
    dijkstra(image: Float32Array, width: number, height: number, voiRange: {
        lower: number;
        upper: number;
    }, brushRadius: number, startPoint: [number, number]): [number, number][];
    renderToolData(evt: MeasurementMouseEvent): void;
    renderBrush(evt: MeasurementMouseEvent): void;
    _paint(evt: MeasurementMouseEvent): void;
}
export {};
