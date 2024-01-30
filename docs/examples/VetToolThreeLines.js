/*const cornerstoneTools = larvitar.cornerstoneTools;
const cornerstone = larvitar.cornerstone;
const external = cornerstoneTools.external;
// State
const getToolState = cornerstoneTools.getToolState; //check
const toolStyle = cornerstoneTools.toolStyle;
const toolColors = cornerstoneTools.toolColors;
// Drawing
const EVENTS = cornerstoneTools.EVENTS;
const draw = cornerstoneTools.importInternal("drawing/draw");
const drawLine = cornerstoneTools.importInternal("drawing/drawLine");
const setShadow = cornerstoneTools.importInternal("drawing/setShadow");
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const drawLinkedTextBox = cornerstoneTools.importInternal(
  "drawing/drawLinkedTextBox"
);
const drawHandles = cornerstoneTools.importInternal("drawing/drawHandles");
const { lengthCursor } = cornerstoneTools.importInternal("tools/cursors");
const getLogger = cornerstoneTools.importInternal("util/getLogger");
const throttle = cornerstoneTools.importInternal("util/throttle");
const getModule = cornerstoneTools.getModule;
const getPixelSpacing = cornerstoneTools.importInternal("util/getPixelSpacing");
const lineSegDistance = cornerstoneTools.importInternal("util/lineSegDistance");
const BaseAnnotationTool = cornerstoneTools.importInternal(
  "base/BaseAnnotationTool"
);*/
// import cornerstoneTools from "cornerstone-tools";

class VetToolThreeLines extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: "HorizontalTool",
      supportedInteractionTypes: ["Mouse"],
      svgCursor: lengthCursor,
      configuration: {
        drawHandles: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        renderDashed: false,
        digits: 2,
        offset: 15
      }
    };

    super(props, defaultProps);
    this.eventData;
    this.datahandles;
    this.abovehandles;
    this.belowhandles;
    this.color;
    this.measureonload;
    this.belowcolor;
    this.abovecolor;
    this.plotlydata = [];
    this.measuring = false;
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
  }

  getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  handleMouseUp = event => {
    this.measuring = false;
    const eventData = this.eventData;

    const handleData = handles => {
      const points = this.getPointsAlongLine(
        handles.start,
        handles.end,
        getPixelSpacing(eventData.image).colPixelSpacing
      );
      const pixelValues = this.getPixelValuesAlongLine(
        handles.start,
        points,
        getPixelSpacing(eventData.image).colPixelSpacing,
        eventData
      );
      let color = "red";
      return { points, pixelValues, color };
    };
    const aboveResults = handleData(this.abovehandles);
    aboveResults.color = "green";
    const belowResults = handleData(this.belowhandles);
    belowResults.color = "blue";
    const data = [handleData(this.datahandles), aboveResults, belowResults];

    this.createPlot(...data);
  };

  createNewMeasurement(eventData) {
    this.eventData = eventData;
    clearToolData(eventData.element, this.name);
    this.measuring = true;
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;

    if (!goodEventData) {
      logger.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );
      return;
    }
    let color = "red";
    this.color = color;
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
          active: false
        },
        end: {
          x,
          y,
          highlight: true,
          active: true
        },
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

    const dx =
      (data.handles.end.x - data.handles.start.x) * (colPixelSpacing || 1);
    const dy =
      (data.handles.end.y - data.handles.start.y) * (rowPixelSpacing || 1);

    const length = Math.sqrt(dx * dx + dy * dy);

    data.length = length;
    data.invalidated = false;
  }

  renderToolData(evt) {
    const eventData = evt.detail;
    const { element } = eventData;
    element.addEventListener("mouseup", this.handleMouseUp);
    const {
      handleRadius,
      drawHandlesOnHover,
      hideHandlesIfMoving,
      renderDashed
    } = this.configuration;
    const toolData = getToolState(evt.currentTarget, this.name);

    if (!toolData) {
      return;
    }

    const context = getNewContext(eventData.canvasContext.canvas);

    const lineDash = getModule("globalConfiguration").configuration.lineDash;
    let start;
    let end;

    for (let i = 0; i < toolData.data.length; i++) {
      const data = toolData.data[i];

      if (data.visible === false) {
        continue;
      }

      draw(context, context => {
        setShadow(context, this.configuration);

        const color = toolColors.getColorIfActive(data);

        const lineOptions = { color };

        if (renderDashed) {
          lineOptions.lineDash = lineDash;
        }
        start = data.handles.start;
        end = data.handles.end;
        data.handles.end.y = data.handles.start.y;
        drawLine(
          context,
          element,
          data.handles.start,
          data.handles.end,
          lineOptions
        );

        const offset = this.configuration.offset;

        const aboveHandles = {
          start: { x: start.x, y: start.y - offset },
          end: { x: end.x, y: end.y - offset }
        };

        const belowHandles = {
          start: { x: start.x, y: start.y + offset },
          end: { x: end.x, y: end.y + offset }
        };

        const abovelineOptions = { color: "green" };
        const belowlineOptions = { color: "blue" };
        drawLine(
          context,
          element,
          aboveHandles.start,
          aboveHandles.end,
          abovelineOptions
        );
        drawLine(
          context,
          element,
          belowHandles.start,
          belowHandles.end,
          belowlineOptions
        );

        const handleOptions = {
          color,
          handleRadius,
          drawHandlesIfActive: drawHandlesOnHover,
          hideHandlesIfMoving
        };
        const abovehandleOptions = {
          color: abovelineOptions.color,
          handleRadius,
          drawHandlesIfActive: drawHandlesOnHover,
          hideHandlesIfMoving
        };
        const belowhandleOptions = {
          color: belowlineOptions.color,
          handleRadius,
          drawHandlesIfActive: drawHandlesOnHover,
          hideHandlesIfMoving
        };

        if (this.configuration.drawHandles) {
          drawHandles(context, eventData, data.handles, handleOptions);
          this.datahandles = data.handles;
          this.abovehandles = aboveHandles;
          this.belowhandles = belowHandles;
          drawHandles(context, eventData, aboveHandles, abovehandleOptions);
          drawHandles(context, eventData, belowHandles, belowhandleOptions);
        }
      });
    }
  }

  getPointsAlongLine(startHandle, endHandle, colPixelSpacing) {
    let points;
    const addPoints = (start, end, step) => {
      const startX = Math.floor(start.x) + 1;
      const numPoints = Math.floor(end.x) - startX;
      points = new Array(numPoints + 1);
      for (let i = 0; i <= numPoints; i++) {
        points[i] = (startX + i) * step;
      }
    };

    if (endHandle.x > startHandle.x) {
      addPoints(startHandle, endHandle, colPixelSpacing);
    }

    if (endHandle.x < startHandle.x) {
      addPoints(endHandle, startHandle, colPixelSpacing);
    }

    return points;
  }

  getPixelValuesAlongLine(startHandle, points, colPixelSpacing, eventData) {
    const pixelValues = new Array(points.length);
    const yPoint = Math.floor(startHandle.y);

    const addPixelValues = (xPoints, startIndex) => {
      const pixelValuesBatch = cornerstone.getStoredPixels(
        eventData.element,
        xPoints,
        yPoint,
        xPoints.length,
        1
      );

      for (let i = 0; i < pixelValuesBatch.length; i++) {
        pixelValues[startIndex + i] = pixelValuesBatch[i];
      }
    };

    for (let i = 0; i < points.length; i++) {
      const xPoint = Math.floor(points[i] / colPixelSpacing);
      addPixelValues([xPoint], i);
    }

    return pixelValues;
  }

  createPlot(...dataSets) {
    const traces = dataSets.map(({ points, pixelValues, color }) => ({
      x: points,
      y: pixelValues,
      type: "lines",
      line: {
        color
      }
    }));

    this.plotlydata = traces;

    const allXValues = dataSets.flatMap(dataSet => dataSet.points);
    const allYValues = dataSets.flatMap(dataSet => dataSet.pixelValues);

    const layout = {
      xaxis: {
        range: [Math.min(...allXValues), Math.max(...allXValues)],
        title: "position (mm)"
      },
      yaxis: {
        range: [Math.min(...allYValues), Math.max(...allYValues)],
        title: "GreyScaleValue (HU)"
      },
      title: "GreyScaleValues vs position",
      responsive: true
    };

    const myPlotDiv = document.getElementById("myPlot");
    Plotly.newPlot(myPlotDiv, traces, layout);
  }

  clearPlotlyData() {
    const myPlotDiv = document.getElementById("myPlot");
    Plotly.purge(myPlotDiv);
    this.plotlydata = [];
  }
}

function clearToolData(element, toolName) {
  const toolData = getToolState(element, toolName);

  if (toolData && toolData.data && toolData.data.length > 0) {
    toolData.data.forEach(data => {
      data.visible = false;
    });
  }
}
