//external imports
import * as csTools from "cornerstone-tools";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";

// internal imports
import { logger } from "../../../common/logger";

// cornerstone tools imports
const external = csTools.external;
const EVENTS = csTools.EVENTS;
const BaseAnnotationTool = csTools.importInternal("base/BaseAnnotationTool");
const getToolState = csTools.getToolState;
const addToolState = csTools.addToolState;
const removeToolState = csTools.removeToolState;
const toolStyle = csTools.toolStyle;
const toolColors = csTools.toolColors;
const triggerEvent = csTools.importInternal("util/triggerEvent");
const pointInsideBoundingBox = csTools.importInternal(
  "util/pointInsideBoundingBox"
);
const lineSegDistance = csTools.importInternal("util/lineSegDistance");
const getPixelSpacing = csTools.importInternal("util/getPixelSpacing");
const calculateSUV = csTools.importInternal("util/calculateSUV");
const numbersWithCommas = csTools.importInternal("util/numbersWithCommas");
const getNewContext = csTools.importInternal("drawing/getNewContext");
const draw = csTools.importInternal("drawing/draw");
const drawJoinedLines = csTools.importInternal("drawing/drawJoinedLines");
const drawHandles = csTools.importInternal("drawing/drawHandles");
const drawLinkedTextBox = csTools.importInternal("drawing/drawLinkedTextBox");
const clipToBox = csTools.importInternal("util/clip");
const cursors = csTools.importInternal("tools/cursors");
const freehandRoiCursor = cursors.freehandRoiCursor;
const throttle = csTools.importInternal("util/throttle");
const freehandUtils = csTools.importInternal("util/freehandUtils");
const getModule = csTools.getModule;
const state = getModule("segmentation").state;
import { getImageTracker, getImageManager } from "../../imageManagers";

const globalConfiguration = {
  configuration: {
    mouseEnabled: true,
    touchEnabled: true,
    globalToolSyncEnabled: false,
    showSVGCursors: true,
    autoResizeViewports: true,
    lineDash: [4, 4]
  }
};

const {
  insertOrDelete,
  freehandArea,
  calculateFreehandStatistics,
  freehandIntersect,
  FreehandHandleData
} = freehandUtils;
type Coords = {
  x: number;
  y: number;
  moving?: boolean;
  active?: boolean;
};
type EventData = {
  enabledElement?: Element;
  buttons?: number;
  currentPoints?: Point;
  deltaPoints?: Point;
  element?: HTMLElement | HTMLDivElement;
  event?: MouseEvent;
  canvasContext?: { canvas: HTMLCanvasElement };
  image?: Image;
  lastPoints?: Point;
  startPoints?: Point;
  type?: string;
  viewport?: Viewport;
};
type Point = {
  page: Coords;
  image: Coords;
  client: Coords;
  canvas: Coords;
};

export interface Handles {
  visible?: boolean;
  active?: boolean;
  text?: string;
  color?: string;
  handles?: Handles;
  start?: HandlePosition;
  end?: HandlePosition;
  offset?: number;
  middle?: HandlePosition;
  textBox?: HandleTextBox;
  initialRotation?: number;
  points?: HandlePosition[];
  invalidHandlePlacement?: boolean;
  x?: number;
  y?: number;
  hasBoundingBox?: boolean;
  lines?: Handles[];
}

interface MeasurementData {
  text?: string;
  computeMeasurements?: boolean;
  rAngle?: number;
  highlight?: boolean;
  visible: boolean;
  active: boolean;
  uuid: string;
  color?: any; // You might want to replace 'any' with the correct type for color
  handles: Handles;
  polyBoundingBox?: Rectangle;
  meanStdDev?: {
    mean: number;
    stdDev: number;
  };
  meanStdDevSUV?: {
    mean: number;
    stdDev: number;
  };
  area?: number;
  invalidated?: boolean;
  unit?: string;
  canComplete?: boolean;
  length?: number;
  cachedStats?: Stats;
  // Add any other properties as needed
}
export interface MeasurementMouseEvent {
  detail: EventData;
  currentTarget: any;
  type?: string;
  stopImmediatePropagation?: Function;
  stopPropagation?: Function;
  preventDefault?: Function;
}
import type { HandleTextBox } from "../../../common/types";

import { Image, Viewport } from "../../types";
import { HandlePosition, Rectangle, Stats } from "../../../common/types";
/**
 * @public
 * @class FreehandRoiTool
 * @memberof Tools.Annotation
 * @classdesc Tool for drawing arbitrary polygonal regions of interest, and
 * measuring the statistics of the enclosed pixels.
 * @extends Tools.Base.BaseAnnotationTool
 */
export default class FreehandRoiTool extends BaseAnnotationTool {
  private isMultiPartTool: boolean;
  private _drawing: boolean;
  private _dragging: boolean;
  private _modifying: boolean;
  private modality: string | null;
  private index: number | null;
  private pointNear: number | null;
  private throttledUpdateCachedStats;
  private finished?: boolean;
  private modifying?: boolean;
  private modifyingAll?: boolean;
  private name: string = "FreehandRoi";
  private uuid?: string;
  private dataAll?: MeasurementData;
  private distanceLine: number = 25;
  private distanceHandle: number = 25;

  private configuration?: {
    handleRadius: boolean;
    drawHandlesOnHover: boolean;
    hideHandlesIfMoving: boolean;
    renderDashed: boolean;
    digits: number;
    drawHandles: boolean;
    invalidColor?: boolean;
    mouseLocation?: { handles: Handles };
    alwaysShowHandles?: boolean;
    activeHandleRadius: number;
    completeHandleRadius: number;
    dragOrigin?: Handles;
    currentHandle: number;
    currentTool: number;
    completeHandleRadiusTouch?: number;
    spacing?: number;
  } = this.configuration;
  private svgCursor?: any = this.svgCursor;
  private data?: MeasurementData;
  private dragged?: boolean;
  private originalX?: number[];
  private originalY?: number[];
  private originalYsingle?: number;
  private originalXsingle?: number;
  private element?: Element;
  private _activeDrawingToolReference?: MeasurementData | null;
  private _drawingInteractionType?: string | null;
  private isEventListenerAdded: boolean = false;
  private pointerCoords?: Coords;
  private validXAll: boolean = true;
  private validYAll: boolean = true;
  private validX: boolean = true;
  private validY: boolean = true;
  private isPointerOutside?: boolean;
  private toolState?: any;
  private canComplete?: boolean;
  constructor(props = {}) {
    const defaultProps = {
      name: "FreehandRoi",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: defaultFreehandConfiguration(),
      svgCursor: freehandRoiCursor
    };

    super(props, defaultProps);

    this.isMultiPartTool = true;

    this._drawing = false;
    this._dragging = false;
    this._modifying = false;
    this.modality = null;
    this.index = null;
    this.pointNear = null;
    // Create bound callback functions for private event loops
    this._drawingMouseDownCallback = this._drawingMouseDownCallback.bind(this);
    this._drawingMouseMoveCallback = this._drawingMouseMoveCallback.bind(this);
    this._drawingMouseDragCallback = this._drawingMouseDragCallback.bind(this);
    this._drawingMouseUpCallback = this._drawingMouseUpCallback.bind(this);
    this._drawingMouseDoubleClickCallback =
      this._drawingMouseDoubleClickCallback.bind(this);
    this._editMouseUpCallback = this._editMouseUpCallback.bind(this);
    this._editMouseDragCallback = this._editMouseDragCallback.bind(this);
    this._editMouseUpAllCallback = this._editMouseUpAllCallback.bind(this);
    this._editMouseDragAllCallback = this._editMouseDragAllCallback.bind(this);
    this._editTouchDragAllCallback = this._editTouchDragAllCallback.bind(this);
    this._drawingTouchStartCallback =
      this._drawingTouchStartCallback.bind(this);
    this._drawingTouchDragCallback = this._drawingTouchDragCallback.bind(this);
    this._drawingDoubleTapClickCallback =
      this._drawingDoubleTapClickCallback.bind(this);
    this._editTouchDragCallback = this._editTouchDragCallback.bind(this);

    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
  }
  handleMouseMove(event: any): void {
    // Update pointer coordinates with the latest mouse position
    this.pointerCoords = {
      x: event.detail.currentPoints.image.x,
      y: event.detail.currentPoints.image.y
    };
    this.isPointerOutside =
      this.pointerCoords!.x < 0 ||
      this.pointerCoords!.x > event.detail.image.width ||
      this.pointerCoords!.y < 0 ||
      this.pointerCoords!.y > event.detail.image.height;
  }
  addMouseMoveEventListener() {
    if (!this.isEventListenerAdded) {
      // Bind handleMouseMove to the class instance
      const boundHandleMouseMove = this.handleMouseMove.bind(this);
      // Add event listener with the bound function
      this.element!.addEventListener(
        "cornerstonetoolsmousedrag",
        boundHandleMouseMove as EventListener
      );
      this.isEventListenerAdded = true;
    }
  }
  // Add method to remove event listener
  removeMouseMoveEventListener() {
    if (this.isEventListenerAdded) {
      // Remove event listener with the same bound function
      this.element!.removeEventListener(
        "mousemove",
        this.handleMouseMove as EventListener
      );
      this.isEventListenerAdded = false;
    }
  }
  createNewMeasurement(eventData: EventData) {
    this.modifying = false;
    this.modifyingAll = false;
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;
    this.element = eventData.element;

    if (this.isEventListenerAdded === false) {
      // Add event listener to capture mouse move events
      this.addMouseMoveEventListener();
    }
    if (!goodEventData) {
      logger.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );

      return;
    }

    const measurementData: {
      visible: boolean;
      active: boolean;
      invalidated: boolean;
      color: undefined;
      canComplete: boolean;
      handles: {
        points: never[];
        textBox?: {
          active: boolean;
          hasMoved: boolean;
          movesIndependently: boolean;
          drawnIndependently: boolean;
          allowedOutsideImage: boolean;
          hasBoundingBox: boolean;
        };
      };
    } = {
      visible: true,
      active: true,
      invalidated: true,
      color: undefined,
      canComplete: false,
      handles: {
        points: []
      }
    };

    measurementData.handles.textBox = {
      active: false,
      hasMoved: false,
      movesIndependently: false,
      drawnIndependently: true,
      allowedOutsideImage: true,
      hasBoundingBox: true
    };
    return measurementData;
  }

  /**
   *
   *
   * @param {Element} element element
   * @param {MeasurementData} data data
   * @param {Coords} coords coords
   * @returns {Boolean}
   */
  pointNearTool(element: Element, data: MeasurementData, coords: Coords) {
    const validParameters = data && data.handles && data.handles.points;
    this.element = element;

    if (this.isEventListenerAdded === false) {
      // Add event listener to capture mouse move events
      this.addMouseMoveEventListener();
    }
    if (!validParameters) {
      throw new Error(
        `invalid parameters supplied to tool ${this.name}'s pointNearTool`
      );
    }

    if (!validParameters || data.visible === false) {
      return false;
    }

    // Call the function
    const toolState = getToolState(this.element, this.name);
    const [j, i] = this._findObjectWithSmallesDistance(toolState, coords);

    if (
      (j != -1 && i != -1 && this.finished === true) ||
      this.modifying === true
    ) {
      this.uuid = toolState.data[j].uuid;
      this._activateModify(element);
    } else {
      this._deactivateModify(element);
    }

    const k = this._pointNearLine(toolState, coords);
    this.index = k;
    for (let jTest = 0; jTest < toolState.data.length; jTest++) {
      if (jTest === k) {
        toolState.data[jTest].active = true;
      } else {
        toolState.data[jTest].active = false;
      }
    }
    if (k !== -1 && j === -1 && i === -1 && this.finished === true) {
      this.dataAll = toolState.data[k];
      this._activateModifyAll(element);
    } else {
      this._deactivateModifyAll(element);
    }

    if ((j != -1 && i != -1) || k !== -1) {
      return true;
    }

    return false;
  }

  _findObjectWithSmallesDistance(
    measurementArray: { data: MeasurementData[] },
    coords: Coords
  ) {
    for (let j = 0; j < measurementArray.data.length!; j++) {
      for (
        let i = 0;
        i < measurementArray.data[j].handles.points!.length;
        i++
      ) {
        const handleCanvas = external.cornerstone.pixelToCanvas(
          this.element,
          measurementArray.data[j].handles.points![i]
        );
        if (
          external.cornerstoneMath.point.distance(handleCanvas, coords) <
          this.distanceHandle
        ) {
          measurementArray.data[j].active = true;
          return [j, i];
        } else {
          measurementArray.data[j].active = false;
        }
      }
    }
    return [-1, -1]; // Return -1 if no object found
  }
  /**
   *
   *
   * @param {*} element element
   * @param {*} data data
   * @param {*} coords coords
   * @returns {Boolean}
   */
  _pointNearLine(
    measurementArray: { data: MeasurementData[] },
    coords: Coords
  ) {
    for (let k = 0; k < measurementArray.data.length; k++) {
      for (
        let i = 0;
        i < measurementArray.data[k].handles.points!.length;
        i++
      ) {
        const startPoint = measurementArray.data[k].handles.points![i];
        const endPoint =
          measurementArray.data[k].handles.points![
          i === measurementArray.data[k].handles.points!.length - 1
            ? 0
            : i + 1
          ];
        if (
          lineSegDistance(this.element, startPoint, endPoint, coords) <
          this.distanceLine
        ) {
          return k;
        }
      }
    }

    return -1;
  }

  /**
   * @param {*} element
   * @param {*} data
   * @param {*} coords
   * @returns {number} the distance in px from the provided coordinates to the
   * closest rendered portion of the annotation. -1 if the distance cannot be
   * calculated.
   */
  distanceFromPoint(element: Element, data: MeasurementData, coords: Coords) {
    let distance = Infinity;

    for (let i = 0; i < data.handles.points!.length; i++) {
      const distanceI = external.cornerstoneMath.point.distance(
        data.handles.points![i],
        coords
      );

      distance = Math.min(distance, distanceI);
    }

    // If an error caused distance not to be calculated, return -1.
    if (distance === Infinity) {
      return -1;
    }

    return distance;
  }

  /**
   * @param {*} element
   * @param {*} data
   * @param {*} coords
   * @returns {number} the distance in canvas units from the provided coordinates to the
   * closest rendered portion of the annotation. -1 if the distance cannot be
   * calculated.
   */
  distanceFromPointCanvas(
    element: Element,
    data: MeasurementData,
    coords: Coords
  ) {
    let distance = Infinity;

    if (!data) {
      return -1;
    }

    const canvasCoords = external.cornerstone.pixelToCanvas(element, coords);

    const points = data.handles.points;

    for (let i = 0; i < points!.length; i++) {
      const handleCanvas = external.cornerstone.pixelToCanvas(
        element,
        points![i]
      );

      const distanceI = external.cornerstoneMath.point.distance(
        handleCanvas,
        canvasCoords
      );

      distance = Math.min(distance, distanceI);
    }

    // If an error caused distance not to be calculated, return -1.
    if (distance === Infinity) {
      return -1;
    }

    return distance;
  }

  /**
   *
   *
   *
   * @param {Object} image image
   * @param {Object} element element
   * @param {Object} data data
   *
   * @returns {void}  void
   */
  updateCachedStats(
    image: cornerstone.Image,
    element: Element,
    toolState: any
  ) {
    // Define variables for the area and mean/standard deviation
    let meanStdDev, meanStdDevSUV;
    const seriesModule = external.cornerstone.metaData.get(
      "generalSeriesModule",
      image.imageId
    );
    const modality = seriesModule ? seriesModule.modality : null;

    const points = this.toolState.data[this.index!].handles.points;

    // If the data has been invalidated, and the tool is not currently active,
    // We need to calculate it again.

    // Retrieve the bounds of the ROI in image coordinates
    const bounds = {
      left: this.toolState.data[this.index!].handles.points[0].x,
      right: this.toolState.data[this.index!].handles.points[0].x,
      bottom: this.toolState.data[this.index!].handles.points[0].y,
      top: this.toolState.data[this.index!].handles.points[0].x
    };

    for (let i = 0; i < points!.length; i++) {
      bounds.left = Math.min(bounds.left, points![i].x);
      bounds.right = Math.max(bounds.right, points![i].x);
      bounds.bottom = Math.min(bounds.bottom, points![i].y);
      bounds.top = Math.max(bounds.top, points![i].y);
    }

    const polyBoundingBox = {
      left: bounds.left,
      top: bounds.bottom,
      width: Math.abs(bounds.right - bounds.left),
      height: Math.abs(bounds.top - bounds.bottom)
    };

    // Store the bounding box information for the text box
    this.toolState.data[this.index!].polyBoundingBox = polyBoundingBox;
    // First, make sure this is not a color image, since no mean / standard
    // Deviation will be calculated for color images.
    if (!image.color) {
      // Retrieve the array of pixels that the ROI bounds cover
      const pixels = external.cornerstone.getPixels(
        element,
        polyBoundingBox.left,
        polyBoundingBox.top,
        polyBoundingBox.width,
        polyBoundingBox.height
      );

      // Calculate the mean & standard deviation from the pixels and the object shape
      meanStdDev = calculateFreehandStatistics.call(
        this,
        pixels,
        polyBoundingBox,
        this.toolState.data[this.index!].handles.points
      );

      if (modality === "PT") {
        // If the image is from a PET scan, use the DICOM tags to
        // Calculate the SUV from the mean and standard deviation.

        // Note that because we are using modality pixel values from getPixels, and
        // The calculateSUV routine also rescales to modality pixel values, we are first
        // Returning the values to storedPixel values before calcuating SUV with them.
        // TODO: Clean this up? Should we add an option to not scale in calculateSUV?
        meanStdDevSUV = {
          mean: calculateSUV(
            image,
            (meanStdDev.mean - image.intercept) / image.slope
          ),
          stdDev: calculateSUV(
            image,
            (meanStdDev.stdDev - image.intercept) / image.slope
          )
        };
      }

      // If the mean and standard deviation values are sane, store them for later retrieval
      if (meanStdDev && !isNaN(meanStdDev.mean)) {
        this.toolState.data[this.index!].meanStdDev = meanStdDev;
        this.toolState.data[this.index!].meanStdDevSUV = meanStdDevSUV;
      }
    }

    // Retrieve the pixel spacing values, and if they are not
    // Real non-zero values, set them to 1
    let { colPixelSpacing, rowPixelSpacing } = getPixelSpacing(image);

    //use correct PixelSpacing for "US" modality
    if (modality === "US") {
      colPixelSpacing = image.columnPixelSpacing;
      rowPixelSpacing = image.rowPixelSpacing;
    }
    //if neceassary, retrieve these values in the Image Manager
    if (rowPixelSpacing === undefined || colPixelSpacing === undefined) {
      const parsedImageId = cornerstoneDICOMImageLoader.wadouri.parseImageId(
        image.imageId
      );
      const rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
      const imageTracker = getImageTracker();
      const seriesId = imageTracker[rootImageId];
      const manager = getImageManager();
      if (manager && seriesId) {
        const series = manager[seriesId];
        rowPixelSpacing =
          series.instances[image.imageId].metadata.pixelSpacing![0];
        colPixelSpacing =
          series.instances[image.imageId].metadata.pixelSpacing![1];
      }
    }

    const scaling = (colPixelSpacing || 1) * (rowPixelSpacing || 1);

    const area = freehandArea(
      this.toolState.data[this.index!].handles.points,
      scaling
    );

    // If the area value is sane, store it for later retrieval
    if (!isNaN(area)) {
      this.toolState.data[this.index!].area = area;
    }

    // Set the invalidated flag to false so that this data won't automatically be recalculated
    this.toolState.data[this.index!].invalidated = false;
  }

  /**
   *
   *
   * @param {*} evt
   * @returns {undefined}
   */
  renderToolData(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    // If we have no toolState for this element, return immediately as there is nothing to do
    const toolState = getToolState(evt.currentTarget, this.name);
    if (!toolState) {
      return;
    }

    this.toolState = toolState;
    const { image, element } = eventData;
    const config = this.configuration;
    const seriesModule = external.cornerstone.metaData.get(
      "generalSeriesModule",
      image!.imageId
    );
    const modality = seriesModule ? seriesModule.modality : null;

    // We have tool data for this element - iterate over each one and draw it
    const context = getNewContext(eventData.canvasContext!.canvas);
    const lineWidth = toolStyle.getToolWidth();
    const { renderDashed } = config!;
    const lineDash = getModule("globalConfiguration").configuration.lineDash;

    for (let i = 0; i < toolState.data.length; i++) {
      const data = toolState.data[i];

      if (data.visible === false) {
        continue;
      }

      this.canComplete = data.canComplete;
      draw(context, (context: CanvasRenderingContext2D) => {
        let color = toolColors.getColorIfActive(data);
        //let fillColor

        if (i === this.index) {
          if (data.handles.invalidHandlePlacement) {
            color = config!.invalidColor;
            //fillColor = config!.invalidColor
          } else {
            color = toolColors.getColorIfActive(data);
            // fillColor = toolColors.getFillColor()
          }
        } else {
          color = "#02FAE5";
        }
        let options: {
          color: string;
          lineDash?: string;
          handleRadius?: number;
        } = { color };

        if (renderDashed) {
          options.lineDash = lineDash;
        }

        if (data.handles.points.length) {
          const points = data.handles.points;

          drawJoinedLines(context, element, points[0], points, options);

          if (data.polyBoundingBox && data.canComplete === true) {
            drawJoinedLines(
              context,
              element,
              points[points.length - 1],
              [points[0]],
              options
            );
            points[points.length - 1].lines = [
              { x: points[0].x, y: points[0].y }
            ];
          } else {
            drawJoinedLines(
              context,
              element,
              points[points.length - 1],
              [config!.mouseLocation!.handles.start],
              options
            );
          }
        }

        // Draw handles

        options = {
          color
          //fill: fillColor
        };
        if (
          config!.alwaysShowHandles ||
          (i === this.index && data.polyBoundingBox)
        ) {
          // Render all handles
          options.handleRadius = config!.activeHandleRadius;

          if (this.configuration!.drawHandles) {
            drawHandles(context, eventData, data.handles.points, options);
          }
        }

        if (data.canComplete) {
          // Draw large handle at the origin if can complete drawing
          options.handleRadius = config!.completeHandleRadius;
          const handle = data.handles.points[0];

          if (this.configuration!.drawHandles) {
            drawHandles(context, eventData, [handle], options);
          }
        }

        if (i === this.index && !data.polyBoundingBox) {
          // Draw handle at origin and at mouse if actively drawing
          options.handleRadius = config!.activeHandleRadius;

          if (this.configuration!.drawHandles) {
            drawHandles(
              context,
              eventData,
              config!.mouseLocation!.handles,
              options
            );
          }

          const firstHandle = data.handles.points[0];

          if (this.configuration!.drawHandles) {
            drawHandles(context, eventData, [firstHandle], options);
          }
        }

        if (data.invalidated === true && i === this.index) {
          if (data.meanStdDev && data.meanStdDevSUV && data.area) {
            this.throttledUpdateCachedStats(image, element, this.toolState);
          } else {
            this.updateCachedStats(image!, element!, this.toolState);
          }
        }

        // Only render text if polygon ROI has been completed and freehand 'shiftKey' mode was not used:
        if (data.polyBoundingBox && !data.handles.textBox.freehand) {
          // If the textbox has not been moved by the user, it should be displayed on the right-most
          // Side of the tool.
          if (!data.handles.textBox.hasMoved) {
            // Find the rightmost side of the polyBoundingBox at its vertical center, and place the textbox here
            // Note that this calculates it in image coordinates
            data.handles.textBox.x =
              data.polyBoundingBox.left + data.polyBoundingBox.width;
            data.handles.textBox.y =
              data.polyBoundingBox.top + data.polyBoundingBox.height / 2;
          }

          const text = textBoxText.call(this, data);
          if (data.canComplete === true) {
            drawLinkedTextBox(
              context,
              element,
              data.handles.textBox,
              text,
              data.handles.points,
              textBoxAnchorPoints,
              color,
              lineWidth,
              20,
              true
            );

            this.finished = true;
          }
        }
      });
    }

    function textBoxText(data: {
      meanStdDev: { mean: number; stdDev: number };
      meanStdDevSUV: { mean: number; stdDev: number };
      area: number;
      unit: string;
    }) {
      const { meanStdDev, meanStdDevSUV, area } = data;
      // Define an array to store the rows of text for the textbox
      const textLines = [];

      // If the mean and standard deviation values are present, display them
      if (meanStdDev && meanStdDev.mean !== undefined) {
        // If the modality is CT, add HU to denote Hounsfield Units
        let moSuffix = "";

        if (modality === "CT") {
          moSuffix = "HU";
        }
        data.unit = moSuffix;

        // Create a line of text to display the mean and any units that were specified (i.e. HU)
        let meanText = `Mean: ${numbersWithCommas(
          meanStdDev.mean.toFixed(2)
        )} ${moSuffix}`;
        // Create a line of text to display the standard deviation and any units that were specified (i.e. HU)
        let stdDevText = `StdDev: ${numbersWithCommas(
          meanStdDev.stdDev.toFixed(2)
        )} ${moSuffix}`;

        // If this image has SUV values to display, concatenate them to the text line
        if (meanStdDevSUV && meanStdDevSUV.mean !== undefined) {
          const SUVtext = " SUV: ";

          meanText +=
            SUVtext + numbersWithCommas(meanStdDevSUV.mean.toFixed(2));
          stdDevText +=
            SUVtext + numbersWithCommas(meanStdDevSUV.stdDev.toFixed(2));
        }

        // Add these text lines to the array to be displayed in the textbox
        textLines.push(meanText);
        textLines.push(stdDevText);
      }

      // If the area is a sane value, display it
      if (area) {
        // Determine the area suffix based on the pixel spacing in the image.
        // If pixel spacing is present, use millimeters. Otherwise, use pixels.
        // This uses Char code 178 for a superscript 2
        let suffix = ` mm${String.fromCharCode(178)}`;

        //use correct PixelSpacing for "US" modality
        let { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);
        if (modality === "US") {
          colPixelSpacing = image!.columnPixelSpacing;
          rowPixelSpacing = image!.rowPixelSpacing;
        }
        //if necessary, retrieve these values in the Image Manager
        if (rowPixelSpacing === undefined || colPixelSpacing === undefined) {
          const parsedImageId =
            cornerstoneDICOMImageLoader.wadouri.parseImageId(
              eventData.image!.imageId
            );
          const rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
          const imageTracker = getImageTracker();
          const seriesId = imageTracker[rootImageId];
          const manager = getImageManager();
          if (manager && seriesId) {
            const series = manager[seriesId];
            rowPixelSpacing =
              series.instances[eventData.image!.imageId].metadata
                .pixelSpacing![0];
            colPixelSpacing =
              series.instances[eventData.image!.imageId].metadata
                .pixelSpacing![1];
          }
        }

        if (
          rowPixelSpacing === undefined ||
          rowPixelSpacing === 0 ||
          rowPixelSpacing === 1 ||
          colPixelSpacing === undefined ||
          colPixelSpacing === 0 ||
          colPixelSpacing === 1
        ) {
          suffix = ` pixels${String.fromCharCode(178)}`;
        }

        // Create a line of text to display the area and its units
        const areaText = `Area: ${numbersWithCommas(area.toFixed(2))}${suffix}`;

        // Add this text line to the array to be displayed in the textbox
        textLines.push(areaText);
      }

      return textLines;
    }

    function textBoxAnchorPoints(handles: Handles) {
      return handles;
    }
  }

  addNewMeasurement(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;

    this._startDrawing(evt);
    this._addPoint(eventData);

    preventPropagation(evt);
  }

  preMouseDownCallback(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    const nearby = this._pointNearHandleAllTools(eventData);

    if (eventData.event!.ctrlKey) {
      if (
        nearby !== undefined &&
        (nearby.handleNearby as HandleTextBox).hasBoundingBox
      ) {
        // Ctrl + clicked textBox, do nothing but still consume event.
      } else {
        insertOrDelete.call(this, evt, nearby);
      }

      preventPropagation(evt);

      return true;
    }

    return false;
  }

  handleSelectedCallback(
    evt: MeasurementMouseEvent,
    toolData: { data: MeasurementData },
    handle: Handles,
    interactionType = "mouse"
  ) {
    const { element } = evt.detail;
    const toolState = getToolState(element, this.name);

    if (handle.hasBoundingBox) {
      // Use default move handler.

      //@ts-ignore
      this.moveHandleNearImagePoint(
        evt,
        this,
        toolData,
        handle,
        interactionType
      );

      return;
    }

    const config = this.configuration;

    config!.dragOrigin = {
      x: handle.x,
      y: handle.y
    };

    // Iterating over handles of all toolData instances to find the indices of the selected handle
    for (let toolIndex = 0; toolIndex < toolState.data.length; toolIndex++) {
      const points = toolState.data[toolIndex].handles.points;

      for (let p = 0; p < points.length; p++) {
        if (points[p] === handle) {
          config!.currentHandle = p;
          config!.currentTool = toolIndex;
        }
      }
    }

    this._modifying = true;

    // Interupt eventDispatchers
    preventPropagation(evt);
  }

  /**
   * Event handler for MOUSE_MOVE during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseMoveCallback(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    const { currentPoints, element } = eventData;
    const toolState = getToolState(element, this.name);

    const config = this.configuration;
    const currentTool = config!.currentTool;

    const data = toolState.data[currentTool];
    const coords = currentPoints!.canvas;

    // Set the mouseLocation handle
    this._getMouseLocation(eventData);
    this._checkInvalidHandleLocation(data, eventData);

    // Mouse move -> Polygon Mode
    const handleNearby = this._pointNearHandle(element!, data, coords!);
    const points = data.handles.points;
    // If there is a handle nearby to snap to
    // (and it's not the actual mouse handle)

    if (
      handleNearby !== undefined &&
      (handleNearby as HandleTextBox).hasBoundingBox &&
      (handleNearby as number) < points.length - 1
    ) {
      config!.mouseLocation!.handles.start!.x =
        points[handleNearby as number].x;
      config!.mouseLocation!.handles.start!.y =
        points[handleNearby as number].y;
    }

    // Force onImageRendered
    external.cornerstone.updateImage(element);
  }

  /**
   * Event handler for MOUSE_DRAG during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseDragCallback(evt: MeasurementMouseEvent) {
    this._drawingDrag(evt);
  }

  /**
   * Event handler for TOUCH_DRAG during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingTouchDragCallback(evt: MeasurementMouseEvent) {
    this._drawingDrag(evt);
  }

  _drawingDrag(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    const { element } = eventData;

    const toolState = getToolState(element, this.name);

    const config = this.configuration;
    const currentTool = config!.currentTool;

    const data = toolState.data[currentTool];

    // Set the mouseLocation handle
    this._getMouseLocation(eventData);
    this._checkInvalidHandleLocation(data, eventData);
    this._addPointPencilMode(eventData, data.handles.points);
    this._dragging = true;

    // Force onImageRendered
    external.cornerstone.updateImage(element);
  }

  /**
   * Event handler for MOUSE_DOWN during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseDownCallback(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    const { currentPoints, element } = eventData;

    const coords = currentPoints!.canvas;

    const config = this.configuration;
    const currentTool = config!.currentTool;
    const toolState = getToolState(element, this.name);
    const data = toolState.data[currentTool];

    const handleNearby = this._pointNearHandle(element!, data, coords!);

    if (!freehandIntersect.end(data.handles.points) && data.canComplete) {
      const lastHandlePlaced = config!.currentHandle;

      this._endDrawing(element!, lastHandlePlaced);
    } else if (handleNearby === undefined) {
      this._addPoint(eventData);
    }

    preventPropagation(evt);

    return;
  }

  /**
   * Event handler for TOUCH_START during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingTouchStartCallback(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    const { currentPoints, element } = eventData;

    const coords = currentPoints!.canvas;

    const config = this.configuration;
    const currentTool = config!.currentTool;
    const toolState = getToolState(element, this.name);
    const data = toolState.data[currentTool];

    const handleNearby = this._pointNearHandle(element!, data, coords!);

    if (!freehandIntersect.end(data.handles.points) && data.canComplete) {
      const lastHandlePlaced = config!.currentHandle;

      this._endDrawing(element!, lastHandlePlaced);
    } else if (handleNearby === undefined) {
      this._addPoint(eventData);
    }

    preventPropagation(evt);

    return;
  }

  /** Ends the active drawing loop and completes the polygon.
   *
   * @public
   * @param {Object} element - The element on which the roi is being drawn.
   * @returns {null}
   */
  completeDrawing(element: Element) {
    if (!this._drawing) {
      return;
    }
    const toolState = getToolState(element, this.name);
    const config = this.configuration;
    const data = toolState.data[config!.currentTool];

    if (
      !freehandIntersect.end(data.handles.points) &&
      data.handles.points.length >= 2
    ) {
      const lastHandlePlaced = config!.currentHandle;

      data.polyBoundingBox = {};
      this._endDrawing(element, lastHandlePlaced);
    }
  }

  /**
   * Event handler for MOUSE_DOUBLE_CLICK during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseDoubleClickCallback(evt: MeasurementMouseEvent) {
    const { element } = evt.detail;

    this.completeDrawing(element!);

    preventPropagation(evt);
  }

  /**
   * Event handler for DOUBLE_TAP during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingDoubleTapClickCallback(evt: MeasurementMouseEvent) {
    const { element } = evt.detail;

    this.completeDrawing(element!);

    preventPropagation(evt);
  }

  /**
   * Event handler for MOUSE_DRAG during handle drag event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _editMouseDragCallback(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    const { element, currentPoints } = eventData;

    this.dragged = true;
    this.modifying = true;

    const toolState = getToolState(element, this.name);
    const config = this.configuration;
    if (this.index === null) {
      this.index = toolState.data.findIndex(
        (obj: MeasurementData) => obj.uuid === this.uuid
      );
    }
    config!.currentTool = this.index!;

    const data = toolState.data[config!.currentTool];
    if (this.pointNear === null) {
      this.pointNear = this._pointNearHandle(
        element!,
        data,
        currentPoints!.canvas!
      ) as number;
    }
    this.distanceHandle = 50;

    this.distanceHandle = 25;
    const currentHandle = this.pointNear;
    const points = data.handles.points;
    let handleIndex = 0;

    //Limit the adjustment of the active measurement, caused by dragging, within the borders of the image

    this.validX = true;
    this.originalXsingle = points[currentHandle].x;

    this.validY = true;
    this.originalYsingle = points[currentHandle].y;

    // Set the mouseLocation handle

    // Update the position of the selected handle to follow the mouse/cursor
    if (currentHandle >= 0 && this.validX === true && this.validY === true) {
      points[currentHandle].x += eventData.deltaPoints!.image.x;
      points[currentHandle].y += eventData.deltaPoints!.image.y;

      // Update the lines associated with the selected handle
      handleIndex = this._getPrevHandleIndex(currentHandle, points);
      const lastLine = points[handleIndex].lines[0];
      lastLine.x += eventData.deltaPoints!.image.x;
      lastLine.y += eventData.deltaPoints!.image.y;
    }

    // Update the image
    external.cornerstone.updateImage(element);
  }

  /**
   * Event handler for TOUCH_DRAG during handle drag event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {void}
   */
  _editTouchDragCallback(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    const { element, currentPoints } = eventData;

    this.dragged = true;
    this.modifying = true;

    const toolState = getToolState(element, this.name);
    const config = this.configuration;
    if (this.index === null) {
      this.index = toolState.data.findIndex(
        (obj: MeasurementData) => obj.uuid === this.uuid
      );
    }
    config!.currentTool = this.index!;

    const data = toolState.data[config!.currentTool];
    if (this.pointNear === null) {
      this.pointNear = this._pointNearHandle(
        element!,
        data,
        currentPoints!.canvas!
      ) as number;
    }
    this.distanceHandle = 50;

    this.distanceHandle = 25;
    const currentHandle = this.pointNear;
    const points = data.handles.points;
    let handleIndex = 0;

    //Limit the adjustment of the active measurement, caused by dragging, within the borders of the image

    this.validX = true;
    this.originalXsingle = points[currentHandle].x;

    this.validY = true;
    this.originalYsingle = points[currentHandle].y;

    // Set the mouseLocation handle

    // Update the position of the selected handle to follow the mouse/cursor
    if (currentHandle >= 0 && this.validX === true && this.validY === true) {
      points[currentHandle].x += eventData.deltaPoints!.image.x;
      points[currentHandle].y += eventData.deltaPoints!.image.y;

      // Update the lines associated with the selected handle
      handleIndex = this._getPrevHandleIndex(currentHandle, points);
      const lastLine = points[handleIndex].lines[0];
      lastLine.x += eventData.deltaPoints!.image.x;
      lastLine.y += eventData.deltaPoints!.image.y;
    }

    // Update the image
    external.cornerstone.updateImage(element);
  }

  /**
   * Event handler for MOUSE_DRAG during lines drag event loop (Roi translation).
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _editMouseDragAllCallback(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    const { element } = eventData;
    this.modifyingAll = true;
    const data = this.dataAll;
    const points = data!.handles.points;
    this.distanceLine = 100;

    //Limit the adjustment of the active measurement, caused by dragging, within the borders of the image

    this.validXAll = true;
    this.originalX = points!.map((obj: Handles) => obj["x"]) as number[];

    this.validYAll = true;
    this.originalY = points!.map((obj: Handles) => obj["y"]) as number[];

    this.distanceLine = 25;
    if (this.validYAll === true && this.validXAll === true) {
      // Set the mouseLocation handle
      this._getMouseLocation(eventData);
      // Calculate movement of the mouse pointer
      const deltaX = eventData.deltaPoints!.image.x;
      const deltaY = eventData.deltaPoints!.image.y;

      // Update lines if necessary
      for (let i = 0; i < points!.length; i++) {
        points![i].x += deltaX;
        points![i].y += deltaY;
      }
      points![points!.length - 1].lines = [
        { x: points![0].x, y: points![0].y }
      ];
      for (let i = 0; i < points!.length - 1; i++) {
        points![i].lines = [{ x: points![i + 1].x, y: points![i + 1].y }];
      }
    }
    // Update the image
    external.cornerstone.updateImage(element);
  }

  /**
   * Event handler for TOUCH_DRAG during lines drag event loop (Roi translation).
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _editTouchDragAllCallback(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    const { element } = eventData;
    this.modifyingAll = true;
    const data = this.dataAll;
    const points = data!.handles.points;
    this.distanceLine = 100;

    //Limit the adjustment of the active measurement, caused by dragging, within the borders of the image

    this.validXAll = true;
    this.originalX = points!.map((obj: Handles) => obj["x"]) as number[];

    this.validYAll = true;
    this.originalY = points!.map((obj: Handles) => obj["y"]) as number[];

    this.distanceLine = 25;
    if (this.validYAll === true && this.validXAll === true) {
      // Set the mouseLocation handle
      this._getMouseLocation(eventData);
      // Calculate movement of the mouse pointer
      const deltaX = eventData.deltaPoints!.image.x;
      const deltaY = eventData.deltaPoints!.image.y;

      // Update lines if necessary
      for (let i = 0; i < points!.length; i++) {
        points![i].x += deltaX;
        points![i].y += deltaY;
        for (let j = 0; j < points![i].lines!.length; j++) {
          points![i].lines![0].x += deltaX;
          points![i].lines![0].y += deltaY;
        }
      }
    }

    // Update the image
    external.cornerstone.updateImage(element);
  }

  /**
   * Returns the previous handle to the current one.
   * @param {Number} currentHandle - the current handle index
   * @param {Array} points - the handles Array of the freehand data
   * @returns {Number} - The index of the previos handle
   */
  _getPrevHandleIndex(currentHandle: number, points: Handles[]) {
    if (currentHandle === 0) {
      return points.length - 1;
    }

    return currentHandle - 1;
  }

  /**
   * Event handler for MOUSE_UP during handle drag event loop.
   *
   * @private
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _editMouseUpCallback(evt: MeasurementMouseEvent) {
    this.modifying = this.modifying === false ? true : false;

    const eventData = evt.detail;

    const toolState = getToolState(this.element, this.name);
    if (this.modifying === false && this.dragged === true) {
      this._deactivateModify(this.element!);
      this._dropHandle(eventData, toolState);
      this._endDrawing(this.element!);
    }
    external.cornerstone.updateImage(this.element);
  }

  /**
   * Event handler for MOUSE_UP during lines drag event loop.
   *
   * @private
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _editMouseUpAllCallback(evt: MeasurementMouseEvent) {
    this.modifyingAll = this.modifyingAll === false ? true : false;

    if (this.modifying === false && this.dragged === true) {
      this._deactivateModifyAll(this.element!);
    }
    external.cornerstone.updateImage(this.element);
  }

  /**
   * Places a handle of the freehand tool if the new location is valid.
   * If the new location is invalid the handle snaps back to its previous position.
   *
   * @private
   * @param {Object} eventData - Data object associated with the event.
   * @param {Object} toolState - The data associated with the freehand tool.
   * @modifies {toolState}
   * @returns {undefined}
   */
  _dropHandle(eventData: EventData, toolState: { data: MeasurementData[] }) {
    const config = this.configuration;
    const currentTool: number = config!.currentTool;
    const handles =
      toolState.data !== undefined && currentTool !== -1
        ? toolState.data[currentTool].handles
        : this.data!.handles;

    const points = handles.points;

    // Don't allow the line being modified to intersect other lines
    if (handles.invalidHandlePlacement) {
      const currentHandle = config!.currentHandle;
      const currentHandleData = points![currentHandle];
      let previousHandleData;

      if (currentHandle === 0) {
        const lastHandleID = points!.length - 1;

        previousHandleData = points![lastHandleID];
      } else {
        previousHandleData = points![currentHandle - 1];
      }

      // Snap back to previous position
      currentHandleData.x = config!.dragOrigin!.x as number;
      currentHandleData.y = config!.dragOrigin!.y as number;
      previousHandleData.lines![0] = currentHandleData;

      handles.invalidHandlePlacement = false;
    }
  }

  /**
   * Begining of drawing loop when tool is active and a click event happens far
   * from existing handles.
   *
   * @private
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _startDrawing(evt: MeasurementMouseEvent) {
    this.finished = false;
    const eventData = evt.detail;

    const measurementData = this.createNewMeasurement(eventData);
    const { element } = eventData;

    const config = this.configuration;
    let interactionType;

    if (evt.type === EVENTS.MOUSE_DOWN_ACTIVATE) {
      interactionType = "Mouse";
    } else if (evt.type === EVENTS.TOUCH_START_ACTIVE) {
      interactionType = "Touch";
    }
    this._activateDraw(element!, interactionType);
    this._getMouseLocation(eventData);

    addToolState(element, this.name, measurementData);

    const toolState = getToolState(element, this.name);

    config!.currentTool = toolState.data.length - 1;

    this._activeDrawingToolReference = toolState.data[config!.currentTool];
  }

  /**
   * Event handler for MOUSE_UP during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseUpCallback(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;

    const toolState = getToolState(this.element, this.name);

    if (this.finished === true && this.canComplete === true) {
      this._deactivateModify(this.element!);
      this._dropHandle(eventData, toolState);
      this._endDrawing(this.element!);
    }
  }

  /**
   * Adds a point on mouse click in polygon mode.
   *
   * @private
   * @param {Object} eventData - data object associated with an event.
   * @returns {undefined}
   */
  _addPoint(eventData: EventData) {
    const { currentPoints, element } = eventData;
    const toolState = getToolState(element, this.name);

    // Get the toolState from the last-drawn polygon
    const config = this.configuration;
    const data = toolState.data[config!.currentTool];

    if (data.handles.invalidHandlePlacement) {
      return;
    }

    const newHandleData = new FreehandHandleData(currentPoints!.image);

    // If this is not the first handle
    if (data.handles.points.length) {
      // Add the line from the current handle to the new handle
      data.handles.points[config!.currentHandle - 1].lines.push(
        currentPoints!.image
      );
    }

    // Add the new handle
    data.handles.points.push(newHandleData);

    // Increment the current handle value
    config!.currentHandle += 1;

    // Force onImageRendered to fire
    external.cornerstone.updateImage(element);
    this.fireModifiedEvent(element!, data);
  }

  /**
   * If in pencilMode, check the mouse position is farther than the minimum
   * distance between points, then add a point.
   *
   * @private
   * @param {Object} eventData - Data object associated with an event.
   * @param {Object} points - Data object associated with the tool.
   * @returns {undefined}
   */
  _addPointPencilMode(eventData: EventData, points: Handles[]) {
    const config = this.configuration;
    const { element } = eventData;
    const mousePoint = config!.mouseLocation!.handles.start;

    const handleFurtherThanMinimumSpacing = (handle: Handles) =>
      this._isDistanceLargerThanSpacing(element!, handle, mousePoint!);

    if (points.every(handleFurtherThanMinimumSpacing)) {
      this._addPoint(eventData);
    }
  }

  /**
   * Ends the active drawing loop and completes the polygon.
   *
   * @private
   * @param {Object} element - The element on which the roi is being drawn.
   * @param {Object} handleNearby - the handle nearest to the mouse cursor.
   * @returns {undefined}
   */
  _endDrawing(element: Element, handleNearby?: number) {
    const toolState = getToolState(element, this.name);
    const config = this.configuration;
    const data =
      toolState.data != undefined &&
        toolState.data[config!.currentTool] != undefined
        ? toolState.data[config!.currentTool]
        : this.data;

    data.active = false;
    data.highlight = false;
    data.handles.invalidHandlePlacement = false;

    // Connect the end handle to the origin handle
    if (handleNearby !== undefined) {
      const points = data.handles.points;

      points[config!.currentHandle - 1].lines.push(points[0]);
    }

    if (this._modifying) {
      this._modifying = false;
      data.invalidated = true;
    }

    // Reset the current handle
    config!.currentHandle = 0;
    config!.currentTool = -1;
    data.canComplete = true;

    if (this._drawing) {
      this._deactivateDraw(element);
    }

    external.cornerstone.updateImage(element);

    this.fireModifiedEvent(element, data);
    this.fireCompletedEvent(element, data);
  }

  /**
   * Returns a handle of a particular tool if it is close to the mouse cursor
   *
   * @private
   * @param {Object} element - The element on which the roi is being drawn.
   * @param {Object} data      Data object associated with the tool.
   * @param {*} coords
   * @returns {Number|Object|Boolean}
   */
  _pointNearHandle(element: Element, data: MeasurementData, coords: Coords) {
    if (data.handles === undefined || data.handles.points === undefined) {
      return;
    }

    if (data.visible === false) {
      return;
    }

    for (let i = 0; i < data.handles.points.length; i++) {
      const handleCanvas = external.cornerstone.pixelToCanvas(
        element,
        data.handles.points[i]
      );
      if (
        external.cornerstoneMath.point.distance(handleCanvas, coords) <
        this.distanceHandle
      ) {
        return i;
      }
    }

    // Check to see if mouse in bounding box of textbox
    if (data.handles.textBox) {
      if (pointInsideBoundingBox(data.handles.textBox, coords)) {
        return data.handles.textBox;
      }
    }
  }

  /**
   * Returns a handle if it is close to the mouse cursor (all tools)
   *
   * @private
   * @param {Object} eventData - data object associated with an event.
   * @returns {Object}
   */
  _pointNearHandleAllTools(eventData: EventData) {
    const { currentPoints, element } = eventData;
    const coords = currentPoints!.canvas;
    const toolState = getToolState(element, this.name);

    if (!toolState) {
      return;
    }

    let handleNearby;

    for (let toolIndex = 0; toolIndex < toolState.data.length; toolIndex++) {
      handleNearby = this._pointNearHandle(
        element!,
        toolState.data[toolIndex],
        coords!
      );
      if (handleNearby !== undefined) {
        return {
          handleNearby,
          toolIndex
        };
      }
    }
  }

  /**
   * Gets the current mouse location and stores it in the configuration object.
   *
   * @private
   * @param {Object} eventData The data assoicated with the event.
   * @returns {undefined}
   */
  _getMouseLocation(eventData: EventData) {
    const { currentPoints, image } = eventData;
    // Set the mouseLocation handle
    const config = this.configuration;

    config!.mouseLocation!.handles.start!.x = currentPoints!.image.x;
    config!.mouseLocation!.handles.start!.y = currentPoints!.image.y;
    clipToBox(config!.mouseLocation!.handles.start, image);
  }

  /**
   * Returns true if the proposed location of a new handle is invalid.
   *
   * @private
   * @param {Object} data      Data object associated with the tool.
   * @param {Object} eventData The data assoicated with the event.
   * @returns {Boolean}
   */
  _checkInvalidHandleLocation(data: MeasurementData, eventData: EventData) {
    if (data.handles.points!.length < 2) {
      return true;
    }

    let invalidHandlePlacement;

    if (this._dragging) {
      invalidHandlePlacement = this._checkHandlesPencilMode(data, eventData);
    } else {
      invalidHandlePlacement = this._checkHandlesPolygonMode(data, eventData);
    }

    data.handles.invalidHandlePlacement = invalidHandlePlacement;
  }

  /**
   * Returns true if the proposed location of a new handle is invalid (in polygon mode).
   *
   * @private
   *
   * @param {Object} data - data object associated with the tool.
   * @param {Object} eventData The data assoicated with the event.
   * @returns {Boolean}
   */
  _checkHandlesPolygonMode(data: MeasurementData, eventData: EventData) {
    const config = this.configuration;
    const { element } = eventData;
    const mousePoint = config!.mouseLocation!.handles.start;
    const points = data.handles.points;
    let invalidHandlePlacement = false;

    data.canComplete = false;

    const mouseAtOriginHandle =
      this._isDistanceSmallerThanCompleteSpacingCanvas(
        element!,
        points![0],
        mousePoint!
      );

    if (
      mouseAtOriginHandle &&
      !freehandIntersect.end(points) &&
      points!.length > 2
    ) {
      data.canComplete = true;
      invalidHandlePlacement = false;
    } else {
      invalidHandlePlacement = freehandIntersect.newHandle(mousePoint, points);
    }

    return invalidHandlePlacement;
  }

  /**
   * Returns true if the proposed location of a new handle is invalid (in pencilMode).
   *
   * @private
   * @param {Object} data - data object associated with the tool.
   * @param {Object} eventData The data associated with the event.
   * @returns {Boolean}
   */
  _checkHandlesPencilMode(data: MeasurementData, eventData: EventData) {
    const config = this.configuration;
    const mousePoint = config!.mouseLocation!.handles.start;
    const points = data.handles.points;
    let invalidHandlePlacement = freehandIntersect.newHandle(
      mousePoint,
      points
    );

    if (invalidHandlePlacement === false) {
      invalidHandlePlacement = this._invalidHandlePencilMode(data, eventData);
    }

    return invalidHandlePlacement;
  }

  /**
   * Returns true if the mouse position is far enough from previous points (in pencilMode).
   *
   * @private
   * @param {Object} data - data object associated with the tool.
   * @param {Object} eventData The data associated with the event.
   * @returns {Boolean}
   */
  _invalidHandlePencilMode(data: MeasurementData, eventData: EventData) {
    const config = this.configuration;
    const { element } = eventData;
    const mousePoint = config!.mouseLocation!.handles.start;
    const points = data.handles.points;

    const mouseAtOriginHandle =
      this._isDistanceSmallerThanCompleteSpacingCanvas(
        element!,
        points![0],
        mousePoint!
      );

    if (mouseAtOriginHandle && points!.length > 2) {
      data.canComplete = true;

      return false;
    }

    data.canComplete = false;

    // Compare with all other handles appart from the last one
    for (let i = 1; i < points!.length - 1; i++) {
      if (
        this._isDistanceSmallerThanSpacing(element!, points![i], mousePoint!)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns true if two points are closer than this.configuration.spacing.
   *
   * @private
   * @param  {Object} element     The element on which the roi is being drawn.
   * @param  {Object} p1          The first point, in pixel space.
   * @param  {Object} p2          The second point, in pixel space.
   * @returns {boolean}            True if the distance is smaller than the
   *                              allowed canvas spacing.
   */
  _isDistanceSmallerThanCompleteSpacingCanvas(
    element: Element,
    p1: Handles,
    p2: Handles
  ) {
    const p1Canvas = external.cornerstone.pixelToCanvas(element, p1);
    const p2Canvas = external.cornerstone.pixelToCanvas(element, p2);

    let completeHandleRadius: number | null = null;

    if (this._drawingInteractionType === "Mouse") {
      completeHandleRadius = this.configuration!.completeHandleRadius;
    } else if (this._drawingInteractionType === "Touch") {
      completeHandleRadius = this.configuration!.completeHandleRadiusTouch!;
    }

    return this._compareDistanceToSpacing(
      element,
      p1Canvas,
      p2Canvas,
      "<",
      completeHandleRadius as number
    );
  }

  /**
   * Returns true if two points are closer than this.configuration.spacing.
   *
   * @private
   * @param  {Object} element     The element on which the roi is being drawn.
   * @param  {Object} p1          The first point, in pixel space.
   * @param  {Object} p2          The second point, in pixel space.
   * @returns {boolean}            True if the distance is smaller than the
   *                              allowed canvas spacing.
   */
  _isDistanceSmallerThanSpacing(element: Element, p1: Handles, p2: Handles) {
    return this._compareDistanceToSpacing(element, p1, p2, "<");
  }

  /**
   * Returns true if two points are farther than this.configuration.spacing.
   *
   * @private
   * @param  {Object} element     The element on which the roi is being drawn.
   * @param  {Object} p1          The first point, in pixel space.
   * @param  {Object} p2          The second point, in pixel space.
   * @returns {boolean}            True if the distance is smaller than the
   *                              allowed canvas spacing.
   */
  _isDistanceLargerThanSpacing(element: Element, p1: Handles, p2: Handles) {
    return this._compareDistanceToSpacing(element, p1, p2, ">");
  }

  /**
   * Compares the distance between two points to this.configuration.spacing.
   *
   * @private
   * @param  {Object} element     The element on which the roi is being drawn.
   * @param  {Object} p1          The first point, in pixel space.
   * @param  {Object} p2          The second point, in pixel space.
   * @param  {string} comparison  The comparison to make.
   * @param  {number} spacing     The allowed canvas spacing
   * @returns {boolean}           True if the distance is smaller than the
   *                              allowed canvas spacing.
   */
  _compareDistanceToSpacing(
    element: Element,
    p1: Handles,
    p2: Handles,
    comparison = ">",
    spacing = this.configuration!.spacing
  ) {
    if (comparison === ">") {
      return external.cornerstoneMath.point.distance(p1, p2) > spacing!;
    }

    return external.cornerstoneMath.point.distance(p1, p2) < spacing!;
  }

  /**
   * Adds drawing loop event listeners.
   *
   * @private
   * @param {Object} element - The viewport element to add event listeners to.
   * @param {string} interactionType - The interactionType used for the loop.
   * @modifies {element}
   * @returns {undefined}
   */
  _activateDraw(element: Element, interactionType: string = "Mouse") {
    this._drawing = true;
    this._drawingInteractionType = interactionType;

    state.isMultiPartToolActive = true;
    hideToolCursor(this.element!);

    // Polygonal Mode
    element.addEventListener(
      "mouseup",
      this._drawingMouseUpCallback as unknown as EventListenerObject
    );
    element.addEventListener(EVENTS.MOUSE_DOWN, this._drawingMouseDownCallback);
    element.addEventListener(EVENTS.MOUSE_MOVE, this._drawingMouseMoveCallback);
    element.addEventListener(
      EVENTS.MOUSE_DOUBLE_CLICK,
      this._drawingMouseDoubleClickCallback
    );

    // Drag/Pencil Mode
    element.addEventListener(EVENTS.MOUSE_DRAG, this._drawingMouseDragCallback);
    element.addEventListener(EVENTS.MOUSE_UP, this._drawingMouseUpCallback);

    // Touch
    element.addEventListener(
      EVENTS.TOUCH_START,
      this._drawingMouseMoveCallback
    );
    element.addEventListener(
      EVENTS.TOUCH_START,
      this._drawingTouchStartCallback
    );

    element.addEventListener(EVENTS.TOUCH_DRAG, this._drawingTouchDragCallback);
    element.addEventListener(EVENTS.TOUCH_END, this._drawingMouseUpCallback);
    element.addEventListener(
      EVENTS.DOUBLE_TAP,
      this._drawingDoubleTapClickCallback
    );

    external.cornerstone.updateImage(element);
  }

  /**
   * Removes drawing loop event listeners.
   *
   * @private
   * @param {Object} element - The viewport element to add event listeners to.
   * @modifies {element}
   * @returns {undefined}
   */
  _deactivateDraw(element: Element) {
    this._drawing = false;
    state.isMultiPartToolActive = false;
    this._activeDrawingToolReference = null;
    this._drawingInteractionType = null;
    setToolCursor(this.element!, this.svgCursor);

    element.removeEventListener(
      "mouseup",
      this._drawingMouseUpCallback as unknown as EventListenerObject
    );
    element.removeEventListener(
      EVENTS.MOUSE_DOWN,
      this._drawingMouseDownCallback
    );
    element.removeEventListener(
      EVENTS.MOUSE_MOVE,
      this._drawingMouseMoveCallback
    );
    element.removeEventListener(
      EVENTS.MOUSE_DOUBLE_CLICK,
      this._drawingMouseDoubleClickCallback
    );
    element.removeEventListener(
      EVENTS.MOUSE_DRAG,
      this._drawingMouseDragCallback
    );
    element.removeEventListener(EVENTS.MOUSE_UP, this._drawingMouseUpCallback);

    // Touch
    element.removeEventListener(
      EVENTS.TOUCH_START,
      this._drawingTouchStartCallback
    );
    element.removeEventListener(
      EVENTS.TOUCH_DRAG,
      this._drawingTouchDragCallback
    );
    element.removeEventListener(
      EVENTS.TOUCH_START,
      this._drawingMouseMoveCallback
    );
    element.removeEventListener(EVENTS.TOUCH_END, this._drawingMouseUpCallback);

    external.cornerstone.updateImage(element);
  }

  /**
   * Adds modify loop event listeners.
   *
   * @private
   * @param {Object} element - The viewport element to add event listeners to.
   * @modifies {element}
   * @returns {undefined}
   */
  _activateModify(element: Element) {
    //this._deactivateModify(element);
    this._deactivateModifyAll(element);
    state.isToolLocked = true;
    this.index = null;
    this.modifying = false;
    this.pointNear = null;
    this.element = element;

    element.addEventListener(
      "mouseup",
      this._editMouseUpCallback as unknown as EventListenerObject
    );

    element.addEventListener(EVENTS.MOUSE_DRAG, this._editMouseDragCallback);
    element.addEventListener(EVENTS.MOUSE_CLICK, this._editMouseUpCallback);

    element.addEventListener(EVENTS.TOUCH_END, this._editMouseUpCallback);
    element.addEventListener(EVENTS.TOUCH_DRAG, this._editTouchDragCallback);

    external.cornerstone.updateImage(element);
  }

  /**
   * Adds modify loop event listeners for Roi translation.
   *
   * @private
   * @param {Object} element - The viewport element to add event listeners to.
   * @modifies {element}
   * @returns {undefined}
   */
  _activateModifyAll(element: Element) {
    this._deactivateModifyAll(element);
    this._deactivateModify(element);
    this.modifyingAll = false;
    this.element = element;
    element.addEventListener(
      "mouseup",
      this._editMouseUpAllCallback as unknown as EventListenerObject
    );
    element.addEventListener(EVENTS.MOUSE_DRAG, this._editMouseDragAllCallback);
    element.addEventListener(EVENTS.MOUSE_CLICK, this._editMouseUpAllCallback);

    element.addEventListener(EVENTS.TOUCH_END, this._editMouseUpAllCallback);
    element.addEventListener(EVENTS.TOUCH_DRAG, this._editTouchDragAllCallback);

    external.cornerstone.updateImage(element);
  }

  /**
   * Removes modify loop event listeners.
   *
   * @private
   * @param {Object} element - The viewport element to add event listeners to.
   * @modifies {element}
   * @returns {undefined}
   */
  _deactivateModify(element: Element) {
    element.removeEventListener(
      "mouseup",
      this._editMouseUpCallback as unknown as EventListenerObject
    );
    element.removeEventListener(EVENTS.MOUSE_DRAG, this._editMouseDragCallback);
    element.removeEventListener(EVENTS.MOUSE_CLICK, this._editMouseUpCallback);
    element.removeEventListener(EVENTS.TOUCH_END, this._editMouseUpCallback);
    element.removeEventListener(EVENTS.TOUCH_DRAG, this._editTouchDragCallback);

    state.isToolLocked = false;
  }

  /**
   * Removes modify loop event listeners for Roi translation.
   *
   * @private
   * @param {Object} element - The viewport element to add event listeners to.
   * @modifies {element}
   * @returns {undefined}
   */
  _deactivateModifyAll(element: Element) {
    element.removeEventListener(EVENTS.MOUSE_UP, this._editMouseUpAllCallback);
    element.removeEventListener(
      EVENTS.MOUSE_DRAG,
      this._editMouseDragAllCallback
    );
    element.removeEventListener(
      EVENTS.MOUSE_CLICK,
      this._editMouseUpAllCallback
    );

    element.removeEventListener(EVENTS.TOUCH_END, this._editMouseUpAllCallback);
    element.removeEventListener(
      EVENTS.TOUCH_DRAG,
      this._editTouchDragAllCallback
    );
  }

  passiveCallback(element: Element) {
    this._closeToolIfDrawing(element);
  }

  enabledCallback(element: Element) {
    this._closeToolIfDrawing(element);
  }

  disabledCallback(element: Element) {
    this._closeToolIfDrawing(element);
  }

  _closeToolIfDrawing(element: Element) {
    if (this._drawing) {
      // Actively drawing but changed mode.
      const config = this.configuration;
      const lastHandlePlaced = config!.currentHandle;

      this._endDrawing(element, lastHandlePlaced);
      external.cornerstone.updateImage(element);
    }
  }

  /**
   * Fire MEASUREMENT_MODIFIED event on provided element
   * @param {any} element which freehand data has been modified
   * @param {any} measurementData the measurment data
   * @returns {void}
   */
  fireModifiedEvent(element: Element, measurementData: MeasurementData) {
    const eventType = EVENTS.MEASUREMENT_MODIFIED;
    const eventData = {
      toolName: this.name,
      toolType: this.name, // Deprecation notice: toolType will be replaced by toolName
      element,
      measurementData
    };

    triggerEvent(element, eventType, eventData);
  }

  fireCompletedEvent(element: Element, measurementData: MeasurementData) {
    const eventType = EVENTS.MEASUREMENT_COMPLETED;
    const eventData = {
      toolName: this.name,
      toolType: this.name, // Deprecation notice: toolType will be replaced by toolName
      element,
      measurementData
    };

    triggerEvent(element, eventType, eventData);
  }

  // ===================================================================
  // Public Configuration API. .
  // ===================================================================

  get spacing() {
    return this.configuration!.spacing;
  }

  set spacing(value) {
    if (typeof value !== "number") {
      throw new Error(
        "Attempting to set freehand spacing to a value other than a number."
      );
    }

    this.configuration!.spacing = value;
    external.cornerstone.updateImage(this.element);
  }

  get activeHandleRadius() {
    return this.configuration!.activeHandleRadius;
  }

  set activeHandleRadius(value) {
    if (typeof value !== "number") {
      throw new Error(
        "Attempting to set freehand activeHandleRadius to a value other than a number."
      );
    }

    this.configuration!.activeHandleRadius = value;
    external.cornerstone.updateImage(this.element);
  }

  get completeHandleRadius() {
    return this.configuration!.completeHandleRadius;
  }

  set completeHandleRadius(value) {
    if (typeof value !== "number") {
      throw new Error(
        "Attempting to set freehand completeHandleRadius to a value other than a number."
      );
    }

    this.configuration!.completeHandleRadius = value;
    external.cornerstone.updateImage(this.element);
  }

  get alwaysShowHandles() {
    return this.configuration!.alwaysShowHandles;
  }

  set alwaysShowHandles(value) {
    if (typeof value !== "boolean") {
      throw new Error(
        "Attempting to set freehand alwaysShowHandles to a value other than a boolean."
      );
    }

    this.configuration!.alwaysShowHandles = value;
    external.cornerstone.updateImage(this.element);
  }

  get invalidColor() {
    return this.configuration!.invalidColor;
  }

  set invalidColor(value) {
    /*
      It'd be easy to check if the color was e.g. a valid rgba color. However
      it'd be difficult to check if the color was a named CSS color without
      bloating the library, so we don't. If the canvas can't intepret the color
      it'll show up grey.
    */

    this.configuration!.invalidColor = value;
    external.cornerstone.updateImage(this.element);
  }

  /**
   * Ends the active drawing loop and removes the polygon.
   *
   * @public
   * @param {Object} element - The element on which the roi is being drawn.
   * @returns {null}
   */
  cancelDrawing(element: Element) {
    if (!this._drawing) {
      return;
    }
    const toolState = getToolState(element, this.name);

    const config = this.configuration;

    const data = toolState.data[config!.currentTool];

    data.active = false;
    data.highlight = false;
    data.handles.invalidHandlePlacement = false;

    // Reset the current handle
    config!.currentHandle = 0;
    config!.currentTool = -1;
    data.canComplete = false;

    removeToolState(element, this.name, data);
    this.data = data;
    this._deactivateDraw(element);

    external.cornerstone.updateImage(element);
  }

  /**
   * New image event handler.
   *
   * @public
   * @param  {Object} evt The event.
   * @returns {null}
   */
  newImageCallback(evt: MeasurementMouseEvent) {
    const config = this.configuration;

    if (!(this._drawing && this._activeDrawingToolReference)) {
      return;
    }

    // Actively drawing but scrolled to different image.

    const element = evt.detail.element;
    const data = this._activeDrawingToolReference;

    data.active = false;
    data.highlight = false;
    data.handles.invalidHandlePlacement = false;

    // Connect the end handle to the origin handle
    const points = data.handles.points;

    points![config!.currentHandle - 1].lines!.push(points![0]);

    // Reset the current handle
    config!.currentHandle = 0;
    config!.currentTool = -1;
    data.canComplete = false;

    this._deactivateDraw(element!);

    external.cornerstone.updateImage(element);
  }
}

function defaultFreehandConfiguration() {
  return {
    mouseLocation: {
      handles: {
        start: {
          highlight: true,
          active: true
        }
      }
    },
    spacing: 1,
    activeHandleRadius: 6,
    completeHandleRadius: 6,
    completeHandleRadiusTouch: 28,
    alwaysShowHandles: false,
    invalidColor: "crimson",
    currentHandle: 0,
    currentTool: -1,
    drawHandles: true,
    renderDashed: false
  };
}

function preventPropagation(evt: MeasurementMouseEvent) {
  evt.stopImmediatePropagation!();
  evt.stopPropagation!();
  evt.preventDefault!();
}

/**
 * Creates an SVG Cursor for the target element
 *
 * @param {HTMLElement} element - The DOM Element to draw on
 * @param {MouseCursor} svgCursor - The cursor.
 * @returns {void}
 */
function setToolCursor(element: Element, svgCursor: typeof freehandRoiCursor) {
  if (!globalConfiguration.configuration.showSVGCursors) {
    return;
  }
  // TODO: (state vs options) Exit if cursor wasn't updated
  // TODO: Exit if invalid options to create cursor

  // Note: Max size of an SVG cursor is 128x128, default is 32x32.
  const cursorBlob = svgCursor.getIconWithPointerSVG();
  const mousePoint = svgCursor.mousePoint;

  const svgCursorUrl = window.URL.createObjectURL(cursorBlob);

  //@ts-ignore
  element.style.cursor = `url('${svgCursorUrl}') ${mousePoint}, auto`;

  state.svgCursorUrl = svgCursorUrl;
}

function hideToolCursor(element: Element) {
  if (!globalConfiguration.configuration.showSVGCursors) {
    return;
  }

  _clearStateAndSetCursor(element, "none");
}

function _clearStateAndSetCursor(element: Element, cursorSeting: string) {
  if (state.svgCursorUrl) {
    window.URL.revokeObjectURL(state.svgCursorUrl);
  }

  state.svgCursorUrl = null;
  //@ts-ignore
  element.style.cursor = cursorSeting;
}
