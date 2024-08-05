declare const BaseTool: any;
/**
 * @public
 * @class WwwcManualTool
 * @memberof Tools
 *
 * @classdesc Tool for setting wwwc by dragging with mouse/touch.
 * @extends Tools.Base.BaseTool
 */
export default class GspsTool extends BaseTool {
    name: string;
    configuration: any;
    toolAnnotations: any[];
    canvas?: Element;
    constructor(props?: any);
    activeCallback(element: HTMLElement): Promise<void>;
    renderToolData(evt: any): void;
    disabledCallback(element: HTMLElement): Promise<void>;
}
export {};
