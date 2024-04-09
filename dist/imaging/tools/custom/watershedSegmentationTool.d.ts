/** @module imaging/tools/custom/watershedSegmentationTool
 *  @desc  This file provides functionalities for
 *         a watershed segmentation tool of selected features with
 *         certain thresholds using a custom cornestone tool
 */
import cornerstone, { Image } from "cornerstone-core";
declare const BaseBrushTool: any;
import { WSConfig, WSMouseEvent, WSEventData, CachedImage, LabelMapType, pixelData3D } from "../types";
import { Series } from "../../types";
/**
 * @public
 * @class WSTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image (only pixels inside thresholds)
 * @extends Tools.Base.BaseBrushTool
 */
export default class WSToggleTool extends BaseBrushTool {
    private maskArray;
    private maskArrayCurrentImage;
    private dicomPixelData;
    private minThreshold;
    private pixelData;
    private seriesUID;
    private maxThreshold;
    private indexImage;
    private imageId;
    private labelToErase;
    private click;
    private labelToChange;
    private element;
    configuration: WSConfig;
    constructor(props?: {});
    /**
     * Allows to get the canvas element when going over it with mouse
     * TODO check with multiple canvas and layouts
     *@name _handleMouseMove
     * @protected
     * @param  {MoveEvent} evt The mouse cursor moving event
     * @returns {void}
     */
    _handleMouseMove(e: MouseEvent): void;
    /**
     * Changes the radius of the brush
     *@method
     * @name _changeRadius
     * @protected
     * @param  {WheelEvent} evt The data object associated with the event.
     * @returns {void}
     */
    _changeRadius(evt: WheelEvent): void;
    /**
     * Event handler for MOUSE_DRAG event.
     * @override
     * @abstract
     * @event
     * @param {WSMouseEvent} evt - The event.
     * @returns {void}
     */
    mouseDragCallback(evt: WSMouseEvent): void;
    /**
     * allow to toggle between single image or multiimage configuration
     *@name _handleToggle
     * @protected
     * @param  {Boolean} isMultiImage if WS has to be applied to single image is false, else is true
     * @param  {number | undefined | null} startIndex startindex if isMultiImage is true
     * @param  {number | undefined | null} endIndex  endindex if isMultiImage is true
     * @param  {number | undefined | null} masksNumber number of masks to be searched with WS
     * @returns {void}
     */
    _handleToggle(isMultiImage: boolean, startIndex: number | undefined | null, endIndex: number | undefined | null, masksNumber: number | undefined | null): void;
    /**
     * Paints the data to the labelmap.
     *@name _paint
     * @protected
     * @param  {WSMouseEvent} evt The data object associated with the event.
     * @returns {void}
     */
    _paint(evt: WSMouseEvent): Promise<void>;
    /**
     * applies the selected processtype on the current image
     *@name _processSingleImage
     * @protected
     * @param  {string} processType //process type "WS"/"LabelEraser"/"ManualEraser"/"LabelPicker"
     * @param  {LabelMapType} labelmap2D
     * @param  {WSMouseEvent} evt //click event
     * @param  {Image} image //current image
     * @param  {number[][]} circleArray //circle array of selected area
     *  @returns {void}
     */
    _processSingleImage(processType: string, labelmap2D: LabelMapType, evt: WSMouseEvent, image: Image, circleArray: number[][]): void;
    /**
     * applies the selected processtype on images
     *@name _processMultiImage
     * @protected
     * @param  {string} processType //process type "WS"/"LabelEraser"/"ManualEraser"/"LabelPicker"
     * @param  {LabelMapType} labelmap2D
     * @param  {LabelMapType} labelmap3D
     * @param  {WSMouseEvent} evt //click event
     * @param  {Image} image //current image
     * @param  {number[][]} circleArray //circle array of selected area
     *  @returns {void}
     */
    _processMultiImage(processType: string, labelmap2D: LabelMapType, labelmap3D: LabelMapType, evt: WSMouseEvent, image: Image, circleArray: number[][]): void;
    /**
     * applies WS on multiple images from startindex to endindex
     * @name _applyWatershedSegmentationMultiImage
     * @protected
     * @param  {CachedImage[]} cachedImages
     * @param  {number} startIndex
     * @param  {number} endIndex
     * @param  {number[]} dicomPixelData //current image
     * @param  {number} minThreshold
     * @param  {number} maxThreshold
     * @param  {number} lowerThreshold
     * @param  {number} upperThreshold
     * @returns {Promise<void>}
     *
     */
    _applyWatershedSegmentationMultiImage(cachedImages: CachedImage[], startIndex: number, endIndex: number, dicomPixelData: number[], minThreshold: number, maxThreshold: number, lowerThreshold: number, upperThreshold: number): Promise<void>;
    /**
     * Applies Watershed segmentation algorithm on pixel data using opencv.js
     * and evaluates the mask to apply to the original dicom image
     *@name _applyWatershedSegmentation
     * @protected
     * @param  {number} width The image width
     * @param  {number} height The image height
     * @param  {number[]} dicomPixelData The pixelDataArray obtained with dicomimage.getPixeldata()
     * @param  {number} minThreshold The image min pixel greyscale value
     * @param  {number} maxThreshold The image max pixel greyscale value
     * @param  {number} lowerThreshold Lower threshold for WS
     * @param  {number} upperThreshold Upper threshold for WS
     * @returns {void}
     */
    _applyWatershedSegmentation(width: number, height: number, dicomPixelData: number[], minThreshold: number, maxThreshold: number, lowerThreshold: number, upperThreshold: number): Promise<number[]>;
    /**
     * Draws the WS mask on the original imae
     *@name _drawBrushPixels
     * @protected
     * @param  {number[][]} masks //The mask array retrieved from WS algorithm
     * @returns {pixelData3D}
     */
    _drawBrushPixels(masks: number[][]): pixelData3D;
    /**
     * Allows to erase selected label parts (evaluating the label that appears the most in the selected area) when using cntrl+click
     *@name _labelToErase
     * @protected
     * @param  {number[][]} circleArray //The selected circle coordinates Array
     * @param  {number[]} maskArray //the mask array of the last WS segmentation
     * @param  {Image} image //the dicom image
     * @param  {number[]} slicei //the i-th slice where the label is erased
     * @returns {void}
     */
    _labelToErase(circleArray: number[][], selectedSlice: number[], image: Image, slicei: number[]): void;
    /**
     * Allows to erase selected label parts when using shift+click (allows to drag)
     * @name _manualEraser
     * @protected
     * @param  {number[][]} circleArray //The selected circle coordinates Array
     * @param  {Image} image //the dicom image
     * @param  {number[]} slicei //the i-th slice where the manual eraser is applied
     * @returns {void}
     */
    _manualEraser(circleArray: number[][], image: Image, slicei: number[]): void;
    /**
     * Allows to pick a selected label parts when using alt+click for the first time
     *@name _labelPicker
     * @protected
     * @param  {number[][]} circleArray //The selected circle coordinates Array
     * @param  {Image} image //the dicom image
     * @param  {number[]} currentArray //the current image array
     * @returns {void}
     */
    _labelPicker(circleArray: number[][], image: Image, currentArray: number[]): void;
    /**
     * Allows to associate the previously picked label on the selected label area when using alt+click for the second time
     * @name _manualPainter
     * @protected
     * @param  {number[][]} circleArray //The selected circle coordinates Array
     * @param  {Image} image //the dicom image
     * @param  {number[]} array //the current image array where to apply manual painter
     * @returns {void}
     */
    _manualPainter(circleArray: number[][], image: Image, array: number[]): void;
    /**
     * initializes parameters that are useful in _paint() function
     *@name  _paintInit
     * @protected
     * @param  {WSMouseEvent} evt
     * @param  {WSEventData} eventData
     * @returns {void}
     */
    _paintInit(evt: WSMouseEvent, eventData: WSEventData): {
        image: cornerstone.Image;
        shouldEraseManually: boolean;
        shouldActivateLabelPicker: boolean | undefined;
        shouldApplyWatershed: boolean;
        shouldErase: any;
    };
    /**
     * resets data when imaegId or seriesUID changes
     *@name _resetData
     * @protected
     * @param  {string} seriesUID
     * @param  {Series} stackData
     * @returns {void}
     */
    _resetData(seriesUID: string, stackData: Series): void;
}
export {};
