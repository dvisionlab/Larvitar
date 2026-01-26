/** @module imaging/tools/custom/editMaskTool
 *  @desc  This file provides functionalities for
 *         a custom mask cornestone tool
 */
import { MaskData, MeasurementMouseEvent } from "../types";
declare const BaseBrushTool: any;
/**
 * @public
 * @class BrushTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image.
 * @extends Tools.Base.BaseBrushTool
 */
export declare class EditMaskTool extends BaseBrushTool {
    static [x: string]: any;
    constructor(props?: {
        mask?: MaskData;
        initCallback?: Function;
    });
    _initializeTool(mask: MaskData, callback: Function): void;
    activeCallback(element: HTMLElement, options: {
        force: string;
    }): void;
    preventCtrl(): void;
    /**
     * Paints the data to the labelmap.
     *
     * @protected
     * @param  {Object} evt The data object associated with the event.
     * @returns {void}
     */
    _paint(evt: MeasurementMouseEvent): void;
}
export {};
