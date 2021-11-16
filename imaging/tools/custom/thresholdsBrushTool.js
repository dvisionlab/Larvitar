/** @module imaging/tools/custom/thresholdBrushTool
 *  @desc  This file provides functionalities for
 *         a brush tool with thresholds using a
 *         custom cornestone tool
 */

// external libraries
import cornerstoneTools from "cornerstone-tools";
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
    const defaultProps = {
      name: "ThresholdsBrush",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {},
      mixins: ["renderBrushMixin"]
    };

    super(props, defaultProps);

    this.touchDragCallback = this._paint.bind(this);
  }

  /**
   * Paints the data to the labelmap.
   *
   * @protected
   * @param  {Object} evt The data object associated with the event.
   * @returns {void}
   */
  _paint(evt) {
    const { configuration } = segmentationModule;
    const eventData = evt.detail;
    const { rows, columns } = eventData.image;
    const { x, y } = eventData.currentPoints.image;

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const radius = configuration.radius;
    const thresholds = configuration.thresholds;
    const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;

    let pointerArray = [];

    // threshold should be applied only if painting, not erasing
    if (shouldErase) {
      pointerArray = getCircle(radius, rows, columns, x, y);
    } else {
      pointerArray = getCircleWithThreshold(
        eventData.image,
        radius,
        thresholds,
        x,
        y
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
 * @returns {Array.number[]}      Array of pixels contained within the circle.
 */
function getCircleWithThreshold(
  image,
  radius,
  thresholds,
  xCoord = 0,
  yCoord = 0
) {
  const pixelData = image.getPixelData();
  const { rows, columns } = image;
  const x0 = Math.floor(xCoord);
  const y0 = Math.floor(yCoord);
  let circleArray = [];

  // if no thresholds, set all pixels range
  if (!thresholds) {
    thresholds = [image.minPixelValue, image.maxPixelValue];
  }

  function isInsideThresholds(v, t) {
    return v >= t[0] && v <= t[1];
  }

  if (radius === 1) {
    let value = pixelData[y0 * rows + x0];
    let moValue = value * image.slope + image.intercept;
    if (isInsideThresholds(moValue, thresholds)) {
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

      if (
        x * x + y * y < radius * radius &&
        isInsideThresholds(moValue, thresholds)
      ) {
        circleArray[index++] = [x0 + x, y0 + y];
      }
    }
  }

  return circleArray;
}
