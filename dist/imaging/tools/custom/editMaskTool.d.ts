/**
 * @public
 * @class BrushTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image.
 * @extends Tools.Base.BaseBrushTool
 */
export class EditMaskTool {
    constructor(props?: {});
    touchDragCallback: (evt: Object) => void;
    _initializeTool(mask: any, callback: any): void;
    activeCallback(element: any, options: any): void;
    preventCtrl(): void;
    /**
     * Paints the data to the labelmap.
     *
     * @protected
     * @param  {Object} evt The data object associated with the event.
     * @returns {void}
     */
    protected _paint(evt: Object): void;
}
