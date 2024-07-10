//external imports
import Plotly from "plotly.js-dist-min";
import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
const getToolState = cornerstoneTools.getToolState;
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
import { HandlePosition } from "../types";

//interfaces/types

type dataSets = { points: number[]; pixelValues: number[]; color: string }[];
type PixelSpacing = {
  rowPixelSpacing: number;
  colPixelSpacing: number;
};
interface data {
  visible: boolean;
  active: boolean;
  color: string;
  invalidated: boolean;
  handles: Handles;
  length: number;
}
interface Handles {
  start: HandlePosition;
  end: HandlePosition;
  offset: number;
  fixedoffset: number;
  color: string;
  textBox?: {
    active: boolean;
    hasMoved: boolean;
    movesIndependently: boolean;
    drawnIndependently: boolean;
    allowedOutsideImage: boolean;
    hasBoundingBox: boolean;
  };
}
interface ToolMouseEvent {
  detail: EventData;
  currentTarget: any;
}
interface Coords {
  x: number;
  y: number;
}
interface EventData {
  currentPoints: {
    image: Coords;
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
}

//plots represent horizontal lines seen from left to right always
//to maintain this view, vertical lines are seen from south to north with angles between [-90;90]
//and from north to south with angles between [90;270]
interface PlotlyData {
  x: number[];
  y: number[];
  type: string;
  line: {
    color: string;
  };
}

/*
 * This module provides the following Tools to be exported:
 * LengthPlotTool
 */

/**
 * @public
 * @class LengthPlotTool
 * @memberof cornerstoneTools
 * @classdesc Tool for tracing 3 lines with a configurable offset
 * and draw the plot of greyscale values along the lines
 * @extends cornerstoneTools.Base.BaseTool
 */
export default class LengthPlotTool extends BaseAnnotationTool {
  name: string = "LengthPlot";
  eventData?: EventData;
  datahandles?: Handles | null;
  abovehandles?: Handles | null;
  belowhandles?: Handles | null;
  plotlydata: Array<PlotlyData> = [];
  measuring = false;
  throttledUpdateCachedStats: any;
  configuration: {
    drawHandles: boolean;
    drawHandlesOnHover: boolean;
    hideHandlesIfMoving: boolean;
    renderDashed: boolean;
    digits: number;
    handleRadius?: number;
    offset: number;
  } = {
    drawHandles: true,
    drawHandlesOnHover: false,
    hideHandlesIfMoving: false,
    renderDashed: false,
    digits: 2,
    offset: 0
  };
  constructor(props = {}) {
    const defaultProps = {
      name: "LengthPlot",
      supportedInteractionTypes: ["Mouse"],
      svgCursor: lengthCursor,
      configuration: {
        drawHandles: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        renderDashed: false,
        digits: 2,
        offset: 0
      }
    };

    super(props, defaultProps);
    this.eventData;
    this.datahandles = null;
    this.click = 0;
    this.abovehandles = null;
    this.belowhandles = null;
    this.borderRight;
    this.borderLeft = 0;
    this.evt;
    this.context;
    this.wheelactive = false;
    this.currentTarget = null;
    this.fixedOffset = 0;
    this.theta = null;
    this.plotlydata = [];
    this.measuring = false;
    this.setupPlot = this.setupPlot.bind(this);
    this.changeOffset = this.changeOffset.bind(this);
    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
  }

  //internal class functions

  /**
   * handles Mouse Up listener (to create the final plot)
   * @method
   * @name setupPlot
   * @returns {void}
   */
  setupPlot() {
    const toolData: { data: data[] } = getToolState(
      this.currentTarget,
      this.name
    );
    if (this.measuring === true) {
      toolData.data[toolData.data.length - 1].handles.fixedoffset =
        toolData.data[toolData.data.length - 1].handles.offset;
    }
    this.click = +1;
    this.measuring =
      this.datahandles?.end.x === this.datahandles?.start.x &&
      this.datahandles?.end.y === this.datahandles?.start.y &&
      this.click === 1
        ? true
        : false;

    const eventData = this.eventData;
    if (this.measuring === false) {
      this.theta = Math.atan2(
        this.datahandles!.end.y - this.datahandles!.start.y,
        this.datahandles!.end.x - this.datahandles!.start.x
      );

      const handleData = (handles: Handles) => {
        const pointsCoords = this.getPointsAlongLine(
          handles.start,
          handles.end,
          getPixelSpacing(eventData!.image).colPixelSpacing
        );
        const points: number[] = []; // Array to store distances

        // Calculate distance for each point
        pointsCoords.forEach(point => {
          const distance = Math.sqrt(
            (point.x - handles.start.x) * (point.x - handles.start.x) +
              (this.image.height - (point.y - this.image.height)) *
                (this.image.height - (point.y - this.image.height))
          );
          points.push(distance);
        });

        const pixelValues = this.getPixelValuesAlongLine(
          handles.start,
          pointsCoords,
          getPixelSpacing(eventData!.image).colPixelSpacing,
          eventData!
        );
        let color = "green";
        return { points, pixelValues, color };
      };
      const result = handleData(this.datahandles!);
      const aboveResults = handleData(this.abovehandles!);
      aboveResults.color = this.abovehandles!.color;
      aboveResults.points = result.points;
      const belowResults = handleData(this.belowhandles!);
      belowResults.color = this.belowhandles!.color;
      belowResults.points = result.points;
      const data = [result, aboveResults, belowResults];

      this.createPlot(eventData!.element.id, ...data);
    }
  }

  /**
   * allows to change the offset between the three lines
   * @method
   * @name changeOffset
   * @param {WheelEvent} evt
   * @returns {void}
   */
  changeOffset(evt: WheelEvent) {
    const toolData: { data: data[] } = getToolState(
      this.currentTarget,
      this.name
    );
    if (toolData) {
      const index = toolData.data.findIndex(obj => obj.active === true);
      const indexTracing = toolData.data.findIndex(
        obj => obj.handles.end.moving === true
      );
      if (
        (toolData.data.length != 0 &&
          index != undefined &&
          index != -1 &&
          toolData.data[index] != undefined &&
          evt.buttons === 1) ||
        (indexTracing != undefined &&
          indexTracing != -1 &&
          toolData.data[index] != undefined)
      ) {
        const { deltaY } = evt;

        toolData.data[index].handles.offset += deltaY > 0 ? 1 : -1;
        evt.preventDefault();
        this.renderToolData(evt);

        cornerstone.updateImage(this.eventData!.element);
      }
    }
  }

  /**
   * Creates new measurement on click
   * @method
   * @name createNewMeasurement
   * @param {EventData} eventData
   * @returns {void}
   */
  createNewMeasurement(eventData: EventData) {
    this.eventData = eventData;
    clearToolData(eventData.element, this.name);
    if (this.datahandles) {
      eventData.element.removeEventListener("wheel", evt =>
        this.changeOffset(evt)
      );
    }
    if (this.datahandles != null) {
      this.datahandles = null;
      this.abovehandles = null;
      this.belowhandles = null;
      this.theta = null;
    }
    eventData.element.addEventListener("wheel", evt => this.changeOffset(evt));

    this.measuring = true;
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;
    this.image = eventData.image;

    if (!goodEventData) {
      console.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );
      return;
    }
    let color = "green";

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
        },
        offset: 0,
        fixedoffset: 0
      }
    };
  }

  /**
   * Identifies when the cursor is near the tool data
   * @method
   * @name pointNearTool
   * @param {HTMLElement} element
   * @param {data} data
   * @param {Coords} coords
   * @returns {boolean}
   */
  pointNearTool(element: HTMLElement, data: data, coords: Coords) {
    const hasStartAndEndHandles =
      data && data.handles && data.handles.start && data.handles.end;
    const validParameters = hasStartAndEndHandles;

    if (!validParameters) {
      console.warn(
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

  /**
   * Updates stats of line length
   * @method
   * @name updateCachedStats
   * @param {cornerstone.Image} image
   * @param {HTMLElement} element
   * @param {data} data
   * @returns {boolean}
   */
  updateCachedStats(
    image: cornerstone.Image,
    element: HTMLElement,
    data: data
  ) {
    const { rowPixelSpacing, colPixelSpacing }: PixelSpacing =
      getPixelSpacing(image);

    const dx =
      (data.handles.end.x - data.handles.start.x) * (colPixelSpacing || 1);
    const dy =
      (data.handles.end.y - data.handles.start.y) * (rowPixelSpacing || 1);

    const length = Math.sqrt(dx * dx + dy * dy);

    data.length = length;
    data.invalidated = false;
  }

  /**
   * Renders the data (new line/modified line)
   * @method
   * @name updateCachedStats
   * @param {ToolMouseEvent | WheelEvent} evt
   * @returns {void}
   */
  renderToolData(evt: ToolMouseEvent | WheelEvent) {
    if (evt.detail) {
      this.evt = evt;
      this.currentTarget = evt.currentTarget;
      this.wheelactive = false;
    } else {
      this.wheelactive = true;
    }

    if (this.evt) {
      const element = this.evt.detail.element;
      this.borderRight = this.evt.detail.image.width;

      const {
        handleRadius,
        drawHandlesOnHover,
        hideHandlesIfMoving,
        renderDashed
      } = this.configuration;

      const toolData: { data: data[] } = getToolState(
        this.currentTarget,
        this.name
      );
      if (!toolData) {
        if (this.eventData){
          const plotDiv = document.getElementById(`plot-${this.eventData.element.id}`);
          this.clearPlotlyData(plotDiv!)
        }
        return;
      }

      this.context = getNewContext(this.evt.detail.canvasContext.canvas);

      const lineDash: boolean = getModule("globalConfiguration").configuration
        .lineDash;
      let start: HandlePosition;
      let end: HandlePosition;

      for (let i = 0; i < toolData.data.length; i++) {
        const data = toolData.data[i];

        if (data.visible === false) {
          continue;
        }

        draw(this.context, (context: CanvasRenderingContext2D) => {
          setShadow(context, this.configuration);

          const color = toolColors.getColorIfActive(data);

          const lineOptions: {
            color: string;
            lineDash?: boolean;
            lineWidth: number;
          } = {
            color,
            lineWidth: 3
          };

          if (renderDashed) {
            lineOptions.lineDash = lineDash;
          }

          start = data.handles.start;
          end = data.handles.end;
          if (
            this.measuring === false &&
            this.wheelactive === true &&
            data.active === true
          ) {
            data.handles.fixedoffset = data.handles.offset;
          }
          data.handles.offset =
            (this.measuring === true && data.handles.end.moving === true) ||
            this.wheelactive === true
              ? data.handles.offset
              : data.handles.fixedoffset;
          //data.handles.end.y = data.handles.start.y;
          drawLine(
            context,
            element,
            data.handles.start,
            data.handles.end,
            lineOptions
          );
          let theta = Math.atan2(
            data.handles.end.y - data.handles.start.y,
            data.handles.end.x - data.handles.start.x
          );
          let abovelineOptions = { color: "red", lineWidth: 3 };
          let belowlineOptions = { color: "blue", lineWidth: 3 };
          if (data.handles.end.x - data.handles.start.x != 0) {
            this.theta = this.theta === null ? theta : this.theta;
            if (
              radiansToDegrees(this.theta) > 90 &&
              radiansToDegrees(this.theta) < 275
            ) {
              abovelineOptions.color = "blue";
              belowlineOptions.color = "red";
            }
          }

          const aboveHandles: Handles = {
            start: {
              x: start.x + data.handles.offset * Math.sin(theta),
              y: start.y - data.handles.offset * Math.cos(theta)
            },
            end: {
              x: end.x + data.handles.offset * Math.sin(theta),
              y: end.y - data.handles.offset * Math.cos(theta)
            },

            offset: data.handles.offset,
            fixedoffset: data.handles.fixedoffset,
            color: abovelineOptions.color
          };
          const belowHandles: Handles = {
            start: {
              x: start.x - data.handles.offset * Math.sin(theta),
              y: start.y + data.handles.offset * Math.cos(theta)
            },
            end: {
              x: end.x - data.handles.offset * Math.sin(theta),
              y: end.y + data.handles.offset * Math.cos(theta)
            },
            offset: data.handles.offset,
            fixedoffset: data.handles.fixedoffset,
            color: belowlineOptions.color
          };
          if (
            radiansToDegrees(this.theta) > 90 &&
            radiansToDegrees(this.theta) < 275
          ) {
            drawLine(
              context,
              element,
              belowHandles.start,
              belowHandles.end,
              belowlineOptions
            );
            drawLine(
              context,
              element,
              aboveHandles.start,
              aboveHandles.end,
              abovelineOptions
            );
          } else {
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
          }

          const handleOptions = {
            color,
            handleRadius: 6,
            drawHandlesIfActive: drawHandlesOnHover,
            hideHandlesIfMoving,
            fill: color
          };

          if (this.configuration.drawHandles) {
            drawHandles(context, this.evt.detail, data.handles, handleOptions);
            this.datahandles = data.handles;
            this.abovehandles = aboveHandles;
            this.belowhandles = belowHandles;
            if (
              radiansToDegrees(this.theta) > 90 &&
              radiansToDegrees(this.theta) < 275
            ) {
              drawHandles(context, this.evt.detail, belowHandles, {
                color: belowlineOptions.color,
                handleRadius: 3,
                drawHandlesIfActive: drawHandlesOnHover,
                hideHandlesIfMoving,
                fill: belowlineOptions.color
              });
              drawHandles(context, this.evt.detail, aboveHandles, {
                color: abovelineOptions.color,
                handleRadius: 3,
                drawHandlesIfActive: drawHandlesOnHover,
                hideHandlesIfMoving,
                fill: abovelineOptions.color
              });
            } else {
              drawHandles(context, this.evt.detail, aboveHandles, {
                color: abovelineOptions.color,
                handleRadius: 3,
                drawHandlesIfActive: drawHandlesOnHover,
                hideHandlesIfMoving,
                fill: abovelineOptions.color
              });
              drawHandles(context, this.evt.detail, belowHandles, {
                color: belowlineOptions.color,
                handleRadius: 3,
                drawHandlesIfActive: drawHandlesOnHover,
                hideHandlesIfMoving,
                fill: belowlineOptions.color
              });
            }
          }

          if (!this.eventData) {
            this.eventData = evt.detail as EventData
            this.image =  this.eventData.image;
          }
          this.setupPlot()
        });
      }
    }
  }

  /**
   * Retrieves the points along the line
   * @method
   * @name getPointsAlongLine
   * @param {HandlePosition} startHandle
   * @param {HandlePosition} endHandle
   * @param {number} colPixelSpacing
   * @returns {number[]}
   */
  getPointsAlongLine(
    startHandle: HandlePosition,
    endHandle: HandlePosition,
    colPixelSpacing: number
  ) {
    let points: { x: number; y: number }[] = [];

    const dx = endHandle.x - startHandle.x;
    const dy = endHandle.y - startHandle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const stepX = (dx / distance) * colPixelSpacing;
    const stepY = (dy / distance) * colPixelSpacing;

    const numPoints = Math.floor(distance / colPixelSpacing);

    for (let i = 0; i <= numPoints; i++) {
      const x = startHandle.x + i * stepX;
      const y = startHandle.y + i * stepY;
      points.push({ x, y });
    }

    return points;
  }

  /**
   * Retrieves the pixel greyscale values along the line
   * @method
   * @name getPixelValuesAlongLine
   * @param {HandlePosition} startHandle
   * @param {number[]} points
   * @param {number} colPixelSpacing
   * @param {EventData} eventData
   * @returns {void}
   */
  getPixelValuesAlongLine(
    startHandle: HandlePosition,
    points: { x: number; y: number }[],
    colPixelSpacing: number,
    eventData: EventData
  ) {
    const pixelValues: number[] = new Array(points.length);

    const addPixelValues = (
      xPoints: number[],
      yPoints: number[],
      startIndex: number
    ) => {
      const pixelValuesBatch = cornerstone.getStoredPixels(
        eventData.element,
        xPoints[0],
        yPoints[0],
        xPoints.length,
        1
      );
      for (let i = 0; i < pixelValuesBatch.length; i++) {
        pixelValues[startIndex + i] = pixelValuesBatch[i];
      }
    };

    for (let i = 0; i < points.length; i++) {
      const xPoint = points[i].x;
      const yPoint = points[i].y;
      addPixelValues([xPoint], [yPoint], i);
    }

    return pixelValues;
  }

  /**
   * Creates the plot: coords-greyscale value
   * @method
   * @name createPlot
   * @param {dataSets} dataSets
   * @returns {void}
   */
  createPlot(canvasId: string, ...dataSets: dataSets) {
    const traces = dataSets.map(({ points, pixelValues, color }) => ({
      x: points,
      y: pixelValues,
      type: "lines",
      line: {
        color
      }
    }));

    this.plotlydata = traces as PlotlyData[];

    const allXValues = dataSets.flatMap(dataSet => dataSet.points);
    const allYValues = dataSets.flatMap(dataSet => dataSet.pixelValues);

    const layout = {
      xaxis: {
        range: [Math.min(...allXValues), Math.max(...allXValues)],
        title: "position(mm)"
      },
      yaxis: {
        range: [Math.min(...allYValues), Math.max(...allYValues)],
        title: "GreyScaleValue (HU)"
      },
      title: "GreyScaleValues vs position",
      responsive: true
    };

    const plotDiv = document.getElementById(`plot-${canvasId}`);
    if (
      this.datahandles!.end.x! < this.borderLeft ||
      this.datahandles!.start.x! < this.borderLeft ||
      this.datahandles!.start.x! > this.borderRight ||
      this.datahandles!.end.x! > this.borderRight
    ) {
      this.clearPlotlyData(plotDiv!);
      plotDiv!.style.display = "none";
    } else {
      plotDiv!.style.display = "block";
      Plotly.react(plotDiv as Plotly.Root, traces as Plotly.Data[], layout);

      this.setupResizeObserver(plotDiv!)
    }
  }

  clearPlotlyData(plotDiv: HTMLElement) {
    Plotly.purge(plotDiv as Plotly.Root);
    this.plotlydata = [];
    this.removeResizeObserver(plotDiv!)
  }

  setupResizeObserver(plotDiv: HTMLElement) {
    const resizeObserver = new ResizeObserver(() => {
      if (plotDiv?.style.display == "block")
        Plotly.Plots.resize(plotDiv as Plotly.Root);
    });
    resizeObserver.observe(plotDiv!);

    (plotDiv as any).__resizeObserver = resizeObserver;
  }

  removeResizeObserver(plotDiv: HTMLElement) {
    const observer = (plotDiv as any).__resizeObserver;
    if (observer) {
      observer.disconnect();
      delete (plotDiv as any).__resizeObserver;
    }
  }

}

/**
 * Clears the tool's data
 * @method
 * @name clearToolData
 * @param {HTMLElement } element
 * @param {string } toolName
 * @returns {void}
 */
function clearToolData(element: HTMLElement, toolName: string) {
  const toolData: { data: data[] } = getToolState(element, toolName);

  if (toolData && toolData.data && toolData.data.length > 0) {
    toolData.data.forEach((data: data) => {
      data.visible = false;
    });
    // Remove all data items from tool state
    toolData.data = [];
  }
}

// Function to convert radians to degrees
function radiansToDegrees(radians: number) {
  let angle = radians * (180 / Math.PI);
  if (angle < 0) {
    angle += 360; // Add 360 to negative angles to bring them into the 0-360 range
  }
  return angle;
}

//to set custom offset do this: DEFAULT_TOOLS["LengthPlot"].offset=parseInt(document.getElementById("offset").value,10)
//create plot in viewport in layeout doable like this:
//const currentDiv = eventData.element //viewport element
//const newDiv = document.createElement("div");
//newDiv.id=currentDiv.id+"-Plotly"
//newDiv.style="width: 100%; max-width: 600px; height: 500px;"
//currentDiv.appendChild(newDiv);
//offsetInput=document.createElement("input");
// Set the attributes for the input element
//offsetInput.type = "number";
//offsetInput.classList.add("manualInput");
//offsetInput.id = currentDiv.id+"-offset";
//offsetInput.placeholder = "offset";
//newDiv.appendChild(offsetInput);
