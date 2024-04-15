/**
 * @public
 * @class ThresholdsBrushTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image (only pixels inside thresholds)
 * @extends Tools.Base.BaseBrushTool
 */
export default class ThresholdsBrushTool {
    constructor(props?: {});
    touchDragCallback: (evt: Object) => void;
    /**
     * Paints the data to the labelmap.
     *
     * @protected
     * @param  {Object} evt The data object associated with the event.
     * @returns {void}
     */
    protected _paint(evt: Object): void;
}
