/**
 * @public
 * @class ThresholdsBrushTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image (only pixels inside thresholds)
 * @extends Tools.Base.BaseBrushTool
 */
export default class ThresholdsBrushTool {
    constructor(props?: {});
    thresholds: any;
    xFactor: any;
    touchDragCallback: (evt: Object) => void;
    /**
      * Event handler for MOUSE_UP during the drawing event loop.
      *
      * @protected
      * @event
      * @param {Object} evt - The event.
      * @returns {void}
      */
    protected _drawingMouseUpCallback(evt: Object): void;
    _drawing: boolean | undefined;
    _mouseUpRender: boolean | undefined;
    /**
     * Paints the data to the labelmap.
     *
     * @protected
     * @param  {Object} evt The data object associated with the event.
     * @returns {void}
     */
    protected _paint(evt: Object): void;
    _calculateThresholdsWithoutMap(image: any, dicomPixelData: any, circleArray: any, minThreshold: any, maxThreshold: any): {
        minThreshold: any;
        maxThreshold: any;
        lowerThreshold: number;
        upperThreshold: number;
    };
}
