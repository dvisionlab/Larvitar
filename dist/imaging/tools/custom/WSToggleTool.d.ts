/**
 * @public
 * @class WSTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image (only pixels inside thresholds)
 * @extends Tools.Base.BaseBrushTool
 */
export default class WSToggleTool {
    constructor(props?: {});
    lowerThreshold: any;
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
     * @override
     * @abstract
     * @event
     * @param {Object} evt - The event.
     */
    override mouseDragCallback(evt: Object): void;
    _lastImageCoords: any;
    /**
     * allow to toggle between single image or multiimage configuration
     *@name _handleToggle
     * @protected
     * @param  {Boolean} isMultiImage if WS has to be applied to single image is false, else is true
     * @param  {number} startIndex startindex if isMultiImage is true
     * @param  {number} endIndex  endindex if isMultiImage is true
     * @param  {number} masksNumber number of masks to be searched with WS
     * @returns {void}
     */
    protected _handleToggle(isMultiImage: boolean, startIndex: number, endIndex: number, masksNumber: number): void;
    /**
     * Paints the data to the labelmap.
     *@name _paint
     * @protected
     * @param  {ClickEvent} evt The data object associated with the event.
     * @returns {void}
     */
    protected _paint(evt: ClickEvent): void;
    /**
     * applies the selected processtype on the current image
     *@name _processMultiImage
     * @protected
     * @param  {string} processType //process type "WS"/"LabelEraser"/"ManualEraser"/"LabelPicker"
     * @param  {Object} labelmap2D
     * @param  {ClickEvent} evt //click event
     * @param  {Image} image //current image
     * @param  {Number[][]} circleArray //circle array of selected area
     * @returns {Promise<number[]>[]}
     */
    protected _processSingleImage(processType: string, labelmap2D: Object, evt: ClickEvent, image: new (width?: number | undefined, height?: number | undefined) => HTMLImageElement, circleArray: number[][]): Promise<number[]>[];
    /**
     * applies the selected processtype on images
     *@name _processMultiImage
     * @protected
     * @param  {string} processType //process type "WS"/"LabelEraser"/"ManualEraser"/"LabelPicker"
     * @param  {Object} labelmap2D
     * @param  {Object} labelmap3D
     * @param  {ClickEvent} evt //click event
     * @param  {Image} image //current image
     * @param  {Number[][]} circleArray //circle array of selected area
     * @returns {Promise<number[]>[]}
     */
    protected _processMultiImage(processType: string, labelmap2D: Object, labelmap3D: Object, evt: ClickEvent, image: new (width?: number | undefined, height?: number | undefined) => HTMLImageElement, circleArray: number[][]): Promise<number[]>[];
    /**
     * applies WS on multiple images from startindex to endindex
     *@name _applyWatershedSegmentationMultiImage
     * @protected
     * @param  {Image[]} cachedImages
     * @param  {string}ImageId
     * @param  {number}startIndex
     * @param  {number}endIndex
     * @param  {number[]}dicomPixelData //current image
     * @returns {Promise<number[]>[]}
     */
    protected _applyWatershedSegmentationMultiImage(cachedImages: (new (width?: number | undefined, height?: number | undefined) => HTMLImageElement)[], ImageId: string, startIndex: number, endIndex: number, dicomPixelData: number[], minThreshold: any, maxThreshold: any, lowerThreshold: any, upperThreshold: any): Promise<number[]>[];
    /**
     * Applies Watershed segmentation algorithm on pixel data using opencv.js
     * and evaluates the mask to apply to the original dicom image
     *@name _ WatershedSegmentation
     * @protected
     * @param  {Mat} src The png matrix associated with the original pixel array
     * @param  {Array} dicomPixelData The pixelDataArray obtained with dicomimage.getPixeldata()
     * @returns {void}
     */
    protected _applyWatershedSegmentation(width: any, height: any, dicomPixelData: any[], minThreshold: any, maxThreshold: any, lowerThreshold: any, upperThreshold: any): void;
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
     *@name _manualEraser
     * @protected
     * @param  {Array} circleArray //The selected circle coordinates Array
     * @param  {Image} image //the dicom image
     *
     * @returns {void}
     */
    protected _manualEraser(circleArray: any[], image: new (width?: number | undefined, height?: number | undefined) => HTMLImageElement, array: any): void;
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
     *@name _manualPainter
     * @protected
     * @param  {Array} circleArray //The selected circle coordinates Array
     * @param  {Image} image //the dicom image
     *
     * @returns {void}
     */
    protected _manualPainter(circleArray: any[], image: new (width?: number | undefined, height?: number | undefined) => HTMLImageElement, array: any): void;
    /**
     * initializes parameters that are useful in _paint() function
     *@name _resetData
     * @protected
     * @param  {ClickEvent} evt
     * @param  {Object} eventData
     * @returns {void}
     */
    protected _paintInit(evt: ClickEvent, eventData: Object): void;
    slicesNumber: any;
    width: any;
    height: any;
    /**
     * resets data when imaegId or seriesUID changes
     *@name _resetData
     * @protected
     * @param  {string} seriesUID
     * @returns {void}
     */
    protected _resetData(seriesUID: string, stackData: any): void;
}
