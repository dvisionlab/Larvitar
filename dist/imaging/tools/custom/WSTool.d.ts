/**
 * @public
 * @class WSTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image (only pixels inside thresholds)
 * @extends Tools.Base.BaseBrushTool
 */
export default class WSTool {
    constructor(props?: {});
    lowerThreshold: number;
    upperThreshold: number;
    Mask_Array: any[];
    touchDragCallback: (evt: Object) => void;
    /**
      * Paints the data to the labelmap.
      *
      * @protected
      * @param  {Object} evt The data object associated with the event.
      * @returns {void}
      */
    protected _paint(evt: Object): void;
    WatershedSegmentation(src: any, upperThreshold: any): void;
    drawBrushPixels(mask: any, pixelData: any, segmentIndex: any, columns: any, shouldErase: any): void;
    eraseIfSegmentIndex(pixelIndex: any, pixelData: any, segmentIndex: any): void;
    _calculateStats(image: any, imagePixelData: any, circleArray: any): {
        mean: number;
        stddev: number;
    };
    getMax(arr: any): number;
    getMin(arr: any): number;
    mapToRange(value: any, inMin: any, inMax: any): number;
}
