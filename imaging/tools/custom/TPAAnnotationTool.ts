import cornerstoneTools from "cornerstone-tools";
import cornerstone from "cornerstone-core";
import {
  Coords,
  EventData,
  HandlePosition,
  MeasurementMouseEvent,
  TPAAnnotation,
  TPAMeasurementState
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

/**
 * TPA (Tibial Plateau Angle) Measurement States
 *
 * The TPA workflow consists of 3 drawing steps:
 *
 * Step 1 — Functional Tibial Axis (FTA):
 *   Draw a line representing the mechanical/functional axis of the tibia.
 *   Typically from the center of the tibial plateau to the center of the
 *   tibial plafond (ankle). Drawn by click-drag.
 *
 * Step 2 — Medial Tibial Plateau Line (MTP):
 *   Draw a line along the slope of the medial tibial plateau,
 *   from the most cranial point to the most caudal point.
 *   Initiated by click in FUNCTIONAL_AXIS_END state, drawn by drag.
 *
 * Step 3 — Reference Line (REF):
 *   Automatically computed as the line perpendicular to the FTA,
 *   anchored at the INTERSECTION of the (infinite) MTP line with the
 *   (infinite) FTA line. This is the clinically correct anchor point.
 *
 * TPA Angle:
 *   The angle between the Medial Tibial Plateau Line and the Reference Line,
 *   measured at the FTA∩MTP intersection point.
 *   The arc spans from the Reference Line direction to the MTP direction.
 *   Clinically, normal TPA is ~5° in cats and ~23° in dogs.
 */

const REF_HALF_LENGTH = 70;
const PROXIMITY_DISTANCE = 30;
export default class TPAAnnotationTool extends BaseAnnotationTool {
  private currentState: TPAMeasurementState;
  private currentAnnotation: TPAAnnotation | null;
  private isDragging: boolean;

  constructor(props: any = {}) {
    const defaultProps = {
      name: "TPAAnnotation",
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

    this.currentState = TPAMeasurementState.IDLE;
    this.currentAnnotation = null;
    this.isDragging = false;
  }

  createNewMeasurement(eventData: EventData) {
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;

    if (!goodEventData) {
      console.error("TPAAnnotationTool: No event data");
      return null;
    }

    const { x, y } = eventData.currentPoints!.image!;

    return {
      visible: true,
      active: true,
      color: undefined,
      invalidated: true,
      handles: {
        // Step 1: Functional Tibial Axis
        ftaStart: { x, y, highlight: true, active: false },
        ftaEnd: { x, y, highlight: true, active: true },

        // Step 2: Medial Tibial Plateau Line
        mtpStart: { x: 0, y: 0, highlight: true, active: false },
        mtpEnd: { x: 0, y: 0, highlight: true, active: false },

        // Step 3: Reference Line (perpendicular to FTA, through FTA∩MTP intersection)
        refStart: { x: 0, y: 0, highlight: false, active: false },
        refEnd: { x: 0, y: 0, highlight: false, active: false },
        intersectionPoint: { x: 0, y: 0 }, // FTA - MTP line intersection

        ftaTextBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true,
          x,
          y
        },
        mtpTextBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true,
          x,
          y
        },
        refTextBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true,
          x,
          y
        },
        tpaTextBox: {
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
        tpaAngle: 0,
        ftaLength: 0,
        mtpLength: 0
      },
      measurementState: TPAMeasurementState.IDLE
    };
  }

  addNewMeasurement(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    const { element } = eventData;

    switch (this.currentState) {
      case TPAMeasurementState.IDLE:
        this.currentAnnotation = this.createNewMeasurement(eventData);
        if (!this.currentAnnotation) return null;

        this.currentState = TPAMeasurementState.FUNCTIONAL_AXIS_START;
        this.currentAnnotation.measurementState = this.currentState;

        cornerstoneTools.addToolState(
          element,
          this.name,
          this.currentAnnotation
        );

        return this.currentAnnotation;

      case TPAMeasurementState.FUNCTIONAL_AXIS_END:
        if (this.currentAnnotation) {
          const { x, y } = eventData.currentPoints.image;
          this.currentAnnotation.handles.mtpStart.x = x;
          this.currentAnnotation.handles.mtpStart.y = y;
          this.currentAnnotation.handles.mtpEnd.x = x;
          this.currentAnnotation.handles.mtpEnd.y = y;
          this.currentAnnotation.handles.mtpEnd.active = true;

          this.currentState = TPAMeasurementState.MEDIAL_PLATEAU_START;
          this.currentAnnotation.measurementState = this.currentState;

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

    if (!this.currentAnnotation || this.isDragging) return;

    const { x, y } = eventData.currentPoints.image;

    switch (this.currentState) {
      case TPAMeasurementState.FUNCTIONAL_AXIS_START:
        this.currentAnnotation.handles.ftaEnd.x = x;
        this.currentAnnotation.handles.ftaEnd.y = y;
        this.currentAnnotation.invalidated = true;
        cornerstone.updateImage(element);
        break;

      case TPAMeasurementState.MEDIAL_PLATEAU_START:
        this.currentAnnotation.handles.mtpEnd.x = x;
        this.currentAnnotation.handles.mtpEnd.y = y;
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
    const { x, y } = eventData.currentPoints.image;

    switch (this.currentState) {
      case TPAMeasurementState.FUNCTIONAL_AXIS_START:
        this.currentAnnotation.handles.ftaEnd.x = x;
        this.currentAnnotation.handles.ftaEnd.y = y;
        break;

      case TPAMeasurementState.MEDIAL_PLATEAU_START:
        this.currentAnnotation.handles.mtpEnd.x = x;
        this.currentAnnotation.handles.mtpEnd.y = y;
        break;

      default:
        break;
    }

    this.currentAnnotation.invalidated = true;
    cornerstone.updateImage(element);
  }

  /**
   * Extracted logic to finalize the Functional Tibial Axis (Step 1)
   */
  private _finishFTA(element: HTMLElement, image: any): void {
    this.currentState = TPAMeasurementState.FUNCTIONAL_AXIS_END;
    if (this.currentAnnotation) {
      this.currentAnnotation.measurementState = this.currentState;
      this.currentAnnotation.handles.ftaEnd.active = false;
      this.updateCachedStats(image, element, this.currentAnnotation);
    }
  }

  /**
   * Extracted logic to finalize the Medial Tibial Plateau (Step 2)
   */
  private _finishMTP(element: HTMLElement, image: any): void {
    this.currentState = TPAMeasurementState.COMPLETE;
    if (this.currentAnnotation) {
      this.currentAnnotation.measurementState = this.currentState;
      this.currentAnnotation.handles.mtpEnd.active = false;
      this.currentAnnotation.active = false;

      this.computeReferenceLineAndAngle(this.currentAnnotation);
      this.updateCachedStats(image, element, this.currentAnnotation);

      const tpa = this.currentAnnotation.cachedStats.tpaAngle;
    }
    this.currentAnnotation = null;
    this.currentState = TPAMeasurementState.IDLE;
  }

  preMouseDownCallback(evt: MeasurementMouseEvent): void {
    const eventData = evt.detail;
    const { element, image } = eventData;

    switch (this.currentState) {
      case TPAMeasurementState.FUNCTIONAL_AXIS_START:
        this._finishFTA(element, image);
        break;

      case TPAMeasurementState.MEDIAL_PLATEAU_START:
        this._finishMTP(element, image);
        break;

      default:
        break;
    }

    cornerstone.updateImage(element);
  }

  mouseUpCallback(evt: MeasurementMouseEvent): void {
    const eventData = evt.detail;
    const { element, image } = eventData;

    if (!this.isDragging) return;
    this.isDragging = false;

    switch (this.currentState) {
      case TPAMeasurementState.FUNCTIONAL_AXIS_START:
        this._finishFTA(element, image);
        break;

      case TPAMeasurementState.MEDIAL_PLATEAU_START:
        this._finishMTP(element, image);
        break;

      default:
        break;
    }

    cornerstone.updateImage(element);
  }

  /**
   * Computes the intersection point of the infinite MTP line with the
   * infinite FTA line using parametric line-line intersection.
   *
   */
  computeLineLineIntersection(
    p1: Coords,
    d1: Coords, // FTA: point + direction
    p2: Coords,
    d2: Coords // MTP: point + direction
  ): Coords | null {
    const cross = d1.x * d2.y - d1.y * d2.x;
    if (Math.abs(cross) < 1e-10) return null; // parallel

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const t = (dx * d2.y - dy * d2.x) / cross;

    return {
      x: p1.x + t * d1.x,
      y: p1.y + t * d1.y
    };
  }

  computeReferenceLineAndAngle(data: any): void {
    const { handles } = data;

    // FTA direction (normalised)
    const ftaDx = handles.ftaEnd.x - handles.ftaStart.x;
    const ftaDy = handles.ftaEnd.y - handles.ftaStart.y;
    const ftaMag = Math.sqrt(ftaDx * ftaDx + ftaDy * ftaDy);
    if (ftaMag === 0) return;

    const ftaNx = ftaDx / ftaMag;
    const ftaNy = ftaDy / ftaMag;

    // Perpendicular to FTA
    const perpNx = -ftaNy;
    const perpNy = ftaNx;

    // MTP direction (normalised)
    const mtpDx = handles.mtpEnd.x - handles.mtpStart.x;
    const mtpDy = handles.mtpEnd.y - handles.mtpStart.y;
    const mtpMag = Math.sqrt(mtpDx * mtpDx + mtpDy * mtpDy);
    if (mtpMag === 0) return;

    const intersection = this.computeLineLineIntersection(
      handles.ftaStart,
      { x: ftaDx, y: ftaDy },
      handles.mtpStart,
      { x: mtpDx, y: mtpDy }
    );

    const anchor: Coords = intersection ?? {
      x: handles.mtpStart.x,
      y: handles.mtpStart.y
    };

    handles.intersectionPoint = anchor;

    // Reference line: perpendicular to FTA
    handles.refStart.x = anchor.x - perpNx * REF_HALF_LENGTH;
    handles.refStart.y = anchor.y - perpNy * REF_HALF_LENGTH;
    handles.refEnd.x = anchor.x + perpNx * REF_HALF_LENGTH;
    handles.refEnd.y = anchor.y + perpNy * REF_HALF_LENGTH;

    //  TPA = angle between MTP direction and Reference Line direction
    const dot = (mtpDx / mtpMag) * perpNx + (mtpDy / mtpMag) * perpNy;
    const clampedDot = Math.max(-1, Math.min(1, dot));
    const angleRad = Math.acos(Math.abs(clampedDot));
    const angleDeg = angleRad * (180 / Math.PI);

    data.cachedStats.tpaAngle = angleDeg;

    // Store direction signs for arc drawing (which quadrant the MTP goes toward)
    data.cachedStats.mtpNx = mtpDx / mtpMag;
    data.cachedStats.mtpNy = mtpDy / mtpMag;
    data.cachedStats.perpNx = perpNx;
    data.cachedStats.perpNy = perpNy;
  }

  updateCachedStats(image: any, element: HTMLElement, data: any) {
    const { handles } = data;

    const ftaDx = handles.ftaEnd.x - handles.ftaStart.x;
    const ftaDy = handles.ftaEnd.y - handles.ftaStart.y;
    const ftaLength = Math.sqrt(ftaDx * ftaDx + ftaDy * ftaDy);

    const mtpDx = handles.mtpEnd.x - handles.mtpStart.x;
    const mtpDy = handles.mtpEnd.y - handles.mtpStart.y;
    const mtpLength = Math.sqrt(mtpDx * mtpDx + mtpDy * mtpDy);

    data.cachedStats.ftaLength = ftaLength.toFixed(2);
    data.cachedStats.mtpLength = mtpLength.toFixed(2);

    if (data.measurementState === TPAMeasurementState.COMPLETE) {
      this.computeReferenceLineAndAngle(data);
    }

    return data.cachedStats;
  }

  renderToolData(evt: MeasurementMouseEvent): void {
    const eventData = evt.detail;
    const { element, canvasContext } = eventData;
    const toolData = cornerstoneTools.getToolState(element, this.name);

    if (!toolData) return;

    const context = getNewContext(canvasContext!.canvas);

    toolData.data.forEach((data: any) => {
      if (!data.visible) return;

      draw(context, (ctx: CanvasRenderingContext2D) => {
        const { handles, cachedStats, measurementState } = data;
        const color = toolColors.getColorIfActive(data);

        // Functional Tibial Axis
        if (measurementState >= TPAMeasurementState.FUNCTIONAL_AXIS_START) {
          const ftaColor = "rgb(80, 200, 255)";

          drawLine(ctx, element, handles.ftaStart, handles.ftaEnd, {
            color: ftaColor,
            lineWidth: 2
          });

          drawHandles(ctx, eventData, [handles.ftaStart, handles.ftaEnd], {
            color: ftaColor
          });

          if (!handles.ftaTextBox.hasMoved) {
            const rightmost =
              handles.ftaEnd.x >= handles.ftaStart.x
                ? handles.ftaEnd
                : handles.ftaStart;
            handles.ftaTextBox.x = rightmost.x + 15;
            handles.ftaTextBox.y = rightmost.y;
          }

          if (measurementState >= TPAMeasurementState.FUNCTIONAL_AXIS_END) {
            const mid = {
              x: (handles.ftaStart.x + handles.ftaEnd.x) / 2,
              y: (handles.ftaStart.y + handles.ftaEnd.y) / 2
            };
            drawLinkedTextBox(
              ctx,
              element,
              handles.ftaTextBox,
              "FTA",
              handles,
              () => [handles.ftaStart, mid, handles.ftaEnd],
              ftaColor,
              1,
              10,
              true
            );
          }
        }

        // Medial Tibial Plateau Line
        if (measurementState >= TPAMeasurementState.MEDIAL_PLATEAU_START) {
          const mtpColor = "rgb(255, 160, 60)";

          drawLine(ctx, element, handles.mtpStart, handles.mtpEnd, {
            color: mtpColor,
            lineWidth: 2
          });

          drawHandles(ctx, eventData, [handles.mtpStart, handles.mtpEnd], {
            color: mtpColor
          });

          if (!handles.mtpTextBox.hasMoved) {
            const rightmost =
              handles.mtpEnd.x >= handles.mtpStart.x
                ? handles.mtpEnd
                : handles.mtpStart;
            handles.mtpTextBox.x = rightmost.x + 15;
            handles.mtpTextBox.y = rightmost.y;
          }

          if (measurementState >= TPAMeasurementState.COMPLETE) {
            const mid = {
              x: (handles.mtpStart.x + handles.mtpEnd.x) / 2,
              y: (handles.mtpStart.y + handles.mtpEnd.y) / 2
            };
            drawLinkedTextBox(
              ctx,
              element,
              handles.mtpTextBox,
              "MTP",
              handles,
              () => [handles.mtpStart, mid, handles.mtpEnd],
              mtpColor,
              1,
              10,
              true
            );
          }
        }

        // Reference Line
        if (measurementState >= TPAMeasurementState.COMPLETE) {
          drawLine(ctx, element, handles.refStart, handles.refEnd, {
            color: color,
            lineWidth: 2,
            lineDash: [6, 4]
          });

          if (!handles.refTextBox.hasMoved) {
            handles.refTextBox.x = handles.refEnd.x + 10;
            handles.refTextBox.y = handles.refEnd.y;
          }

          const refMid = {
            x: (handles.refStart.x + handles.refEnd.x) / 2,
            y: (handles.refStart.y + handles.refEnd.y) / 2
          };
          drawLinkedTextBox(
            ctx,
            element,
            handles.refTextBox,
            "REF ⊥ FTA",
            handles,
            () => [handles.refStart, refMid, handles.refEnd],
            color,
            1,
            10,
            true
          );

          // TPA angle arc
          this.drawAngleArc(ctx, element, handles, cachedStats, color);

          const tpa = parseFloat(cachedStats.tpaAngle);
          const ip = handles.intersectionPoint ?? handles.mtpStart;

          if (!handles.tpaTextBox.hasMoved) {
            handles.tpaTextBox.x = ip.x + 40;
            handles.tpaTextBox.y = ip.y + 40;
          }

          const anchorMid = {
            x: (ip.x + handles.refEnd.x) / 2,
            y: (ip.y + handles.refEnd.y) / 2
          };

          drawLinkedTextBox(
            ctx,
            element,
            handles.tpaTextBox,
            [`TPA = ${tpa.toFixed(1)}°`],
            handles,
            () => [ip, anchorMid, handles.refEnd],
            color,
            1,
            10,
            true
          );
        }
      });
    });
  }

  /**
   * The arc sweeps from the Reference Line direction to the MTP direction
   */
  drawAngleArc(
    context: CanvasRenderingContext2D,
    element: HTMLElement,
    handles: any,
    cachedStats: any,
    color: string
  ): void {
    const intersectionPixel = handles.intersectionPoint;
    if (!intersectionPixel) return;

    const arcPoint = cornerstone.pixelToCanvas(element, intersectionPixel);

    const perpNx = cachedStats.perpNx ?? 0;
    const perpNy = cachedStats.perpNy ?? 0;
    const mtpNx = cachedStats.mtpNx ?? 0;
    const mtpNy = cachedStats.mtpNy ?? 0;

    if (perpNx === 0 && perpNy === 0) return;

    const refAngle = Math.atan2(perpNy, perpNx);
    const mtpAngle = Math.atan2(mtpNy, mtpNx);

    const mtpAngleOpposite = mtpAngle + Math.PI;

    // Pick whichever MTP half-direction gives the smaller arc (the acute TPA)
    const angularDiff = (a: number, b: number): number => {
      let d = (((b - a) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (d > Math.PI) d = 2 * Math.PI - d;
      return d;
    };

    const diffNormal = angularDiff(refAngle, mtpAngle);
    const diffOpposite = angularDiff(refAngle, mtpAngleOpposite);
    const useMtpAngle =
      diffNormal <= diffOpposite ? mtpAngle : mtpAngleOpposite;

    // Determine arc sweep direction (CCW vs CW) to always draw the short arc
    let startAngle = refAngle;
    let endAngle = useMtpAngle;
    let sweep =
      (((endAngle - startAngle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const counterClockwise = sweep > Math.PI; // if sweep > 180° flip direction

    const radius = 26;
    context.beginPath();
    context.arc(
      arcPoint.x,
      arcPoint.y,
      radius,
      startAngle,
      endAngle,
      counterClockwise
    );
    context.strokeStyle = color;
    context.lineWidth = this.configuration.arcLineWidth || 1.5;
    context.stroke();
  }

  pointNearTool(
    element: HTMLElement,
    data: any,
    coords: Coords,
    interactionType: string
  ): boolean {
    if (!data?.handles) return false;

    const { handles } = data;

    const testHandles = [
      handles.ftaStart,
      handles.ftaEnd,
      handles.mtpStart,
      handles.mtpEnd
    ];

    for (const h of testHandles) {
      if (this.isPointNearHandle(element, h, coords, PROXIMITY_DISTANCE))
        return true;
    }

    if (
      this.isPointNearLine(
        element,
        handles.ftaStart,
        handles.ftaEnd,
        coords,
        PROXIMITY_DISTANCE
      )
    ) {
      return true;
    }

    if (data.measurementState >= TPAMeasurementState.MEDIAL_PLATEAU_START) {
      if (
        this.isPointNearLine(
          element,
          handles.mtpStart,
          handles.mtpEnd,
          coords,
          PROXIMITY_DISTANCE
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
    PROXIMITY_DISTANCE: number
  ): boolean {
    if (!handle || handle.x === undefined || handle.y === undefined)
      return false;
    const hc = cornerstone.pixelToCanvas(element, handle as any);
    const dx = hc.x - coords.x;
    const dy = hc.y - coords.y;
    return dx * dx + dy * dy <= PROXIMITY_DISTANCE * PROXIMITY_DISTANCE;
  }

  isPointNearLine(
    element: HTMLElement,
    startHandle: HandlePosition,
    endHandle: HandlePosition,
    coords: Coords,
    PROXIMITY_DISTANCE: number
  ): boolean {
    if (!startHandle || !endHandle) return false;
    const sc = cornerstone.pixelToCanvas(element, startHandle as any);
    const ec = cornerstone.pixelToCanvas(element, endHandle as any);
    return (
      this.PROXIMITY_DISTANCEToLineSegment(coords, sc, ec) <= PROXIMITY_DISTANCE
    );
  }

  PROXIMITY_DISTANCEToLineSegment(
    point: Coords,
    lineStart: Coords,
    lineEnd: Coords
  ): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    if (dx === 0 && dy === 0) {
      return Math.sqrt(
        (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2
      );
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
          (dx * dx + dy * dy)
      )
    );

    return Math.sqrt(
      (point.x - (lineStart.x + t * dx)) ** 2 +
        (point.y - (lineStart.y + t * dy)) ** 2
    );
  }

  getHandleNearImagePoint(
    element: HTMLElement,
    data: any,
    coords: Coords,
    interactionType: string
  ) {
    const PROXIMITY_DISTANCE = interactionType === "mouse" ? 15 : 25;
    const { handles } = data;

    const handlesList = [
      handles.ftaStart,
      handles.ftaEnd,
      handles.mtpStart,
      handles.mtpEnd
    ];

    for (const handle of handlesList) {
      if (this.isPointNearHandle(element, handle, coords, PROXIMITY_DISTANCE)) {
        return handle;
      }
    }

    return null;
  }
}
