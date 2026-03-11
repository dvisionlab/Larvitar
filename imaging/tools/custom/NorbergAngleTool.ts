// external libraries
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
const toolStyle = cornerstoneTools.toolStyle;
const drawLinkedTextBox = cornerstoneTools.importInternal(
  "drawing/drawLinkedTextBox"
);

//internal imports
import { logger } from "../../../logger";
import { Coords, EventData, MeasurementData } from "../types";

/**
 * @public
 * @class NorbergAngleTool
 * @memberof Tools.Annotation
 * @classdesc Tool for measuring distances with adjustable angle segments at both endpoints.
 * Shows angle arcs and allows 45-degree adjustment segments.
 * @extends Tools.Base.BaseAnnotationTool
 */
export default class NorbergAngleTool extends BaseAnnotationTool {
  configuration: any;

  constructor(props: any = {}) {
    const defaultProps = {
      name: "NorbergAngle",
      supportedInteractionTypes: ["Mouse", "Touch"],
      svgCursor: lengthCursor,
      configuration: {
        drawHandles: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        renderDashed: false,
        digits: 2,
        // Angle display configuration
        showAngles: true,
        angleArcRadius: 30,
        angleLabelDistance: 45,
        segmentLength: 50,
        defaultAngle: 80
      }
    };

    super(props, defaultProps);

    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
  }

  createNewMeasurement(eventData: EventData): MeasurementData | undefined {
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;

    if (!goodEventData) {
      logger.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );

      return;
    }

    const { x, y } = eventData.currentPoints!.image!;

    return {
      visible: true,
      active: true,
      color: undefined,
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
        // Angle adjustment handles
        startAngleHandle: {
          x,
          y,
          highlight: true,
          active: false
        },
        endAngleHandle: {
          x,
          y,
          highlight: true,
          active: false
        },
        textBox: {
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
      // Store angle data
      startSegmentAngle: this.configuration.defaultAngle,
      endSegmentAngle: this.configuration.defaultAngle,
      startAngleCustomized: false,
      endAngleCustomized: false,
      startSegmentLength: this.configuration.segmentLength,
      endSegmentLength: this.configuration.segmentLength,
      startSegmentCustomized: false,
      endSegmentCustomized: false
    };
  }

  pointNearTool(
    element: HTMLElement,
    data: MeasurementData,
    coords: Coords
  ): boolean {
    const hasStartAndEndHandles =
      data && data.handles && data.handles.start! && data.handles.end!;
    const validParameters = hasStartAndEndHandles;

    if (!validParameters) {
      logger.warn(
        `invalid parameters supplied to tool ${this.name}'s pointNearTool`
      );

      return false;
    }

    if (data.visible === false) {
      return false;
    }

    const nearMainLine =
      lineSegDistance(element, data.handles.start!, data.handles.end!, coords) <
      10;

    const nearStartSegment =
      lineSegDistance(
        element,
        data.handles.start!,
        data.handles.startAngleHandle!,
        coords
      ) < 10;

    const nearEndSegment =
      lineSegDistance(
        element,
        data.handles.end!,
        data.handles.endAngleHandle!,
        coords
      ) < 10;

    return nearMainLine || nearStartSegment || nearEndSegment;
  }

  updateCachedStats(
    image: any,
    element: HTMLElement,
    data: MeasurementData
  ): void {
    const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);
    const { segmentLength } = this.configuration;

    const dx =
      (data.handles.end!.x - data.handles.start!.x) * (colPixelSpacing || 1);
    const dy =
      (data.handles.end!.y - data.handles.start!.y) * (rowPixelSpacing || 1);

    const length = Math.sqrt(dx * dx + dy * dy);

    const mainAngleRadians = Math.atan2(
      data.handles.end!.y - data.handles.start!.y,
      data.handles.end!.x - data.handles.start!.x
    );

    const targetAngleDeg = 80;
    const targetAngleRad = (targetAngleDeg * Math.PI) / 180;

    if (data.handles.startAngleHandle!.active === true) {
      data.startAngleCustomized = true;
      data.startSegmentCustomized = true;

      const dx = data.handles.startAngleHandle!.x - data.handles.start!.x;
      const dy = data.handles.startAngleHandle!.y - data.handles.start!.y;
      data.startSegmentLength = Math.sqrt(dx * dx + dy * dy);

      const currentRad = Math.atan2(
        data.handles.startAngleHandle!.y - data.handles.start!.y,
        data.handles.startAngleHandle!.x - data.handles.start!.x
      );
      data.startSegmentAngle =
        ((currentRad - mainAngleRadians) * 180) / Math.PI;
    } else if (!data.startAngleCustomized && !data.startSegmentCustomized) {
      const useSegmentLength = segmentLength;
      const startSegmentRad = mainAngleRadians - targetAngleRad;
      data.handles.startAngleHandle!.x =
        data.handles.start!.x + useSegmentLength * Math.cos(startSegmentRad);
      data.handles.startAngleHandle!.y =
        data.handles.start!.y + useSegmentLength * Math.sin(startSegmentRad);
      data.startSegmentAngle = targetAngleDeg;
      data.startSegmentLength = useSegmentLength;
    } else {
      const useSegmentLength = data.startSegmentLength || segmentLength;
      const storedAngleRad = (data.startSegmentAngle! * Math.PI) / 180;
      const startSegmentRad = mainAngleRadians + storedAngleRad;
      data.handles.startAngleHandle!.x =
        data.handles.start!.x + useSegmentLength * Math.cos(startSegmentRad);
      data.handles.startAngleHandle!.y =
        data.handles.start!.y + useSegmentLength * Math.sin(startSegmentRad);
    }

    if (data.handles.endAngleHandle!.active === true) {
      data.endAngleCustomized = true;
      data.endSegmentCustomized = true;

      const dx = data.handles.endAngleHandle!.x - data.handles.end!.x;
      const dy = data.handles.endAngleHandle!.y - data.handles.end!.y;
      data.endSegmentLength = Math.sqrt(dx * dx + dy * dy);

      const currentRad = Math.atan2(
        data.handles.endAngleHandle!.y - data.handles.end!.y,
        data.handles.endAngleHandle!.x - data.handles.end!.x
      );
      const oppositeAngleRad = mainAngleRadians + Math.PI;
      data.endSegmentAngle = ((oppositeAngleRad - currentRad) * 180) / Math.PI;
    } else if (!data.endAngleCustomized && !data.endSegmentCustomized) {
      const useSegmentLength = segmentLength;
      const oppositeAngleRad = mainAngleRadians - Math.PI;
      const endSegmentRad = oppositeAngleRad + targetAngleRad;
      data.handles.endAngleHandle!.x =
        data.handles.end!.x + useSegmentLength * Math.cos(endSegmentRad);
      data.handles.endAngleHandle!.y =
        data.handles.end!.y + useSegmentLength * Math.sin(endSegmentRad);
      data.endSegmentAngle = targetAngleDeg;
      data.endSegmentLength = useSegmentLength;
    } else {
      const useSegmentLength = data.endSegmentLength || segmentLength;
      const oppositeAngleRad = mainAngleRadians + Math.PI;
      const storedAngleRad = (data.endSegmentAngle! * Math.PI) / 180;
      const endSegmentRad = oppositeAngleRad - storedAngleRad;
      data.handles.endAngleHandle!.x =
        data.handles.end!.x + useSegmentLength * Math.cos(endSegmentRad);
      data.handles.endAngleHandle!.y =
        data.handles.end!.y + useSegmentLength * Math.sin(endSegmentRad);
    }

    data.length = length;
    data.invalidated = false;
  }

  drawAngleArc(
    context: CanvasRenderingContext2D,
    centerPoint: Coords,
    startAngleDegrees: number,
    endAngleDegrees: number,
    radius: number,
    color: string,
    counterClockwise = false
  ) {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = 2;

    const startRad = (startAngleDegrees * Math.PI) / 180;
    const endRad = (endAngleDegrees * Math.PI) / 180;

    context.beginPath();
    context.arc(
      centerPoint.x,
      centerPoint.y,
      radius,
      startRad,
      endRad,
      counterClockwise
    );
    context.stroke();
    context.restore();
  }

  drawAngleLabel(
    context: CanvasRenderingContext2D,
    point: Coords,
    angle: number,
    labelAngle: number,
    distance: number,
    color: string
  ): void {
    context.save();
    context.font = "14px Arial";
    context.fillStyle = color;

    let displayAngle = Math.abs(angle);
    let complementaryAngle = 360 - displayAngle;

    const angleText = `${displayAngle.toFixed(1)}° / ${complementaryAngle.toFixed(1)}°`;
    const textMetrics = context.measureText(angleText);

    const labelAngleRad = (labelAngle * Math.PI) / 180;
    const x = point.x + distance * Math.cos(labelAngleRad);
    const y = point.y + distance * Math.sin(labelAngleRad);

    context.fillStyle = "rgba(0, 0, 0, 0.7)";
    const padding = 3;
    context.fillRect(
      x - textMetrics.width / 2 - padding,
      y - 8 - padding,
      textMetrics.width + padding * 2,
      16 + padding * 2
    );

    context.fillStyle = color;
    context.textAlign = "center";
    context.fillText(angleText, x, y + 4);

    context.restore();
  }

  renderToolData(evt: any): void {
    const eventData = evt.detail;
    const {
      handleRadius,
      drawHandlesOnHover,
      hideHandlesIfMoving,
      renderDashed,
      digits,
      showAngles,
      angleArcRadius,
      angleLabelDistance
    } = this.configuration;
    const toolData = getToolState(evt.currentTarget, this.name);

    if (!toolData) {
      return;
    }

    const context = getNewContext(eventData.canvasContext.canvas);
    const { image, element } = eventData;
    const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);
    const cornerstone = cornerstoneTools.external.cornerstone;

    const lineWidth = toolStyle.getToolWidth();
    const lineDash = getModule("globalConfiguration").configuration.lineDash;

    for (let i = 0; i < toolData.data.length; i++) {
      const data: MeasurementData = toolData.data[i];

      if (data.visible === false) {
        continue;
      }

      draw(context, (context: CanvasRenderingContext2D) => {
        setShadow(context, this.configuration);

        const color = toolColors.getColorIfActive(data);
        const lineOptions: any = { color };

        if (renderDashed) {
          lineOptions.lineDash = lineDash;
        }

        if (data.invalidated === true) {
          this.updateCachedStats(image, element, data);
        }

        drawLine(
          context,
          element,
          data.handles.start!,
          data.handles.end!,
          lineOptions
        );

        drawLine(
          context,
          element,
          data.handles.start!,
          data.handles.startAngleHandle!,
          { color, lineWidth: 2 }
        );

        drawLine(
          context,
          element,
          data.handles.end!,
          data.handles.endAngleHandle!,
          { color, lineWidth: 2 }
        );

        if (
          showAngles &&
          data.startSegmentAngle !== undefined &&
          data.endSegmentAngle !== undefined
        ) {
          const startCanvas = cornerstone.pixelToCanvas(
            element,
            data.handles.start!
          );
          const endCanvas = cornerstone.pixelToCanvas(
            element,
            data.handles.end!
          );
          const startAngleHandleCanvas = cornerstone.pixelToCanvas(
            element,
            data.handles.startAngleHandle!
          );
          const endAngleHandleCanvas = cornerstone.pixelToCanvas(
            element,
            data.handles.endAngleHandle!
          );

          const mainLineAngleStart =
            (Math.atan2(
              endCanvas.y - startCanvas.y,
              endCanvas.x - startCanvas.x
            ) *
              180) /
            Math.PI;

          const mainLineAngleEnd = (mainLineAngleStart + 180) % 360;

          const segmentAngleStart =
            (Math.atan2(
              startAngleHandleCanvas.y - startCanvas.y,
              startAngleHandleCanvas.x - startCanvas.x
            ) *
              180) /
            Math.PI;

          const segmentAngleEnd =
            (Math.atan2(
              endAngleHandleCanvas.y - endCanvas.y,
              endAngleHandleCanvas.x - endCanvas.x
            ) *
              180) /
            Math.PI;

          this.drawAngleArc(
            context,
            startCanvas,
            mainLineAngleStart,
            segmentAngleStart,
            angleArcRadius,
            color,
            false // counterClockwise
          );

          this.drawAngleArc(
            context,
            startCanvas,
            mainLineAngleStart,
            segmentAngleStart,
            angleArcRadius,
            color,
            true // counterClockwise
          );

          this.drawAngleArc(
            context,
            endCanvas,
            mainLineAngleEnd,
            segmentAngleEnd,
            angleArcRadius,
            color,
            false // counterClockwise
          );

          this.drawAngleArc(
            context,
            endCanvas,
            mainLineAngleEnd,
            segmentAngleEnd,
            angleArcRadius,
            color,
            true // counterClockwise
          );

          const startLabelAngle = (mainLineAngleStart + segmentAngleStart) / 2;
          const endLabelAngle = (mainLineAngleEnd + segmentAngleEnd) / 2;

          this.drawAngleLabel(
            context,
            startCanvas,
            data.startSegmentAngle,
            startLabelAngle,
            angleLabelDistance,
            color
          );

          this.drawAngleLabel(
            context,
            endCanvas,
            data.endSegmentAngle,
            endLabelAngle,
            angleLabelDistance,
            color
          );
        }

        const handleOptions = {
          color,
          handleRadius,
          drawHandlesIfActive: drawHandlesOnHover,
          hideHandlesIfMoving
        };

        if (this.configuration.drawHandles) {
          drawHandles(context, eventData, data.handles, handleOptions);
        }

        if (!data.handles.textBox!.hasMoved) {
          const coords = {
            x: Math.max(data.handles.start!.x, data.handles.end!.x),
            y: 0
          };

          if (coords.x === data.handles.start!.x) {
            coords.y = data.handles.start!.y;
          } else {
            coords.y = data.handles.end!.y;
          }

          data.handles.textBox!.x = coords.x;
          data.handles.textBox!.y = coords.y;
        }

        const xOffset = 10;

        const text = textBoxText(
          data,
          rowPixelSpacing,
          colPixelSpacing,
          digits
        );

        drawLinkedTextBox(
          context,
          element,
          data.handles.textBox,
          text,
          data.handles,
          textBoxAnchorPoints,
          color,
          lineWidth,
          xOffset,
          true
        );
      });
    }

    function textBoxText(
      annotation: MeasurementData,
      rowPixelSpacing: number,
      colPixelSpacing: number,
      digits: number
    ): string {
      const measuredValue = _sanitizeMeasuredValue(annotation.length);

      if (!measuredValue) {
        return "";
      }

      let suffix = "mm";

      if (!rowPixelSpacing || !colPixelSpacing) {
        suffix = "pixels";
      }

      annotation.unit = suffix;

      return `${measuredValue.toFixed(digits)} ${suffix}`;
    }

    function textBoxAnchorPoints(
      handles: MeasurementData["handles"]
    ): Coords[] {
      const midpoint = {
        x: (handles.start!.x + handles.end!.x) / 2,
        y: (handles.start!.y + handles.end!.y) / 2
      };

      return [handles.start!, midpoint, handles.end!];
    }
  }
}

function _sanitizeMeasuredValue(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsedValue = Number(value);
  const isNumber = !isNaN(parsedValue);

  return isNumber ? parsedValue : undefined;
}
