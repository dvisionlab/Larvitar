declare const BaseTool: any;
/**
 * @public
 * @class WwwcManualTool
 * @memberof Tools
 *
 * @classdesc Tool for setting wwwc by dragging with mouse/touch.
 * @extends Tools.Base.BaseTool
 */
export default class WwwlTool extends BaseTool {
    name: string;
    configuration: any;
    constructor(props?: any);
    mouseDragCallback(evt: any): void;
    touchDragCallback(evt: any): void;
}
export {};
