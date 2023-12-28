/**
 * @public
 * @class WSTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image (only pixels inside thresholds)
 * @extends Tools.Base.BaseBrushTool
 */
export default class WSTool {
    constructor(props?: {});
    lowerThreshold: number | null;
    upperThreshold: number | null;
    maskArray: any[] | null;
    src: any;
    dicomPixelData: any;
    minThreshold: any;
    pixelData: any;
    seriesUID: any;
    maxThreshold: any;
    segmentIndex: number;
    indexImage: number;
    imageId: any;
    seriesId: any;
    labelToErase: number | null;
    /**
     * Allows to get the canvas element when going over it with mouse
     * TODO check with multiple canvas and layouts
     *@name _handleMouseMove
     * @protected
     * @param  {MoveEvent} evt The mouse cursor moving event
     * @returns {void}
     */
    protected _handleMouseMove(e: any): void;
    element: any;
    /**
     * Changes the radius of the brush
     *@method
     * @name _changeRadius
     * @protected
     * @param  {scrollEvent} evt The data object associated with the event.
     * @returns {void}
     */
    protected _changeRadius(evt: scrollEvent): void;
    /**
     * Paints the data to the labelmap.
     *@name _paint
     * @protected
     * @param  {ClickEvent} evt The data object associated with the event.
     * @returns {void}
     */
    protected _paint(evt: ClickEvent): void;
    slicesNumber: any;
    xFactor: number | undefined;
    width: any;
    height: any;
    /**
     * Applies Watershed segmentation algorithm on pixel data using opencv.js
     * and evaluates the mask to apply to the original dicom image
     *@name _ WatershedSegmentation
     * @protected
     * @param  {Mat} src The png matrix associated with the original pixel array
     * @param  {Array} dicomPixelData The pixelDataArray obtained with dicomimage.getPixeldata()
     * @returns {void}
     */
    protected _applyWatershedSegmentation(width: any, height: any, dicomPixelData: any[]): void;
    /**
     * Draws the WS mask on the original imae
     *@name _drawBrushPixels
     * @protected
     * @param  {Array} masks //The mask array retrieved from WS algorithm
     * @param  {Array} pixelData //the original dicom image array
     * @param  {Array} segmentIndex //the index of the mask, in order to identify different features and change color (from 1 to n)
     *
     * @returns {void}
     */
    protected _drawBrushPixels(masks: any[], pixelData2D: any, pixelData3D: any, slicesNumber: any): void;
    /**
     * Allows to erase selected label parts (evaluating the label that appears the most in the selected area) when using cntrl+click
     *@name _labelToErase
     * @protected
     * @param  {Array} circleArray //The selected circle coordinates Array
     * @param  {Array} maskArray //the mask array of the last WS segmentation
     * @param  {Image} image //the dicom image
     *
     * @returns {void}
     */
    protected _labelToErase(circleArray: any[], maskArray: any[], image: new (width?: number | undefined, height?: number | undefined) => HTMLImageElement): void;
    _ManualEraser(circleArray: any, image: any): void;
    /**
      * Allows to calculate stats such as mean and stddev of the selected circle area
      *@name _labelToErase
      * @protected
      * @param  {Image} image //the dicom image
      * @param  {Array} imagePixelData
      * @param  {Array} circleArray //The selected circle coordinates Array
      *
      * @returns {void}
      */
    protected _calculateStats(image: new (width?: number | undefined, height?: number | undefined) => HTMLImageElement, imagePixelData: any[], circleArray: any[]): void;
    getMax(arr: any): number;
    getMin(arr: any): number;
    mapToRange(value: any, inMin: any, inMax: any): number;
}
