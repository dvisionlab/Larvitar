//external imports
import cornerstoneTools from "cornerstone-tools";
const external = cornerstoneTools.external;
const BaseAnnotationTool = cornerstoneTools.importInternal(
  "base/BaseAnnotationTool"
);
// State
const getToolState = cornerstoneTools.getToolState;
const toolStyle = cornerstoneTools.toolStyle;
const toolColors = cornerstoneTools.toolColors;
const getHandleNearImagePoint = cornerstoneTools.importInternal(
  "manipulators/getHandleNearImagePoint"
);
// Drawing
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const draw = cornerstoneTools.importInternal("drawing/draw");
const drawEllipse = cornerstoneTools.importInternal("drawing/drawEllipse");
const drawHandles = cornerstoneTools.importInternal("drawing/drawHandles");
const drawLinkedTextBox = cornerstoneTools.importInternal(
  "drawing/drawLinkedTextBox"
);
const setShadow = cornerstoneTools.importInternal("drawing/setShadow");
// Util
const calculateSUV = cornerstoneTools.importInternal("util/calculateSUV");
const numbersWithCommas = cornerstoneTools.importInternal(
  "util/numbersWithCommas"
);
const { pointInEllipse, calculateEllipseStatistics } =
  cornerstoneTools.importInternal("util/ellipseUtils");
const getROITextBoxCoords = cornerstoneTools.importInternal(
  "util/getROITextBoxCoords"
);
const throttle = cornerstoneTools.importInternal("util/throttle");
const { ellipticalRoiCursor } =
  cornerstoneTools.importInternal("tools/cursors");
const getPixelSpacing = cornerstoneTools.importInternal("util/getPixelSpacing");
const getModule = cornerstoneTools.getModule;

//internal imports
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
import { StoreViewport } from "../../types";
import store from "../../imageStore";

/**
 * @public
 * @class EllipticalRoiTool
 * @memberof Tools.Annotation
 * @classdesc Tool for drawing elliptical regions of interest, and measuring
 * the statistics of the enclosed pixels.
 * @extends Tools.Base.BaseAnnotationTool
 */
export default class EllipticalRoiTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: "EllipticalRoi",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        // showMinMax: false,
        // showHounsfieldUnits: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        renderDashed: false
      },
      svgCursor: ellipticalRoiCursor
    };

    super(props, defaultProps);
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
      console.error(
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
      console.warn(
        `invalid parameters supplied to tool ${this.name}'s pointNearTool`
      );
    }

    if (!validParameters || data.visible === false) {
      return false;
    }

    const handleNearImagePoint: boolean = getHandleNearImagePoint(
      element,
      data.handles,
      coords,
      6
    );

    if (handleNearImagePoint) {
      return true;
    }

    const distance: number = interactionType === "mouse" ? 15 : 25;
    const startCanvas: Coords = external.cornerstone.pixelToCanvas(
      element,
      data.handles.start
    );
    const endCanvas: Coords = external.cornerstone.pixelToCanvas(
      element,
      data.handles.end
    );

    const minorEllipse: Rectangle = {
      left: Math.min(startCanvas.x, endCanvas.x) + distance / 2,
      top: Math.min(startCanvas.y, endCanvas.y) + distance / 2,
      width: Math.abs(startCanvas.x - endCanvas.x) - distance,
      height: Math.abs(startCanvas.y - endCanvas.y) - distance
    };

    const majorEllipse: Rectangle = {
      left: Math.min(startCanvas.x, endCanvas.x) - distance / 2,
      top: Math.min(startCanvas.y, endCanvas.y) - distance / 2,
      width: Math.abs(startCanvas.x - endCanvas.x) + distance,
      height: Math.abs(startCanvas.y - endCanvas.y) + distance
    };

    const pointInMinorEllipse: boolean = pointInEllipse(minorEllipse, coords);
    const pointInMajorEllipse: boolean = pointInEllipse(majorEllipse, coords);

    if (pointInMajorEllipse && !pointInMinorEllipse) {
      return true;
    }

    return false;
  }

  updateCachedStats(
    image: cornerstone.Image,
    element: Element,
    data: MeasurementData
  ) {
    const pixelSpacing: PixelSpacing = getPixelSpacing(image);

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
    const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);

    const hasPixelSpacing: boolean =
      rowPixelSpacing != undefined &&
      rowPixelSpacing != 0 &&
      colPixelSpacing != 0 &&
      colPixelSpacing != undefined;

    draw(context, (context: CanvasRenderingContext2D) => {
      // If we have tool data for this element - iterate over each set and draw it
      for (let i = 0; i < toolData.data.length; i++) {
        const data = toolData.data[i];

        if (data.visible === false) {
          continue;
        }

        // Configure
        const color = toolColors.getColorIfActive(data);
        const handleOptions = {
          color,
          handleRadius,
          drawHandlesIfActive: drawHandlesOnHover,
          hideHandlesIfMoving
        };

        setShadow(context, this.configuration);

        const ellipseOptions: MeasurementConfig = { color };

        if (renderDashed) {
          ellipseOptions.lineDash = lineDash;
        }

        // Draw
        drawEllipse(
          context,
          element,
          data.handles.start,
          data.handles.end,
          ellipseOptions,
          "pixel",
          data.handles.initialRotation
        );
        drawHandles(context, eventData, data.handles, handleOptions);

        // Update textbox stats
        if (data.invalidated === true) {
          if (data.cachedStats) {
            this.throttledUpdateCachedStats(image, element, data);
          } else {
            this.updateCachedStats(image, element, data);
          }
        }

        // Default to textbox on right side of ROI
        if (!data.handles.textBox.hasMoved) {
          const defaultCoords = getROITextBoxCoords(
            eventData.viewport,
            data.handles
          );

          Object.assign(data.handles.textBox, defaultCoords);
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
 *
 *
 * @param {*} startHandle
 * @param {*} endHandle
 * @returns {Array.<{x: number, y: number}>}
 */
function _findTextBoxAnchorPoints(
  startHandle: HandlePosition,
  endHandle: HandlePosition
): Coords[] {
  const { left, top, width, height } = _getEllipseImageCoordinates(
    startHandle,
    endHandle
  );

  return [
    {
      // Top middle point of ellipse
      x: left + width / 2,
      y: top
    },
    {
      // Left middle point of ellipse
      x: left,
      y: top + height / 2
    },
    {
      // Bottom middle point of ellipse
      x: left + width / 2,
      y: top + height
    },
    {
      // Right middle point of ellipse
      x: left + width,
      y: top + height / 2
    }
  ];
}

function _getUnit(modality: string, showHounsfieldUnits: boolean) {
  return modality === "CT" && showHounsfieldUnits !== false ? "HU" : "";
}

/**
 *
 *
 * @param {*} context
 * @param {*} isColorImage
 * @param {*} { area, mean, stdDev, min, max, meanStdDevSUV }
 * @param {*} modality
 * @param {*} hasPixelSpacing
 * @param {*} [options={}] - { showMinMax, showHounsfieldUnits }
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

  // Don't display mean/standardDev for color images
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

/**
 *
 *
 * @param {*} area
 * @param {*} hasPixelSpacing
 * @returns {string} The formatted label for showing area
 */
function _formatArea(modality: string, area: number, hasPixelSpacing: boolean) {
  // This uses Char code 178 for a superscript 2
  const suffix =
    !hasPixelSpacing || modality === "US"
      ? ` px${String.fromCharCode(178)}`
      : ` mm${String.fromCharCode(178)}`;

  return `Area: ${numbersWithCommas(area.toFixed(2))}${suffix}`;
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
  // Retrieve the bounds of the ellipse in image coordinates
  const ellipseCoordinates = _getEllipseImageCoordinates(
    handles.start!,
    handles.end!
  );

  // Retrieve the array of pixels that the ellipse bounds cover
  const pixels = external.cornerstone.getPixels(
    element,
    ellipseCoordinates.left,
    ellipseCoordinates.top,
    ellipseCoordinates.width,
    ellipseCoordinates.height
  );

  // Calculate the mean & standard deviation from the pixels and the ellipse details.
  const ellipseMeanStdDev = calculateEllipseStatistics(
    pixels,
    ellipseCoordinates
  );

  let meanStdDevSUV;

  if (modality === "PT") {
    meanStdDevSUV = {
      mean: calculateSUV(image, ellipseMeanStdDev.mean, true) || 0,
      stdDev: calculateSUV(image, ellipseMeanStdDev.stdDev, true) || 0
    };
  }

  // Calculate the image area from the ellipse dimensions and pixel spacing
  const area =
    Math.PI *
    ((ellipseCoordinates.width * (pixelSpacing.colPixelSpacing || 1)) / 2) *
    ((ellipseCoordinates.height * (pixelSpacing.rowPixelSpacing || 1)) / 2);

  return {
    area: area || 0,
    count: ellipseMeanStdDev.count || 0,
    mean: ellipseMeanStdDev.mean || 0,
    variance: ellipseMeanStdDev.variance || 0,
    stdDev: ellipseMeanStdDev.stdDev || 0,
    min: ellipseMeanStdDev.min || 0,
    max: ellipseMeanStdDev.max || 0,
    meanStdDevSUV
  };
}

/**
 * Retrieve the bounds of the ellipse in image coordinates
 *
 * @param {*} startHandle
 * @param {*} endHandle
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
function _getEllipseImageCoordinates(
  startHandle: HandlePosition,
  endHandle: HandlePosition
) {
  return {
    left: Math.round(Math.min(startHandle.x, endHandle.x)),
    top: Math.round(Math.min(startHandle.y, endHandle.y)),
    width: Math.round(Math.abs(startHandle.x - endHandle.x)),
    height: Math.round(Math.abs(startHandle.y - endHandle.y))
  };
}
