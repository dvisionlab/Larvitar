import cornerstoneTools from "cornerstone-tools";
import cornerstone from "cornerstone-core";
import {
  Coords,
  EventData,
  HandlePosition,
  Handles,
  HandleTextBox,
  MeasurementMouseEvent,
  VHSAnnotationData,
  VHSCachedStats,
  VHSMeasurementState
} from "../types";

const toolColors = cornerstoneTools.toolColors;
const draw = cornerstoneTools.importInternal("drawing/draw");
const drawLine = cornerstoneTools.importInternal("drawing/drawLine");
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const drawHandles = cornerstoneTools.importInternal("drawing/drawHandles");
const drawLinkedTextBox = cornerstoneTools.importInternal(
  "drawing/drawLinkedTextBox"
);
const throttle = cornerstoneTools.importInternal("util/throttle");

const { lengthCursor } = cornerstoneTools.importInternal("tools/cursors");
const BaseAnnotationTool = cornerstoneTools.importInternal(
  "base/BaseAnnotationTool"
);

export default class VHSAnnotationTool extends BaseAnnotationTool {
  private currentState: VHSMeasurementState;
  private currentAnnotation: VHSAnnotationData | null;
  private isDragging: boolean;

  private _throttledMouseMove: (evt: MeasurementMouseEvent) => void;
  private _throttledMouseDrag: (evt: MeasurementMouseEvent) => void;

  constructor(props: Record<string, unknown> = {}) {
    const defaultProps = {
      name: "VHSAnnotation",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        drawHandles: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        clickProximity: 30,
        renderDashed: false
      },
      svgCursor: lengthCursor
    };

    super(props, defaultProps);

    this.currentState = VHSMeasurementState.IDLE;
    this.currentAnnotation = null;
    this.isDragging = false;

    this._throttledMouseMove = throttle(this._mouseMoveImpl.bind(this), 16) as (
      evt: MeasurementMouseEvent
    ) => void;
    this._throttledMouseDrag = throttle(this._mouseDragImpl.bind(this), 16) as (
      evt: MeasurementMouseEvent
    ) => void;
  }

  createNewMeasurement(eventData: EventData): VHSAnnotationData | null {
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;

    if (!goodEventData) {
      console.error("VHSAnnotationTool: No event data");
      return null;
    }

    const { x, y } = eventData.currentPoints!.image!;

    return {
      visible: true,
      active: true,
      color: undefined,
      invalidated: true,
      handles: {
        vertebralStart: { x, y, highlight: true, active: false },
        vertebralEnd: { x, y, highlight: true, active: true },
        longAxisStart: { x: 0, y: 0, highlight: true, active: false },
        longAxisEnd: { x: 0, y: 0, highlight: true, active: false },
        shortAxisStart: { x: 0, y: 0, highlight: true, active: false },
        shortAxisEnd: { x: 0, y: 0, highlight: true, active: false },
        vertebralTextBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true,
          x,
          y
        },
        longAxisTextBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true,
          x,
          y
        },
        shortAxisTextBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true,
          x,
          y
        },
        vhsTextBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true,
          x,
          y
        }
      },
      cachedStats: {
        vertebralLength: 0,
        longAxisLength: 0,
        shortAxisLength: 0,
        longAxisProjection: 0,
        shortAxisProjection: 0,
        longAxisAngle: 0,
        shortAxisAngle: 0,
        longAxisVHS: 0,
        shortAxisVHS: 0,
        totalVHS: 0
      },
      measurementState: VHSMeasurementState.IDLE
    };
  }

  calculateDistance(point1: Coords, point2: Coords): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  addNewMeasurement(evt: MeasurementMouseEvent): VHSAnnotationData | null {
    const eventData = evt.detail;
    const { element } = eventData;

    switch (this.currentState) {
      case VHSMeasurementState.IDLE: {
        this.currentAnnotation = this.createNewMeasurement(eventData);
        if (!this.currentAnnotation) return null;

        this.currentState = VHSMeasurementState.VERTEBRAL_START;
        this.currentAnnotation.measurementState = this.currentState;

        cornerstoneTools.addToolState(
          element,
          this.name,
          this.currentAnnotation
        );
        return this.currentAnnotation;
      }

      case VHSMeasurementState.VERTEBRAL_END: {
        if (this.currentAnnotation) {
          const { x, y } = eventData.currentPoints.image;
          this.currentAnnotation.handles.longAxisStart.x = x;
          this.currentAnnotation.handles.longAxisStart.y = y;
          this.currentAnnotation.handles.longAxisEnd.x = x;
          this.currentAnnotation.handles.longAxisEnd.y = y;
          this.currentAnnotation.handles.longAxisEnd.active = true;

          this.currentState = VHSMeasurementState.LONG_AXIS_START;
          this.currentAnnotation.measurementState = this.currentState;
          cornerstone.updateImage(element);
        }
        break;
      }

      case VHSMeasurementState.LONG_AXIS_END: {
        if (this.currentAnnotation) {
          const { x, y } = eventData.currentPoints.image;
          this.currentAnnotation.handles.shortAxisStart.x = x;
          this.currentAnnotation.handles.shortAxisStart.y = y;
          this.currentAnnotation.handles.shortAxisEnd.x = x;
          this.currentAnnotation.handles.shortAxisEnd.y = y;
          this.currentAnnotation.handles.shortAxisEnd.active = true;

          this.currentState = VHSMeasurementState.SHORT_AXIS_START;
          this.currentAnnotation.measurementState = this.currentState;
          cornerstone.updateImage(element);
        }
        break;
      }

      default:
        break;
    }

    return null;
  }

  mouseMoveCallback(evt: MeasurementMouseEvent): void {
    this._throttledMouseMove(evt);
  }

  private _mouseMoveImpl(evt: MeasurementMouseEvent): void {
    const eventData = evt.detail;
    const { element } = eventData;

    if (!this.currentAnnotation || this.isDragging) return;

    switch (this.currentState) {
      case VHSMeasurementState.VERTEBRAL_START:
        this.currentAnnotation.handles.vertebralEnd.x =
          eventData.currentPoints.image.x;
        this.currentAnnotation.handles.vertebralEnd.y =
          eventData.currentPoints.image.y;
        break;

      case VHSMeasurementState.LONG_AXIS_START:
        this.currentAnnotation.handles.longAxisEnd.x =
          eventData.currentPoints.image.x;
        this.currentAnnotation.handles.longAxisEnd.y =
          eventData.currentPoints.image.y;
        break;

      case VHSMeasurementState.SHORT_AXIS_START:
        this.currentAnnotation.handles.shortAxisEnd.x =
          eventData.currentPoints.image.x;
        this.currentAnnotation.handles.shortAxisEnd.y =
          eventData.currentPoints.image.y;
        break;

      default:
        return;
    }

    this.currentAnnotation.invalidated = true;
    cornerstone.updateImage(element);
  }

  mouseDragCallback(evt: MeasurementMouseEvent): void {
    this._throttledMouseDrag(evt);
  }

  private _mouseDragImpl(evt: MeasurementMouseEvent): void {
    const eventData = evt.detail;
    const { element } = eventData;

    if (!this.currentAnnotation) return;

    this.isDragging = true;

    switch (this.currentState) {
      case VHSMeasurementState.VERTEBRAL_START:
        this.currentAnnotation.handles.vertebralEnd.x =
          eventData.currentPoints.image.x;
        this.currentAnnotation.handles.vertebralEnd.y =
          eventData.currentPoints.image.y;
        break;

      case VHSMeasurementState.LONG_AXIS_START:
        this.currentAnnotation.handles.longAxisEnd.x =
          eventData.currentPoints.image.x;
        this.currentAnnotation.handles.longAxisEnd.y =
          eventData.currentPoints.image.y;
        break;

      case VHSMeasurementState.SHORT_AXIS_START:
        this.currentAnnotation.handles.shortAxisEnd.x =
          eventData.currentPoints.image.x;
        this.currentAnnotation.handles.shortAxisEnd.y =
          eventData.currentPoints.image.y;
        break;

      default:
        break;
    }

    this.currentAnnotation.invalidated = true;
    cornerstone.updateImage(element);
  }

  private _completeSegment(
    state: VHSMeasurementState,
    eventData: EventData,
    element: HTMLElement
  ): void {
    switch (state) {
      case VHSMeasurementState.VERTEBRAL_START:
        this.currentState = VHSMeasurementState.VERTEBRAL_END;
        if (this.currentAnnotation) {
          this.currentAnnotation.measurementState = this.currentState;
          this.currentAnnotation.handles.vertebralEnd.active = false;
          this.updateCachedStats(
            eventData.image,
            element,
            this.currentAnnotation
          );
        }
        cornerstone.updateImage(element);
        break;

      case VHSMeasurementState.LONG_AXIS_START:
        this.currentState = VHSMeasurementState.LONG_AXIS_END;
        if (this.currentAnnotation) {
          this.currentAnnotation.measurementState = this.currentState;
          this.currentAnnotation.handles.longAxisEnd.active = false;
          this.updateCachedStats(
            eventData.image,
            element,
            this.currentAnnotation
          );
        }
        cornerstone.updateImage(element);
        break;

      case VHSMeasurementState.SHORT_AXIS_START:
        this.currentState = VHSMeasurementState.COMPLETE;
        if (this.currentAnnotation) {
          this.currentAnnotation.measurementState = this.currentState;
          this.currentAnnotation.handles.shortAxisEnd.active = false;
          this.currentAnnotation.active = false;
          this.updateCachedStats(
            eventData.image,
            element,
            this.currentAnnotation
          );
        }
        this.currentAnnotation = null;
        this.currentState = VHSMeasurementState.IDLE;
        cornerstone.updateImage(element);
        break;

      default:
        break;
    }
  }

  mouseUpCallback(evt: MeasurementMouseEvent): void {
    const eventData = evt.detail;
    const { element } = eventData;

    if (!this.isDragging) return;

    this.isDragging = false;
    this._completeSegment(this.currentState, eventData, element);
  }

  preMouseDownCallback(evt: MeasurementMouseEvent): void {
    const eventData = evt.detail;
    const { element } = eventData;

    if (this.isDragging) return;

    this._completeSegment(this.currentState, eventData, element);
  }

  private _autoPositionTextBox(
    textBox: HandleTextBox,
    startHandle: HandlePosition,
    endHandle: HandlePosition,
    xOffset: number = 0
  ): void {
    if (textBox.hasMoved) return;

    if (startHandle.x >= endHandle.x) {
      textBox.x = startHandle.x + xOffset;
      textBox.y = startHandle.y;
    } else {
      textBox.x = endHandle.x + xOffset;
      textBox.y = endHandle.y;
    }
  }

  renderToolData(evt: MeasurementMouseEvent): void {
    const eventData = evt.detail;
    const { element, canvasContext, image } = eventData;
    const toolData = cornerstoneTools.getToolState(element, this.name);

    if (!toolData) return;

    const context = getNewContext(canvasContext!.canvas);

    toolData.data.forEach((data: VHSAnnotationData) => {
      if (!data.visible) return;

      draw(context, (ctx: CanvasRenderingContext2D) => {
        const { handles, cachedStats, measurementState } = data;
        const color = toolColors.getColorIfActive(data);

        if (measurementState >= VHSMeasurementState.VERTEBRAL_START) {
          const vertebralColor = "rgb(0, 150, 255)";

          drawLine(ctx, element, handles.vertebralStart, handles.vertebralEnd, {
            color: vertebralColor,
            lineWidth: 2
          });
          drawHandles(
            ctx,
            eventData,
            [handles.vertebralStart, handles.vertebralEnd],
            {
              color: vertebralColor
            }
          );

          this._autoPositionTextBox(
            handles.vertebralTextBox,
            handles.vertebralStart,
            handles.vertebralEnd
          );

          if (measurementState >= VHSMeasurementState.VERTEBRAL_END) {
            const midPoint = {
              x: (handles.vertebralStart.x + handles.vertebralEnd.x) / 2,
              y: (handles.vertebralStart.y + handles.vertebralEnd.y) / 2
            };
            drawLinkedTextBox(
              ctx,
              element,
              handles.vertebralTextBox,
              "T4-T9",
              handles,
              () => [handles.vertebralStart, midPoint, handles.vertebralEnd],
              vertebralColor,
              1,
              10,
              true
            );
          }
        }

        this._autoPositionTextBox(
          handles.longAxisTextBox,
          handles.longAxisStart,
          handles.longAxisEnd
        );

        if (measurementState >= VHSMeasurementState.LONG_AXIS_START) {
          const longAxisColor = "rgb(255, 80, 80)";

          drawLine(ctx, element, handles.longAxisStart, handles.longAxisEnd, {
            color: longAxisColor,
            lineWidth: 2
          });
          drawHandles(
            ctx,
            eventData,
            [handles.longAxisStart, handles.longAxisEnd],
            {
              color: longAxisColor
            }
          );

          if (measurementState >= VHSMeasurementState.LONG_AXIS_END) {
            const longAxisMid = {
              x: (handles.longAxisStart.x + handles.longAxisEnd.x) / 2,
              y: (handles.longAxisStart.y + handles.longAxisEnd.y) / 2
            };
            drawLinkedTextBox(
              ctx,
              element,
              handles.longAxisTextBox,
              "L",
              handles,
              () => [handles.longAxisStart, longAxisMid, handles.longAxisEnd],
              longAxisColor,
              1,
              10,
              true
            );
            this.drawProjectionVisualization(
              ctx,
              element,
              handles,
              "P1",
              longAxisColor,
              10,
              cachedStats
            );
          }
        }

        this._autoPositionTextBox(
          handles.shortAxisTextBox,
          handles.shortAxisStart,
          handles.shortAxisEnd
        );

        if (measurementState >= VHSMeasurementState.SHORT_AXIS_START) {
          const shortAxisColor = "rgb(80, 255, 255)";

          drawLine(ctx, element, handles.shortAxisStart, handles.shortAxisEnd, {
            color: shortAxisColor,
            lineWidth: 2
          });
          drawHandles(
            ctx,
            eventData,
            [handles.shortAxisStart, handles.shortAxisEnd],
            {
              color: shortAxisColor
            }
          );

          if (measurementState >= VHSMeasurementState.COMPLETE) {
            const shortAxisMid = {
              x: (handles.shortAxisStart.x + handles.shortAxisEnd.x) / 2,
              y: (handles.shortAxisStart.y + handles.shortAxisEnd.y) / 2
            };
            drawLinkedTextBox(
              ctx,
              element,
              handles.shortAxisTextBox,
              "S",
              handles,
              () => [
                handles.shortAxisStart,
                shortAxisMid,
                handles.shortAxisEnd
              ],
              shortAxisColor,
              1,
              10,
              true
            );
            this.drawProjectionVisualization(
              ctx,
              element,
              handles,
              "P2",
              shortAxisColor,
              20,
              cachedStats
            );
          }
        }

        this._autoPositionTextBox(
          handles.vhsTextBox,
          handles.vertebralStart,
          handles.vertebralEnd,
          30
        );

        if (measurementState === VHSMeasurementState.COMPLETE) {
          const {
            longAxisVHS: p1,
            shortAxisVHS: p2,
            totalVHS: total
          } = cachedStats;

          const textLines = [
            `VHS = P1 + P2`,
            `${total.toFixed(2)} = ${p1.toFixed(1)} + ${p2.toFixed(1)}`
          ];

          const vhsAnchorPoint = {
            x: (handles.longAxisEnd.x + handles.shortAxisEnd.x) / 2,
            y: (handles.longAxisEnd.y + handles.shortAxisEnd.y) / 2
          };
          drawLinkedTextBox(
            ctx,
            element,
            handles.vhsTextBox,
            textLines,
            handles,
            () => [handles.longAxisEnd, vhsAnchorPoint, handles.shortAxisEnd],
            color,
            1,
            10,
            true
          );
        }
      });
    });
  }

  drawProjectionVisualization(
    context: CanvasRenderingContext2D,
    element: HTMLElement,
    handles: Handles,
    label: string,
    color: string,
    offset: number,
    cachedStats: VHSCachedStats
  ): void {
    const vx = handles.vertebralEnd!.x - handles.vertebralStart!.x;
    const vy = handles.vertebralEnd!.y - handles.vertebralStart!.y;
    const vMag = Math.sqrt(vx * vx + vy * vy);

    if (vMag === 0) return;

    const vNormX = vx / vMag;
    const vNormY = vy / vMag;

    let cx: number, cy: number;

    if (label === "P1") {
      cx = handles.longAxisEnd!.x - handles.longAxisStart!.x;
      cy = handles.longAxisEnd!.y - handles.longAxisStart!.y;
    } else {
      cx = handles.shortAxisEnd!.x - handles.shortAxisStart!.x;
      cy = handles.shortAxisEnd!.y - handles.shortAxisStart!.y;
    }

    const projectionLength = cx * vNormX + cy * vNormY;
    const projEndX = handles.vertebralStart!.x + vNormX * projectionLength;
    const projEndY = handles.vertebralStart!.y + vNormY * projectionLength;

    const angle = Math.atan2(vy, vx);
    const offsetX = Math.cos(angle + Math.PI / 2) * offset;
    const offsetY = Math.sin(angle + Math.PI / 2) * offset;

    const lineStart = {
      x: handles.vertebralStart!.x + offsetX,
      y: handles.vertebralStart!.y + offsetY
    };
    const lineEnd = { x: projEndX + offsetX, y: projEndY + offsetY };

    drawLine(context, element, lineStart, lineEnd, {
      color,
      lineWidth: 3,
      lineDash: [5, 5]
    });

    this.drawTick(context, element, lineStart, angle, color);
    this.drawTick(context, element, lineEnd, angle, color);
  }

  drawTick(
    context: CanvasRenderingContext2D,
    element: HTMLElement,
    point: Coords,
    angle: number,
    color: string
  ): void {
    const tickLen = 8;
    const start = {
      x: point.x + Math.cos(angle + Math.PI / 2) * tickLen,
      y: point.y + Math.sin(angle + Math.PI / 2) * tickLen
    };
    const end = {
      x: point.x - Math.cos(angle + Math.PI / 2) * tickLen,
      y: point.y - Math.sin(angle + Math.PI / 2) * tickLen
    };
    drawLine(context, element, start, end, { color, lineWidth: 2 });
  }

  updateCachedStats(
    image: unknown,
    element: HTMLElement,
    data: VHSAnnotationData
  ): VHSCachedStats {
    const { handles } = data;

    const vx = handles.vertebralEnd.x - handles.vertebralStart.x;
    const vy = handles.vertebralEnd.y - handles.vertebralStart.y;
    const vertebralLength = Math.sqrt(vx * vx + vy * vy);

    const vNormX = vertebralLength > 0 ? vx / vertebralLength : 0;
    const vNormY = vertebralLength > 0 ? vy / vertebralLength : 0;

    const lx = handles.longAxisEnd.x - handles.longAxisStart.x;
    const ly = handles.longAxisEnd.y - handles.longAxisStart.y;
    const longAxisLength = Math.sqrt(lx * lx + ly * ly);

    const sx = handles.shortAxisEnd.x - handles.shortAxisStart.x;
    const sy = handles.shortAxisEnd.y - handles.shortAxisStart.y;
    const shortAxisLength = Math.sqrt(sx * sx + sy * sy);

    const longAxisProjection = Math.abs(lx * vNormX + ly * vNormY);
    const shortAxisProjection = Math.abs(sx * vNormX + sy * vNormY);

    const vertebralUnit = vertebralLength / 5.0;
    const longAxisVHS =
      vertebralUnit > 0 ? longAxisProjection / vertebralUnit : 0;
    const shortAxisVHS =
      vertebralUnit > 0 ? shortAxisProjection / vertebralUnit : 0;
    const totalVHS = longAxisVHS + shortAxisVHS;

    const getAngle = (dotProduct: number, length: number): number => {
      if (length === 0) return 0;
      const cosTheta = Math.max(-1, Math.min(1, dotProduct / length));
      return Math.abs(Math.acos(cosTheta)) * (180 / Math.PI);
    };

    const longAxisAngle = getAngle(lx * vNormX + ly * vNormY, longAxisLength);
    const shortAxisAngle = getAngle(sx * vNormX + sy * vNormY, shortAxisLength);

    data.cachedStats = {
      vertebralLength,
      longAxisLength,
      shortAxisLength,
      longAxisProjection,
      shortAxisProjection,
      longAxisAngle,
      shortAxisAngle,
      longAxisVHS,
      shortAxisVHS,
      totalVHS
    };

    return data.cachedStats;
  }

  pointNearTool(
    element: HTMLElement,
    data: VHSAnnotationData,
    coords: Coords,
    interactionType: string
  ): boolean {
    if (!data?.handles) return false;

    const distance = interactionType === "mouse" ? 15 : 25;
    const { handles } = data;

    const handlesList: HandlePosition[] = [
      handles.vertebralStart,
      handles.vertebralEnd,
      handles.longAxisStart,
      handles.longAxisEnd,
      handles.shortAxisStart,
      handles.shortAxisEnd
    ];

    for (const handle of handlesList) {
      if (this.isPointNearHandle(element, handle, coords, distance))
        return true;
    }

    if (
      this.isPointNearLine(
        element,
        handles.vertebralStart,
        handles.vertebralEnd,
        coords,
        distance
      )
    ) {
      return true;
    }

    if (data.measurementState >= VHSMeasurementState.LONG_AXIS_START) {
      if (
        this.isPointNearLine(
          element,
          handles.longAxisStart,
          handles.longAxisEnd,
          coords,
          distance
        )
      ) {
        return true;
      }
    }

    if (data.measurementState >= VHSMeasurementState.SHORT_AXIS_START) {
      if (
        this.isPointNearLine(
          element,
          handles.shortAxisStart,
          handles.shortAxisEnd,
          coords,
          distance
        )
      ) {
        return true;
      }
    }

    return false;
  }

  isPointNearHandle(
    element: HTMLElement,
    handle: HandlePosition,
    coords: Coords,
    distance: number
  ): boolean {
    if (!handle || handle.x === undefined || handle.y === undefined)
      return false;

    const handleCanvas = cornerstone.pixelToCanvas(element, handle as never);
    const dx = handleCanvas.x - coords.x;
    const dy = handleCanvas.y - coords.y;

    return dx * dx + dy * dy <= distance * distance;
  }

  isPointNearLine(
    element: HTMLElement,
    startHandle: HandlePosition,
    endHandle: HandlePosition,
    coords: Coords,
    distance: number
  ): boolean {
    if (!startHandle || !endHandle) return false;

    const startCanvas = cornerstone.pixelToCanvas(
      element,
      startHandle as never
    );
    const endCanvas = cornerstone.pixelToCanvas(element, endHandle as never);

    return (
      this.distanceToLineSegment(coords, startCanvas, endCanvas) <= distance
    );
  }

  distanceToLineSegment(
    point: Coords,
    lineStart: Coords,
    lineEnd: Coords
  ): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    if (dx === 0 && dy === 0) {
      const dpx = point.x - lineStart.x;
      const dpy = point.y - lineStart.y;
      return Math.sqrt(dpx * dpx + dpy * dpy);
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
          (dx * dx + dy * dy)
      )
    );

    const projectionX = lineStart.x + t * dx;
    const projectionY = lineStart.y + t * dy;
    const dpx = point.x - projectionX;
    const dpy = point.y - projectionY;

    return Math.sqrt(dpx * dpx + dpy * dpy);
  }

  getHandleNearImagePoint(
    element: HTMLElement,
    data: VHSAnnotationData,
    coords: Coords,
    interactionType: string
  ): HandlePosition | null {
    const distance = interactionType === "mouse" ? 15 : 25;
    const { handles } = data;

    const handlesList: HandlePosition[] = [
      handles.vertebralStart,
      handles.vertebralEnd,
      handles.longAxisStart,
      handles.longAxisEnd,
      handles.shortAxisStart,
      handles.shortAxisEnd
    ];

    for (const handle of handlesList) {
      if (this.isPointNearHandle(element, handle, coords, distance))
        return handle;
    }

    return null;
  }
}
