import { Viewport } from "../../types";
import { EventData, Overlay } from "../types";
declare const BaseTool: any;
interface ToolMouseEvent {
    detail: EventData;
    currentTarget: any;
}
/**
 *
 * http://dicom.nema.org/dicom/2013/output/chtml/part03/sect_C.9.html
 *
 * @public
 * @class Overlay
 * @memberof Tools
 *
 * @classdesc Tool for displaying a scale overlay on the image.  Uses viewport.overlayColor to set the default colour.
 * @extends Tools.Base.BaseTool
 */
export default class OverlayTool extends BaseTool {
    constructor(configuration?: {});
    enabledCallback(element: HTMLElement): void;
    disabledCallback(element: HTMLElement): void;
    forceImageUpdate(element: HTMLElement): void;
    setupRender(image: cornerstone.Image): {
        overlays: Overlay[];
    } | undefined;
    setupViewport(viewport: Viewport): true | undefined;
    renderToolData(evt: ToolMouseEvent): void;
}
export {};
