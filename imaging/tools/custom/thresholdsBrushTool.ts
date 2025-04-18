/** @module imaging/tools/custom/thresholdBrushTool
 *  @desc  This file provides functionalities for
 *         a brush tool with thresholds using a
 *         custom cornestone tool
 */

// external libraries
import cornerstoneTools from "cornerstone-tools";
import {
  calculateStats,
  calculateThresholds
} from "./utils/watershedSegmentationToolUtils/WSUtils";
import { getMaxPixelValue, getMinPixelValue } from "../../imageUtils";
import { MeasurementMouseEvent, ThresholdsBrushProp } from "../types";
import { Image } from "cornerstone-core";
const external = cornerstoneTools.external;
const BaseBrushTool = cornerstoneTools.importInternal("base/BaseBrushTool");
const segmentationUtils = cornerstoneTools.importInternal(
  "util/segmentationUtils"
);
const drawBrushPixels = segmentationUtils.drawBrushPixels;
const getCircle = segmentationUtils.getCircle;
const segmentationModule = cornerstoneTools.getModule("segmentation");

/**
 * @public
 * @class ThresholdsBrushTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image (only pixels inside thresholds)
 * @extends Tools.Base.BaseBrushTool
 */
export default class ThresholdsBrushTool extends BaseBrushTool {
  constructor(props = {}) {
    const defaultProps: ThresholdsBrushProp = {
      name: "ThresholdsBrush",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {},
      mixins: ["renderBrushMixin"]
    };
    super(props, defaultProps);
    // add parameter of threshold min/max in configuration for static
    if (
      defaultProps.configuration.staticThreshold &&
      defaultProps.configuration.thresholds
    ) {
      this.thresholds = defaultProps.configuration.thresholds;
    }
    // define parameter for statistical fine tuning
    // TODO: edit parameter for fine tuning
    const X_FACTOR = 1.2;
    this.xFactor = X_FACTOR;
    if (defaultProps.configuration.xFactor) {
      this.xFactor = defaultProps.configuration.xFactor;
    }
    this.touchDragCallback = this._paint.bind(this);
  }

  /**
   * Event handler for MOUSE_UP during the drawing event loop.
   *
   * @protected
   * @event
   * @param {MeasurementMouseEvent} evt - The event.
   * @returns {void}
   */
  _drawingMouseUpCallback(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    const element = eventData.element;

    this._endPainting(evt);

    this._drawing = false;
    this._mouseUpRender = true;
    this._stopListeningForMouseUp(element);
    this.thresholds = null;
  }

  /**
   * Paints the data to the labelmap.
   *
   * @protected
   * @param  {MeasurementMouseEvent} evt The data object associated with the event.
   * @returns {void}
   */
  _paint(evt: MeasurementMouseEvent) {
    const { configuration } = segmentationModule;
    const eventData = evt.detail;
    const { rows, columns } = eventData.image;
    const { x, y } = eventData.currentPoints.image;

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const radius = configuration.radius;
    const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;

    let pointerArray = [];

    // threshold should be applied only if painting, not erasing
    if (shouldErase) {
      pointerArray = getCircle(radius, rows, columns, x, y);
    } else {
      // optimal threshold
      if (!this.thresholds && !this.setThresholds) {
        const pixelData = eventData.image.getPixelData();
        pointerArray = getCircle(radius, rows, columns, x, y);
        this.thresholds = this._calculateThresholdsWithoutMap(
          eventData.image,
          pixelData,
          pointerArray,
          null,
          null
        );
      }
      const lowerThreshold = this.thresholds
        ? this.thresholds.lowerThreshold
        : this.setThresholds.lowerThreshold;
      const upperThreshold = this.thresholds
        ? this.thresholds.upperThreshold
        : this.setThresholds.upperThreshold;
      const thresholdArray = [lowerThreshold, upperThreshold];
      pointerArray = getCircleWithThreshold(
        eventData.image,
        radius,
        thresholdArray,
        x,
        y,
        this.thresholds ? true : false
      );
    }

    // Draw / Erase the active color.
    drawBrushPixels(
      pointerArray,
      labelmap2D.pixelData,
      labelmap3D.activeSegmentIndex,
      columns,
      shouldErase
    );

    external.cornerstone.updateImage(evt.detail.element);
  }
  // TODO add an event to handle this
  increaseSensitivity() {
    this.xFactor = this.xFactor + 0.2;
  }
  decreaseSensitivity() {
    this.xFactor = this.xFactor - 0.2;
  }
  _calculateThresholdsWithoutMap(
    image: Image,
    dicomPixelData: number[],
    circleArray: number[][],
    minThreshold: number | null,
    maxThreshold: number | null
  ) {
    const { mean, stddev } = calculateStats(image, dicomPixelData, circleArray);

    minThreshold =
      minThreshold === null ? getMinPixelValue(dicomPixelData) : minThreshold;
    maxThreshold =
      maxThreshold === null ? getMaxPixelValue(dicomPixelData) : maxThreshold;

    let lowerThreshold = mean - this.xFactor * stddev;
    let upperThreshold = mean + this.xFactor * stddev;
    return { minThreshold, maxThreshold, lowerThreshold, upperThreshold };
  }
}

/**
 * Gets the pixels within the circle if inside thresholds (included)
 * NOTE: thresholds values must consider slope and intercept (MO value)
 * @method
 * @name getCircleWithThreshold
 *
 * @param  {Object} image         The target image.
 * @param  {number} radius        The radius of the circle.
 * @param  {Array} thresholds     The thresholds array [min, max].
 * @param  {number} [xCoord = 0]  The x-location of the center of the circle.
 * @param  {number} [yCoord = 0]  The y-location of the center of the circle.
 * @param {boolean} applyMapping  Flag to set application of mapping of image slope / intercept or not
 * @returns {Array.number[]}      Array of pixels contained within the circle.
 */
function getCircleWithThreshold(
  image: Image,
  radius: number,
  thresholds: number[],
  xCoord: number = 0,
  yCoord: number = 0,
  applyMapping: boolean
) {
  const pixelData = image.getPixelData();
  const { rows, columns } = image;
  const x0 = Math.floor(xCoord);
  const y0 = Math.floor(yCoord);
  let circleArray: number[][] = [];

  // if no thresholds, set all pixels range
  if (!thresholds) {
    thresholds = [
      image.minPixelValue * image.slope + image.intercept,
      image.maxPixelValue * image.slope + image.intercept
    ];
  }

  function isInsideThresholds(v: number, t: number[]) {
    return v >= t[0] && v <= t[1];
  }
  const tMapped = applyMapping
    ? [
        thresholds[0] * image.slope + image.intercept,
        thresholds[1] * image.slope + image.intercept
      ]
    : [thresholds[0], thresholds[1]];
  if (radius === 1) {
    let value = pixelData[y0 * rows + x0];
    let moValue = value * image.slope + image.intercept;
    //threshold convert to image space
    if (isInsideThresholds(moValue, tMapped)) {
      circleArray = [[x0, y0]];
    }
    return circleArray;
  }

  let index = 0;

  for (let y = -radius; y <= radius; y++) {
    const yCoord = y0 + y;

    if (yCoord > rows || yCoord < 0) {
      continue;
    }

    for (let x = -radius; x <= radius; x++) {
      const xCoord = x0 + x;

      if (xCoord >= columns || xCoord < 0) {
        continue;
      }

      let value = pixelData[yCoord * rows + xCoord];
      let moValue = value * image.slope + image.intercept;
      if (x * x + y * y < radius * radius) {
        if (isInsideThresholds(moValue, tMapped)) {
          circleArray[index++] = [x0 + x, y0 + y];
        }
      }
    }
  }

  return circleArray;
}
