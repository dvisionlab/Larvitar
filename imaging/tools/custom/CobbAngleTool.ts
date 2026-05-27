import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import {
  Coords,
  EventData,
  HandlePosition,
  HandleTextBox,
  MeasurementData
} from "../types";

// ---------------------------------------------------------------------------
// Internal CS-tools imports  (v4 API)
// ---------------------------------------------------------------------------
const BaseAnnotationTool = cornerstoneTools.importInternal(
  "base/BaseAnnotationTool"
);
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const draw = cornerstoneTools.importInternal("drawing/draw");
const drawLine = cornerstoneTools.importInternal("drawing/drawLine");
const drawHandles = cornerstoneTools.importInternal("drawing/drawHandles");
const drawLinkedTextBox = cornerstoneTools.importInternal(
  "drawing/drawLinkedTextBox"
);
const setShadow = cornerstoneTools.importInternal("drawing/setShadow");
const lineSegDistance = cornerstoneTools.importInternal("util/lineSegDistance");
const moveHandleNearImagePoint = cornerstoneTools.importInternal(
  "manipulators/moveHandleNearImagePoint"
);
const getToolState = cornerstoneTools.getToolState;
const addToolState = cornerstoneTools.addToolState;
const removeToolState = cornerstoneTools.removeToolState;
const EVENTS = cornerstoneTools.EVENTS;
const toolStyle = cornerstoneTools.toolStyle;
const toolColors = cornerstoneTools.toolColors;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CobbAngleHandles {
  points: HandlePosition[]; // always length 2 or 4: [p0,p1] then [p0,p1,p2,p3]
  textBox: HandleTextBox;
}

type CobbAngleMeasurementData = MeasurementData & {
  complete: boolean;
  value?: number;
  arc1Angle?: number;
  arc2Angle?: number;
  arcPoints?: {
    arc1Start: Coords;
    arc1End: Coords;
    arc2Start: Coords;
    arc2End: Coords;
  };
  handles: CobbAngleHandles;
};

interface CobbAngleConfiguration {
  shadow: boolean;
  drawHandles: boolean;
  drawHandlesOnHover: boolean;
  hideHandlesIfMoving: boolean;
  renderDashed: boolean;
  showArcLines: boolean;
}

// ---------------------------------------------------------------------------
// Geometry helpers  (ported from CS3D, framework-agnostic)
// ---------------------------------------------------------------------------

function dist2(a: Coords, b: Coords): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Coords, b: Coords): Coords {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Angle (degrees) between two line segments, each given as [start, end].
 * Mirrors CS3D's `angleBetweenLines`.
 */
function angleBetweenLines(
  line1: [Coords, Coords],
  line2: [Coords, Coords]
): number {
  const v1 = { x: line1[1].x - line1[0].x, y: line1[1].y - line1[0].y };
  const v2 = { x: line2[1].x - line2[0].x, y: line2[1].y - line2[0].y };
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const dot = (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2);
  return (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
}

/**
 * Re-order the four handle points so that points[1] and points[2] are the
 * closest pair across the two segments, matching CS3D's endpoint-ordering
 * logic in `_calculateCachedStats`.
 *
 * Returns a canonical [seg1Start, seg1End, seg2Start, seg2End] tuple where
 * seg1End ↔ seg2Start is the "near" side.
 */
function orderSegmentEndpoints(
  pts: HandlePosition[]
): [HandlePosition, HandlePosition, HandlePosition, HandlePosition] {
  const [p0, p1, p2, p3] = pts;
  const pairs: Array<{
    d: number;
    s1s: HandlePosition;
    s1e: HandlePosition;
    s2s: HandlePosition;
    s2e: HandlePosition;
  }> = [
    { d: dist2(p1, p2), s1s: p0, s1e: p1, s2s: p2, s2e: p3 },
    { d: dist2(p1, p3), s1s: p0, s1e: p1, s2s: p3, s2e: p2 },
    { d: dist2(p0, p2), s1s: p1, s1e: p0, s2s: p2, s2e: p3 },
    { d: dist2(p0, p3), s1s: p1, s1e: p0, s2s: p3, s2e: p2 }
  ];
  pairs.sort((a, b) => a.d - b.d);
  const { s1s, s1e, s2s, s2e } = pairs[0];
  return [s1s, s1e, s2s, s2e];
}

/**
 * Compute angle + arc indicator segment endpoints.
 * Matches CS3D's `getArcsStartEndPoints` exactly.
 */
function computeCobbStats(pts: HandlePosition[]): {
  cobbAngle: number;
  arc1Angle: number;
  arc2Angle: number;
  arcPoints: {
    arc1Start: Coords;
    arc1End: Coords;
    arc2Start: Coords;
    arc2End: Coords;
  };
} {
  const [s1s, s1e, s2s, s2e] = orderSegmentEndpoints(pts);

  // Canvas coords as simple Coords objects (already pixel-space here)
  const firstLine: [Coords, Coords] = [s1s, s1e];
  const secondLine: [Coords, Coords] = [s2s, s2e];

  const mid1 = midpoint(firstLine[0], firstLine[1]);
  const mid2 = midpoint(secondLine[0], secondLine[1]);
  const linkLine: [Coords, Coords] = [mid1, mid2];

  const linkLineLength = dist2(mid1, mid2);
  const ratio = 0.1;

  const arc1Angle = angleBetweenLines(firstLine, linkLine);
  const arc2Angle = angleBetweenLines(secondLine, linkLine);

  const arc1Side = arc1Angle > 90 ? 1 : 0;
  const arc2Side = arc2Angle > 90 ? 0 : 1;

  const midLinkLine = midpoint(mid1, mid2);
  const midFirstLine = midpoint(firstLine[0], firstLine[1]);
  const midSecondLine = midpoint(secondLine[0], secondLine[1]);

  function arcPoint(
    fromMidLine: Coords,
    towardPoint: Coords,
    length: number
  ): Coords {
    const dx = towardPoint.x - fromMidLine.x;
    const dy = towardPoint.y - fromMidLine.y;
    const mag = Math.hypot(dx, dy);
    if (mag === 0) return fromMidLine;
    return {
      x: fromMidLine.x + (dx / mag) * length,
      y: fromMidLine.y + (dy / mag) * length
    };
  }

  const arc1Start = arcPoint(
    midFirstLine,
    firstLine[arc1Side],
    linkLineLength * ratio
  );
  const arc1End = arcPoint(mid1, midLinkLine, linkLineLength * ratio);
  const arc2Start = arcPoint(
    midSecondLine,
    secondLine[arc2Side],
    linkLineLength * ratio
  );
  const arc2End = arcPoint(mid2, midLinkLine, linkLineLength * ratio);

  // CS3D uses angleBetweenLines(seg1, seg2) for the Cobb angle where
  // seg1 = [s1e→s1s] and seg2 = [s2s→s2e] (tail-to-tail from the near side).
  const cobbAngle = angleBetweenLines([s1e, s1s], [s2s, s2e]);

  return {
    cobbAngle,
    arc1Angle: arc1Angle > 90 ? 180 - arc1Angle : arc1Angle,
    arc2Angle: arc2Angle > 90 ? 180 - arc2Angle : arc2Angle,
    arcPoints: { arc1Start, arc1End, arc2Start, arc2End }
  };
}

// ---------------------------------------------------------------------------
// CobbAngleTool
// ---------------------------------------------------------------------------

/**
 * CobbAngleTool – CS-tools v4 port of the CS3D CobbAngle tool.
 *
 * Drawing interaction (identical to CS3D):
 *   1. Click + drag  → segment 1.
 *   2. Mouse-up      → segment 1 committed; cursor resets.
 *   3. Click + drag  → segment 2.
 *   4. Mouse-up      → measurement complete; angle computed.
 *
 * After completion:
 *   • Drag either line to translate that segment.
 *   • Drag any handle to reposition individual endpoints.
 *   • Drag the text box freely.
 *
 * Configuration:
 *   shadow, drawHandles, drawHandlesOnHover, hideHandlesIfMoving,
 *   renderDashed, showArcLines (default false – set true to draw
 *   the short indicator segments like CS3D).
 */
export default class CobbAngleTool extends BaseAnnotationTool {
  angleStartedNotYetCompleted: boolean;
  configuration: CobbAngleConfiguration;

  // Track whether we are currently moving an entire line (not just a handle).
  // Stored as 0 (first line) | 1 (second line) | null.
  _movingLineIndex: 0 | 1 | null = null;
  _lastDragPoint: Coords | null = null;

  constructor(props: any = {}) {
    const defaultProps = {
      name: "CobbAngle",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        shadow: true,
        drawHandles: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        renderDashed: false,
        showArcLines: false
      }
    };

    super(props, defaultProps);
    this.angleStartedNotYetCompleted = false;
  }

  // -------------------------------------------------------------------------
  // createNewMeasurement
  // -------------------------------------------------------------------------

  createNewMeasurement(
    eventData: EventData
  ): CobbAngleMeasurementData | undefined {
    if (this.angleStartedNotYetCompleted) return undefined;

    const goodEventData = eventData?.currentPoints?.image;

    if (!goodEventData) {
      console.warn("CobbAngleTool: bad event data");
      return undefined;
    }

    this.angleStartedNotYetCompleted = true;

    const { x, y } = eventData.currentPoints.image;

    // Start with only the two handles for segment 1.
    // points[2] and points[3] are added when the second interaction begins.
    return {
      visible: true,
      active: true,
      color: undefined,
      invalidated: true,
      complete: false,
      value: undefined,
      handles: {
        points: [
          { x, y, highlight: true, active: false },
          { x, y, highlight: true, active: true } // being dragged
        ],
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

  // -------------------------------------------------------------------------
  // pointNearTool
  // -------------------------------------------------------------------------

  pointNearTool(
    element: HTMLElement,
    data: CobbAngleMeasurementData,
    coords: Coords,
    interactionType = "mouse"
  ): boolean {
    if (!data?.handles || data.visible === false) return false;

    const proximity = interactionType === "mouse" ? 6 : 16;
    const pts = data.handles.points;

    const nearSeg1 =
      pts.length >= 2 &&
      this._segmentDistance(element, pts[0], pts[1], coords) < proximity;

    const nearSeg2 =
      pts.length === 4 &&
      this._segmentDistance(element, pts[2], pts[3], coords) < proximity;

    return nearSeg1 || nearSeg2;
  }

  // -------------------------------------------------------------------------
  // distanceFromPoint
  // -------------------------------------------------------------------------

  distanceFromPoint(
    element: HTMLElement,
    data: CobbAngleMeasurementData,
    coords: Coords
  ): number {
    const pts = data.handles.points;
    const d1 =
      pts.length >= 2
        ? this._segmentDistance(element, pts[0], pts[1], coords)
        : Infinity;
    const d2 =
      pts.length === 4
        ? this._segmentDistance(element, pts[2], pts[3], coords)
        : Infinity;
    return Math.min(d1, d2);
  }

  // -------------------------------------------------------------------------
  // renderToolData
  // -------------------------------------------------------------------------

  renderToolData(evt: { detail: EventData }): void {
    const eventData = evt.detail;
    const { element, canvasContext } = eventData;
    const toolData = getToolState(element, this.name) as
      | { data: CobbAngleMeasurementData[] }
      | undefined;

    if (!toolData?.data?.length) return;

    const context = getNewContext(canvasContext.canvas);
    const { renderDashed, shadow, showArcLines } = this.configuration;
    const lineDash = renderDashed ? [4, 4] : undefined;

    draw(context, (ctx: CanvasRenderingContext2D) => {
      for (const data of toolData.data) {
        if (data.visible === false) continue;

        const color = data.active
          ? toolColors.getActiveColor()
          : data.color || toolColors.getToolColor();

        if (shadow) setShadow(ctx, this.configuration);

        const pts = data.handles.points;

        // ---- Segment 1 (always present) ----
        drawLine(ctx, element, pts[0], pts[1], { color, lineDash }, "pixel");

        // ---- Segment 2 (present once second interaction started) ----
        if (pts.length === 4) {
          drawLine(ctx, element, pts[2], pts[3], { color, lineDash }, "pixel");

          // Dashed link line between midpoints (matches CS3D)
          const mid1Canvas = _midpointCanvas(element, pts[0], pts[1]);
          const mid2Canvas = _midpointCanvas(element, pts[2], pts[3]);
          _drawDashedLine(ctx, mid1Canvas, mid2Canvas, color);

          // ---- Arc indicator segments ----
          if (showArcLines && data.complete && data.arcPoints) {
            const { arc1Start, arc1End, arc2Start, arc2End } = data.arcPoints;
            drawLine(
              ctx,
              element,
              arc1Start,
              arc1End,
              { color, lineDash: undefined },
              "pixel"
            );
            drawLine(
              ctx,
              element,
              arc2Start,
              arc2End,
              { color, lineDash: undefined },
              "pixel"
            );
          }
        }

        // ---- Handles ----
        if (this.configuration.drawHandles) {
          // Build a named-key object that drawHandles accepts
          const handleMap: Record<string, HandlePosition> = {};
          pts.forEach((p, i) => {
            handleMap[`p${i}`] = p;
          });
          drawHandles(ctx, eventData, handleMap, { color, lineDash });
        }

        // ---- Text box ----
        if (!data.complete || data.value == null) continue;

        const text = `${data.value.toFixed(2)}\u00B0`;

        const canvasPts = pts.map(p =>
          cornerstone.pixelToCanvas(element, p as any)
        );

        if (!data.handles.textBox.hasMoved) {
          const cx = canvasPts.reduce((s, p) => s + p.x, 0) / canvasPts.length;
          const cy = canvasPts.reduce((s, p) => s + p.y, 0) / canvasPts.length;
          data.handles.textBox.x = cx;
          data.handles.textBox.y = cy;
        }

        const anchorPoints = canvasPts;
        const boundingBox = drawLinkedTextBox(
          ctx,
          element,
          data.handles.textBox,
          text,
          anchorPoints,
          (textBoxAnchors: Coords[]) =>
            _nearestPoint(textBoxAnchors, anchorPoints),
          color,
          0,
          0,
          0
        );

        if (boundingBox) {
          data.handles.textBox.boundingBox = boundingBox;
        }

        // ---- Arc angle text boxes (when showArcLines is on) ----
        if (showArcLines && data.arcPoints) {
          const { arc1Start, arc1End, arc2Start, arc2End } = data.arcPoints;
          _drawArcLabel(
            ctx,
            element,
            arc1Start,
            arc1End,
            `${data.arc1Angle?.toFixed(2) ?? ""}°`,
            color,
            eventData
          );
          _drawArcLabel(
            ctx,
            element,
            arc2Start,
            arc2End,
            `${data.arc2Angle?.toFixed(2) ?? ""}°`,
            color,
            eventData
          );
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // Mouse / touch event hooks
  // -------------------------------------------------------------------------

  /**
   * postMouseDownCallback
   *
   * Called after the framework's own mousedown handling.
   *
   * Phase A (handleIndex 1 active): first segment is being dragged – nothing
   *   extra needed, the framework moves it.
   * Phase B (handleIndex 1 inactive, points.length === 2): segment 1 is done,
   *   user just clicked to start segment 2 → plant points[2] and points[3].
   * Phase C (handleIndex 3 active): segment 2 is being dragged.
   */
  postMouseDownCallback(evt: { detail: EventData }): boolean {
    if (!this.angleStartedNotYetCompleted) return false;

    const { element, currentPoints } = evt.detail;
    const toolData = getToolState(element, this.name) as
      | { data: CobbAngleMeasurementData[] }
      | undefined;
    if (!toolData?.data.length) return false;

    const data = toolData.data[toolData.data.length - 1];
    const pts = data.handles.points;

    // Only intercept when segment 1 is committed and segment 2 not yet started.
    if (pts[1].active) return false; // still drawing segment 1
    if (pts.length === 4) return false; // segment 2 already planted

    const { x, y } = currentPoints.image;
    pts.push(
      { x, y, highlight: true, active: false },
      { x, y, highlight: true, active: true }
    );

    cornerstone.updateImage(element);
    return true; // swallow: don't create a new measurement
  }

  /**
   * mouseMoveCallback
   *
   * Tracks whichever endpoint is currently active.
   */
  mouseMoveCallback(evt: { detail: EventData }): boolean {
    if (!this.angleStartedNotYetCompleted) return false;

    const { element, currentPoints } = evt.detail;
    const toolData = getToolState(element, this.name) as
      | { data: CobbAngleMeasurementData[] }
      | undefined;
    if (!toolData?.data.length) return false;

    const data = toolData.data[toolData.data.length - 1];
    if (!data.active) return false;

    const pts = data.handles.points;
    const activeHandle = pts.find(p => p.active);
    if (activeHandle) {
      activeHandle.x = currentPoints.image.x;
      activeHandle.y = currentPoints.image.y;
      data.invalidated = true;
      cornerstone.updateImage(element);
    }
    return true;
  }

  /**
   * postMouseUpCallback / postTouchEndCallback
   *
   * Drives the two-phase state machine:
   *   • End of segment 1 drag → deactivate pts[1], wait for segment 2 click.
   *   • End of segment 2 drag → mark complete, compute angle.
   */
  postMouseUpCallback(evt: { detail: EventData }): boolean {
    this._commitSegment(evt);
    return false;
  }

  postTouchEndCallback(evt: { detail: EventData }): boolean {
    this._commitSegment(evt);
    return false;
  }
  getHandles(data: CobbAngleMeasurementData) {
    // Return a plain object of named handles — the framework iterates
    // the values and sets .moving on the one nearest the cursor.
    const map: Record<string, HandlePosition> = {};
    data.handles.points.forEach((p, i) => {
      map[`point${i}`] = p;
    });
    // Always include the textBox so it stays draggable too.
    map.textBox = data.handles.textBox as any;
    return map;
  }
  /**
   * handleSelectedCallback
   *
   * Drag an individual handle to move a single endpoint.
   */
  handleSelectedCallback(
    evt: { detail: EventData },
    toolData: CobbAngleMeasurementData,
    handle: HandlePosition,
    interactionType = "mouse"
  ): void {
    if (!handle) return;
    moveHandleNearImagePoint(
      evt,
      this,
      toolData,
      handle,
      interactionType,
      () => {
        this.updateCachedStats(evt.detail.image, evt.detail.element, toolData);
        cornerstone.updateImage(evt.detail.element);
      }
    );
  }

  /**
   * toolSelectedCallback
   *
   * Called when the user clicks on a line body (not a handle).
   * Identifies which segment was clicked and starts a whole-line drag,
   * matching CS3D's `toolSelectedCallback` behaviour.
   */
  toolSelectedCallback(
    evt: { detail: EventData },
    annotation: CobbAngleMeasurementData,
    interactionType = "mouse"
  ): void {
    const { element, currentPoints } = evt.detail;
    const canvasCoords = cornerstone.pixelToCanvas(
      element,
      currentPoints.image as any
    ) as Coords;

    const pts = annotation.handles.points;
    const proximity = interactionType === "mouse" ? 6 : 16;

    const d1 =
      pts.length >= 2
        ? this._segmentDistance(element, pts[0], pts[1], canvasCoords)
        : Infinity;
    const d2 =
      pts.length === 4
        ? this._segmentDistance(element, pts[2], pts[3], canvasCoords)
        : Infinity;

    this._movingLineIndex = d1 <= d2 ? 0 : 1;
    this._lastDragPoint = { ...currentPoints.image };

    // Attach drag + up listeners directly (mirrors CS3D _activateModify pattern)
    const onDrag = (dragEvt: { detail: EventData }) => {
      const { currentPoints: cp } = dragEvt.detail;
      if (this._lastDragPoint == null) return;

      const dx = cp.image.x - this._lastDragPoint.x;
      const dy = cp.image.y - this._lastDragPoint.y;
      this._lastDragPoint = { ...cp.image };

      const base = this._movingLineIndex === 0 ? 0 : 2;
      pts[base].x += dx;
      pts[base].y += dy;
      pts[base + 1].x += dx;
      pts[base + 1].y += dy;

      annotation.invalidated = true;
      cornerstone.updateImage(element);
    };

    const onUp = (upEvt: { detail: EventData }) => {
      element.removeEventListener(EVENTS.MOUSE_DRAG, onDrag as any);
      element.removeEventListener(EVENTS.MOUSE_UP, onUp as any);
      this._movingLineIndex = null;
      this._lastDragPoint = null;
      this.updateCachedStats(upEvt.detail.image, element, annotation);
      cornerstone.updateImage(element);
    };

    element.addEventListener(EVENTS.MOUSE_DRAG, onDrag as any);
    element.addEventListener(EVENTS.MOUSE_UP, onUp as any);
  }

  /**
   * updateCachedStats
   *
   * Recomputes the Cobb angle and arc points whenever data is invalidated.
   */
  updateCachedStats(
    image: cornerstone.Image,
    element: HTMLElement,
    data: CobbAngleMeasurementData
  ): void {
    if (!data.complete) return;
    const pts = data.handles.points;
    if (pts.length !== 4) return;

    const { cobbAngle, arc1Angle, arc2Angle, arcPoints } =
      computeCobbStats(pts);

    data.value = cobbAngle;
    data.arc1Angle = arc1Angle;
    data.arc2Angle = arc2Angle;
    data.arcPoints = arcPoints;
    data.invalidated = false;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  _commitSegment(evt: { detail: EventData }): void {
    const { element, image } = evt.detail;
    const toolData = getToolState(element, this.name) as
      | { data: CobbAngleMeasurementData[] }
      | undefined;
    if (!toolData?.data.length) return;

    const data = toolData.data[toolData.data.length - 1];
    if (!data.active) return;

    const pts = data.handles.points;

    if (pts[1]?.active) {
      // Segment 1 just finished
      pts[1].active = false;
      // points[2]/[3] will be added by postMouseDownCallback on next click
    } else if (pts.length === 4 && pts[3]?.active) {
      // Segment 2 just finished
      pts[3].active = false;
      data.complete = true;
      data.active = false;
      this.angleStartedNotYetCompleted = false;

      this.updateCachedStats(image, element, data);

      cornerstoneTools.triggerEvent(element, EVENTS.MEASUREMENT_COMPLETED, {
        toolName: this.name,
        toolType: this.name,
        element,
        measurementData: data
      });
    }

    cornerstone.updateImage(element);
  }

  _segmentDistance(
    element: HTMLElement,
    p1: Coords,
    p2: Coords,
    canvasCoords: Coords
  ): number {
    const c1 = cornerstone.pixelToCanvas(element, p1 as any);
    const c2 = cornerstone.pixelToCanvas(element, p2 as any);
    return lineSegDistance(element, c1, c2, canvasCoords);
  }
}

// ---------------------------------------------------------------------------
// Module-level helpers
// ---------------------------------------------------------------------------

function _midpointCanvas(element: HTMLElement, p1: Coords, p2: Coords): Coords {
  const c1 = cornerstone.pixelToCanvas(element, p1 as any);
  const c2 = cornerstone.pixelToCanvas(element, p2 as any);
  return { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
}

function _drawDashedLine(
  ctx: CanvasRenderingContext2D,
  a: Coords,
  b: Coords,
  color: string
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw a plain text label at the midpoint of an arc indicator segment.
 * Mirrors CS3D's `drawTextBoxSvg` arc labels.
 */
function _drawArcLabel(
  ctx: CanvasRenderingContext2D,
  element: HTMLElement,
  p1: Coords,
  p2: Coords,
  text: string,
  color: string,
  _eventData: EventData
): void {
  const c1 = cornerstone.pixelToCanvas(element, p1 as any);
  const c2 = cornerstone.pixelToCanvas(element, p2 as any);
  const mx = (c1.x + c2.x) / 2;
  const my = (c1.y + c2.y) / 2;

  ctx.save();
  ctx.font = "12px sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, mx, my);
  ctx.restore();
}

function _nearestPoint(
  textBoxAnchors: Coords[],
  lineAnchors: Coords[]
): Coords {
  let best = lineAnchors[0];
  let bestDist = Infinity;
  for (const tba of textBoxAnchors) {
    for (const la of lineAnchors) {
      const d = Math.hypot(tba.x - la.x, tba.y - la.y);
      if (d < bestDist) {
        bestDist = d;
        best = la;
      }
    }
  }
  return best;
}
