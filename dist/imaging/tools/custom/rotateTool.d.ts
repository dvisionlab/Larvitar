import { MeasurementMouseEvent } from "../types";
declare const BaseTool: any;
/**
 * @public
 * @class RotateTool
 * @memberof Tools
 *
 * @classdesc Tool for rotating the image.
 * @extends Tools.Base.BaseTool
 */
export default class RotateTool extends BaseTool {
    static [x: string]: any;
    constructor(props?: {});
    touchDragCallback(evt: MeasurementMouseEvent): void;
    mouseDragCallback(evt: MeasurementMouseEvent): void;
    postMouseDownCallback(evt: MeasurementMouseEvent): void;
    dragCallback(evt: MeasurementMouseEvent): void;
}
export {};
