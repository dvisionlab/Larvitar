import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import {
  Coords,
  EventData,
  HandlePosition,
  HandleTextBox,
  MeasurementData
} from "../types";

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
const { lengthCursor } = cornerstoneTools.importInternal("tools/cursors");
const setShadow = cornerstoneTools.importInternal("drawing/setShadow");
const lineSegDistance = cornerstoneTools.importInternal("util/lineSegDistance");
const moveHandleNearImagePoint = cornerstoneTools.importInternal(
  "manipulators/moveHandleNearImagePoint"
);
const getToolState = cornerstoneTools.getToolState;
const addToolState = cornerstoneTools.addToolState;
const EVENTS = cornerstoneTools.EVENTS;
const toolColors = cornerstoneTools.toolColors;
// triggerEvent non è esposto direttamente su cornerstoneTools v4:
// si usa cornerstone.triggerEvent (da cornerstone-core) oppure
// l'utility interna. cornerstone-core lo espone come named export.
const triggerEvent = (cornerstone as any).triggerEvent as (
  el: HTMLElement,
  eventName: string,
  detail: object
) => void;

interface CobbAngleHandles {
  point0: HandlePosition;
  point1: HandlePosition;
  point2?: HandlePosition;
  point3?: HandlePosition;
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

/**
 * Compute the Euclidean distance between two points.
 * @function
 * @param {Coords} a - First point.
 * @param {Coords} b - Second point.
 * @returns {number} Distance between the points.
 */
function dist2(a: Coords, b: Coords): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Compute the midpoint between two coordinates.
 * @function
 * @param {Coords} a - First endpoint.
 * @param {Coords} b - Second endpoint.
 * @returns {Coords} Midpoint of the two coordinates.
 */
function midpoint2(a: Coords, b: Coords): Coords {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function _drawCobbAngleIntersection(
  ctx: CanvasRenderingContext2D,
  element: HTMLElement,
  p0: Coords,
  p1: Coords,
  p2: Coords,
  p3: Coords,
  color: string
): void {
  const c0 = cornerstone.pixelToCanvas(element, p0 as any);
  const c1 = cornerstone.pixelToCanvas(element, p1 as any);
  const c2 = cornerstone.pixelToCanvas(element, p2 as any);
  const c3 = cornerstone.pixelToCanvas(element, p3 as any);

  const mid1 = { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 };
  const mid2 = { x: (c2.x + c3.x) / 2, y: (c2.y + c3.y) / 2 };

  const dir1 = { x: c1.x - c0.x, y: c1.y - c0.y };
  const dir2 = { x: c3.x - c2.x, y: c3.y - c2.y };

  const n1 = { x: -dir1.y, y: dir1.x };
  const n2 = { x: -dir2.y, y: dir2.x };

  const det = n1.x * n2.y - n1.y * n2.x;

  if (Math.abs(det) > 1e-6) {
    const dx = mid2.x - mid1.x;
    const dy = mid2.y - mid1.y;

    const t = (dx * n2.y - dy * n2.x) / det;
    const intersect = {
      x: mid1.x + t * n1.x,
      y: mid1.y + t * n1.y
    };

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(mid1.x, mid1.y);
    ctx.lineTo(intersect.x, intersect.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mid2.x, mid2.y);
    ctx.lineTo(intersect.x, intersect.y);
    ctx.stroke();

    ctx.setLineDash([]);

    const v1 = { x: mid1.x - intersect.x, y: mid1.y - intersect.y };
    const v2 = { x: mid2.x - intersect.x, y: mid2.y - intersect.y };

    const a1 = Math.atan2(v1.y, v1.x);
    const a2 = Math.atan2(v2.y, v2.x);

    let diff = a2 - a1;
    while (diff <= -Math.PI) diff += 2 * Math.PI;
    while (diff > Math.PI) diff -= 2 * Math.PI;

    const dist1 = Math.hypot(v1.x, v1.y);
    const dist2 = Math.hypot(v2.x, v2.y);
    const radius = Math.min(30, dist1 * 0.8, dist2 * 0.8);

    ctx.beginPath();
    if (diff > 0) {
      ctx.arc(intersect.x, intersect.y, radius, a1, a2);
    } else {
      ctx.arc(intersect.x, intersect.y, radius, a2, a1);
    }
    ctx.stroke();

    ctx.restore();
  }
}
/**
 * Compute the angle between two lines in degrees.
 * @function
 * @param {[Coords, Coords]} l1 - First line endpoints.
 * @param {[Coords, Coords]} l2 - Second line endpoints.
 * @returns {number} Angle between the lines in degrees.
 */
function angleBetweenLines(l1: [Coords, Coords], l2: [Coords, Coords]): number {
  const v1 = { x: l1[1].x - l1[0].x, y: l1[1].y - l1[0].y };
  const v2 = { x: l2[1].x - l2[0].x, y: l2[1].y - l2[0].y };
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);
  if (m1 === 0 || m2 === 0) return 0;
  const cos = (v1.x * v2.x + v1.y * v2.y) / (m1 * m2);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

/**
 * Order segment endpoints for consistent Cobb angle computation.
 * @function
 * @param {Coords} p0 - First endpoint of segment one.
 * @param {Coords} p1 - Second endpoint of segment one.
 * @param {Coords} p2 - First endpoint of segment two.
 * @param {Coords} p3 - Second endpoint of segment two.
 * @returns {{ s1a: Coords, s1b: Coords, s2a: Coords, s2b: Coords }} Ordered endpoints.
 */
function orderEndpoints(
  p0: Coords,
  p1: Coords,
  p2: Coords,
  p3: Coords
): { s1a: Coords; s1b: Coords; s2a: Coords; s2b: Coords } {
  const candidates = [
    { d: dist2(p1, p2), s1a: p0, s1b: p1, s2a: p2, s2b: p3 },
    { d: dist2(p1, p3), s1a: p0, s1b: p1, s2a: p3, s2b: p2 },
    { d: dist2(p0, p2), s1a: p1, s1b: p0, s2a: p2, s2b: p3 },
    { d: dist2(p0, p3), s1a: p1, s1b: p0, s2a: p3, s2b: p2 }
  ];
  candidates.sort((a, b) => a.d - b.d);
  return candidates[0];
}

/**
 * Compute a point along a vector at a fixed length.
 * @function
 * @param {Coords} from - Origin point.
 * @param {Coords} toward - Direction point.
 * @param {number} len - Distance from the origin.
 * @returns {Coords} Derived point along the vector.
 */
function arcPointFrom(from: Coords, toward: Coords, len: number): Coords {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return { ...from };
  return { x: from.x + (dx / mag) * len, y: from.y + (dy / mag) * len };
}

/**
 * Compute Cobb angle statistics from two line segments.
 * @function
 * @param {Coords} p0 - First point of the first segment.
 * @param {Coords} p1 - Second point of the first segment.
 * @param {Coords} p2 - First point of the second segment.
 * @param {Coords} p3 - Second point of the second segment.
 * @returns {{ cobbAngle: number, arc1Angle: number, arc2Angle: number, arcPoints: { arc1Start: Coords, arc1End: Coords, arc2Start: Coords, arc2End: Coords } }}
 */
function computeCobbStats(p0: Coords, p1: Coords, p2: Coords, p3: Coords) {
  const { s1a, s1b, s2a, s2b } = orderEndpoints(p0, p1, p2, p3);
  const cobbAngle = angleBetweenLines([s1b, s1a], [s2a, s2b]);

  const mid1 = midpoint2(s1a, s1b);
  const mid2 = midpoint2(s2a, s2b);
  const linkLen = dist2(mid1, mid2);
  const ratio = 0.1;
  const midLink = midpoint2(mid1, mid2);

  const rawA1 = angleBetweenLines([s1a, s1b], [mid1, mid2]);
  const rawA2 = angleBetweenLines([s2a, s2b], [mid1, mid2]);

  const arc1Side = rawA1 > 90 ? 1 : 0;
  const arc2Side = rawA2 > 90 ? 0 : 1;

  const firstLine: [Coords, Coords] = [s1a, s1b];
  const secondLine: [Coords, Coords] = [s2a, s2b];

  return {
    cobbAngle,
    arc1Angle: rawA1 > 90 ? 180 - rawA1 : rawA1,
    arc2Angle: rawA2 > 90 ? 180 - rawA2 : rawA2,
    arcPoints: {
      arc1Start: arcPointFrom(mid1, firstLine[arc1Side], linkLen * ratio),
      arc1End: arcPointFrom(mid1, midLink, linkLen * ratio),
      arc2Start: arcPointFrom(mid2, secondLine[arc2Side], linkLen * ratio),
      arc2End: arcPointFrom(mid2, midLink, linkLen * ratio)
    }
  };
}

type DrawPhase = "idle" | "seg1Move" | "seg2Wait" | "seg2Move";

/**
 * Cobb angle annotation tool for measuring spinal curvature.
 * @class
 */
export default class CobbAngleTool extends BaseAnnotationTool {
  _phase: DrawPhase = "idle";

  /**
   * Create a new CobbAngleTool instance.
   * @instance
   * @param {object} [props={}] - Tool configuration properties.
   */
  constructor(props: any = {}) {
    super(props, {
      name: "CobbAngle",
      supportedInteractionTypes: ["Mouse", "Touch"],
      svgCursor: lengthCursor,
      configuration: {
        shadow: true,
        drawHandles: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        renderDashed: false,
        showArcLines: false
      }
    });
  }

  /**
   * Create a new measurement object while a segment is being drawn.
   * @instance
   * @function
   * @param {EventData} eventData - Current event data from the interaction.
   * @returns {CobbAngleMeasurementData|undefined} New measurement data or undefined.
   */
  createNewMeasurement(
    eventData: EventData
  ): CobbAngleMeasurementData | undefined {
    if (!eventData?.currentPoints?.image) return undefined;
    const { x, y } = eventData.currentPoints.image;

    return {
      visible: true,
      active: true,
      color: undefined,
      invalidated: true,
      complete: false,
      value: undefined,
      handles: {
        point0: { x, y, highlight: true, active: false },
        point1: { x, y, highlight: true, active: true },
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
   * Add a new measurement and begin the drawing interaction.
   * @instance
   * @function
   * @param {{detail: EventData}} evt - Event wrapper containing the interaction detail.
   * @param {string} [_interactionType="mouse"] - Interaction type used to add the measurement.
   * @returns {void}
   */
  addNewMeasurement(
    evt: { detail: EventData },
    _interactionType = "mouse"
  ): void {
    if (this._phase !== "idle") return;

    const eventData = evt.detail;
    const { element } = eventData;

    const data = this.createNewMeasurement(eventData);
    if (!data) return;

    this._phase = "seg1Move";
    addToolState(element, this.name, data);
    cornerstone.updateImage(element);

    setTimeout(() => {
      this._activateDraw(element);
    }, 0);

    (evt as any).stopImmediatePropagation?.();
  }

  /**
   * Determine whether a point is near one of the tool segments.
   * @instance
   * @function
   * @param {HTMLElement} element - DOM element containing the image.
   * @param {CobbAngleMeasurementData} data - Measurement data for the tool.
   * @param {Coords} coords - Image coordinates to test.
   * @param {string} [interactionType="mouse"] - Interaction type reference.
   * @returns {boolean} True when the point is near the tool.
   */
  pointNearTool(
    element: HTMLElement,
    data: CobbAngleMeasurementData,
    coords: Coords,
    interactionType = "mouse"
  ): boolean {
    if (!data?.handles || data.visible === false) return false;
    const prox = interactionType === "mouse" ? 6 : 16;
    const h = data.handles;
    if (this._segDistPixel(element, h.point0, h.point1, coords) < prox)
      return true;
    if (
      h.point2 &&
      h.point3 &&
      this._segDistPixel(element, h.point2, h.point3, coords) < prox
    )
      return true;
    return false;
  }

  /**
   * Compute the minimum distance from a point to either tool segment.
   * @instance
   * @function
   * @param {HTMLElement} element - DOM element containing the image.
   * @param {CobbAngleMeasurementData} data - Measurement data to evaluate.
   * @param {Coords} coords - Image coordinates for the distance check.
   * @returns {number} Minimum distance in pixels.
   */
  distanceFromPoint(
    element: HTMLElement,
    data: CobbAngleMeasurementData,
    coords: Coords
  ): number {
    const h = data.handles;
    const d1 = this._segDistPixel(element, h.point0, h.point1, coords);
    const d2 =
      h.point2 && h.point3
        ? this._segDistPixel(element, h.point2, h.point3, coords)
        : Infinity;
    return Math.min(d1, d2);
  }

  /**
   * Render the tool graphics onto the canvas.
   * @instance
   * @function
   * @param {{detail: EventData}} evt - Event wrapper containing the render context.
   * @returns {void}
   */
  renderToolData(evt: { detail: EventData }): void {
    const eventData = evt.detail;
    const { element, canvasContext } = eventData;
    const toolData = getToolState(element, this.name) as
      | { data: CobbAngleMeasurementData[] }
      | undefined;

    if (!toolData?.data?.length) return;

    const context = getNewContext(canvasContext.canvas);
    const { shadow, showArcLines } = this.configuration;

    draw(context, (ctx: CanvasRenderingContext2D) => {
      for (const data of toolData.data) {
        if (data.visible === false) continue;

        const color = data.active
          ? toolColors.getActiveColor()
          : data.color || toolColors.getToolColor();

        if (shadow) setShadow(ctx, this.configuration);

        const h = data.handles;

        drawLine(ctx, element, h.point0, h.point1, { color }, "pixel");

        if (h.point2 != null && h.point3 != null) {
          drawLine(ctx, element, h.point2, h.point3, { color }, "pixel");

          _drawCobbAngleIntersection(
            ctx,
            element,
            h.point0,
            h.point1,
            h.point2,
            h.point3,
            color
          );
        }

        if (this.configuration.drawHandles) {
          const pts: Record<string, HandlePosition> = {
            point0: h.point0,
            point1: h.point1
          };
          if (h.point2) pts.point2 = h.point2;
          if (h.point3) pts.point3 = h.point3;
          drawHandles(ctx, eventData, pts, { color });
        }

        if (!data.complete || data.value == null) continue;

        const text = `${data.value.toFixed(2)}\u00B0`;

        const canvasPts = [h.point0, h.point1, h.point2!, h.point3!].map(p =>
          cornerstone.pixelToCanvas(element, p as any)
        );

        if (!h.textBox.hasMoved) {
          h.textBox.x = canvasPts.reduce((s, p) => s + p.x, 0) / 4;
          h.textBox.y = canvasPts.reduce((s, p) => s + p.y, 0) / 4;
        }

        const boundingBox = drawLinkedTextBox(
          ctx,
          element,
          h.textBox,
          text,
          canvasPts,
          (anchors: Coords[]) => _nearestPoint(anchors, canvasPts),
          color,
          0,
          0,
          0
        );
        if (boundingBox) h.textBox.boundingBox = boundingBox;

        if (showArcLines && data.arcPoints) {
          const { arc1Start, arc1End, arc2Start, arc2End } = data.arcPoints;
          _drawArcLabel(
            ctx,
            element,
            arc1Start,
            arc1End,
            `${data.arc1Angle?.toFixed(2) ?? ""}°`,
            color
          );
          _drawArcLabel(
            ctx,
            element,
            arc2Start,
            arc2End,
            `${data.arc2Angle?.toFixed(2) ?? ""}°`,
            color
          );
        }
      }
    });
  }

  /**
   * Attach drawing event listeners to the element.
   * @instance
   * @function
   * @param {HTMLElement} element - DOM element to attach draw listeners to.
   * @returns {void}
   */
  _activateDraw(element: HTMLElement): void {
    element.addEventListener(
      EVENTS.MOUSE_MOVE,
      this._onMouseMove as any as EventListener
    );
    element.addEventListener(
      EVENTS.MOUSE_CLICK,
      this._onMouseClick as any as EventListener
    );
    element.addEventListener(
      EVENTS.TOUCH_DRAG,
      this._onMouseMove as any as EventListener
    );
    element.addEventListener(
      EVENTS.TOUCH_TAP,
      this._onMouseClick as any as EventListener
    );
  }

  /**
   * Remove drawing event listeners from the element.
   * @instance
   * @function
   * @param {HTMLElement} element - DOM element to detach draw listeners from.
   * @returns {void}
   */
  _deactivateDraw(element: HTMLElement): void {
    element.removeEventListener(
      EVENTS.MOUSE_MOVE,
      this._onMouseMove as any as EventListener
    );
    element.removeEventListener(
      EVENTS.MOUSE_CLICK,
      this._onMouseClick as any as EventListener
    );
    element.removeEventListener(
      EVENTS.TOUCH_DRAG,
      this._onMouseMove as any as EventListener
    );
    element.removeEventListener(
      EVENTS.TOUCH_TAP,
      this._onMouseClick as any as EventListener
    );
  }

  /**
   * Handle mouse or touch drag events while drawing a segment.
   * @instance
   * @function
   * @param {{detail: EventData}} evt - Event wrapper containing interaction details.
   * @returns {void}
   */
  _onMouseMove = (evt: { detail: EventData }): void => {
    if (this._phase === "idle" || this._phase === "seg2Wait") return;

    const { element, currentPoints } = evt.detail;
    const { x, y } = currentPoints.image;

    const toolData = getToolState(element, this.name) as
      | { data: CobbAngleMeasurementData[] }
      | undefined;
    if (!toolData?.data.length) return;

    const data = toolData.data[toolData.data.length - 1];
    const h = data.handles;

    if (this._phase === "seg1Move" && h.point1) {
      h.point1.x = x;
      h.point1.y = y;
    } else if (this._phase === "seg2Move" && h.point3) {
      h.point3.x = x;
      h.point3.y = y;
    }

    data.invalidated = true;
    cornerstone.updateImage(element);
  };

  /**
   * Handle click or tap events during drawing phases.
   * @instance
   * @function
   * @param {{detail: EventData}} evt - Event wrapper containing interaction detail.
   * @returns {void}
   */
  _onMouseClick = (evt: { detail: EventData }): void => {
    if (this._phase === "idle") return;

    const { element, currentPoints, image } = evt.detail;
    const { x, y } = currentPoints.image;

    const toolData = getToolState(element, this.name) as
      | { data: CobbAngleMeasurementData[] }
      | undefined;
    if (!toolData?.data.length) return;

    const data = toolData.data[toolData.data.length - 1];
    const h = data.handles;

    if (this._phase === "seg1Move") {
      const dist = Math.hypot(h.point0.x - x, h.point0.y - y);
      if (dist < 2) {
        return;
      }

      h.point1.x = x;
      h.point1.y = y;
      h.point1.active = false;
      this._phase = "seg2Wait";
      data.invalidated = true;
      cornerstone.updateImage(element);
      return;
    }

    if (this._phase === "seg2Wait") {
      h.point2 = { x, y, highlight: true, active: false };
      h.point3 = { x, y, highlight: true, active: true };
      this._phase = "seg2Move";
      data.invalidated = true;
      cornerstone.updateImage(element);
      return;
    }

    if (this._phase === "seg2Move") {
      h.point3!.x = x;
      h.point3!.y = y;
      h.point3!.active = false;
      data.complete = true;
      data.active = false;
      this._phase = "idle";

      this._updateStats(image, element, data);
      this._deactivateDraw(element);

      triggerEvent(element, EVENTS.MEASUREMENT_COMPLETED, {
        toolName: this.name,
        toolType: this.name,
        element,
        measurementData: data
      });

      cornerstone.updateImage(element);
    }
  };

  /**
   * Callback invoked when a handle is selected for dragging.
   * @instance
   * @function
   * @param {{detail: EventData}} evt - Event wrapper containing interaction detail.
   * @param {CobbAngleMeasurementData} data - Measurement data for the selected tool.
   * @param {HandlePosition} handle - Handle being dragged.
   * @param {string} [interactionType="mouse"] - Interaction type used for dragging.
   * @returns {void}
   */
  handleSelectedCallback(
    evt: { detail: EventData },
    data: CobbAngleMeasurementData,
    handle: HandlePosition,
    interactionType = "mouse"
  ): void {
    if (!handle) return;

    moveHandleNearImagePoint(evt, this, data, handle, interactionType, () => {
      this._updateStats(evt.detail.image, evt.detail.element, data);
      cornerstone.updateImage(evt.detail.element);
    });
  }

  /**
   * Callback invoked when the tool annotation itself is selected.
   * @instance
   * @function
   * @param {{detail: EventData}} evt - Event wrapper containing interaction detail.
   * @param {CobbAngleMeasurementData} annotation - Selected annotation data.
   * @param {string} [interactionType="mouse"] - Interaction type used for selection.
   * @returns {void}
   */
  toolSelectedCallback(
    evt: { detail: EventData },
    annotation: CobbAngleMeasurementData,
    interactionType = "mouse"
  ): void {
    const { element, currentPoints } = evt.detail;
    const h = annotation.handles;

    const clickCanvas = cornerstone.pixelToCanvas(
      element,
      currentPoints.image as any
    ) as Coords;

    const d1 = this._segDistCanvas(element, h.point0, h.point1, clickCanvas);
    const d2 =
      h.point2 && h.point3
        ? this._segDistCanvas(element, h.point2, h.point3, clickCanvas)
        : Infinity;
    const moveFirstLine = d1 <= d2;

    let lastImage = { ...currentPoints.image };

    const onMove = (moveEvt: Event) => {
      const detail = (moveEvt as any).detail as EventData;
      if (!detail?.currentPoints?.image) return;
      const { x, y } = detail.currentPoints.image;
      const dx = x - lastImage.x;
      const dy = y - lastImage.y;
      lastImage = { x, y };

      if (moveFirstLine) {
        h.point0.x += dx;
        h.point0.y += dy;
        h.point1.x += dx;
        h.point1.y += dy;
      } else {
        h.point2!.x += dx;
        h.point2!.y += dy;
        h.point3!.x += dx;
        h.point3!.y += dy;
      }

      annotation.invalidated = true;
      cornerstone.updateImage(element);
    };

    const onUp = (upEvt: Event) => {
      element.removeEventListener(EVENTS.MOUSE_MOVE, onMove);
      element.removeEventListener(EVENTS.MOUSE_UP, onUp);
      element.removeEventListener(EVENTS.TOUCH_DRAG, onMove);
      element.removeEventListener(EVENTS.TOUCH_END, onUp);
      this._updateStats((upEvt as any).detail?.image, element, annotation);
      cornerstone.updateImage(element);
    };

    element.addEventListener(EVENTS.MOUSE_MOVE, onMove);
    element.addEventListener(EVENTS.MOUSE_UP, onUp);
    element.addEventListener(EVENTS.TOUCH_DRAG, onMove);
    element.addEventListener(EVENTS.TOUCH_END, onUp);
  }

  /**
   * Update cached statistics for an annotation after image or layout changes.
   * @instance
   * @function
   * @param {cornerstone.Image} image - Current image object.
   * @param {HTMLElement} element - DOM element containing the image.
   * @param {CobbAngleMeasurementData} data - Measurement data to update.
   * @returns {void}
   */
  updateCachedStats(
    image: cornerstone.Image,
    element: HTMLElement,
    data: CobbAngleMeasurementData
  ): void {
    this._updateStats(image, element, data);
  }

  /**
   * Recalculate measurement statistics and cache results.
   * @instance
   * @function
   * @param {cornerstone.Image|undefined} _image - Current image object.
   * @param {HTMLElement} _element - DOM element containing the image.
   * @param {CobbAngleMeasurementData} data - Measurement data to recalculate.
   * @returns {void}
   */
  _updateStats(
    _image: cornerstone.Image | undefined,
    _element: HTMLElement,
    data: CobbAngleMeasurementData
  ): void {
    if (!data.complete) return;
    const h = data.handles;
    if (!h.point2 || !h.point3) return;

    const { cobbAngle, arc1Angle, arc2Angle, arcPoints } = computeCobbStats(
      h.point0,
      h.point1,
      h.point2,
      h.point3
    );

    data.value = cobbAngle;
    data.arc1Angle = arc1Angle;
    data.arc2Angle = arc2Angle;
    data.arcPoints = arcPoints;
    data.invalidated = false;
  }

  /**
   * Compute distance from a canvas point to a segment defined in pixel coordinates.
   * @instance
   * @function
   * @param {HTMLElement} element - DOM element containing the image.
   * @param {Coords} p1 - First endpoint of the segment.
   * @param {Coords} p2 - Second endpoint of the segment.
   * @param {Coords} canvasCoords - Canvas coordinates to measure from.
   * @returns {number} Distance from the point to the segment in canvas space.
   */
  _segDistCanvas(
    element: HTMLElement,
    p1: Coords,
    p2: Coords,
    canvasCoords: Coords
  ): number {
    const c1 = cornerstone.pixelToCanvas(element, p1 as any);
    const c2 = cornerstone.pixelToCanvas(element, p2 as any);
    return lineSegDistance(element, c1, c2, canvasCoords);
  }

  /**
   * Compute distance from an image pixel point to a segment.
   * @instance
   * @function
   * @param {HTMLElement} element - DOM element containing the image.
   * @param {Coords} p1 - First endpoint of the segment.
   * @param {Coords} p2 - Second endpoint of the segment.
   * @param {Coords} pixelCoords - Image pixel coordinates to measure from.
   * @returns {number} Distance from the point to the segment.
   */
  _segDistPixel(
    element: HTMLElement,
    p1: Coords,
    p2: Coords,
    pixelCoords: Coords
  ): number {
    const canvasCoords = cornerstone.pixelToCanvas(
      element,
      pixelCoords as any
    ) as Coords;
    return this._segDistCanvas(element, p1, p2, canvasCoords);
  }
}

function _drawArcLabel(
  ctx: CanvasRenderingContext2D,
  element: HTMLElement,
  p1: Coords,
  p2: Coords,
  text: string,
  color: string
): void {
  const c1 = cornerstone.pixelToCanvas(element, p1 as any);
  const c2 = cornerstone.pixelToCanvas(element, p2 as any);
  ctx.save();
  ctx.font = "12px sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, (c1.x + c2.x) / 2, (c1.y + c2.y) / 2);
  ctx.restore();
}

/**
 * Find the nearest anchor point from a set of line anchors.
 * @function
 * @param {Coords[]} textBoxAnchors - Candidate anchor points from the textbox.
 * @param {Coords[]} lineAnchors - Candidate anchor points from the line geometry.
 * @returns {Coords} Nearest point on the line.
 */
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
