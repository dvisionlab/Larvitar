import cornerstoneTools from "cornerstone-tools";

const external = cornerstoneTools.external;
const BaseAnnotationTool = cornerstoneTools.importInternal(
  "base/BaseAnnotationTool"
);
const EVENTS = cornerstoneTools.EVENTS;
// State
const getToolState = cornerstoneTools.getToolState;
const toolStyle = cornerstoneTools.toolStyle;
const toolColors = cornerstoneTools.toolColors;

// Drawing
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const draw = cornerstoneTools.importInternal("drawing/draw");
const drawHandles = cornerstoneTools.importInternal("drawing/drawHandles");
const drawRect = cornerstoneTools.importInternal("drawing/drawRect");
const fillBox = cornerstoneTools.importInternal("drawing/fillBox");
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
const getLogger = cornerstoneTools.importInternal("util/getLogger");
const getPixelSpacing = cornerstoneTools.importInternal("util/getPixelSpacing");
const getModule = cornerstoneTools.getModule;
const BaseTool = cornerstoneTools.importInternal('base/BaseTool');
const clip = cornerstoneTools.importInternal('util/clip')
const getLuminance =  cornerstoneTools.importInternal('util/getLuminance');
const wwwcRegionCursor = cornerstoneTools.importInternal('cursors/wwwcRegionCursor');
const logger = getLogger("tools:annotation:RectangleRoiTool");

/**
 * @public
 * @class WwwcInvertRegionTool
 * @memberof Tools
 *
 * @classdesc Tool for setting wwwc based on a rectangular region.
 * @extends Tools.Base.BaseTool
 */

export default class WwwcInvertRegionTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: "WwwcInvertRegionTool",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        drawHandles: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        renderDashed: false,
        minWindowWidth: 10,
        // showMinMax: false,
        // showHounsfieldUnits: true,
      },
      svgCursor: rectangleRoiCursor
    };

    super(props, defaultProps);

    this._drawingMouseUpCallback = this._applyStrategy.bind(this);
    this._editMouseUpCallback = this._applyStrategy.bind(this);

    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 10);
  }

  createNewMeasurement(eventData) {
    const { element } = eventData;
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;

    if (!goodEventData) {
      logger.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );

      return;
    }
    element.addEventListener(EVENTS.MOUSE_UP, this._drawingMouseUpCallback);
    element.addEventListener(EVENTS.TOUCH_END, this._drawingMouseUpCallback);
    return {
      computeMeasurements: this.options.computeMeasurements,
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

  pointNearTool(element, data, coords, interactionType) {
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
    const startCanvas = external.cornerstone.pixelToCanvas(
      element,
      data.handles.start
    );
    const endCanvas = external.cornerstone.pixelToCanvas(
      element,
      data.handles.end
    );

    const rect = {
      left: Math.min(startCanvas.x, endCanvas.x),
      top: Math.min(startCanvas.y, endCanvas.y),
      width: Math.abs(startCanvas.x - endCanvas.x),
      height: Math.abs(startCanvas.y - endCanvas.y)
    };

    const distanceToPoint = external.cornerstoneMath.rect.distanceToPoint(
      rect,
      coords
    );

    return distanceToPoint < distance;
  }

  updateCachedStats(image, element, data) {
    if (data.computeMeasurements) {
      const seriesModule =
        external.cornerstone.metaData.get(
          "generalSeriesModule",
          image.imageId
        ) || {};
      const modality = seriesModule.modality;
      const pixelSpacing = getPixelSpacing(image);

      const stats = _calculateStats(
        image,
        element,
        data.handles,
        modality,
        pixelSpacing
      );

      data.cachedStats = stats;
    }
    data.invalidated = false;
  }

  renderToolData(evt) {
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
    } = this.configuration;
    const context = getNewContext(eventData.canvasContext.canvas);
    const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);

    // Meta
    const seriesModule =
      external.cornerstone.metaData.get("generalSeriesModule", image.imageId) ||
      {};

    // Pixel Spacing
    const modality = seriesModule.modality;
    const hasPixelSpacing = rowPixelSpacing && colPixelSpacing;

    draw(context, context => {
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

        const rectOptions = { color };

        if (renderDashed) {
          rectOptions.lineDash = lineDash;
        }

        // Draw the rectangle
        // drawFillRect 
        // const boundingBox = _getRectangleImageCoordinates( data.handles.start, data.handles.end);
        // must be converted in canvas coords
        const startCanvas = external.cornerstone.pixelToCanvas(
          element,
          data.handles.start
        );
        const endCanvas = external.cornerstone.pixelToCanvas(
          element,
          data.handles.end
        );
    
        const rect = {
          left: Math.min(startCanvas.x, endCanvas.x),
          top: Math.min(startCanvas.y, endCanvas.y),
          width: Math.abs(startCanvas.x - endCanvas.x),
          height: Math.abs(startCanvas.y - endCanvas.y)
        };
    
        fillBox(context, rect, 'white');
        /*
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
        */
        if (data.computeMeasurements) {
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

          const textBoxAnchorPoints = handles =>
            _findTextBoxAnchorPoints(handles.start, handles.end);
          const textBoxContent = _createTextBoxContent(
            context,
            image.color,
            data.cachedStats,
            modality,
            hasPixelSpacing,
            this.configuration
          );

          data.unit = _getUnit(
            modality,
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
      }
    });
  }
   /**
   * Event handler for MOUSE_UP/TOUCH_END during handle drag event loop.
   *
   * @private
   * @method _applyStrategy
   * @param {(CornerstoneTools.event#MOUSE_UP|CornerstoneTools.event#TOUCH_END)} evt Interaction event emitted by an enabledElement
   * @returns {void}
   */
  _applyStrategy(evt) {
    const toolData = getToolState(evt.currentTarget, this.name);
    const rectangles = toolData ? toolData.data : [] ;
    if (Array.isArray(rectangles)) { 
      const allHandles = rectangles.map(item => item.handles);
      _applyWWWCRegion(evt, allHandles, this.configuration);
    }
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
function _getRectangleImageCoordinates(startHandle, endHandle) {
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
function _calculateStats(image, element, handles, modality, pixelSpacing) {
  // Retrieve the bounds of the rectangle in image coordinates
  const roiCoordinates = _getRectangleImageCoordinates(
    handles.start,
    handles.end
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
function _calculateRectangleStats(sp, rectangle) {
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
      min = Math.min(min, sp[index]);
      max = Math.max(max, sp[index]);
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
function _findTextBoxAnchorPoints(startHandle, endHandle) {
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
function _formatArea(area, hasPixelSpacing) {
  // This uses Char code 178 for a superscript 2
  const suffix = hasPixelSpacing
    ? ` mm${String.fromCharCode(178)}`
    : ` px${String.fromCharCode(178)}`;

  return `Area: ${numbersWithCommas(area.toFixed(2))}${suffix}`;
}

function _getUnit(modality, showHounsfieldUnits) {
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
  context,
  isColorImage,
  { area = 0, mean = 0, stdDev = 0, min = 0, max = 0, meanStdDevSUV = 0 } = {},
  modality,
  hasPixelSpacing,
  options = {}
) {
  const showMinMax = options.showMinMax || false;
  const textLines = [];

  const otherLines = [];

  if (!isColorImage) {
    const hasStandardUptakeValues = meanStdDevSUV && meanStdDevSUV.mean !== 0;
    const unit = _getUnit(modality, options.showHounsfieldUnits);

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

  textLines.push(_formatArea(area, hasPixelSpacing));
  otherLines.forEach(x => textLines.push(x));

  return textLines;
}

/**
 * Calculates the minimum and maximum value in the given pixel array
 * and updates the viewport of the element in the event.
 *
 * @private
 * @method _applyWWWCRegion
 * @param {(CornerstoneTools.event#MOUSE_UP|CornerstoneTools.event#TOUCH_END)} evt Interaction event emitted by an enabledElement
 * @param {Array} handles array of the objects of image handles
 * @param {Object} config The tool's configuration object
 * @returns {void}
 */
const _applyWWWCRegion = function(evt, handles, config) {
  const eventData = evt.detail;
  const { image, element } = eventData;
  const fullImageLuminance = getLuminance(element, 0, 0, image.width, image.height);
  let extentsLuminance = fullImageLuminance; 
  handles.forEach(handle => {
    /*
    if (_isEmptyObject(handle.start) || _isEmptyObject(handles.end)) {
      return;
    }
    */
    const { start: startPoint, end: endPoint } = handle;
    // Get the rectangular region defined by the handles
    let left = Math.min(startPoint.x, endPoint.x);
    let top = Math.min(startPoint.y, endPoint.y);
    let width = Math.abs(startPoint.x - endPoint.x);
    let height = Math.abs(startPoint.y - endPoint.y);
    // Bound the rectangle so we don't get undefined pixels
    left = clip(left, 0, image.width);
    top = clip(top, 0, image.height);
    width = Math.floor(Math.min(width, Math.abs(image.width - left)));
    height = Math.floor(Math.min(height, Math.abs(image.height - top))); 
    // Get the pixel data in the rectangular region
    // get luminance of the whole image
    const x = Math.round(left);
    const y = Math.round(top);
    let row, column, spIndex;
    for (row = 0; row < height; row++) {
      for (column = 0; column < width; column++) {
        spIndex = (row + y) * image.columns + (column + x);
        extentsLuminance[spIndex] = null; 
      }
    }
   
  });
  // remove the luminance of the selected area
  let normalizedImageLuminance = [...extentsLuminance];
  normalizedImageLuminance = normalizedImageLuminance.filter(item => item !== null);
  // calculate maxminmean in the area
  const minMaxMean = _calculateMinMaxMean(
    normalizedImageLuminance,
    image.minPixelValue,
    image.maxPixelValue
  );
  // Adjust the viewport window width and center based on the calculated values
  const viewport = eventData.viewport;

  if (config.minWindowWidth === undefined) {
    config.minWindowWidth = 10;
  }

  viewport.voi.windowWidth = Math.max(
    Math.abs(minMaxMean.max - minMaxMean.min),
    config.minWindowWidth
  );
  viewport.voi.windowCenter = minMaxMean.mean;

  // Unset any existing VOI LUT
  viewport.voiLUT = undefined;
  external.cornerstone.setViewport(element, viewport);
  external.cornerstone.updateImage(element);
};

/**
 * Calculates the minimum, maximum, and mean value in the given pixel array
 *
 * @private
 * @method _calculateMinMaxMean
 * @param {number[]} pixelLuminance array of pixel luminance values
 * @param {number} globalMin starting "min" valie
 * @param {bumber} globalMax starting "max" value
 * @returns {Object} {min: number, max: number, mean: number }
 */
const _calculateMinMaxMean = function(pixelLuminance, globalMin, globalMax) {
  const numPixels = pixelLuminance.length;
  let min = globalMax;
  let max = globalMin;
  let sum = 0;

  if (numPixels < 2) {
    return {
      min,
      max,
      mean: (globalMin + globalMax) / 2,
    };
  }

  for (let index = 0; index < numPixels; index++) {
    const spv = pixelLuminance[index];

    min = Math.min(min, spv);
    max = Math.max(max, spv);
    sum += spv;
  }

  return {
    min,
    max,
    mean: sum / numPixels,
  };
};

/**
 * Helper to determine if an object has no keys and is the correct type (is empty)
 *
 * @private
 * @function _isEmptyObject
 * @param {Object} obj The object to check
 * @returns {Boolean} true if the object is empty
 */
const _isEmptyObject = obj =>
  Object.keys(obj).length === 0 && obj.constructor === Object;

