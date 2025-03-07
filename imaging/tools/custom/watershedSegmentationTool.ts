/** @module imaging/tools/custom/watershedSegmentationTool
 *  @desc  This file provides functionalities for
 *         a watershed segmentation tool of selected features with
 *         certain thresholds using a custom cornestone tool
 */

// external libraries
import cornerstoneTools from "cornerstone-tools";
import cornerstone, { Image } from "cornerstone-core";
import { each, extend } from "lodash";
const external = cornerstoneTools.external;
const BaseBrushTool = cornerstoneTools.importInternal("base/BaseBrushTool");
const segmentationUtils = cornerstoneTools.importInternal(
  "util/segmentationUtils"
);
const getCircle = segmentationUtils.getCircle;
const segmentationModule = cornerstoneTools.getModule("segmentation");
const getToolState = cornerstoneTools.getToolState;

// internal libraries
import { DEFAULT_TOOLS } from "../default";
import store from "../../imageStore";
import {
  mapToRange,
  calculateThresholds,
  shiftAndZeroOut
} from "./utils/watershedSegmentationToolUtils/WSUtils";
import { getMaxPixelValue } from "../../imageUtils";
import {
  WSConfig,
  WSToolConfig,
  WSMouseEvent,
  WSEventData,
  CachedImage,
  LabelMapType,
  pixelData3D
} from "../types";
import { Series } from "../../types";

//global variable
declare var cv: any; //opencv-js

/*
 * This tool provides the following class to be exported: WSToggleTool
 */

/**
 * @public
 * @class WSTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image (only pixels inside thresholds)
 * @extends Tools.Base.BaseBrushTool
 */
export default class WSToggleTool extends BaseBrushTool {
  private maskArray: number[][] | null = null;
  private maskArrayCurrentImage: number[] | null = null;
  private dicomPixelData: number[] | null = null;
  private minThreshold: number | null = null;
  private pixelData: number[][] | null = null;
  private seriesUID: string | null = null;
  private maxThreshold: number | null = null;
  private indexImage: number = 0;
  private imageId: string | null = null;
  private labelToErase: number | null = null;
  private click: number = 0;
  private labelToChange: number | null = null;
  private element: HTMLElement | null = null;

  public configuration: WSConfig = {
    multiImage: false,
    startIndex: null,
    endIndex: null,
    masksNumber: 10
  };
  constructor(props = {}) {
    const defaultProps = {
      name: "WSToggle",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        multiImage: false,
        startIndex: null,
        endIndex: null,
        masksNumber: 10
      },
      mixins: ["renderBrushMixin"]
    };

    super(props, defaultProps);

    this._handleMouseMove = this._handleMouseMove.bind(this);
    document.addEventListener("mousemove", this._handleMouseMove);
    setSegmentationConfig({
      segmentsPerLabelmap: this.configuration.masksNumber
    });
  }

  /**
   * Allows to get the canvas element when going over it with mouse
   * TODO check with multiple canvas and layouts
   *@name _handleMouseMove
   * @protected
   * @param  {MoveEvent} evt The mouse cursor moving event
   * @returns {void}
   */
  _handleMouseMove(e: MouseEvent) {
    if (
      document
        .elementFromPoint(e.pageX, e.pageY)!
        .classList.contains("cornerstone-canvas")
    ) {
      // Remove the event listener when the condition is met
      document.removeEventListener("mousemove", this._handleMouseMove);

      // Your existing code here
      this.element = document.elementFromPoint(e.pageX, e.pageY)!.parentElement;
      if (this.element) {
        this.element.addEventListener("wheel", this._changeRadius.bind(this));
      }
    }
  }

  /**
   * Changes the radius of the brush
   *@method
   * @name _changeRadius
   * @protected
   * @param  {WheelEvent} evt The data object associated with the event.
   * @returns {void}
   */
  _changeRadius(evt: WheelEvent) {
    if (evt.ctrlKey == true || evt.altKey == true || evt.shiftKey == true) {
      const { configuration }: { configuration: { radius: number } } =
        segmentationModule;
      const { deltaY } = evt;

      configuration.radius += deltaY > 0 ? 1 : -1;

      configuration.radius = Math.max(configuration.radius, 1);

      external.cornerstone.updateImage(this.element);
      evt.preventDefault(); //modify custom mouse scroll to not interefere with ctrl+wheel
    }
  }

  /**
   * Event handler for MOUSE_DRAG event.
   * @override
   * @abstract
   * @event
   * @param {WSMouseEvent} evt - The event.
   * @returns {void}
   */
  mouseDragCallback(evt: WSMouseEvent) {
    if (evt.detail.buttons === 1 && evt.detail.shiftKey) {
      this._paint(evt);
    }
  }

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
  _handleToggle(
    isMultiImage: boolean,
    startIndex: number | undefined | null,
    endIndex: number | undefined | null,
    masksNumber: number | undefined | null
  ) {
    // Toggle mode between 'stack' and 'slice' on Tab key press or other events
    if (
      endIndex != null &&
      endIndex != undefined &&
      startIndex != null &&
      startIndex != undefined &&
      endIndex < startIndex
    ) {
      endIndex = startIndex;
      startIndex = endIndex;
    }
    this.configuration.multiImage = isMultiImage;
    if (isMultiImage === true) {
      this.configuration.startIndex =
        startIndex === null || startIndex === undefined
          ? 0
          : Math.max(startIndex, 0);
      this.configuration.endIndex =
        endIndex === null || endIndex === undefined
          ? this.slicesNumber
          : Math.min(endIndex + 1, this.slicesNumber);
    } else {
      this.configuration.startIndex = null;
      this.configuration.endIndex = null;
    }

    this.configuration.masksNumber =
      masksNumber === null || masksNumber === undefined
        ? 10
        : Math.max(masksNumber, 1);
  }

  /**
   * Paints the data to the labelmap.
   *@name _paint
   * @protected
   * @param  {WSMouseEvent} evt The data object associated with the event.
   * @returns {void}
   */
  async _paint(evt: WSMouseEvent) {
    (DEFAULT_TOOLS["WSToggle"] as WSToolConfig).configuration.onload = true;
    const { configuration } = segmentationModule;
    const eventData = evt.detail;
    let {
      image,
      shouldEraseManually,
      shouldActivateLabelPicker,
      shouldApplyWatershed,
      shouldErase
    } = this._paintInit(evt, eventData);

    const { rows, columns } = image;
    const { x, y } = eventData.currentPoints.image;
    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }
    const radius = configuration.radius;
    const {
      labelmap2D,
      labelmap3D
    }: { labelmap2D: LabelMapType; labelmap3D: LabelMapType } =
      this.paintEventData;

    let circleArray = getCircle(radius, rows, columns, x, y);
    this._handleToggle(
      (DEFAULT_TOOLS["WSToggle"] as WSToolConfig).configuration.multiImage,
      (DEFAULT_TOOLS["WSToggle"] as WSToolConfig).configuration.startIndex,
      (DEFAULT_TOOLS["WSToggle"] as WSToolConfig).configuration.endIndex,
      (DEFAULT_TOOLS["WSToggle"] as WSToolConfig).configuration.masksNumber
    );
    let processType: string;
    if (shouldApplyWatershed) {
      processType = "WS"; //only click
    } else if (shouldErase) {
      processType = "LabelEraser"; //ctrl+click
      this.labelToErase = null;
    } else if (shouldEraseManually) {
      processType = "ManualEraser"; //shift+click
    } else if (shouldActivateLabelPicker) {
      processType = "LabelPicker"; //alt+click
    }
    const isMultiImage = this.configuration.multiImage;
    isMultiImage
      ? this._processMultiImage(
          processType!,
          labelmap2D,
          labelmap3D,
          evt,
          image,
          circleArray
        )
      : this._processSingleImage(
          processType!,
          labelmap2D,
          evt,
          image,
          circleArray
        );
  }

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
  _processSingleImage(
    processType: string,
    labelmap2D: LabelMapType,
    evt: WSMouseEvent,
    image: Image,
    circleArray: number[][]
  ) {
    switch (processType) {
      case "WS":
        //cv.onRuntimeInitialized = () => {
        this.labelToErase = null;
        // threshold should be applied only if painting, not erasing
        if (this.dicomPixelData === null) {
          this.dicomPixelData = image.getPixelData();
        }

        const { minThreshold, maxThreshold, lowerThreshold, upperThreshold } =
          calculateThresholds(
            image,
            this.dicomPixelData,
            circleArray,
            this.minThreshold!,
            this.maxThreshold!
          );

        this.maskArrayCurrentImage = new Array(this.width * this.height);

        this._applyWatershedSegmentation(
          this.width,
          this.height,
          this.dicomPixelData,
          minThreshold,
          maxThreshold,
          lowerThreshold,
          upperThreshold
        ).then(result => {
          this.maskArrayCurrentImage = result;
          labelmap2D.pixelData = this.maskArrayCurrentImage as number[];
          external.cornerstone.updateImage(evt.detail.element);
          (DEFAULT_TOOLS["WSToggle"] as WSToolConfig).configuration.onload =
            false;
        });
        //};

        break;

      case "LabelEraser":
        this.labelToErase = null;
        if (this.maskArrayCurrentImage != null) {
          this._labelToErase(
            circleArray,
            this.maskArrayCurrentImage,
            image,
            this.maskArrayCurrentImage
          );
          labelmap2D.pixelData = this.maskArrayCurrentImage;
          external.cornerstone.updateImage(evt.detail.element);
          (DEFAULT_TOOLS["WSToggle"] as WSToolConfig).configuration.onload =
            false;
        }
        break;

      case "ManualEraser":
        let inputEraserArray = this.maskArrayCurrentImage;

        this._manualEraser(circleArray, image, inputEraserArray!);
        labelmap2D.pixelData = inputEraserArray as number[];
        external.cornerstone.updateImage(evt.detail.element);
        (DEFAULT_TOOLS["WSToggle"] as WSToolConfig).configuration.onload =
          false;
        break;

      case "LabelPicker":
        this.click = this.click + 1;
        let currentArray = this.maskArrayCurrentImage;

        if (this.click === 1) {
          this._labelPicker(circleArray, image, currentArray!);
        } else if (this.click === 2) {
          this._manualPainter(circleArray, image, currentArray!);
          this.click = 0;
        }
        labelmap2D.pixelData = currentArray as number[];
        external.cornerstone.updateImage(evt.detail.element);
        (DEFAULT_TOOLS["WSToggle"] as WSToolConfig).configuration.onload =
          false;
        break;
    }
  }

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
  _processMultiImage(
    processType: string,
    labelmap2D: LabelMapType,
    labelmap3D: LabelMapType,
    evt: WSMouseEvent,
    image: Image,
    circleArray: number[][]
  ) {
    switch (processType) {
      case "WS":
        //cv.onRuntimeInitialized = () => {
        this.labelToErase = null;
        // threshold should be applied only if painting, not erasing
        if (this.dicomPixelData === null) {
          this.dicomPixelData = image.getPixelData();
        }

        const { minThreshold, maxThreshold, lowerThreshold, upperThreshold } =
          calculateThresholds(
            image,
            this.dicomPixelData,
            circleArray,
            this.minThreshold!,
            this.maxThreshold!
          );
        this.maskArray = new Array(this.slicesNumber);
        this.pixelData = new Array(this.slicesNumber);
        this._applyWatershedSegmentationMultiImage(
          cornerstone.imageCache.cachedImages,
          this.configuration.startIndex!,
          this.configuration.endIndex!,
          this.dicomPixelData,
          minThreshold,
          maxThreshold,
          lowerThreshold,
          upperThreshold
        ).then(() => {
          let pixelMask3D = this._drawBrushPixels(this.maskArray!);
          labelmap3D.labelmaps2D = pixelMask3D;
          external.cornerstone.updateImage(evt.detail.element);
          (DEFAULT_TOOLS["WSToggle"] as WSToolConfig).configuration.onload =
            false;
        });
        //};
        break;

      case "LabelEraser":
        this.labelToErase = null;
        if (this.maskArrayCurrentImage != null && this.maskArray === null) {
          this._labelToErase(
            circleArray,
            this.maskArrayCurrentImage,
            image,
            this.maskArrayCurrentImage
          );
          labelmap2D.pixelData = this.maskArrayCurrentImage;
          external.cornerstone.updateImage(evt.detail.element);
          (DEFAULT_TOOLS["WSToggle"] as WSToolConfig).configuration.onload =
            false;
        } else if (this.maskArray != null) {
          for (let i = 0; i < this.slicesNumber; i++) {
            this._labelToErase(
              circleArray,
              this.maskArray[this.indexImage],
              image,
              this.maskArray[i]
            );
          }
          let pixelMask3D = this._drawBrushPixels(this.maskArray);
          labelmap3D.labelmaps2D = pixelMask3D;
          external.cornerstone.updateImage(evt.detail.element);
          (DEFAULT_TOOLS["WSToggle"] as WSToolConfig).configuration.onload =
            false;
        }
        break;

      case "ManualEraser":
        let inputEraserArray =
          this.maskArrayCurrentImage != null && this.maskArray === null
            ? this.maskArrayCurrentImage
            : this.maskArray![this.indexImage];

        this._manualEraser(circleArray, image, inputEraserArray);
        labelmap2D.pixelData = inputEraserArray;
        if (this.maskArray != null) {
          let pixelMask3D = this._drawBrushPixels(this.maskArray);
          labelmap3D.labelmaps2D = pixelMask3D;
        }
        external.cornerstone.updateImage(evt.detail.element);
        (DEFAULT_TOOLS["WSToggle"] as WSToolConfig).configuration.onload =
          false;
        break;

      case "LabelPicker":
        this.click = this.click + 1;

        let currentArray =
          this.maskArrayCurrentImage != null && this.maskArray === null
            ? this.maskArrayCurrentImage
            : this.maskArray![this.indexImage];

        if (this.click === 1) {
          this._labelPicker(circleArray, image, currentArray);
        } else if (this.click === 2) {
          this._manualPainter(circleArray, image, currentArray);
          this.click = 0;
        }
        labelmap2D.pixelData = currentArray;
        if (this.maskArray != null) {
          let pixelMask3D = this._drawBrushPixels(this.maskArray);
          labelmap3D.labelmaps2D = pixelMask3D;
        }
        external.cornerstone.updateImage(evt.detail.element);
        (DEFAULT_TOOLS["WSToggle"] as WSToolConfig).configuration.onload =
          false;
        break;
    }
  }

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
  async _applyWatershedSegmentationMultiImage(
    cachedImages: CachedImage[],
    startIndex: number,
    endIndex: number,
    dicomPixelData: number[],
    minThreshold: number,
    maxThreshold: number,
    lowerThreshold: number,
    upperThreshold: number
  ) {
    const promises: Promise<number[]>[] = [];
    const selectedItems = cachedImages.slice(startIndex, endIndex);
    let imageId = cachedImages[this.indexImage].image.imageId;
    async function processIteration(this: WSToggleTool, i: number) {
      let item = selectedItems[i];
      let trueindex = startIndex + i;

      if (trueindex < endIndex) {
        if (item.image.imageId === imageId) {
          this.pixelData![trueindex] = dicomPixelData;
        } else {
          this.pixelData![trueindex] =
            this.pixelData![trueindex] === undefined
              ? item.image.getPixelData()
              : this.pixelData![trueindex];
        }

        // Wait for watershed segmentation algorithm to finish
        const result = await this._applyWatershedSegmentation(
          this.width,
          this.height,
          this.pixelData![trueindex],
          minThreshold,
          maxThreshold,
          lowerThreshold,
          upperThreshold
        );

        this.maskArray![trueindex] = result;

        // Push the promise into the vector
        promises.push(Promise.resolve(result));
        // Move on to the next image
        let nextImageindex = i + 1;

        // Call the next iteration asynchronously
        await processIteration.call(this, nextImageindex);
      }
    }

    // Start the processing
    await processIteration.call(this, 0);
    // Wait for all promises to resolve
    await Promise.all(promises);
  }

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
  _applyWatershedSegmentation(
    width: number,
    height: number,
    dicomPixelData: number[],
    minThreshold: number,
    maxThreshold: number,
    lowerThreshold: number,
    upperThreshold: number
  ): Promise<number[]> {
    return new Promise((resolve, reject) => {
      try {
        // Assuming 8-bit unsigned integer pixel values
        // Create a new array for PNG pixel data with 4 channels: RGB
        const pngPixelData = new Uint8Array(width * height * 4);

        for (let i = 0; i < dicomPixelData.length; i++) {
          // Assuming each integer represents a grayscale value
          pngPixelData[i * 4] = mapToRange(
            dicomPixelData[i],
            minThreshold,
            maxThreshold
          ); // Red channel
          pngPixelData[i * 4 + 1] = pngPixelData[i * 4]; // Green channel
          pngPixelData[i * 4 + 2] = pngPixelData[i * 4]; // Blue channel
          pngPixelData[i * 4 + 3] = 255; // Alpha channel (fully opaque)
        }

        // Create an OpenCV Mat object from the PNG pixel data
        let src = new cv.Mat(height, width, cv.CV_8UC4); // 3 channels: RGB
        src.data.set(pngPixelData);

        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        //let contourArray=preProcess(gray,src)//OPTIONAL

        let opening = new cv.Mat();
        let Bg = new cv.Mat();
        let Fg = new cv.Mat();
        let distTrans = new cv.Mat();
        let unknown = new cv.Mat();
        let markers = new cv.Mat();
        //gray and threshold image
        cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        let lowerBinary = new cv.Mat();
        let upperBinary = new cv.Mat();

        cv.threshold(gray, lowerBinary, lowerThreshold, 255, cv.THRESH_BINARY);
        cv.threshold(
          gray,
          upperBinary,
          upperThreshold,
          255,
          cv.THRESH_BINARY_INV
        );

        // Combine the binary masks using bitwise_and
        cv.bitwise_and(lowerBinary, upperBinary, gray);

        // get background
        let M = cv.Mat.ones(3, 3, cv.CV_8U);
        cv.erode(gray, gray, M);
        cv.dilate(gray, opening, M);
        cv.dilate(opening, Bg, M, new cv.Point(-1, -1), 1);
        // distance transform
        cv.distanceTransform(opening, distTrans, cv.DIST_L2, 5);
        cv.normalize(distTrans, distTrans, 1, 0, cv.NORM_INF);
        // get foreground
        cv.threshold(distTrans, Fg, 0, 255, cv.THRESH_BINARY);
        Fg.convertTo(Fg, cv.CV_8U, 1, 0);
        cv.subtract(Bg, Fg, unknown);
        // get connected components markers
        cv.connectedComponents(Fg, markers);

        let markersArray = new Array(markers.rows * markers.cols);
        for (let i = 0; i < markers.rows; i++) {
          for (let j = 0; j < markers.cols; j++) {
            const markerValue = markers.ucharPtr(i, j)[0] + 1;
            markers.intPtr(i, j)[0] =
              unknown.ucharPtr(i, j)[0] === 255 ? 0 : markerValue;
            markersArray[markers.cols * i + j - 1] = markers.intPtr(i, j)[0];
          }
        }

        cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
        cv.watershed(src, markers);
        //postProcess(markers: cv.Mat,gray: cv.Mat,markersArray: number[]) //OPTIONAL

        shiftAndZeroOut(markersArray, 100);

        let label = 1;
        const rows = markers.rows;
        const cols = markers.cols;
        const lastRowIndex = rows - 1;
        const lastColIndex = cols - 1;

        function processRow(i: number, configuration: WSConfig) {
          for (let j = 0; j < cols; j++) {
            const markersArrayIndex = i * cols + j;
            const markerValue = markers.intPtr(i, j)[0];

            if (markerValue === -1) {
              // Border pixel
              markersArray[markersArrayIndex] =
                i === 0 || j === 0 || i === lastRowIndex || j === lastColIndex
                  ? 0
                  : label;
            } else if (markerValue >= 1) {
              // Inside pixel (non-zero marker values)
              label =
                markerValue > configuration.masksNumber!
                  ? configuration.masksNumber
                  : markerValue;
              markersArray[markersArrayIndex] = label;
            } else {
              // Background pixel (marker value == 0)
              markersArray[markersArrayIndex] = 0;
            }
          }
        }
        //iteration to set mask markers
        function processIteration(i: number, configuration: WSConfig) {
          if (i < rows) {
            processRow(i, configuration);

            // Move on to the next row
            let nextRow = i + 1;
            setTimeout(() => {
              processIteration(nextRow, configuration);
            }, 0);
          } else {
            // Delete unused Mat elements
            src.delete();
            gray.delete();
            opening.delete();
            Bg.delete();
            Fg.delete();
            distTrans.delete();
            unknown.delete();
            markers.delete();
            M.delete();
            // mask array to mask a DICOM image
            resolve(markersArray);
          }
        }
        processIteration(0, this.configuration);
      } catch (error) {
        reject(error);
      }
    });
    //ALTERNATIVE INSTEAD OF PROCESSITERATION: SIMPLE NESTED FOR CYCLE
    //pros: +VELOCE, SPECIALMENTE NELLA WS SU SINGOLA SLICE
    //cons: BLOCKS THE UI (NOTARE CHE LA UI E' COMUNQUE BLOCCATA NEL CASO MULTISLICE ANCHE USANDO PROCESSITERATION,
    //ANDREBBE SPEZZATO IN CHUNKS ANCHE IL CICLO FOR SULLE IMMAGINI NEL CASO MULTISLICE, MA SI ROMPE)
    //TODO: check se conviene tenere la versione vecchia
    //for (let i = 0; i < rows; i++) {
    //for (let j = 0; j < cols; j++) {
    //const markersArrayIndex = i * markers.cols + j;
    //const markerValue = markers.intPtr(i, j)[0];

    //if (markerValue === -1) {
    // Border pixel
    //markersArray[markersArrayIndex] =
    //  i === 0 || j === 0 || i === lastRowIndex || j === lastColIndex
    //   ? 0
    //   : label;
    //} else if (markerValue >= 1) {
    // // Inside pixel (non-zero marker values)
    //label =
    // markerValue > this.configuration.masksNumber
    //   ? this.configuration.masksNumber
    //  : markerValue;
    // markersArray[markersArrayIndex] = label;
    // } else {
    //// Background pixel (marker value == 0)
    // markersArray[markersArrayIndex] = 0;
    // }
    //}
    //}

    //this._processAsync(10, markers, markersArray, label);

    // delete unused Mat elements
    //src.delete();
    //gray.delete();
    //opening.delete();
    //Bg.delete();
    //Fg.delete();
    //distTrans.delete();
    //unknown.delete();
    //markers.delete();
    //M.delete();
    //// mask array to mask a DICOM image
    //resolve(markersArray);
    //} catch (error) {
    //reject(error);
    //}
    //});
  }

  /**
   * Draws the WS mask on the original imae
   *@name _drawBrushPixels
   * @protected
   * @param  {number[][]} masks //The mask array retrieved from WS algorithm
   * @returns {pixelData3D}
   */
  _drawBrushPixels(masks: number[][]) {
    let pixelData3D: pixelData3D = masks.map(pixelData => {
      const segmentsOnLabelmap = [
        ...new Set(pixelData.filter(Number.isInteger))
      ].sort((a, b) => a - b);
      return { pixelData, segmentsOnLabelmap };
    });

    return pixelData3D;
  }

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
  _labelToErase(
    circleArray: number[][],
    selectedSlice: number[],
    image: Image,
    slicei: number[]
  ) {
    if (this.labelToErase == null) {
      let counts = new Array(this.configuration.masksNumber + 1).fill(0);
      circleArray.forEach(([x, y]) => {
        const label = selectedSlice[y * image.rows + x];
        counts[label] = counts[label] + 1;
      });

      let max = getMaxPixelValue(counts);
      this.labelToErase = counts.findIndex(count => count === max);
    }

    for (let i = 0; i < slicei.length; i++) {
      slicei[i] = slicei[i] === this.labelToErase ? 0 : slicei[i];
    }
  }

  /**
   * Allows to erase selected label parts when using shift+click (allows to drag)
   * @name _manualEraser
   * @protected
   * @param  {number[][]} circleArray //The selected circle coordinates Array
   * @param  {Image} image //the dicom image
   * @param  {number[]} slicei //the i-th slice where the manual eraser is applied
   * @returns {void}
   */
  _manualEraser(circleArray: number[][], image: Image, slicei: number[]) {
    circleArray.forEach(([x, y]) => {
      slicei[y * image.rows + x] = 0;
    });
  }

  /**
   * Allows to pick a selected label parts when using alt+click for the first time
   *@name _labelPicker
   * @protected
   * @param  {number[][]} circleArray //The selected circle coordinates Array
   * @param  {Image} image //the dicom image
   * @param  {number[]} currentArray //the current image array
   * @returns {void}
   */
  _labelPicker(circleArray: number[][], image: Image, currentArray: number[]) {
    let counts = new Array(this.configuration.masksNumber! + 1).fill(0);
    circleArray.forEach(([x, y]) => {
      const label = currentArray[y * image.rows + x];
      counts[label] = counts[label] + 1;
    });

    let max = getMaxPixelValue(counts);
    this.pickedLabel = counts.findIndex(count => count === max);
  }

  /**
   * Allows to associate the previously picked label on the selected label area when using alt+click for the second time
   * @name _manualPainter
   * @protected
   * @param  {number[][]} circleArray //The selected circle coordinates Array
   * @param  {Image} image //the dicom image
   * @param  {number[]} array //the current image array where to apply manual painter
   * @returns {void}
   */
  _manualPainter(circleArray: number[][], image: Image, array: number[]) {
    let counts = new Array(this.configuration.masksNumber! + 1).fill(0);
    circleArray.forEach(([x, y]) => {
      const label = array[y * image.rows + x];
      counts[label] = counts[label] + 1;
    });

    let max = getMaxPixelValue(counts);
    this.labelToChange = counts.findIndex(count => count === max);

    for (let i = 0; i < array.length; i++) {
      if (array[i] === this.labelToChange) {
        array[i] = this.pickedLabel;
      }
    }
  }

  /**
   * initializes parameters that are useful in _paint() function
   *@name  _paintInit
   * @protected
   * @param  {WSMouseEvent} evt
   * @param  {WSEventData} eventData
   * @returns {void}
   */
  _paintInit(evt: WSMouseEvent, eventData: WSEventData) {
    const element = eventData.element;
    this.element = element as HTMLElement;
    const viewport = store.get(["viewports", this.element!.id]);

    element.addEventListener(
      "wheel",
      this._changeRadius.bind(this) as EventListener
    );

    const toolData = getToolState(element, "stack");
    const stackData = toolData.data[0];
    const image = eventData.image;
    if (image.imageId != this.imageId || viewport.seriesUID != this.seriesUID) {
      this._resetData(viewport.seriesUID, stackData);
    }
    this.imageId = image.imageId;
    this.indexImage = stackData.imageIds.indexOf(this.imageId);

    this.slicesNumber = this.slicesNumber || stackData.imageIds.length;
    this.seriesUID = viewport.seriesUID;

    this.width = this.height || image.height;
    this.height = this.width || image.width;

    const { shouldErase } = this.paintEventData;
    let shouldEraseManually =
      evt.detail.shiftKey === undefined
        ? evt.detail.event.shiftKey
        : evt.detail.shiftKey;
    let shouldActivateLabelPicker =
      evt.detail.event === undefined ? undefined : evt.detail.event.altKey;
    let shouldApplyWatershed =
      (shouldErase === false || shouldErase === undefined) &&
      (shouldEraseManually === false || shouldEraseManually === undefined) &&
      (shouldActivateLabelPicker === false ||
        shouldActivateLabelPicker === undefined);

    return {
      image,
      shouldEraseManually,
      shouldActivateLabelPicker,
      shouldApplyWatershed,
      shouldErase
    };
  }

  /**
   * resets data when imaegId or seriesUID changes
   *@name _resetData
   * @protected
   * @param  {string} seriesUID
   * @param  {Series} stackData
   * @returns {void}
   */
  _resetData(seriesUID: string, stackData: Series) {
    this.dicomPixelData = null;
    this.minThreshold = null;
    this.maxThreshold = null;
    this.pixelData = this.seriesUID != seriesUID ? null : this.pixelData;
    this.slicesNumber =
      this.seriesUID != seriesUID ? null : stackData.imageIds.length;
    this.maskArray = this.seriesUID != seriesUID ? null : this.maskArray;
    this.maskArrayCurrentImage = null;
  }
}

// Internal functions

const setSegmentationConfig = function (config: Object) {
  let { configuration } = cornerstoneTools.getModule("segmentation");
  extend(configuration, config);
  let enabledElements = cornerstone.getEnabledElements();
  each(enabledElements, el => {
    cornerstone.updateImage(el.element);
  });
};
