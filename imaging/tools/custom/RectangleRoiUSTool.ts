//external imports
import cornerstoneTools from "cornerstone-tools";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
const external = cornerstoneTools.external;
const BaseAnnotationTool = cornerstoneTools.importInternal(
  "base/BaseAnnotationTool"
);
// State
const getToolState = cornerstoneTools.getToolState;
const toolStyle = cornerstoneTools.toolStyle;
const toolColors = cornerstoneTools.toolColors;
// Drawing
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const draw = cornerstoneTools.importInternal("drawing/draw");
const drawHandles = cornerstoneTools.importInternal("drawing/drawHandles");
const drawRect = cornerstoneTools.importInternal("drawing/drawRect");
const drawLinkedTextBox = cornerstoneTools.importInternal(
  "drawing/drawLinkedTextBox"
);
const setShadow = cornerstoneTools.importInternal("drawing/setShadow");
// Util
const calculateSUV = cornerstoneTools.importInternal("util/calculateSUV");
const getROITextBoxCoords = cornerstoneTools.importInternal(
  "util/getROITextBoxCoords"
);
const numbersWithCommas = cornerstoneTools.importInternal(
  "util/numbersWithCommas"
);
const throttle = cornerstoneTools.importInternal("util/throttle");
const { rectangleRoiCursor } = cornerstoneTools.importInternal("tools/cursors");
const getPixelSpacing = cornerstoneTools.importInternal("util/getPixelSpacing");
const getModule = cornerstoneTools.getModule;

//internal imports
import { logger } from "../../../logger";
import {
  Coords,
  EventData,
  HandlePosition,
  Handles,
  MeasurementConfig,
  MeasurementData,
  MeasurementMouseEvent,
  PixelSpacing,
  Rectangle,
  Stats
} from "../types";
import { ImageManager, Series, StoreViewport } from "../../types";
import store from "../../imageStore";
import { getImageTracker, getImageManager } from "../../imageManagers";

/**
 * @public
 * @class RectangleRoiTool
 * @memberof Tools.Annotation
 * @classdesc Tool for drawing rectangular regions of interest, and measuring
 * the statistics of the enclosed pixels.
 * @extends Tools.Base.BaseAnnotationTool
 */
export default class RectangleRoiTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: "RectangleRoi",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        drawHandles: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        renderDashed: false
        // showMinMax: false,
        // showHounsfieldUnits: true
      },
      svgCursor: rectangleRoiCursor
    };

    super(props, defaultProps);
    this.options.deleteIfHandleOutsideImage = false;
    this.modality = null;
    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
  }

  createNewMeasurement(eventData: EventData) {
    const goodEventData: Coords =
      eventData && eventData.currentPoints && eventData.currentPoints.image;
    const viewport: StoreViewport = store.get(["viewports", this.element.id]);
    if (viewport.modality) {
      this.modality = viewport.modality;
    }

    if (!goodEventData) {
      logger.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );

      return;
    }

    return {
      visible: true,
      active: true,
      color: undefined,
      invalidated: true,
      handles: {
        start: {
          x: eventData.currentPoints.image.x,
          y: eventData.currentPoints.image.y,
          highlight: true,
          active: false
        },
        end: {
          x: eventData.currentPoints.image.x,
          y: eventData.currentPoints.image.y,
          highlight: true,
          active: true
        },
        initialRotation: eventData.viewport.rotation,
        textBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true
        }
      }
    };
  }

  pointNearTool(
    element: Element,
    data: MeasurementData,
    coords: Coords,
    interactionType: string
  ) {
    const hasStartAndEndHandles =
      data && data.handles && data.handles.start && data.handles.end;
    const validParameters = hasStartAndEndHandles;

    if (!validParameters) {
      logger.warn(
        `invalid parameters supplied to tool ${this.name}'s pointNearTool`
      );
    }

    if (!validParameters || data.visible === false) {
      return false;
    }

    const distance = interactionType === "mouse" ? 15 : 25;
    const startCanvas: Coords = external.cornerstone.pixelToCanvas(
      element,
      data.handles.start
    );
    const endCanvas: Coords = external.cornerstone.pixelToCanvas(
      element,
      data.handles.end
    );

    const rect: Rectangle = {
      left: Math.min(startCanvas.x, endCanvas.x),
      top: Math.min(startCanvas.y, endCanvas.y),
      width: Math.abs(startCanvas.x - endCanvas.x),
      height: Math.abs(startCanvas.y - endCanvas.y)
    };

    const distanceToPoint: number =
      external.cornerstoneMath.rect.distanceToPoint(rect, coords);

    return distanceToPoint < distance;
  }

  updateCachedStats(
    image: cornerstone.Image,
    element: Element,
    data: MeasurementData
  ) {
    const pixelSpacing: { colPixelSpacing: number; rowPixelSpacing: number } =
      getPixelSpacing(image);

    if (
      pixelSpacing.rowPixelSpacing === undefined ||
      pixelSpacing.colPixelSpacing === undefined
    ) {
      let parsedImageId = cornerstoneDICOMImageLoader.wadouri.parseImageId(
        image.imageId
      );
      let rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
      let imageTracker = getImageTracker();
      let seriesId = imageTracker[rootImageId];
      let manager = getImageManager() as ImageManager;
      if (manager && seriesId) {
        let series = manager[seriesId] as Series;
        pixelSpacing.rowPixelSpacing =
          series.instances[image.imageId].metadata.pixelSpacing![0];
        pixelSpacing.colPixelSpacing =
          series.instances[image.imageId].metadata.pixelSpacing![1];
      }
    }

    const stats: Stats = _calculateStats(
      image,
      element,
      data.handles,
      this.modality,
      pixelSpacing
    );

    data.cachedStats = stats;
    data.invalidated = false;
  }

  renderToolData(evt: MeasurementMouseEvent) {
    const toolData = getToolState(evt.currentTarget, this.name);

    if (!toolData) {
      return;
    }

    const eventData = evt.detail;
    const { image, element } = eventData;
    const lineWidth = toolStyle.getToolWidth();
    const lineDash = getModule("globalConfiguration").configuration.lineDash;
    const {
      handleRadius,
      drawHandlesOnHover,
      hideHandlesIfMoving,
      renderDashed
    }: MeasurementConfig = this.configuration;
    const context: CanvasRenderingContext2D = getNewContext(
      eventData.canvasContext.canvas
    );
    let { rowPixelSpacing, colPixelSpacing }: PixelSpacing =
      getPixelSpacing(image);
    if (this.modality === "US") {
      colPixelSpacing = image.columnPixelSpacing;
      rowPixelSpacing = image.rowPixelSpacing;
    }

    if (rowPixelSpacing === undefined || colPixelSpacing === undefined) {
      let parsedImageId = cornerstoneDICOMImageLoader.wadouri.parseImageId(
        eventData.image.imageId
      );
      let rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
      let imageTracker = getImageTracker();
      let seriesId = imageTracker[rootImageId];
      let manager = getImageManager() as ImageManager;
      if (manager && seriesId) {
        let series = manager[seriesId] as Series;
        rowPixelSpacing =
          series.instances[eventData.image.imageId].metadata.pixelSpacing![0];
        colPixelSpacing =
          series.instances[eventData.image.imageId].metadata.pixelSpacing![1];
      }
    }
    const hasPixelSpacing: boolean =
      rowPixelSpacing != undefined &&
      rowPixelSpacing != 0 &&
      rowPixelSpacing != 1;
    colPixelSpacing != 0 &&
      colPixelSpacing != 1 &&
      colPixelSpacing != undefined;

    draw(context, (context: CanvasRenderingContext2D) => {
      // If we have tool data for this element - iterate over each set and draw it
      for (let i = 0; i < toolData.data.length; i++) {
        const data: MeasurementData = toolData.data[i];

        if (data.visible === false) {
          continue;
        }

        // Configure
        const color = toolColors.getColorIfActive(data);
        const handleOptions: MeasurementConfig = {
          color,
          handleRadius,
          drawHandlesIfActive: drawHandlesOnHover,
          hideHandlesIfMoving
        };

        setShadow(context, this.configuration);

        const rectOptions: {
          color: string;
          lineDash?: boolean;
          lineWidth?: number;
        } = { color };

        if (renderDashed) {
          rectOptions.lineDash = lineDash;
        }

        // Draw
        drawRect(
          context,
          element,
          data.handles.start,
          data.handles.end,
          rectOptions,
          "pixel",
          data.handles.initialRotation
        );

        if (this.configuration.drawHandles) {
          drawHandles(context, eventData, data.handles, handleOptions);
        }

        // Update textbox stats
        if (data.invalidated === true) {
          if (data.cachedStats) {
            this.throttledUpdateCachedStats(image, element, data);
          } else {
            this.updateCachedStats(image, element, data);
          }
        }

        // Default to textbox on right side of ROI
        if (!data.handles.textBox!.hasMoved) {
          const defaultCoords = getROITextBoxCoords(
            eventData.viewport,
            data.handles
          );

          Object.assign(data.handles.textBox!, defaultCoords);
        }

        const textBoxAnchorPoints = (handles: Handles) =>
          _findTextBoxAnchorPoints(handles.start!, handles.end!);
        const textBoxContent = _createTextBoxContent(
          context,
          image.color,
          data.cachedStats,
          this.modality,
          hasPixelSpacing,
          this.configuration
        );

        data.unit = _getUnit(
          this.modality,
          this.configuration.showHounsfieldUnits
        );

        drawLinkedTextBox(
          context,
          element,
          data.handles.textBox,
          textBoxContent,
          data.handles,
          textBoxAnchorPoints,
          color,
          lineWidth,
          10,
          true
        );
      }
    });
  }
}

/**
 * TODO: This is the same method (+ GetPixels) for the other ROIs
 * TODO: The pixel filtering is the unique bit
 *
 * @param {*} startHandle
 * @param {*} endHandle
 * @returns {{ left: number, top: number, width: number, height: number}}
 */
function _getRectangleImageCoordinates(
  startHandle: HandlePosition,
  endHandle: HandlePosition
) {
  return {
    left: Math.min(startHandle.x, endHandle.x),
    top: Math.min(startHandle.y, endHandle.y),
    width: Math.abs(startHandle.x - endHandle.x),
    height: Math.abs(startHandle.y - endHandle.y)
  };
}

/**
 *
 *
 * @param {*} image
 * @param {*} element
 * @param {*} handles
 * @param {*} modality
 * @param {*} pixelSpacing
 * @returns {Object} The Stats object
 */
function _calculateStats(
  image: cornerstone.Image,
  element: Element,
  handles: Handles,
  modality: string,
  pixelSpacing: PixelSpacing
) {
  // Retrieve the bounds of the rectangle in image coordinates
  const roiCoordinates = _getRectangleImageCoordinates(
    handles.start!,
    handles.end!
  );

  // Retrieve the array of pixels that the rectangle bounds cover
  const pixels = external.cornerstone.getPixels(
    element,
    roiCoordinates.left,
    roiCoordinates.top,
    roiCoordinates.width,
    roiCoordinates.height
  );

  // Calculate the mean & standard deviation from the pixels and the rectangle details
  const roiMeanStdDev = _calculateRectangleStats(pixels, roiCoordinates);

  let meanStdDevSUV;

  if (modality === "PT") {
    meanStdDevSUV = {
      mean: calculateSUV(image, roiMeanStdDev.mean, true) || 0,
      stdDev: calculateSUV(image, roiMeanStdDev.stdDev, true) || 0
    };
  }

  // Calculate the image area from the rectangle dimensions and pixel spacing
  const area =
    roiCoordinates.width *
    (pixelSpacing.colPixelSpacing || 1) *
    (roiCoordinates.height * (pixelSpacing.rowPixelSpacing || 1));

  const perimeter =
    roiCoordinates.width * 2 * (pixelSpacing.colPixelSpacing || 1) +
    roiCoordinates.height * 2 * (pixelSpacing.rowPixelSpacing || 1);

  return {
    area: area || 0,
    perimeter,
    count: roiMeanStdDev.count || 0,
    mean: roiMeanStdDev.mean || 0,
    variance: roiMeanStdDev.variance || 0,
    stdDev: roiMeanStdDev.stdDev || 0,
    min: roiMeanStdDev.min || 0,
    max: roiMeanStdDev.max || 0,
    meanStdDevSUV
  };
}

/**
 *
 *
 * @param {*} sp
 * @param {*} rectangle
 * @returns {{ count, number, mean: number,  variance: number,  stdDev: number,  min: number,  max: number }}
 */
function _calculateRectangleStats(sp: number[], rectangle: Rectangle) {
  let sum = 0;
  let sumSquared = 0;
  let count = 0;
  let index = 0;
  let min = sp ? sp[0] : null;
  let max = sp ? sp[0] : null;

  for (let y = rectangle.top; y < rectangle.top + rectangle.height; y++) {
    for (let x = rectangle.left; x < rectangle.left + rectangle.width; x++) {
      sum += sp[index];
      sumSquared += sp[index] * sp[index];
      if (min != null && max != null) {
        min = Math.min(min, sp[index]);
        max = Math.max(max, sp[index]);
      }
      count++; // TODO: Wouldn't this just be sp.length?
      index++;
    }
  }

  if (count === 0) {
    return {
      count,
      mean: 0.0,
      variance: 0.0,
      stdDev: 0.0,
      min: 0.0,
      max: 0.0
    };
  }

  const mean = sum / count;
  const variance = sumSquared / count - mean * mean;

  return {
    count,
    mean,
    variance,
    stdDev: Math.sqrt(variance),
    min,
    max
  };
}

/**
 *
 *
 * @param {*} startHandle
 * @param {*} endHandle
 * @returns {Array.<{x: number, y: number}>}
 */
function _findTextBoxAnchorPoints(
  startHandle: HandlePosition,
  endHandle: HandlePosition
) {
  const { left, top, width, height } = _getRectangleImageCoordinates(
    startHandle,
    endHandle
  );

  return [
    {
      // Top middle point of rectangle
      x: left + width / 2,
      y: top
    },
    {
      // Left middle point of rectangle
      x: left,
      y: top + height / 2
    },
    {
      // Bottom middle point of rectangle
      x: left + width / 2,
      y: top + height
    },
    {
      // Right middle point of rectangle
      x: left + width,
      y: top + height / 2
    }
  ];
}

/**
 *
 *
 * @param {*} area
 * @param {*} hasPixelSpacing
 * @returns {string} The formatted label for showing area
 */
function _formatArea(modality: string, area: number, hasPixelSpacing: boolean) {
  // This uses Char code 178 for a superscript 2
  const suffix = !hasPixelSpacing
    ? ` px${String.fromCharCode(178)}`
    : ` mm${String.fromCharCode(178)}`;

  return `Area: ${numbersWithCommas(area.toFixed(2))}${suffix}`;
}

function _getUnit(modality: string, showHounsfieldUnits: boolean) {
  return modality === "CT" && showHounsfieldUnits !== false ? "HU" : "";
}

/**
 * TODO: This is identical to EllipticalROI's same fn
 * TODO: We may want to make this a utility for ROIs with these values?
 *
 * @param {*} context
 * @param {*} isColorImage
 * @param {*} { area, mean, stdDev, min, max, meanStdDevSUV }
 * @param {*} modality
 * @param {*} hasPixelSpacing
 * @param {*} [options={}]
 * @returns {string[]}
 */
function _createTextBoxContent(
  context: CanvasRenderingContext2D,
  isColorImage: boolean,
  {
    area = 0,
    mean = 0,
    stdDev = 0,
    min = 0,
    max = 0,
    meanStdDevSUV = { mean: 0, stdDev: 0 }
  }: {
    area?: number;
    mean?: number;
    stdDev?: number;
    min?: number;
    max?: number;
    meanStdDevSUV?: { mean: number; stdDev: number };
  } = {},
  modality: string,
  hasPixelSpacing: boolean,
  options: { showMinMax?: boolean; showHounsfieldUnits?: boolean } = {}
) {
  const showMinMax = options.showMinMax || false;
  const textLines: string[] = [];

  const otherLines: string[] = [];

  if (!isColorImage) {
    const hasStandardUptakeValues = meanStdDevSUV && meanStdDevSUV.mean !== 0;
    const unit = _getUnit(modality, options.showHounsfieldUnits!);

    let meanString = `Mean: ${numbersWithCommas(mean.toFixed(2))} ${unit}`;
    const stdDevString = `Std Dev: ${numbersWithCommas(
      stdDev.toFixed(2)
    )} ${unit}`;

    // If this image has SUV values to display, concatenate them to the text line
    if (hasStandardUptakeValues) {
      const SUVtext = " SUV: ";

      const meanSuvString = `${SUVtext}${numbersWithCommas(
        meanStdDevSUV.mean.toFixed(2)
      )}`;
      const stdDevSuvString = `${SUVtext}${numbersWithCommas(
        meanStdDevSUV.stdDev.toFixed(2)
      )}`;

      const targetStringLength = Math.floor(
        context.measureText(`${stdDevString}     `).width
      );

      while (context.measureText(meanString).width < targetStringLength) {
        meanString += " ";
      }

      otherLines.push(`${meanString}${meanSuvString}`);
      otherLines.push(`${stdDevString}     ${stdDevSuvString}`);
    } else {
      otherLines.push(`${meanString}`);
      otherLines.push(`${stdDevString}`);
    }

    if (showMinMax) {
      let minString = `Min: ${min} ${unit}`;
      const maxString = `Max: ${max} ${unit}`;
      const targetStringLength = hasStandardUptakeValues
        ? Math.floor(context.measureText(`${stdDevString}     `).width)
        : Math.floor(context.measureText(`${meanString}     `).width);

      while (context.measureText(minString).width < targetStringLength) {
        minString += " ";
      }

      otherLines.push(`${minString}${maxString}`);
    }
  }

  textLines.push(_formatArea(modality, area, hasPixelSpacing));
  otherLines.forEach(x => textLines.push(x));

  return textLines;
}
