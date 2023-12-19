const cornerstoneTools = larvitar.cornerstoneTools;
const external = cornerstoneTools.external;
const BaseAnnotationTool = cornerstoneTools.importInternal("base/BaseAnnotationTool");
// State
const getToolState = cornerstoneTools.getToolState;
const toolStyle = cornerstoneTools.toolStyle;
const toolColors = cornerstoneTools.toolColors;
// Drawing
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const draw = cornerstoneTools.importInternal("drawing/draw");
const drawHandles = cornerstoneTools.importInternal("drawing/drawHandles");
const drawRect = cornerstoneTools.importInternal("drawing/drawRect");
const drawLinkedTextBox = cornerstoneTools.importInternal("drawing/drawLinkedTextBox");
const setShadow = cornerstoneTools.importInternal("drawing/setShadow");
// Util
const calculateSUV = cornerstoneTools.importInternal("util/calculateSUV");
const getROITextBoxCoords = cornerstoneTools.importInternal("util/getROITextBoxCoords");
const numbersWithCommas = cornerstoneTools.importInternal("util/numbersWithCommas");
const throttle = cornerstoneTools.importInternal("util/throttle");
const { rectangleRoiCursor } = cornerstoneTools.importInternal("tools/cursors");
const getLogger = cornerstoneTools.importInternal("util/getLogger");
const getPixelSpacing = cornerstoneTools.importInternal("util/getPixelSpacing");
const getModule = cornerstoneTools.getModule;
const logger = getLogger("tools:annotation:RectangleRoiTool");

/**
 * @public
 * @class RectangleRoiTool
 * @memberof Tools.Annotation
 * @classdesc Tool for drawing rectangular regions of interest, and measuring
 * the statistics of the enclosed pixels.
 * @extends Tools.Base.BaseAnnotationTool
 */
class WatershedSegmentationTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: "WatershedSegmentation",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        drawHandles: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        renderDashed: false,
      },
      svgCursor: rectangleRoiCursor
    };
    super(props, defaultProps);

    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.Mask_Array=[];
    this.eventData
    this.datahandles
    this.data
    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
    this.lowerThreshold;
      this.upperThreshold
    
  }
 
  handleMouseUp= async (event) => {

    this.measuring = false;
    const eventData = this.eventData;
    const DICOMimage=eventData.image;
    const canvas = eventData.canvasContext.canvas;
    const seriesModule =
        external.cornerstone.metaData.get(
          "generalSeriesModule",
          DICOMimage.imageId
        ) || {};
      const modality = seriesModule.modality;
      const pixelSpacing = getPixelSpacing(DICOMimage);
    const stats = _calculateStats(
        DICOMimage,
        eventData.element,
        this.datahandles,
        modality,
        pixelSpacing
      );
      const XFactor=0.7;
      const dicomPixelData = DICOMimage.getPixelData();
      const minThreshold = this.getMin(dicomPixelData)   
      const maxThreshold = this.getMax(dicomPixelData);
      const meanNorm=this.mapToRange(stats.mean, minThreshold, maxThreshold);

      const stdDevNorm=this.mapToRange(stats.stdDev, minThreshold, maxThreshold);
      const lowerThreshold =  meanNorm- XFactor* stdDevNorm;
      const upperThreshold = meanNorm + XFactor * stdDevNorm;
      this.lowerThreshold=lowerThreshold;
      this.upperThreshold=upperThreshold;
  
const height = DICOMimage.height;
const width = DICOMimage.width;


let normalizedPixelData = new Uint8Array(width * height)
for(let i=0;i<dicomPixelData.length;i++)
{
          normalizedPixelData[i]=this.mapToRange(dicomPixelData[i], minThreshold, maxThreshold);
}
// Assuming 8-bit unsigned integer pixel values
// Create a new array for PNG pixel data with 4 channels: RGB
const pngPixelData = new Uint8Array(width * height * 4);
// Function to convert DICOM pixel data to PNG pixel data
for (let i = 0; i < dicomPixelData.length; i++) {
  const pixelValue = normalizedPixelData[i];

  // Assuming each integer represents a grayscale value
  pngPixelData[i * 4] = pixelValue; // Red channel
  pngPixelData[i * 4 + 1] = pixelValue; // Green channel
  pngPixelData[i * 4 + 2] = pixelValue; // Blue channel
  pngPixelData[i * 4 + 3] = 255; // Alpha channel (fully opaque)

}

// Create an OpenCV Mat object from the PNG pixel data
let src = new cv.Mat(height, width, cv.CV_8UC4); // 3 channels: RGB
src.data.set(pngPixelData);

      // Now 'src' is an OpenCV Mat object representing the PNG image
        let Maskold=this.Mask_Array
        await this.WatershedSegmentation(src, lowerThreshold,upperThreshold)

        console.log(this.Mask_Array)
        console.log(this.arraysEqual(Maskold, this.Mask_Array))
        await this.Applymask_onDICOM(this.Mask_Array,dicomPixelData,DICOMimage,minThreshold,maxThreshold)
        console.log(this.name)
        //larvitar.setToolPassive(this.name);
  }
  arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null||a == undefined||b == undefined) return false;
    if (a.length !== b.length) return false;
  
    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.
  
    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  mapToRange(value, inMin, inMax) {
    return ((value - inMin) / (inMax - inMin)) * 255;
}
getMax(arr) {
   let len = arr.length;
  let max = -Infinity;

  while (len--) {
      max = arr[len] > max ? arr[len] : max;
  }
  return max;
}
getMin(arr) {
  let len = arr.length;
  let min = +Infinity;

  while (len--) {
      min = arr[len] < min ? arr[len] : min;
  }
  return min;
}
WatershedSegmentation(src,lowerThreshold,upperThreshold){
  
let dst = new cv.Mat();

let gray = new cv.Mat();
let opening = new cv.Mat();
let Bg = new cv.Mat();
let Fg = new cv.Mat();
let distTrans = new cv.Mat();
let unknown = new cv.Mat();
let markers = new cv.Mat();
// gray and threshold image
cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

cv.threshold(gray, gray, upperThreshold, 255, cv.THRESH_BINARY);

// get background
let M = cv.Mat.ones(3, 3, cv.CV_8U);
cv.erode(gray, gray, M);
cv.dilate(gray, opening, M);
cv.dilate(opening, Bg, M, new cv.Point(-1, -1), 1);
// distance transform
cv.distanceTransform(opening, distTrans, cv.DIST_L2, 5);
cv.normalize(distTrans, distTrans, 1, 0, cv.NORM_INF);
// get foreground
cv.threshold(distTrans, Fg, 0.01, 255, cv.THRESH_BINARY);
Fg.convertTo(Fg, cv.CV_8U, 1, 0);
cv.subtract(Bg, Fg, unknown);
// get connected components markers
cv.connectedComponents(Fg, markers);
for (let i = 0; i < markers.rows; i++) {
    for (let j = 0; j < markers.cols; j++) {
     markers.intPtr(i, j)[0] = markers.ucharPtr(i, j)[0] + 1;
        if (unknown.ucharPtr(i, j)[0] == 255) {
            markers.intPtr(i, j)[0] = 0;
        }
        }
}
cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
cv.watershed(src, markers);
// draw barriers
const matrix = (rows, cols) => new Array(cols).fill(0).map((o, i) => new Array(rows).fill(0))
//cv.imshow("canvasOutput",Bg)
//let mask=matrix(markers.rows,markers.cols);
let mask_array=[];

for (let i = 0; i < markers.rows; i++) {
    for (let j = 0; j < markers.cols; j++) {
                //mask[i][j]=0;
                
        if (markers.intPtr(i, j)[0] == -1) {
                //mask[i][j]=1;
                mask_array.push(1);
                src.ucharPtr(i, j)[0] = 255; // R
                src.ucharPtr(i, j)[1] = 0; // G
                src.ucharPtr(i, j)[2] = 0; // B
            }
            else{
              mask_array.push(0);
            }
        }
    }

    //use mask array to mask a DICOM image 
src.delete(); dst.delete(); gray.delete(); opening.delete(); Bg.delete();
Fg.delete(); distTrans.delete(); unknown.delete(); markers.delete(); M.delete();
//pixel_array = imageObject.metadata.x7fe00010;
this.Mask_Array=mask_array;

  }

 Applymask_onDICOM(
    Mask_Array,
    dicomPixelData,DICOMimage,minThreshold,maxThreshold
  ){

  let array=new Array(dicomPixelData.length)
  for(let i=0;i<dicomPixelData.length;i++)
  {
    if(Mask_Array[i]===0)
    {array[i * 4]=dicomPixelData[i]
      array[i * 4+1]=dicomPixelData[i]
      array[i * 4+2]=dicomPixelData[i]
      array[i * 4+3]=255
    }
    else if(Mask_Array[i]===1)
    {
      array[i*4]=maxThreshold;
      array[i * 4+1]=0
      array[i * 4+2]=0
      array[i * 4+3]=1
    }
  }
  console.log(array)
  let modifiedImage = {
    imageId: DICOMimage.imageId, // Keep the same imageId
    minPixelValue:minThreshold,
    maxPixelValue: maxThreshold,
    slope: DICOMimage.slope,
    intercept: DICOMimage.intercept,
    windowCenter: DICOMimage.windowCenter,
    windowWidth: DICOMimage.windowWidth,
    getPixelData: () => array,
    rows: DICOMimage.rows,
    columns: DICOMimage.columns,
    height: DICOMimage.height,
    width: DICOMimage.width,
    color: true,
    columnPixelSpacing: DICOMimage.columnPixelSpacing,
    rowPixelSpacing: DICOMimage.rowPixelSpacing,
  };
  

  let element_new = document.getElementById('canvasOutput');
  larvitar.cornerstone.displayImage(element_new, modifiedImage);

  //larvitar.addDefaultTools();
  }

  createNewMeasurement(eventData) {

    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;

    if (!goodEventData) {
      logger.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );

      return;
    }
    
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
    element.addEventListener('mouseup', this.handleMouseUp);
    this.eventData=eventData;
    this.element=element
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
          this.datahandles=data.handles;
          this.data=data;
        }

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


