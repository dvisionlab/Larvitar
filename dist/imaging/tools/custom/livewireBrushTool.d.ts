/** @module imaging/tools/custom/livewireSegmentationTool
 *  @desc  This file provides functionalities for
 *         a brush tool with livewire using a
 *         custom cornerstoneTools
 */
import { Coords, MeasurementMouseEvent } from "../types";
import { LivewireScissors } from "./utils/livewireUtils/livewireScissors";
import { LivewirePath } from "./utils/livewireUtils/livewirePath";
import { Image } from "cornerstone-core";
declare const BaseBrushTool: any;
export default class LivewireBrushTool extends BaseBrushTool {
    private gradient;
    private pixelData;
    private lastRenderTimestamp;
    private throttleTime;
    private throttledRenderBrush;
    constructor(props?: {});
    dijkstra(image: Image, width: number, height: number, voiRange: {
        lower: number;
        upper: number;
    }, brushRadius: number, startPoint: Coords, scissors?: LivewireScissors | null, path?: LivewirePath | null): {
        path: [number, number][];
        scissors: LivewireScissors;
    };
    renderToolData(evt: MeasurementMouseEvent): void;
    renderBrush(evt: MeasurementMouseEvent): void;
    _paint(evt: MeasurementMouseEvent): void;
}
export {};
