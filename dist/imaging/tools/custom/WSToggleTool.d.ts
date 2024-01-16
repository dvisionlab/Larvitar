/**
 * @public
 * @class WSTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image (only pixels inside thresholds)
 * @extends Tools.Base.BaseBrushTool
 */
export default class WSToggleTool {
    constructor(props?: {});
    lowerThreshold: number | null;
    upperThreshold: any;
    maskArray: any;
    maskArrayCurrentImage: any;
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
    click: number;
    labelToChange: number | null;
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
      * Event handler for MOUSE_DRAG event.
      *
      * @override
      * @abstract
      * @event
      * @param {Object} evt - The event.
      */
    override mouseDragCallback(evt: Object): void;
    _lastImageCoords: any;
    handleToggle(isMultiImage: any, startIndex: any, endIndex: any, masksNumber: any): void;
    /**
     * Paints the data to the labelmap.
     *@name _paint
     * @protected
     * @param  {ClickEvent} evt The data object associated with the event.
     * @returns {void}
     */
    protected _paint(evt: ClickEvent): void;
    slicesNumber: any;
    width: any;
    height: any;
    xFactor: number | undefined;
    /**
      * resets data when imaegId or seriesUID changes
      *@name _resetData
      * @protected
      * @param  {string} seriesUID
      * @returns {void}
      */
    protected _resetData(seriesUID: string, stackData: any): void;
    /**
     * Activates a loader in progress when WS is advancing
     *@name _toggleUIVisibility
     * @protected
     * @param  {boolean} showBrush
     * @param  {boolean} showLoader
     * @returns {void}
     */
    protected _toggleUIVisibility(showBrush: boolean, showLoader: boolean): void;
    /**
     * eliminates the label that appear less than minappearance
     *@name _shiftAndZeroOut
     * @protected
     * @param  {Mat} array The marker array
     * @param  {Array} minAppearance The pixelDataArray obtained with dicomimage.getPixeldata()
     * @returns {void}
     */
    protected _shiftAndZeroOut(array: Mat, minAppearance: any[]): void;
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
     *
      *@name _processChunk
     * @protected
     * @param  {number} i
     * @param  {number} j
     * @param  {number} markers//the markers,found and processed after WS
     * @param  {Array} markersArray //the array of markers processed
     * @param  {number} label //the label of the initial feature 1
     * @param  {number}lastRowIndex //rows-1
     * @param  {number}lastColIndex //cols-1
     *
     *
     *
     * @returns {void}
     */
    protected _processChunk(i: number, j: number, markers: number, markersArray: any[], label: number, lastRowIndex: number, lastColIndex: number): void;
    /**
     *
     *@name _processRowsAsync
     * @protected
     * @param  {number} startRow //the markers rows found and processed after WS
     * @param  {number} endRow //the markers rows found and processed after WS
     * @param  {number} markers//the markers,found and processed after WS
     * @param  {Array} markersArray //the array of markers processed
     * @param  {number} label //the label of the initial feature 1
     * @param  {number}lastRowIndex //rows-1
     * @param  {number}lastColIndex //cols-1
     *
     * @returns {void}
     */
    protected _processRowsAsync(startRow: number, endRow: number, markers: number, markersArray: any[], label: number, lastRowIndex: number, lastColIndex: number): void;
    /**
     *
     *@name _processAsync
     * @protected
     * @param  {Array} rowsPerChunk //deafult rows to be processed per chunk (10)
     * @param  {number} markers//the markers,found and processed after WS
     * @param  {Array} markersArray //the array of markers processed
     * @param  {number} label //the label of the initial feature 1
     *
     * @returns {void}
     */
    protected _processAsync(rowsPerChunk: any[], markers: number, markersArray: any[], label: number): void;
    /**
     * Post processes the markers after WS //TODO check errors in drawContours
     *@name _postProcess
     * @protected
     * @param  {cv.Mat} markers //The mask array retrieved from WS algorithm
     * @returns {cv.Mat}
     */
    protected _postProcess(markers: cv.Mat): cv.Mat;
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
    protected _drawBrushPixels(masks: any[], pixelData3D: any): void;
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
    protected _labelToErase(circleArray: any[], selectedSlice: any, image: new (width?: number | undefined, height?: number | undefined) => HTMLImageElement, slicei: any): void;
    /**
      * Allows to erase selected label parts when using shift+click (allows to drag)
      *@name _ManualEraser
      * @protected
      * @param  {Array} circleArray //The selected circle coordinates Array
      * @param  {Image} image //the dicom image
      *
      * @returns {void}
      */
    protected _ManualEraser(circleArray: any[], image: new (width?: number | undefined, height?: number | undefined) => HTMLImageElement, array: any): void;
    /**
       * Allows to pick a selected label parts when using alt+click for the first time
       *@name _labelPicker
       * @protected
       * @param  {Array} circleArray //The selected circle coordinates Array
       * @param  {Image} image //the dicom image
       *
       * @returns {void}
       */
    protected _labelPicker(circleArray: any[], image: new (width?: number | undefined, height?: number | undefined) => HTMLImageElement, currentArray: any): void;
    pickedLabel: number | undefined;
    /**
       * Allows to associate the previously picked label on the selected label area when using alt+click for the second time
       *@name _ManualPainter
       * @protected
       * @param  {Array} circleArray //The selected circle coordinates Array
       * @param  {Image} image //the dicom image
       *
       * @returns {void}
       */
    protected _ManualPainter(circleArray: any[], image: new (width?: number | undefined, height?: number | undefined) => HTMLImageElement, array: any): void;
    /**
      * Allows to calculate stats such as mean and stddev of the selected circle area
      *@name  _calculateStats
      * @protected
      * @param  {Image} image //the dicom image
      * @param  {Array} imagePixelData
      * @param  {Array} circleArray //The selected circle coordinates Array
      *
      * @returns {void}
      */
    protected _calculateStats(image: new (width?: number | undefined, height?: number | undefined) => HTMLImageElement, imagePixelData: any[], circleArray: any[]): void;
    /**
    * Allows to map a value to range 0,255 (8bit, png)
    *@name  mapToRange
    * @protected
    * @param  {number} value //the greyscale value to convert
    * @param  {number} inMin//The min gs value in the image
    * @param  {number} inMax //The max gs value in the image
    *
    * @returns {void}
    */
    protected mapToRange(value: number, inMin: number, inMax: number): void;
    getMax(arr: any): number;
    getMin(arr: any): number;
}
