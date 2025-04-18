/** @module imaging/tools/polygonSegmentationMixin
 *  @desc  This file ovverides `freehandSegmentationMixin`'s
 *         `renderToolData` method
 */

// external libraries
import cornerstoneTools from "cornerstone-tools";
import {
  Coords,
  MeasurementData,
  MeasurementMouseEvent,
  WSEventData
} from "../types";
import PolylineScissorsTool from "./polylineScissorsTool";
const external = cornerstoneTools.external;
const draw = cornerstoneTools.importInternal("drawing/draw");
const drawJoinedLines = cornerstoneTools.importInternal(
  "drawing/drawJoinedLines"
);
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const { getDiffBetweenPixelData } = cornerstoneTools.importInternal(
  "util/segmentationUtils"
);
const { getters, setters } = cornerstoneTools.getModule("segmentation");

/**
 * Global var, identify when first point has already been placed
 */
let isDrawing = false;

/**
 * Override for `freehandSegmentationMixin`'s `renderToolData` method to render a polyline instead
 * of a freehand region with the first and last point connected. Apply after the `freehandSegmentationMixin`.
 *
 * @override
 * @param {MeasurementMouseEvent} evt The cornerstone render event.
 * @returns {null}
 */
function renderToolData(
  this: PolylineScissorsTool,
  evt: MeasurementMouseEvent
) {
  const eventData = evt.detail;
  const { element } = eventData;
  const color = getters.brushColor(element, true);
  const context = getNewContext(eventData.canvasContext.canvas);
  const handles = this.handles;

  draw(context, (context: CanvasRenderingContext2D) => {
    const isNotTheFirstHandle = handles.points.length > 1;

    if (isNotTheFirstHandle) {
      for (let j = 0; j < handles.points.length; j++) {
        const lines = [...handles.points[j].lines];

        drawJoinedLines(context, element, this.handles.points[j], lines, {
          color
        });
      }
    }
  });
}

/**
 * Returns a handle of a particular tool if it is close to the mouse cursor
 *
 * @private
 * @param {Element} element - The element on which the roi is being drawn.
 * @param {PolylineScissorsTool} data      Data object associated with the tool.
 * @param {Coords} coords
 * @returns {Number|Object|Boolean}
 */
function _pointNearHandle(
  element: Element,
  data: PolylineScissorsTool,
  coords: Coords
) {
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

    if (external.cornerstoneMath.point.distance(handleCanvas, coords) < 6) {
      return true;
    }
  }
}

/**
 * Entry point, manage workflow starting / ending
 * @param {MeasurementMouseEvent} evt
 */

function _checkIfDrawing(
  this: PolylineScissorsTool,
  evt: MeasurementMouseEvent
) {
  const { currentPoints, element } = evt.detail;
  const coords = currentPoints.canvas;
  let data = this;

  if (isDrawing && _pointNearHandle(element, data, coords)) {
    _applyStrategy.call(this, evt);
  } else if (isDrawing) {
    _setHandlesAndUpdate.call(this, evt);
  } else {
    isDrawing = true;
    _startOutliningRegion.call(this, evt);
  }
}

/**
 * Sets the start handle point and claims the eventDispatcher event
 *
 * @private
 * @param {MeasurementMouseEvent} evt // mousedown, touchstart, click
 * @returns {void|null}
 */
function _startOutliningRegion(
  this: PolylineScissorsTool,
  evt: MeasurementMouseEvent
) {
  const element = evt.detail.element;
  const image = evt.detail.currentPoints.image;
  const points = this.handles.points;

  points.push({
    x: image.x,
    y: image.y,
    lines: []
  });

  this.currentHandle += 1;

  external.cornerstone.updateImage(element);
}

/**
 * This function will update the handles and updateImage to force re-draw
 *
 * @private
 * @method _setHandlesAndUpdate
 * @param {(CornerstoneTools.event#TOUCH_DRAG|CornerstoneTools.event#MOUSE_DRAG|CornerstoneTools.event#MOUSE_MOVE)} evt  Interaction event emitted by an enabledElement
 * @returns {void}
 */
function _setHandlesAndUpdate(
  this: PolylineScissorsTool,
  evt: MeasurementMouseEvent
) {
  const eventData = evt.detail;
  const element = evt.detail.element;

  this._addPoint(eventData);
  external.cornerstone.updateImage(element);
}

/**
 * Event handler for MOUSE_UP/TOUCH_END during handle drag event loop.
 *
 * @private
 * @method _applyStrategy
 * @param {MeasurementMouseEvent} evt Interaction event emitted by an enabledElement
 * @returns {void}
 */
function _applyStrategy(
  this: PolylineScissorsTool,
  evt: MeasurementMouseEvent
) {
  const points = this.handles.points;
  const { element } = evt.detail;

  const { labelmap2D, labelmap3D, currentImageIdIndex } =
    getters.labelmap2D(element);

  const pixelData = labelmap2D.pixelData;
  const previousPixeldata = pixelData.slice();

  const operationData = {
    points,
    pixelData,
    segmentIndex: labelmap3D.activeSegmentIndex,
    segmentationMixinType: `freehandSegmentationMixin`
  };

  this.applyActiveStrategy(evt, operationData);

  const operation = {
    imageIdIndex: currentImageIdIndex,
    diff: getDiffBetweenPixelData(previousPixeldata, pixelData)
  };

  setters.pushState(this.element, [operation]);

  // Invalidate the brush tool data so it is redrawn
  setters.updateSegmentsOnLabelmap2D(labelmap2D);
  external.cornerstone.updateImage(element);

  this._resetHandles();
}

/**
 * Sets the start and end handle points to empty objects
 *
 * @private
 * @method _resetHandles
 * @returns {undefined}
 */
function _resetHandles(this: PolylineScissorsTool) {
  this.handles = {
    points: []
  };

  isDrawing = false;

  this.currentHandle = 0;
}

/**
 * Adds a point on mouse click in polygon mode.
 *
 * @private
 * @param {WSEventData} evt - data object associated with an event.
 * @returns {void}
 */
function _addPoint(this: PolylineScissorsTool, evt: WSEventData) {
  const points = this.handles.points;

  if (points.length) {
    // Add the line from the current handle to the new handle
    points[this.currentHandle - 1].lines.push({
      x: evt.currentPoints.image.x,
      y: evt.currentPoints.image.y,
      lines: []
    });
  }

  // Add the new handle
  points.push({
    x: evt.currentPoints.image.x,
    y: evt.currentPoints.image.y,
    lines: []
  });

  // Increment the current handle value
  this.currentHandle += 1;

  // Force onImageRendered to fire
  external.cornerstone.updateImage(evt.element);
}

/**
 * @mixin polygonSegmentationMixin - segmentation operations for polyline
 * @memberof Mixins
 */
export default {
  mouseClickCallback: _checkIfDrawing,
  initializeMixin: _resetHandles,
  renderToolData,
  _resetHandles,
  _addPoint,
  _applyStrategy
};
