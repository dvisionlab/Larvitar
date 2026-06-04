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
  handles: CobbAngleHandles;
};

/**
 * Compute the Euclidean distance between two points.
 */
function dist2(a: Coords, b: Coords): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Compute the midpoint between two coordinates.
 */
function midpoint2(a: Coords, b: Coords): Coords {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Compute the angle between two lines in degrees, strictly returning the acute angle.
 */
function angleBetweenLines(l1: [Coords, Coords], l2: [Coords, Coords]): number {
  const v1 = { x: l1[1].x - l1[0].x, y: l1[1].y - l1[0].y };
  const v2 = { x: l2[1].x - l2[0].x, y: l2[1].y - l2[0].y };
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);
  if (m1 === 0 || m2 === 0) return 0;

  let dot = (v1.x * v2.x + v1.y * v2.y) / (m1 * m2);
  dot = Math.max(-1, Math.min(1, dot));
  let angle = (Math.acos(dot) * 180) / Math.PI;

  // Force acute angle to strictly match standard Cobb Angle measurements
  return angle > 90 ? 180 - angle : angle;
}

/**
 * Order segment endpoints for consistent Cobb angle computation.
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

function _drawCobbAngleIntersection(
  ctx: CanvasRenderingContext2D,
  element: HTMLElement,
  p0: Coords,
  p1: Coords,
  p2: Coords,
  p3: Coords,
  color: string,
  angleText: string // NEW PARAMETER
): void {
  const c0 = cornerstone.pixelToCanvas(element, p0 as any);
  const c1 = cornerstone.pixelToCanvas(element, p1 as any);
  const c2 = cornerstone.pixelToCanvas(element, p2 as any);
  const c3 = cornerstone.pixelToCanvas(element, p3 as any);

  const mid1 = { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 };
  const mid2 = { x: (c2.x + c3.x) / 2, y: (c2.y + c3.y) / 2 };

  const dir1 = { x: c1.x - c0.x, y: c1.y - c0.y };
  const dir2 = { x: c3.x - c2.x, y: c3.y - c2.y };

  const mag1 = Math.hypot(dir1.x, dir1.y);
  const mag2 = Math.hypot(dir2.x, dir2.y);
  if (mag1 === 0 || mag2 === 0) return;

  const toOther1 = { x: mid2.x - mid1.x, y: mid2.y - mid1.y };
  const toOther2 = { x: mid1.x - mid2.x, y: mid1.y - mid2.y };

  let n1 = { x: -dir1.y / mag1, y: dir1.x / mag1 };
  if (n1.x * toOther1.x + n1.y * toOther1.y < 0) {
    n1 = { x: dir1.y / mag1, y: -dir1.x / mag1 };
  }

  let n2 = { x: -dir2.y / mag2, y: dir2.x / mag2 };
  if (n2.x * toOther2.x + n2.y * toOther2.y < 0) {
    n2 = { x: dir2.y / mag2, y: -dir2.x / mag2 };
  }

  const D = n1.y * n2.x - n1.x * n2.y;

  if (Math.abs(D) < 1e-6) {
    const perpLen = Math.hypot(toOther1.x, toOther1.y) * 0.45;
    const pEnd1 = { x: mid1.x + n1.x * perpLen, y: mid1.y + n1.y * perpLen };
    const pEnd2 = { x: mid2.x + n2.x * perpLen, y: mid2.y + n2.y * perpLen };

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mid1.x, mid1.y);
    ctx.lineTo(pEnd1.x, pEnd1.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mid2.x, mid2.y);
    ctx.lineTo(pEnd2.x, pEnd2.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const dx = mid2.x - mid1.x;
  const dy = mid2.y - mid1.y;
  const t1 = (-dx * n2.y + dy * n2.x) / D;

  const I = { x: mid1.x + t1 * n1.x, y: mid1.y + t1 * n1.y };

  const V1 = { x: I.x - mid1.x, y: I.y - mid1.y };
  const V2 = { x: I.x - mid2.x, y: I.y - mid2.y };
  const len1 = Math.hypot(V1.x, V1.y);
  const len2 = Math.hypot(V2.x, V2.y);

  const u1 = len1 > 1e-3 ? { x: V1.x / len1, y: V1.y / len1 } : n1;
  const u2 = len2 > 1e-3 ? { x: V2.x / len2, y: V2.y / len2 } : n2;

  const extLen = 20;
  const pEnd1 = { x: I.x + u1.x * extLen, y: I.y + u1.y * extLen };
  const pEnd2 = { x: I.x + u2.x * extLen, y: I.y + u2.y * extLen };

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.moveTo(mid1.x, mid1.y);
  ctx.lineTo(pEnd1.x, pEnd1.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mid2.x, mid2.y);
  ctx.lineTo(pEnd2.x, pEnd2.y);
  ctx.stroke();

  ctx.setLineDash([]);

  // GUARANTEED ACUTE ANGLE LOGIC
  const dot = u1.x * u2.x + u1.y * u2.y;
  const draw_u1 = u1;
  const draw_u2 = dot >= 0 ? u2 : { x: -u2.x, y: -u2.y };

  const a1 = Math.atan2(draw_u1.y, draw_u1.x);
  const a2 = Math.atan2(draw_u2.y, draw_u2.x);

  const radius = 15;
  let sweep = a2 - a1;
  while (sweep <= -Math.PI) sweep += 2 * Math.PI;
  while (sweep > Math.PI) sweep -= 2 * Math.PI;

  let startAngle = a1;
  let endAngle = a2;
  if (sweep < 0) {
    startAngle = a2;
    endAngle = a1;
    sweep = -sweep;
  }

  // Trova la bisettrice dell'angolo acuto
  const midAngle = startAngle + sweep / 2;

  // Disegno Archetto
  ctx.beginPath();
  ctx.arc(I.x, I.y, radius, startAngle, endAngle);
  ctx.stroke();

  // DRAW TEXT NEAR THE ARC
  if (angleText) {
    const textRadius = radius + 14; // Distanza del testo dall'intersezione
    const textX = I.x + textRadius * Math.cos(midAngle);
    const textY = I.y + textRadius * Math.sin(midAngle);

    ctx.save();
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(angleText, textX, textY);
    ctx.restore();
  }

  ctx.restore();
}

function computeCobbStats(p0: Coords, p1: Coords, p2: Coords, p3: Coords) {
  const { s1a, s1b, s2a, s2b } = orderEndpoints(p0, p1, p2, p3);
  const cobbAngle = angleBetweenLines([s1a, s1b], [s2a, s2b]);

  return { cobbAngle };
}

type DrawPhase = "idle" | "seg1Move" | "seg2Wait" | "seg2Move";

export default class CobbAngleTool extends BaseAnnotationTool {
  _phase: DrawPhase = "idle";

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
        renderDashed: false
      }
    });
  }

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
          hasBoundingBox: true,
          x: x,
          y: y
        }
      }
    };
  }

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

  renderToolData(evt: { detail: EventData }): void {
    const eventData = evt.detail;
    const { element, canvasContext } = eventData;
    const toolData = getToolState(element, this.name) as
      | { data: CobbAngleMeasurementData[] }
      | undefined;

    if (!toolData?.data?.length) return;

    const context = getNewContext(canvasContext.canvas);
    const { shadow } = this.configuration;

    draw(context, (ctx: CanvasRenderingContext2D) => {
      for (const data of toolData.data) {
        if (data.visible === false) continue;

        const color = data.active
          ? toolColors.getActiveColor()
          : data.color || toolColors.getToolColor();

        if (shadow) setShadow(ctx, this.configuration);

        const h = data.handles;

        drawLine(ctx, element, h.point0, h.point1, { color }, "pixel");

        // Calcola dinamicamente il testo durante lo spostamento
        let angleText = "";
        if (h.point2 != null && h.point3 != null) {
          let currentAngle = data.value;
          if (currentAngle === undefined) {
            currentAngle = computeCobbStats(
              h.point0,
              h.point1,
              h.point2,
              h.point3
            ).cobbAngle;
          }
          angleText = `${currentAngle.toFixed(1)}\xB0`;

          drawLine(ctx, element, h.point2, h.point3, { color }, "pixel");

          _drawCobbAngleIntersection(
            ctx,
            element,
            h.point0,
            h.point1,
            h.point2,
            h.point3,
            color,
            angleText
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

        if (!data.complete || data.value === undefined) continue;

        // Render del classico Textbox spostabile (Mantenuto ma puoi nasconderlo se preferisci)
        const canvasPts: Coords[] = [];
        if (h.point0)
          canvasPts.push(cornerstone.pixelToCanvas(element, h.point0 as any));
        if (h.point1)
          canvasPts.push(cornerstone.pixelToCanvas(element, h.point1 as any));
        if (h.point2)
          canvasPts.push(cornerstone.pixelToCanvas(element, h.point2 as any));
        if (h.point3)
          canvasPts.push(cornerstone.pixelToCanvas(element, h.point3 as any));

        if (!h.textBox.hasMoved && canvasPts.length > 0) {
          h.textBox.x =
            canvasPts.reduce((s, p) => s + p.x, 0) / canvasPts.length;
          h.textBox.y =
            canvasPts.reduce((s, p) => s + p.y, 0) / canvasPts.length;
        }

        const boundingBox = drawLinkedTextBox(
          ctx,
          element,
          h.textBox,
          angleText,
          canvasPts,
          (anchors: Coords[]) => _nearestPoint(anchors, canvasPts),
          color,
          1,
          0,
          0
        );
        if (boundingBox) h.textBox.boundingBox = boundingBox;
      }
    });
  }

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
      if (dist < 2) return;

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

  updateCachedStats(
    image: cornerstone.Image,
    element: HTMLElement,
    data: CobbAngleMeasurementData
  ): void {
    this._updateStats(image, element, data);
  }

  _updateStats(
    _image: cornerstone.Image | undefined,
    _element: HTMLElement,
    data: CobbAngleMeasurementData
  ): void {
    if (!data.complete) return;
    const h = data.handles;
    if (!h.point2 || !h.point3) return;

    const { cobbAngle } = computeCobbStats(
      h.point0,
      h.point1,
      h.point2,
      h.point3
    );

    data.value = cobbAngle;
    data.invalidated = false;
  }

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

function _nearestPoint(
  textBoxAnchors: Coords[],
  lineAnchors: Coords[]
): Coords {
  if (!lineAnchors || lineAnchors.length === 0) return { x: 0, y: 0 };
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
