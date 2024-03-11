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
import {
  HandlePosition,
  dataSets,
  PixelSpacing,
  MeasurementData,
  Handles,
  MeasurementMouseEvent,
  Coords,
  EventData,
  PlotlyData
} from "../types";

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
  datahandles?: Handles;
  abovehandles?: Handles;
  belowhandles?: Handles;
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
    this.datahandles;
    this.click = 0;
    this.abovehandles;
    this.belowhandles;
    this.borderRight;
    this.borderLeft = 0;
    this.evt;
    this.context;
    this.wheelactive = false;
    this.currentTarget = null;
    this.fixedOffset = 0;
    this.plotlydata = [];
    this.measuring = false;
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.changeOffset = this.changeOffset.bind(this);
    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
  }

  //internal class functions

  /**
   * handles Mouse Up listener (to create the final plot)
   * @method
   * @name handleMouseUp
   * @returns {void}
   */
  handleMouseUp() {
    const toolData: { data: MeasurementData[] } = getToolState(
      this.currentTarget,
      this.name
    );
    this.fixedOffset = toolData.data[toolData.data.length - 1].handles.offset;
    this.click = +1;
    this.measuring =
      this.datahandles?.end!.x === this.datahandles?.start!.x &&
      this.click === 1
        ? true
        : false;

    const eventData = this.eventData;

    const handleData = (handles: Handles) => {
      const points = this.getPointsAlongLine(
        handles.start!,
        handles.end!,
        getPixelSpacing(eventData!.image).colPixelSpacing
      );
      const pixelValues = this.getPixelValuesAlongLine(
        handles.start!,
        points,
        getPixelSpacing(eventData!.image).colPixelSpacing,
        eventData!
      );
      let color = "green";
      return { points, pixelValues, color };
    };
    const aboveResults = handleData(this.abovehandles!);
    aboveResults.color = "red";
    const belowResults = handleData(this.belowhandles!);
    belowResults.color = "blue";
    const data = [handleData(this.datahandles!), aboveResults, belowResults];
    if (this.measuring === false) {
      this.createPlot(...data);
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
    const toolData: { data: MeasurementData[] } = getToolState(
      this.currentTarget,
      this.name
    );
    if (toolData) {
      const index = toolData.data.findIndex(obj => obj.active === true);
      const indexTracing = toolData.data.findIndex(
        obj => obj.handles.end!.moving === true
      );

      if (
        toolData.data.length != 0 &&
        (index != undefined || indexTracing != undefined) &&
        toolData.data[index] != undefined
      ) {
        const { deltaY } = evt;

        toolData.data[index].handles.offset! += deltaY > 0 ? 1 : -1;
        evt.preventDefault(); //modify custom mouse scroll to not interefere with ctrl+wheel
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
      eventData.element.removeEventListener("mouseup", () =>
        this.handleMouseUp()
      );
      eventData.element.removeEventListener("wheel", evt =>
        this.changeOffset(evt)
      );
    }
    eventData.element.addEventListener("mouseup", () => this.handleMouseUp());
    eventData.element.addEventListener("wheel", evt => this.changeOffset(evt));

    this.measuring = true;
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;

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
        offset: 0
      }
    };
  }

  /**
   * Identifies when the cursor is near the tool data
   * @method
   * @name pointNearTool
   * @param {HTMLElement} element
   * @param {MeasurementData} data
   * @param {Coords} coords
   * @returns {boolean}
   */
  pointNearTool(element: HTMLElement, data: MeasurementData, coords: Coords) {
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
   * @param {MeasurementData} data
   * @returns {boolean}
   */
  updateCachedStats(
    image: cornerstone.Image,
    element: HTMLElement,
    data: MeasurementData
  ) {
    const { rowPixelSpacing, colPixelSpacing }: PixelSpacing =
      getPixelSpacing(image);

    const dx =
      (data.handles.end!.x - data.handles.start!.x) * (colPixelSpacing || 1);
    const dy =
      (data.handles.end!.y - data.handles.start!.y) * (rowPixelSpacing || 1);

    const length = Math.sqrt(dx * dx + dy * dy);

    data.length = length;
    data.invalidated = false;
  }

  /**
   * Renders the data (new line/modified line)
   * @method
   * @name updateCachedStats
   * @param {MeasurementMouseEvent | WheelEvent} evt
   * @returns {void}
   */
  renderToolData(evt: MeasurementMouseEvent | WheelEvent) {
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

      const toolData: { data: MeasurementData[] } = getToolState(
        this.currentTarget,
        this.name
      );

      if (!toolData) {
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

          start = data.handles.start!;
          end = data.handles.end!;
          if (
            this.measuring === false &&
            this.wheelactive === true &&
            data.active === true
          ) {
            this.fixedOffset = data.handles.offset;
          }
          data.handles.offset =
            (this.measuring === true && data.handles.end!.moving === true) ||
            this.wheelactive === true
              ? data.handles.offset
              : this.fixedOffset;

          //data.handles.end.y = data.handles.start.y;
          drawLine(
            context,
            element,
            data.handles.start,
            data.handles.end,
            lineOptions
          );

          const aboveHandles: Handles = {
            start: { x: start.x, y: start.y - data.handles.offset! },
            end: { x: end.x, y: end.y - data.handles.offset! },
            offset: data.handles.offset
          };

          const belowHandles: Handles = {
            start: { x: start.x, y: start.y + data.handles.offset! },
            end: { x: end.x, y: end.y + data.handles.offset! },
            offset: data.handles.offset
          };

          const abovelineOptions = { color: "red", lineWidth: 3 };
          const belowlineOptions = { color: "blue", lineWidth: 3 };

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
            drawHandles(context, this.evt.detail, aboveHandles, {
              color: "red",
              handleRadius: 3,
              drawHandlesIfActive: drawHandlesOnHover,
              hideHandlesIfMoving,
              fill: "red"
            });
            drawHandles(context, this.evt.detail, belowHandles, {
              color: "blue",
              handleRadius: 3,
              drawHandlesIfActive: drawHandlesOnHover,
              hideHandlesIfMoving,
              fill: "blue"
            });
          }
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
    let points: number[] = [];
    const addPoints = (
      start: HandlePosition,
      end: HandlePosition,
      step: number
    ) => {
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
    points: number[],
    colPixelSpacing: number,
    eventData: EventData
  ) {
    const pixelValues: number[] = new Array(points.length);
    const yPoint = Math.floor(startHandle.y);

    const addPixelValues = (xPoints: number[], startIndex: number) => {
      const pixelValuesBatch = cornerstone.getStoredPixels(
        eventData.element,
        xPoints[0],
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

  /**
   * Creates the plot: coords-greyscale value
   * @method
   * @name createPlot
   * @param {dataSets} dataSets
   * @returns {void}
   */
  createPlot(...dataSets: dataSets) {
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

    if (
      this.datahandles!.end!.x! < this.borderLeft ||
      this.datahandles!.start!.x! < this.borderLeft ||
      this.datahandles!.start!.x! > this.borderRight ||
      this.datahandles!.end!.x! > this.borderRight
    ) {
      this.clearPlotlyData(myPlotDiv!);
      myPlotDiv!.style.display = "none";
    } else {
      myPlotDiv!.style.display = "block";
      Plotly.react(myPlotDiv as Plotly.Root, traces as Plotly.Data[], layout);
    }
  }

  clearPlotlyData(myPlotDiv: HTMLElement) {
    Plotly.purge(myPlotDiv as Plotly.Root);
    this.plotlydata = [];
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
  const toolData: { data: MeasurementData[] } = getToolState(element, toolName);

  if (toolData && toolData.data && toolData.data.length > 0) {
    toolData.data.forEach((data: MeasurementData) => {
      data.visible = false;
    });
  }
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
