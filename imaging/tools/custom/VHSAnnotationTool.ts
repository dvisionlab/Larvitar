import cornerstoneTools from "cornerstone-tools";
import cornerstone from "cornerstone-core";
import {
  Coords,
  EventData,
  HandlePosition,
  Handles,
  HandleTextBox,
  MeasurementMouseEvent
} from "../types";
const toolColors = cornerstoneTools.toolColors;
const draw = cornerstoneTools.importInternal("drawing/draw");
const drawLine = cornerstoneTools.importInternal("drawing/drawLine");
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const drawHandles = cornerstoneTools.importInternal("drawing/drawHandles");
const drawLinkedTextBox = cornerstoneTools.importInternal(
  "drawing/drawLinkedTextBox"
);

const { lengthCursor } = cornerstoneTools.importInternal("tools/cursors");
const BaseAnnotationTool = cornerstoneTools.importInternal(
  "base/BaseAnnotationTool"
);

enum MeasurementState {
  IDLE = 0,
  VERTEBRAL_START = 1,
  VERTEBRAL_END = 2,
  LONG_AXIS_START = 3,
  LONG_AXIS_END = 4,
  SHORT_AXIS_START = 5,
  SHORT_AXIS_END = 6,
  COMPLETE = 7
}

export default class VHSAnnotationTool extends BaseAnnotationTool {
  private currentState: MeasurementState;
  private currentAnnotation: any | null;
  private isDragging: boolean;

  constructor(props: any = {}) {
    const defaultProps = {
      name: "VHSAnnotation",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        drawHandles: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        renderDashed: false
      },
      svgCursor: lengthCursor
    };

    super(props, defaultProps);

    this.currentState = MeasurementState.IDLE;
    this.currentAnnotation = null;
    this.isDragging = false;
  }

  createNewMeasurement(eventData: EventData) {
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
        vertebralStart: {
          x,
          y,
          highlight: true,
          active: false
        },
        vertebralEnd: {
          x,
          y,
          highlight: true,
          active: true
        },
        longAxisStart: {
          x: 0,
          y: 0,
          highlight: true,
          active: false
        },
        longAxisEnd: {
          x: 0,
          y: 0,
          highlight: true,
          active: false
        },
        shortAxisStart: {
          x: 0,
          y: 0,
          highlight: true,
          active: false
        },
        shortAxisEnd: {
          x: 0,
          y: 0,
          highlight: true,
          active: false
        },
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
        vertebralLength: "0",
        longAxisLength: "0",
        shortAxisLength: "0",
        longAxisVHS: "0",
        shortAxisVHS: "0",
        totalVHS: "0"
      },
      measurementState: MeasurementState.IDLE
    };
  }

  calculateDistance(point1: Coords, point2: Coords): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  addNewMeasurement(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    const { element } = eventData;

    switch (this.currentState) {
      case MeasurementState.IDLE:
        this.currentAnnotation = this.createNewMeasurement(eventData);
        if (!this.currentAnnotation) return null;

        this.currentState = MeasurementState.VERTEBRAL_START;
        this.currentAnnotation.measurementState = this.currentState;

        cornerstoneTools.addToolState(
          element,
          this.name,
          this.currentAnnotation
        );

        console.log(
          "Passo 1/6: Clicca sul centro di T4 - ora trascina fino a T9"
        );
        return this.currentAnnotation;

      case MeasurementState.VERTEBRAL_END:
        if (this.currentAnnotation) {
          this.currentAnnotation.handles.longAxisStart.x =
            eventData.currentPoints.image.x;
          this.currentAnnotation.handles.longAxisStart.y =
            eventData.currentPoints.image.y;
          this.currentAnnotation.handles.longAxisEnd.x =
            eventData.currentPoints.image.x;
          this.currentAnnotation.handles.longAxisEnd.y =
            eventData.currentPoints.image.y;
          this.currentAnnotation.handles.longAxisEnd.active = true;

          this.currentState = MeasurementState.LONG_AXIS_START;
          this.currentAnnotation.measurementState = this.currentState;

          console.log(
            "Passo 3/6: Clicca sul punto cardiaco superiore - ora trascina fino all'apice"
          );
          cornerstone.updateImage(element);
        }
        break;

      case MeasurementState.LONG_AXIS_END:
        if (this.currentAnnotation) {
          this.currentAnnotation.handles.shortAxisStart.x =
            eventData.currentPoints.image.x;
          this.currentAnnotation.handles.shortAxisStart.y =
            eventData.currentPoints.image.y;
          this.currentAnnotation.handles.shortAxisEnd.x =
            eventData.currentPoints.image.x;
          this.currentAnnotation.handles.shortAxisEnd.y =
            eventData.currentPoints.image.y;
          this.currentAnnotation.handles.shortAxisEnd.active = true;

          this.currentState = MeasurementState.SHORT_AXIS_START;
          this.currentAnnotation.measurementState = this.currentState;

          console.log(
            "Passo 5/6: Clicca sul punto cardiaco sinistro - ora trascina a destra"
          );
          cornerstone.updateImage(element);
        }
        break;

      default:
        break;
    }

    return null;
  }

  mouseMoveCallback(evt: MeasurementMouseEvent): void {
    const eventData = evt.detail;
    const { element } = eventData;

    if (!this.currentAnnotation) return;

    // Only update on mouse move if we're NOT dragging (rubber-band mode)
    if (this.isDragging) return;

    // Update the end point position while mouse is moving (rubber-band effect)
    switch (this.currentState) {
      case MeasurementState.VERTEBRAL_START:
        this.currentAnnotation.handles.vertebralEnd.x =
          eventData.currentPoints.image.x;
        this.currentAnnotation.handles.vertebralEnd.y =
          eventData.currentPoints.image.y;
        this.currentAnnotation.invalidated = true;
        cornerstone.updateImage(element);
        break;

      case MeasurementState.LONG_AXIS_START:
        this.currentAnnotation.handles.longAxisEnd.x =
          eventData.currentPoints.image.x;
        this.currentAnnotation.handles.longAxisEnd.y =
          eventData.currentPoints.image.y;
        this.currentAnnotation.invalidated = true;
        cornerstone.updateImage(element);
        break;

      case MeasurementState.SHORT_AXIS_START:
        this.currentAnnotation.handles.shortAxisEnd.x =
          eventData.currentPoints.image.x;
        this.currentAnnotation.handles.shortAxisEnd.y =
          eventData.currentPoints.image.y;
        this.currentAnnotation.invalidated = true;
        cornerstone.updateImage(element);
        break;

      default:
        break;
    }
  }

  mouseDragCallback(evt: MeasurementMouseEvent): void {
    const eventData = evt.detail;
    const { element } = eventData;

    if (!this.currentAnnotation) return;

    this.isDragging = true;

    // Update end point during drag
    switch (this.currentState) {
      case MeasurementState.VERTEBRAL_START:
        this.currentAnnotation.handles.vertebralEnd.x =
          eventData.currentPoints.image.x;
        this.currentAnnotation.handles.vertebralEnd.y =
          eventData.currentPoints.image.y;
        break;

      case MeasurementState.LONG_AXIS_START:
        this.currentAnnotation.handles.longAxisEnd.x =
          eventData.currentPoints.image.x;
        this.currentAnnotation.handles.longAxisEnd.y =
          eventData.currentPoints.image.y;
        break;

      case MeasurementState.SHORT_AXIS_START:
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

  mouseUpCallback(evt: MeasurementMouseEvent): void {
    const eventData = evt.detail;
    const { element } = eventData;

    // If we were dragging, complete the current segment
    if (this.isDragging) {
      this.isDragging = false;

      switch (this.currentState) {
        case MeasurementState.VERTEBRAL_START:
          this.currentState = MeasurementState.VERTEBRAL_END;
          if (this.currentAnnotation) {
            this.currentAnnotation.measurementState = this.currentState;
            this.currentAnnotation.handles.vertebralEnd.active = false;
          }
          console.log(
            "Passo 2/6 Completato - Ora clicca sul punto cardiaco superiore"
          );
          break;

        case MeasurementState.LONG_AXIS_START:
          this.currentState = MeasurementState.LONG_AXIS_END;
          if (this.currentAnnotation) {
            this.currentAnnotation.measurementState = this.currentState;
            this.currentAnnotation.handles.longAxisEnd.active = false;
          }
          console.log(
            "Passo 4/6 Completato - Ora clicca sul punto cardiaco sinistro"
          );
          break;

        case MeasurementState.SHORT_AXIS_START:
          this.currentState = MeasurementState.COMPLETE;
          if (this.currentAnnotation) {
            this.currentAnnotation.measurementState = this.currentState;
            this.currentAnnotation.handles.shortAxisEnd.active = false;
            this.currentAnnotation.active = false;
            this.updateCachedStats(
              eventData.image,
              element,
              this.currentAnnotation
            );

            const vhs = parseFloat(this.currentAnnotation.cachedStats.totalVHS);
            console.log(
              `Misurazione VHS Completata: ${vhs.toFixed(2)} unità vertebrali`
            );
          }

          this.currentAnnotation = null;
          this.currentState = MeasurementState.IDLE;
          break;

        default:
          break;
      }

      if (this.currentAnnotation) {
        this.updateCachedStats(
          eventData.image,
          element,
          this.currentAnnotation
        );
      }

      cornerstone.updateImage(element);
    }
  }

  preMouseDownCallback(evt: MeasurementMouseEvent): void {
    const eventData = evt.detail;
    const { element } = eventData;

    if (!this.isDragging) {
      switch (this.currentState) {
        case MeasurementState.VERTEBRAL_START:
          this.currentState = MeasurementState.VERTEBRAL_END;
          if (this.currentAnnotation) {
            this.currentAnnotation.measurementState = this.currentState;
            this.currentAnnotation.handles.vertebralEnd.active = false;
          }
          console.log(
            "Passo 2/6 Completato - Ora clicca sul punto cardiaco superiore"
          );
          if (this.currentAnnotation) {
            this.updateCachedStats(
              eventData.image,
              element,
              this.currentAnnotation
            );
          }
          cornerstone.updateImage(element);
          break;

        case MeasurementState.LONG_AXIS_START:
          this.currentState = MeasurementState.LONG_AXIS_END;
          if (this.currentAnnotation) {
            this.currentAnnotation.measurementState = this.currentState;
            this.currentAnnotation.handles.longAxisEnd.active = false;
          }
          console.log(
            "Passo 4/6 Completato - Ora clicca sul punto cardiaco sinistro"
          );
          if (this.currentAnnotation) {
            this.updateCachedStats(
              eventData.image,
              element,
              this.currentAnnotation
            );
          }
          cornerstone.updateImage(element);
          break;

        case MeasurementState.SHORT_AXIS_START:
          this.currentState = MeasurementState.COMPLETE;
          if (this.currentAnnotation) {
            this.currentAnnotation.measurementState = this.currentState;
            this.currentAnnotation.handles.shortAxisEnd.active = false;
            this.currentAnnotation.active = false;
            this.updateCachedStats(
              eventData.image,
              element,
              this.currentAnnotation
            );

            const vhs = parseFloat(this.currentAnnotation.cachedStats.totalVHS);
            console.log(
              `Misurazione VHS Completata: ${vhs.toFixed(2)} unità vertebrali`
            );
          }

          this.currentAnnotation = null;
          this.currentState = MeasurementState.IDLE;
          cornerstone.updateImage(element);
          break;

        default:
          break;
      }
    }
  }

  renderToolData(evt: MeasurementMouseEvent): void {
    const eventData = evt.detail;
    const { element, canvasContext, image } = eventData;
    const toolData = cornerstoneTools.getToolState(element, this.name);

    if (!toolData) return;

    const context = getNewContext(canvasContext!.canvas);

    toolData.data.forEach((data: any) => {
      if (!data.visible) return;

      draw(context, (ctx: CanvasRenderingContext2D) => {
        const { handles, cachedStats, measurementState } = data;
        const color = toolColors.getColorIfActive(data);

        // LINEA DI RIFERIMENTO VERTEBRALE (T4-T9)
        if (measurementState >= MeasurementState.VERTEBRAL_START) {
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

          if (!data.handles.vertebralTextBox!.hasMoved) {
            const coords: { x: number; y?: number } = {
              x: Math.max(
                data.handles.vertebralStart!.x,
                data.handles.vertebralEnd!.x
              )
            };

            if (coords.x === data.handles.vertebralStart!.x) {
              coords.y = data.handles.vertebralStart!.y;
            } else {
              coords.y = data.handles.vertebralEnd!.y;
            }

            data.handles.vertebralTextBox!.x = coords.x;
            data.handles.vertebralTextBox!.y = coords.y;
          }
          if (measurementState >= MeasurementState.VERTEBRAL_END) {
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
        if (!data.handles.longAxisTextBox!.hasMoved) {
          const coords: { x: number; y?: number } = {
            x: Math.max(
              data.handles.longAxisStart!.x,
              data.handles.longAxisEnd!.x
            )
          };

          if (coords.x === data.handles.longAxisStart!.x) {
            coords.y = data.handles.longAxisStart!.y;
          } else {
            coords.y = data.handles.longAxisEnd!.y;
          }

          data.handles.longAxisTextBox!.x = coords.x;
          data.handles.longAxisTextBox!.y = coords.y;
        }
        // ASSE LUNGO (L)
        if (measurementState >= MeasurementState.LONG_AXIS_START) {
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

          if (measurementState >= MeasurementState.LONG_AXIS_END) {
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
        if (!data.handles.shortAxisTextBox!.hasMoved) {
          const coords: { x: number; y?: number } = {
            x: Math.max(
              data.handles.shortAxisStart!.x,
              data.handles.shortAxisEnd!.x
            )
          };

          if (coords.x === data.handles.shortAxisStart!.x) {
            coords.y = data.handles.shortAxisStart!.y;
          } else {
            coords.y = data.handles.shortAxisEnd!.y;
          }

          data.handles.shortAxisTextBox!.x = coords.x;
          data.handles.shortAxisTextBox!.y = coords.y;
        }
        // ASSE CORTO (S)
        if (measurementState >= MeasurementState.SHORT_AXIS_START) {
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

          if (measurementState >= MeasurementState.COMPLETE) {
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
        if (!data.handles.vhsTextBox!.hasMoved) {
          const coords: { x: number; y?: number } = {
            x:
              Math.max(
                data.handles.vertebralStart!.x,
                data.handles.vertebralEnd!.x
              ) + 30
          };

          if (coords.x === data.handles.vertebralStart!.x) {
            coords.y = data.handles.vertebralStart!.y;
          } else {
            coords.y = data.handles.vertebralEnd!.y;
          }

          data.handles.vhsTextBox!.x = coords.x;
          data.handles.vhsTextBox!.y = coords.y;
        }
        // TEXTBOX VHS FINALE
        if (measurementState === MeasurementState.COMPLETE) {
          const p1 = parseFloat(cachedStats.longAxisVHS);
          const p2 = parseFloat(cachedStats.shortAxisVHS);
          const total = parseFloat(cachedStats.totalVHS);

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
    cachedStats: any
  ): void {
    const vx = handles.vertebralEnd!.x - handles.vertebralStart!.x;
    const vy = handles.vertebralEnd!.y - handles.vertebralStart!.y;
    const vMag = Math.sqrt(vx * vx + vy * vy);

    if (vMag === 0) return;

    const vNormX = vx / vMag;
    const vNormY = vy / vMag;

    let cx, cy, startHandle, endHandle;

    if (label === "P1") {
      cx = handles.longAxisEnd!.x - handles.longAxisStart!.x;
      cy = handles.longAxisEnd!.y - handles.longAxisStart!.y;
      startHandle = handles.longAxisStart;
      endHandle = handles.longAxisEnd;
    } else {
      cx = handles.shortAxisEnd!.x - handles.shortAxisStart!.x;
      cy = handles.shortAxisEnd!.y - handles.shortAxisStart!.y;
      startHandle = handles.shortAxisStart;
      endHandle = handles.shortAxisEnd;
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

  updateCachedStats(image: any, element: HTMLElement, data: any) {
    const { handles } = data;

    const vx = handles.vertebralEnd.x - handles.vertebralStart.x;
    const vy = handles.vertebralEnd.y - handles.vertebralStart.y;
    const vertebralLength = Math.sqrt(vx * vx + vy * vy);

    const vNormX = vx / vertebralLength;
    const vNormY = vy / vertebralLength;

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

    const longAxisAngle =
      Math.abs(Math.acos((lx * vNormX + ly * vNormY) / longAxisLength)) *
      (180 / Math.PI);
    const shortAxisAngle =
      Math.abs(Math.acos((sx * vNormX + sy * vNormY) / shortAxisLength)) *
      (180 / Math.PI);

    data.cachedStats = {
      vertebralLength: vertebralLength.toFixed(2),
      longAxisLength: longAxisLength.toFixed(2),
      shortAxisLength: shortAxisLength.toFixed(2),
      longAxisProjection: longAxisProjection.toFixed(2),
      shortAxisProjection: shortAxisProjection.toFixed(2),
      longAxisAngle: longAxisAngle.toFixed(1),
      shortAxisAngle: shortAxisAngle.toFixed(1),
      longAxisVHS: longAxisVHS.toFixed(1),
      shortAxisVHS: shortAxisVHS.toFixed(1),
      totalVHS: totalVHS.toFixed(2)
    };

    return data.cachedStats;
  }

  pointNearTool(
    element: HTMLElement,
    data: any,
    coords: Coords,
    interactionType: string
  ): boolean {
    const validParameters = data && data.handles;
    if (!validParameters) return false;

    const distance = interactionType === "mouse" ? 15 : 25;
    const handles = data.handles;

    const handlesList = [
      handles.vertebralStart,
      handles.vertebralEnd,
      handles.longAxisStart,
      handles.longAxisEnd,
      handles.shortAxisStart,
      handles.shortAxisEnd
    ];

    for (let handle of handlesList) {
      if (this.isPointNearHandle(element, handle, coords, distance)) {
        return true;
      }
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

    if (data.measurementState >= MeasurementState.LONG_AXIS_START) {
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

    if (data.measurementState >= MeasurementState.SHORT_AXIS_START) {
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
    if (!handle || handle.x === undefined || handle.y === undefined) {
      return false;
    }

    const handleCanvas = cornerstone.pixelToCanvas(element, handle as any);
    const dx = handleCanvas.x - coords.x;
    const dy = handleCanvas.y - coords.y;
    const distanceSquared = dx * dx + dy * dy;

    return distanceSquared <= distance * distance;
  }

  isPointNearLine(
    element: HTMLElement,
    startHandle: HandlePosition,
    endHandle: HandlePosition,
    coords: Coords,
    distance: number
  ): boolean {
    if (!startHandle || !endHandle) return false;

    const startCanvas = cornerstone.pixelToCanvas(element, startHandle as any);
    const endCanvas = cornerstone.pixelToCanvas(element, endHandle as any);

    const distToLine = this.distanceToLineSegment(
      coords,
      startCanvas,
      endCanvas
    );

    return distToLine <= distance;
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
    data: any,
    coords: Coords,
    interactionType: string
  ) {
    const distance = interactionType === "mouse" ? 15 : 25;
    const handles = data.handles;

    const handlesList = [
      { handle: handles.vertebralStart, name: "vertebralStart" },
      { handle: handles.vertebralEnd, name: "vertebralEnd" },
      { handle: handles.longAxisStart, name: "longAxisStart" },
      { handle: handles.longAxisEnd, name: "longAxisEnd" },
      { handle: handles.shortAxisStart, name: "shortAxisStart" },
      { handle: handles.shortAxisEnd, name: "shortAxisEnd" }
    ];

    for (let { handle, name } of handlesList) {
      if (this.isPointNearHandle(element, handle, coords, distance)) {
        return handle;
      }
    }

    return null;
  }
}
