const cornerstoneTools = larvitar.cornerstoneTools;
const cornerstone = larvitar.cornerstone;
const external = cornerstoneTools.external;
// State
const getToolState = cornerstoneTools.getToolState;//check
const toolStyle = cornerstoneTools.toolStyle;
const toolColors = cornerstoneTools.toolColors;
// Drawing
const EVENTS = cornerstoneTools.EVENTS;
const draw = cornerstoneTools.importInternal("drawing/draw");
const drawLine=cornerstoneTools.importInternal("drawing/drawLine");
const setShadow=cornerstoneTools.importInternal("drawing/setShadow");
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const drawLinkedTextBox = cornerstoneTools.importInternal("drawing/drawLinkedTextBox");
const drawHandles = cornerstoneTools.importInternal("drawing/drawHandles");
const { lengthCursor } = cornerstoneTools.importInternal("tools/cursors");
const getLogger = cornerstoneTools.importInternal("util/getLogger");
const throttle = cornerstoneTools.importInternal("util/throttle");
const getModule = cornerstoneTools.getModule;
const getPixelSpacing = cornerstoneTools.importInternal("util/getPixelSpacing");
const lineSegDistance =cornerstoneTools.importInternal("util/lineSegDistance");
const BaseAnnotationTool=cornerstoneTools.importInternal("base/BaseAnnotationTool");
// import cornerstoneTools from "cornerstone-tools";

/**
 * @public
 * @class LengthTool
 * @memberof Tools.Annotation
 * @classdesc Tool for measuring distances.
 * @extends Tools.Base.BaseAnnotationTool
 */
class VetTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'HorizontalTool',
      supportedInteractionTypes: ['Mouse'],
      svgCursor: lengthCursor,
      configuration: {
        drawHandles: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        renderDashed: false,
        digits: 2,
      },
    };

    super(props, defaultProps);
    this.eventData;
    this.datahandles;
    this.color;
    this.measuring = false; // New variable to track measurement state
    this.handleMouseUp = this.handleMouseUp.bind(this);
    // Add event listeners to start and stop measurements
    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
  }
  getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  
  handleMouseUp= (event) => {
    console.log("stop");
    this.measuring = false;
    const eventData = this.eventData;
  
    const points = this.getPointsAlongLine(this.datahandles.start,
      this.datahandles.end,
      getPixelSpacing(eventData.image).colPixelSpacing
    );
  console.log(points);
    const pixelValues = this.getPixelValuesAlongLine(
      this.datahandles.start,
      points,
      getPixelSpacing(eventData.image).colPixelSpacing, 
      eventData
    );
  
    // Plot the graph using the extracted points and pixel values
    this.createPlot(points, pixelValues);
  }

  createNewMeasurement(eventData) {
this.eventData=eventData;
    console.log("start");
    this.measuring = true;
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;

    if (!goodEventData) {
      logger.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );

      return;
    }
    let color=this.getRandomColor();
    this.color=color;
    const { x, y } = eventData.currentPoints.image;

    return {
      visible: true,
      active: true,
      color: color,
      invalidated: true,
      handles: {
        start: {
          x,
          y,
          highlight: true,
          active: false,
        },
        end: {
          x,
          y,
          highlight: true,
          active: true,
        },
        textBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true,
        },
      },
    };
  }

  /**
   *
   *
   * @param {*} element
   * @param {*} data
   * @param {*} coords
   * @returns {Boolean}
   */
  pointNearTool(element, data, coords) {
    const hasStartAndEndHandles =
      data && data.handles && data.handles.start && data.handles.end;
    const validParameters = hasStartAndEndHandles;

    if (!validParameters) {
      logger.warn(
        `invalid parameters supplied to tool ${this.name}'s pointNearTool`
      );

      return false;
    }

    if (data.visible === false) {
      return false;
    }

    return (
      lineSegDistance(element, data.handles.start, data.handles.end, coords) <
      25
    );
  }

  updateCachedStats(image, element, data) {
    const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);

    // Set rowPixelSpacing and columnPixelSpacing to 1 if they are undefined (or zero)
    const dx =
      (data.handles.end.x - data.handles.start.x) * (colPixelSpacing || 1);
    const dy =
      (data.handles.end.y - data.handles.start.y) * (rowPixelSpacing || 1);

    // Calculate the length, and create the text variable with the millimeters or pixels suffix
    const length = Math.sqrt(dx * dx + dy * dy);

    // Store the length inside the tool for outside access
    data.length = length;
    data.invalidated = false;
  }

  renderToolData(evt) {
    const eventData = evt.detail;
    const { image, element } = eventData;
    element.addEventListener('mouseup', this.handleMouseUp);
    const {
      handleRadius,
      drawHandlesOnHover,
      hideHandlesIfMoving,
      renderDashed,
      digits,
    } = this.configuration;
    const toolData = getToolState(evt.currentTarget, this.name);

    if (!toolData) {
      return;
    }

    // We have tool data for this element - iterate over each one and draw it
    const context = getNewContext(eventData.canvasContext.canvas);
    
    const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);

    const lineWidth = toolStyle.getToolWidth();
    const lineDash = getModule('globalConfiguration').configuration.lineDash;
    let data = toolData.data;
    let start;
    let end;

    for (let i = 0; i < toolData.data.length; i++) {
      const data = toolData.data[i];

      if (data.visible === false) {
        continue;
      }

      draw(context, context => {
        console.log("drawing");
        // Configurable shadow
        setShadow(context, this.configuration);

        const color = toolColors.getColorIfActive(data);

        const lineOptions = { color };

        if (renderDashed) {
          lineOptions.lineDash = lineDash;
        }
        start=data.handles.start;
        end=data.handles.end;
        data.handles.end.y=data.handles.start.y;
        // Draw the measurement line
        drawLine(
          context,
          element,
          data.handles.start,
          data.handles.end,
          lineOptions
        );

        // Draw the handles
        const handleOptions = {
          color,
          handleRadius,
          drawHandlesIfActive: drawHandlesOnHover,
          hideHandlesIfMoving,
        };

        if (this.configuration.drawHandles) {
          drawHandles(context, eventData, data.handles, handleOptions);
          this.datahandles=data.handles;
        }

        if (!data.handles.textBox.hasMoved) {
          const coords = {
            x: Math.max(data.handles.start.x, data.handles.end.x),
            y: data.handles.start.y
          };
          data.handles.textBox.x = coords.x;
          data.handles.textBox.y = coords.y;
        }

        // Move the textbox slightly to the right and upwards
        // So that it sits beside the length tool handle
        const xOffset = 10;

        // Update textbox stats
        if (data.invalidated === true) {
          if (data.length) {
            this.throttledUpdateCachedStats(image, element, data);
          } else {
            this.updateCachedStats(image, element, data);
          }
        }

        const text = textBoxText(data, rowPixelSpacing, colPixelSpacing);

        drawLinkedTextBox(
          context,
          element,
          data.handles.textBox,
          text,
          data.handles,
          textBoxAnchorPoints,
          color,
          lineWidth,
          xOffset,
          true
        );
        
      });
    }
    
    // - SideEffect: Updates annotation 'suffix'
    function textBoxText(annotation, rowPixelSpacing, colPixelSpacing) {
      const measuredValue = _sanitizeMeasuredValue(annotation.length);

      // Measured value is not defined, return empty string
      if (!measuredValue) {
        return '';
      }

      // Set the length text suffix depending on whether or not pixelSpacing is available
      let suffix = 'mm';

      if (!rowPixelSpacing || !colPixelSpacing) {
        suffix = 'pixels';
      }

      annotation.unit = suffix;

      return `${measuredValue.toFixed(digits)} ${suffix}`;
    }

    function textBoxAnchorPoints(handles) {
      const midpoint = {
        x: (handles.start.x + handles.end.x) / 2,
        y: (handles.start.y + handles.end.y) / 2,
      };

      return [handles.start, midpoint, handles.end];
    }    

  }

  getPointsAlongLine(startHandle, endHandle,colPixelSpacing) {
    const points = [];
    
    if(endHandle.x>startHandle.x)
    {
    const numPoints = (Math.floor(endHandle.x) - Math.floor(startHandle.x));
    let x = Math.floor(startHandle.x) + 1;
    points.push(x*colPixelSpacing);
    for (let i = 0; i < numPoints; i++) {
      x = x + 1;
      points.push(x*colPixelSpacing); //from pixels to mm
    }
  }
  if (endHandle.x<startHandle.x)
  {
    const numPoints = (Math.floor(startHandle.x) - Math.floor(endHandle.x));
    let x = Math.floor(endHandle.x) + 1;
    points.push(x*colPixelSpacing);
    for (let i = 0; i < numPoints; i++) {
      x = x + 1;
      points.push(x*colPixelSpacing); //from pixels to mm
    }
  }
    return points;
  }


  getPixelValuesAlongLine(startHandle, points, colPixelSpacing,eventData) {
    const pixelValues = [];
    const yPoint = Math.floor(startHandle.y); // Adjust this if needed
    console.log(points);
    for (let i = 0; i < points.length; i++) {
      const xPoint=Math.floor(points[i] / colPixelSpacing); 
      const pixelValue = cornerstone.getStoredPixels(
        eventData.element,
        xPoint,
        yPoint,
        1,
        1
      )[0];
      // Use cornerstone to get pixel value at the specified location
      //const pixelValue = cornerstone.getPixelValue(image, xPoint, yPoint);
  
      pixelValues.push(pixelValue);
    }
  
    return pixelValues;
  }
  createPlot(points,pixelValues){
    console.log("plot")
    const xValues = points
    console.log(xValues)

    const firstpixel = Math.min(...xValues);
console.log(firstpixel);

const lastpixel = Math.max(...xValues);
console.log(lastpixel);
    const yValues =  pixelValues;//pixelValues;
    const minGV=Math.min.apply(null, yValues);
    const maxGV= Math.max.apply(null, yValues);
    const data = [{
      x: xValues,
      y: yValues,
      mode:"scatter",
      line: {
        color: this.color,
      },
    }];
    
    // Define Layout
    const layout = {
      xaxis: {range: [firstpixel, lastpixel], title: "position (mm)"},
      yaxis: {range: [minGV, maxGV], title: "GreyScaleValue (HU)"},  
      title: "GreyScaleValues vs position",
      responsive: true,
      type : 'log'
      //plot_bgcolor : "black"
    };
    
    // Display using Plotly
    const myPlotDiv = document.getElementById('myPlot');
    Plotly.newPlot(myPlotDiv, data, layout);
    console.log("Data:", data);
    console.log("Layout:", layout);
    console.log(myPlotDiv);
}
}

/**
 * Attempts to sanitize a value by casting as a number; if unable to cast,
 * we return `undefined`
 *
 * @param {*} value
 * @returns a number or undefined
 */
function _sanitizeMeasuredValue(value) {
  const parsedValue = Number(value);
  const isNumber = !isNaN(parsedValue);

  return isNumber ? parsedValue : undefined;
}