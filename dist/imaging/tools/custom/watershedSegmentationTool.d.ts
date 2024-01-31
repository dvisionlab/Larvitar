import cornerstone, { Image } from "cornerstone-core";
import cv from "@techstark/opencv-js";
declare const BaseBrushTool: any;
import { Series } from "../../types";
interface WSConfig {
    multiImage: boolean;
    startIndex: number | null;
    endIndex: number | null;
    masksNumber: number;
    onload?: boolean;
}
interface WSMouseEvent {
    detail: WSEventData;
}
interface WSEventData {
    currentPoints: {
        image: {
            x: number;
            y: number;
        };
    };
    element: Element | HTMLElement;
    buttons: number;
    shiftKey: boolean;
    event: {
        altKey: boolean;
        shiftKey: boolean;
    };
    image: Image;
}
interface CachedImage {
    image: {
        imageId: string;
        getPixelData: () => number[];
    };
}
interface LabelMapType {
    pixelData?: number[];
    labelmaps2D?: labelmaps2DType[];
}
interface labelmaps2DType {
    pixelData: number[];
    segmentsOnLabelmap: number[];
}
/**
 * @public
 * @class WSTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image (only pixels inside thresholds)
 * @extends Tools.Base.BaseBrushTool
 */
export default class WSToggleTool extends BaseBrushTool {
    lowerThreshold: number | null;
    upperThreshold: number | null;
    maskArray: number[][] | null;
    maskArrayCurrentImage: number[] | null;
    src: cv.Mat | null;
    dicomPixelData: number[] | null;
    minThreshold: number | null;
    pixelData: number[][] | null;
    seriesUID: string | null;
    maxThreshold: number | null;
    segmentIndex: number;
    indexImage: number;
    imageId: string | null;
    seriesId: string | null;
    labelToErase: number | null;
    click: number;
    labelToChange: number | null;
    element: HTMLElement | null;
    _lastImageCoords: {
        x: number;
        y: number;
    } | null;
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
     * @param  {scrollEvent} evt The data object associated with the event.
     * @returns {void}
     */
    _changeRadius(evt: WheelEvent): void;
    /**
     * Event handler for MOUSE_DRAG event.
     * @override
     * @abstract
     * @event
     * @param {Object} evt - The event.
     */
    mouseDragCallback(evt: WSMouseEvent): void;
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
    _handleToggle(isMultiImage: boolean, startIndex: number | undefined | null, endIndex: number | undefined | null, masksNumber: number | undefined | null): void;
    /**
     * Paints the data to the labelmap.
     *@name _paint
     * @protected
     * @param  {ClickEvent} evt The data object associated with the event.
     * @returns {void}
     */
    _paint(evt: WSMouseEvent): Promise<void>;
    /**
     * applies the selected processtype on the current image
     *@name _processMultiImage
     * @protected
     * @param  {string} processType //process type "WS"/"LabelEraser"/"ManualEraser"/"LabelPicker"
     * @param  {Object} labelmap2D
     * @param  {ClickEvent} evt //click event
     * @param  {Image} image //current image
     * @param  {Number[][]} circleArray //circle array of selected area
     *  @returns {void}
     */
    _processSingleImage(processType: string, labelmap2D: LabelMapType, evt: WSMouseEvent, image: Image, circleArray: number[][]): void;
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
     *  @returns {void}
     */
    _processMultiImage(processType: string, labelmap2D: LabelMapType, labelmap3D: LabelMapType, evt: WSMouseEvent, image: Image, circleArray: number[][]): void;
    /**
     * applies WS on multiple images from startindex to endindex
     *@name _applyWatershedSegmentationMultiImage
     * @protected
     * @param  {Image[]} cachedImages
     * @param  {string}ImageId
     * @param  {number}startIndex
     * @param  {number}endIndex
     * @param  {number[]}dicomPixelData //current image
     *  @returns {void}
     *
     */
    _applyWatershedSegmentationMultiImage(cachedImages: CachedImage[], startIndex: number, endIndex: number, dicomPixelData: number[], minThreshold: number, maxThreshold: number, lowerThreshold: number, upperThreshold: number): Promise<void>;
    /**
     * Applies Watershed segmentation algorithm on pixel data using opencv.js
     * and evaluates the mask to apply to the original dicom image
     *@name _ WatershedSegmentation
     * @protected
     * @param  {Mat} src The png matrix associated with the original pixel array
     * @param  {Array} dicomPixelData The pixelDataArray obtained with dicomimage.getPixeldata()
     * @returns {void}
     */
    _applyWatershedSegmentation(width: number, height: number, dicomPixelData: number[], minThreshold: number, maxThreshold: number, lowerThreshold: number, upperThreshold: number): Promise<number[]>;
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
    _drawBrushPixels(masks: number[][]): {
        pixelData: number[];
        segmentsOnLabelmap: number[];
    }[];
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
    _labelToErase(circleArray: number[][], selectedSlice: number[], image: Image, slicei: number[]): void;
    /**
     * Allows to erase selected label parts when using shift+click (allows to drag)
     *@name _manualEraser
     * @protected
     * @param  {Array} circleArray //The selected circle coordinates Array
     * @param  {Image} image //the dicom image
     *
     * @returns {void}
     */
    _manualEraser(circleArray: number[][], image: Image, array: number[]): void;
    /**
     * Allows to pick a selected label parts when using alt+click for the first time
     *@name _labelPicker
     * @protected
     * @param  {Array} circleArray //The selected circle coordinates Array
     * @param  {Image} image //the dicom image
     *
     * @returns {void}
     */
    _labelPicker(circleArray: number[][], image: Image, currentArray: number[]): void;
    /**
     * Allows to associate the previously picked label on the selected label area when using alt+click for the second time
     *@name _manualPainter
     * @protected
     * @param  {Array} circleArray //The selected circle coordinates Array
     * @param  {Image} image //the dicom image
     *
     * @returns {void}
     */
    _manualPainter(circleArray: number[][], image: Image, array: number[]): void;
    /**
     * initializes parameters that are useful in _paint() function
     *@name _resetData
     * @protected
     * @param  {ClickEvent} evt
     * @param  {Object} eventData
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
     * @returns {void}
     */
    _resetData(seriesUID: string, stackData: Series): void;
}
export {};
