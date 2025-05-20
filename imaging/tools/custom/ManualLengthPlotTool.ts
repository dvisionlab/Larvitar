//external imports
import Plotly from "plotly.js-dist-min";
import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
const getToolState = cornerstoneTools.getToolState; //check
const toolColors = cornerstoneTools.toolColors;
const draw = cornerstoneTools.importInternal("drawing/draw");
const drawLine = cornerstoneTools.importInternal("drawing/drawLine");
const setShadow = cornerstoneTools.importInternal("drawing/setShadow");
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const drawHandles = cornerstoneTools.importInternal("drawing/drawHandles");
const { lengthCursor } = cornerstoneTools.importInternal("tools/cursors");
const throttle = cornerstoneTools.importInternal("util/throttle");
const getModule = cornerstoneTools.getModule;
const getPixelSpacing = cornerstoneTools.importInternal("util/getPixelSpacing");
const lineSegDistance = cornerstoneTools.importInternal("util/lineSegDistance");
const BaseAnnotationTool = cornerstoneTools.importInternal(
  "base/BaseAnnotationTool"
);

//internal imports
import { logger } from "../../../common/logger";
import { HandlePosition } from "../../../common/types";

//interfaces/types
type PixelSpacing = {
  rowPixelSpacing: number;
  colPixelSpacing: number;
};
type ToolData = {
  data: data[];
};
type data = {
  visible: boolean;
  active: boolean;
  color: string;
  invalidated: boolean;
  handles: Handles;
  length: number;
  uuid: string;
};
type Handles = {
  start: HandlePosition;
  end: HandlePosition;
  textBox?: {
    active: boolean;
    hasMoved: boolean;
    movesIndependently: boolean;
    drawnIndependently: boolean;
    allowedOutsideImage: boolean;
    hasBoundingBox: boolean;
  };
};
type ToolMouseEvent = {
  detail: EventData;
  currentTarget: any;
};
type EventData = {
  currentPoints: {
    image: { x: number; y: number };
  };
  element: HTMLElement;
  buttons: number;
  shiftKey: boolean;
  event: {
    altKey: boolean;
    shiftKey: boolean;
  };
  image: cornerstone.Image;
  canvasContext: {
    canvas: any;
  };
};
type PlotlyData = {
  x: number[];
  y: number[];
  type: string;
  line: {
    color: string;
  };
};
/**
 * @public
 * @class LengthTool
 * @memberof Tools.Annotation
 * @classdesc Tool for measuring distances.
 * @extends Tools.Base.BaseAnnotationTool
 */
export default class ManualLengthPlotTool extends BaseAnnotationTool {
  name: string = "ManualLengthPlot";
  eventData?: EventData;
  datahandles?: Handles;
  plotlydata: Array<PlotlyData> = [];
  measuring = false;
  throttledUpdateCachedStats: any;
  lineNumber: number | null = null;
  greenlineY: number | null = null;
  newMeasurement: boolean = false;
  configuration: {
    drawHandles: boolean;
    drawHandlesOnHover: boolean;
    hideHandlesIfMoving: boolean;
    renderDashed: boolean;
    digits: number;
    handleRadius?: number;
  } = {
    drawHandles: true,
    drawHandlesOnHover: false,
    hideHandlesIfMoving: false,
    renderDashed: false,
    digits: 2
  };
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
        digits: 2
      }
    };

    super(props, defaultProps);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    // Add event listeners to start and stop measurements
    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
  }
  getColor(y: number) {
    let color: string = "red";

    if (this.lineNumber === null || this.lineNumber === 3) {
      color = "green";
      this.greenlineY = y;
      this.lineNumber = 1;
    } else if (y > this.greenlineY!) {
      color = this.color === "blue" ? "red" : "blue";
      this.lineNumber = this.lineNumber + 1;
    } else if (y < this.greenlineY!) {
      color = this.color === "red" ? "blue" : "red";
      this.lineNumber = this.lineNumber + 1;
    }
    return color;
  }

  handleMouseUp = () => {
    const eventData = this.eventData;
    const { element } = eventData!;
    //const toolData: ToolData = getToolState(element, this.name);

    const points = this.getPointsAlongLine(
      this.datahandles!.start,
      this.datahandles!.end,
      getPixelSpacing(eventData!.image).colPixelSpacing
    );
    const pixelValues = this.getPixelValuesAlongLine(
      this.datahandles!.start,
      points,
      getPixelSpacing(eventData!.image).colPixelSpacing,
      eventData!
    );

    // Plot the graph using the extracted points and pixel values
    this.createPlot(points, pixelValues);
  };
  clearCanvasAndPlot(eventData: EventData) {
    // Clear the canvas
    const { element } = eventData;
    const toolData: ToolData = getToolState(element, this.name);

    if (toolData && toolData.data && toolData.data.length > 0) {
      toolData.data.forEach((data: data) => {
        data.visible = false;
      });
    }
    // Clear the Plotly plot
    const myPlotDiv = document.getElementById("myPlot");
    Plotly.purge(myPlotDiv as Plotly.Root);
    this.plotlydata = [];
  }
  createNewMeasurement(eventData: EventData) {
    this.newMeasurement = true;
    if (this.lineNumber === 3) {
      this.clearCanvasAndPlot(eventData);
    }
    eventData.element.addEventListener("mouseup", () => this.handleMouseUp());
    this.eventData = eventData;
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;

    if (!goodEventData) {
      logger.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );

      return;
    }
    const { x, y } = eventData.currentPoints.image;
    let color = this.getColor(y);
    this.color = color;

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

  /**
   *
   *
   * @param {*} element
   * @param {*} data
   * @param {*} coords
   * @returns {Boolean}
   */
  pointNearTool(
    element: HTMLElement,
    data: data,
    coords: { x: number; y: number }
  ) {
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

  updateCachedStats(
    image: cornerstone.Image,
    element: HTMLElement,
    data: data
  ) {
    const { rowPixelSpacing, colPixelSpacing }: PixelSpacing =
      getPixelSpacing(image);

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

  renderToolData(evt: ToolMouseEvent) {
    const eventData = evt.detail;
    const { image, element } = eventData;
    const {
      handleRadius,
      drawHandlesOnHover,
      hideHandlesIfMoving,
      renderDashed
    } = this.configuration;
    const toolData: ToolData = getToolState(evt.currentTarget, this.name);

    if (!toolData) {
      return;
    }

    // We have tool data for this element - iterate over each one and draw it
    const context: CanvasRenderingContext2D = getNewContext(
      eventData.canvasContext.canvas
    );

    const lineDash: boolean = getModule("globalConfiguration").configuration
      .lineDash;
    let start;
    let end;

    for (let i = 0; i < toolData.data.length; i++) {
      const data = toolData.data[i];

      if (data.visible === false) {
        continue;
      }

      draw(context, (context: CanvasRenderingContext2D) => {
        // Configurable shadow
        setShadow(context, this.configuration);

        const color = toolColors.getColorIfActive(data);
        if (data.active) {
          this.color = color;
          this.datahandles = data.handles;
        }
        const lineOptions: { color: string; lineDash?: boolean } = { color };

        if (renderDashed) {
          lineOptions.lineDash = lineDash;
        }
        start = data.handles.start;
        end = data.handles.end;
        data.handles.end.y = data.handles.start.y;
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
          hideHandlesIfMoving
        };

        if (this.configuration.drawHandles) {
          drawHandles(context, eventData, data.handles, handleOptions);
        }

        this.currentuuid = data.uuid;
        // Update textbox stats
        if (data.invalidated === true) {
          if (data.length) {
            this.throttledUpdateCachedStats(image, element, data);
          } else {
            this.updateCachedStats(image, element, data);
          }
        }
      });
    }
  }

  getPointsAlongLine(
    startHandle: HandlePosition,
    endHandle: HandlePosition,
    colPixelSpacing: number
  ) {
    const points: number[] = [];
    const numPoints = Math.floor(endHandle.x) - Math.floor(startHandle.x);
    let x = Math.floor(startHandle.x) + 1;
    points.push(x * colPixelSpacing);
    for (let i = 0; i < numPoints; i++) {
      x = x + 1;
      points.push(x * colPixelSpacing); //from pixels to mm
    }
    return points;
  }

  getPixelValuesAlongLine(
    startHandle: HandlePosition,
    points: number[],
    colPixelSpacing: number,
    eventData: EventData
  ) {
    const pixelValues: number[] = [];
    const yPoint = Math.floor(startHandle.y); // Adjust this if needed
    for (let i = 0; i < points.length; i++) {
      const xPoint = Math.floor(points[i] / colPixelSpacing);
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
  createPlot(points: number[], pixelValues: number[]) {
    // Create a new trace for each measurement
    const trace = {
      x: points,
      y: pixelValues,
      type: "lines",
      line: {
        color: this.color
      }
    };

    // Add the trace to the existing data array
    if (this.newMeasurement) {
      this.plotlydata.push(trace);
    } else {
      const indexOfExistentData = this.plotlydata.findIndex(
        obj => obj.line.color === this.color
      );
      this.plotlydata[indexOfExistentData] = trace;
    }
    const data = [...this.plotlydata];
    // Combine all traces into a single data array

    // Adjust the axis range based on all data
    const allXValues = data.flatMap(trace => trace.x);
    const allYValues = data.flatMap(trace => trace.y);

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

    // Display using Plotly
    const myPlotDiv = document.getElementById("myPlot");
    Plotly.react(myPlotDiv as Plotly.Root, data as Plotly.Data[], layout);
    this.newMeasurement = false;
  }
}
