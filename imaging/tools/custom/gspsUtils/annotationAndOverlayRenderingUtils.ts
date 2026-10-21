import { convertCIELabToRGBWithRefs } from "./genericDrawingUtils";
import type {
  AnnotationOverlay,
  CompoundDetails,
  GraphicDetails,
  MajorTicks,
  TextDetails
} from "./types";

import { rotateCoords } from "./genericMathUtils";
import {
  applyPixelToCanvas,
  calculateEllipseCoordinates,
  calculateHandles,
  calculateRectangleCoordinates,
  applyRotationAndTranslation,
  intersect
} from "./genericMathUtils";
import {
  drawText,
  drawBoundingBox,
  drawTick,
  drawCutline,
  drawEllipse,
  drawPerpendicularTickAtPoint,
  drawRectangle
} from "./genericDrawingUtils";
import * as csTools from "cornerstone-tools";
import cornerstone, { Image, PixelCoordinate } from "cornerstone-core";
import { Coords, ViewportComplete } from "../../types";
import { logger } from "../../../../logger";

const drawArrow = csTools.importInternal("drawing/drawArrow");
const drawLine = csTools.importInternal("drawing/drawLine");
const drawLink = csTools.importInternal("drawing/drawLink");

const HANDLE_SIZE = 6;

function drawHandle(
  context: CanvasRenderingContext2D,
  point: Coords,
  color: string
) {
  context.save();
  context.fillStyle = color;
  context.fillRect(
    point.x - HANDLE_SIZE / 2,
    point.y - HANDLE_SIZE / 2,
    HANDLE_SIZE,
    HANDLE_SIZE
  );
  context.restore();
}

function applyStyleToContext(
  context: CanvasRenderingContext2D,
  sequence: any,
  fallbackColor: string
): string {
  let finalColor = fallbackColor || "#00ff3c";

  if (sequence?.patternOnColorCIELabValue) {
    const rgb = convertCIELabToRGBWithRefs(sequence.patternOnColorCIELabValue);
    finalColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1)`;
  }

  context.strokeStyle = finalColor;
  context.lineWidth = sequence?.lineThickness || 2;

  if (sequence?.lineDashingStyle === "DASHED") {
    context.setLineDash([5, 5]);
  } else {
    context.setLineDash([]);
  }

  return finalColor;
}

/**
 * Renders different types of graphic annotations (POINT, POLYLINE, CIRCLE, ELLIPSE) on the canvas, 
   adhering to DICOM graphic layer module (0070,0020) and annotation sequences.
 * @name renderGraphicAnnotation
 * @protected
 * @param  {GraphicDetails} graphicObject //object containing graphic parameters for annotations
 * @param  {CanvasRenderingContext2D} context //context on which annotations will be displayed
 * @param  {HTMLElement} element //viewport's element
 * @param  {string} color //annotation color
 * @param  {ViewportComplete} viewport 
 * @param  {Image} image 
 *
 * @returns {void}
 */
export function renderGraphicAnnotation(
  graphicObject: GraphicDetails,
  context: CanvasRenderingContext2D,
  element: HTMLElement,
  color: string,
  viewport: ViewportComplete,
  image: Image
) {
  const graphicType = graphicObject.graphicType;
  if (
    !graphicType ||
    !graphicObject.graphicData ||
    graphicObject.graphicData.length === 0
  )
    return;

  const xMultiplier = viewport.displayedArea?.brhc?.x
    ? viewport.displayedArea.brhc.x - viewport.displayedArea.tlhc!.x
    : 1;
  const xScope = viewport.displayedArea?.tlhc?.x ?? 0;
  const yMultiplier = viewport.displayedArea?.brhc?.y
    ? viewport.displayedArea.brhc.y - viewport.displayedArea.tlhc!.y
    : 1;
  const yScope = viewport.displayedArea?.tlhc?.y ?? 0;

  context.save();
  const finalColor = applyStyleToContext(
    context,
    graphicObject.lineStyleSequence,
    color
  );

  const canvasPoints: Coords[] = [];
  for (let i = 0; i < graphicObject.graphicData.length; i += 2) {
    canvasPoints.push({
      x: graphicObject.graphicData[i],
      y: graphicObject.graphicData[i + 1]
    });
  }

  const transformedPoints = applyPixelToCanvas(
    canvasPoints,
    element,
    xMultiplier,
    yMultiplier,
    xScope,
    yScope,
    image,
    viewport,
    graphicObject.graphicAnnotationUnits === "DISPLAY"
  );

  switch (graphicType) {
    case "POINT": {
      if (transformedPoints.length < 1) break;
      const pt = transformedPoints[0];
      context.beginPath();
      context.arc(pt.x, pt.y, 3, 0, 2 * Math.PI);
      context.fillStyle = finalColor;
      context.fill();
      context.stroke();
      break;
    }

    case "POLYLINE": {
      if (transformedPoints.length >= 2) {
        context.beginPath();
        context.moveTo(transformedPoints[0].x, transformedPoints[0].y);
        for (let i = 1; i < transformedPoints.length; i++) {
          context.lineTo(transformedPoints[i].x, transformedPoints[i].y);
        }
        context.stroke();

        const isClosed =
          transformedPoints[0].x ===
            transformedPoints[transformedPoints.length - 1].x &&
          transformedPoints[0].y ===
            transformedPoints[transformedPoints.length - 1].y;

        if (!isClosed) {
          drawHandle(context, transformedPoints[0], finalColor);
          drawHandle(
            context,
            transformedPoints[transformedPoints.length - 1],
            finalColor
          );
          if (transformedPoints.length === 3) {
            drawHandle(context, transformedPoints[1], finalColor);
          }
        }
      }
      break;
    }

    case "INTERPOLATED": {
      if (transformedPoints.length >= 2) {
        context.beginPath();
        context.moveTo(transformedPoints[0].x, transformedPoints[0].y);
        for (let i = 1; i < transformedPoints.length - 1; i++) {
          const xc = (transformedPoints[i].x + transformedPoints[i + 1].x) / 2;
          const yc = (transformedPoints[i].y + transformedPoints[i + 1].y) / 2;
          context.quadraticCurveTo(
            transformedPoints[i].x,
            transformedPoints[i].y,
            xc,
            yc
          );
        }
        context.lineTo(
          transformedPoints[transformedPoints.length - 1].x,
          transformedPoints[transformedPoints.length - 1].y
        );
        context.stroke();
      }
      break;
    }

    case "CIRCLE":
    case "ELLIPSE": {
      if (transformedPoints.length >= 4) {
        const p1 = transformedPoints[0];
        const p2 = transformedPoints[1];
        const p3 = transformedPoints[2];
        const p4 = transformedPoints[3];

        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2;
        const ry = Math.hypot(p4.x - p3.x, p4.y - p3.y) / 2;
        const rotationAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

        context.beginPath();
        context.ellipse(cx, cy, rx, ry, rotationAngle, 0, 2 * Math.PI);
        context.stroke();

        if (graphicObject.graphicFilled === "Y") {
          context.fillStyle = finalColor;
          context.fill();
        }

        drawHandle(context, p1, finalColor);
        drawHandle(context, p2, finalColor);
        drawHandle(context, p3, finalColor);
        drawHandle(context, p4, finalColor);
      } else if (transformedPoints.length >= 2) {
        const center = transformedPoints[0];
        const edge = transformedPoints[1];
        const radius = Math.hypot(edge.x - center.x, edge.y - center.y);

        context.beginPath();
        context.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        context.stroke();
      }
      break;
    }
  }
  context.restore();
}

/**
  This function renders a text annotation on the canvas, including its bounding box. 
  It calculates the correct position and size based on viewport and image dimensions.
 * @name renderTextAnnotation
 * @protected
 * @param  {TextDetails} textObject //object containing graphic parameters for annotations
 * @param  {CanvasRenderingContext2D} context //context on which annotations will be displayed
 * @param  {string} color //annotation color
 * @param  {HTMLElement} element //viewport's element
 * @param  {Image} image 
 * @param  {ViewportComplete} viewport 
 *
 * @returns {void}
 */
export function renderTextAnnotation(
  textObject: TextDetails,
  context: CanvasRenderingContext2D,
  color: string,
  element: HTMLElement,
  image: Image,
  viewport: ViewportComplete
) {
  const xMultiplier = viewport.displayedArea?.brhc?.x
    ? viewport.displayedArea.brhc.x - viewport.displayedArea.tlhc!.x
    : 1;
  const xScope = viewport.displayedArea?.tlhc?.x ?? 0;
  const yMultiplier = viewport.displayedArea?.brhc?.y
    ? viewport.displayedArea.brhc.y - viewport.displayedArea.tlhc!.y
    : 1;
  const yScope = viewport.displayedArea?.tlhc?.y ?? 0;

  const [tlhc, brhc, anchorPoint] = applyPixelToCanvas(
    [
      textObject.boundingBox?.tlhc as Coords,
      textObject.boundingBox?.brhc as Coords,
      textObject.anchorPoint as Coords
    ],
    element,
    xMultiplier,
    yMultiplier,
    xScope,
    yScope,
    image,
    viewport,
    textObject.boundingBoxUnits === "DISPLAY"
  );

  const isCenteredOnAnchorPoints: boolean =
    (brhc.x === null || tlhc.x === null) && anchorPoint.x !== null;

  const xCenter = isCenteredOnAnchorPoints
    ? anchorPoint.x!
    : (brhc.x! + tlhc.x!) / 2;
  const yCenter = isCenteredOnAnchorPoints
    ? anchorPoint.y!
    : (brhc.y! + tlhc.y!) / 2;

  const boundingBoxWidth = brhc.x! - tlhc.x!;
  const boundingBoxHeight = brhc.y! - tlhc.y!;
  const top = yCenter! - boundingBoxHeight! / 2;
  const left = xCenter! - boundingBoxWidth! / 2;

  let finalColor = color;
  if (textObject.textStyleSequence?.textColorCIELabValue) {
    const rgb = convertCIELabToRGBWithRefs(
      textObject.textStyleSequence.textColorCIELabValue
    );
    finalColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1)`;
  }

  const fontSize = parseInt(context.font.match(/\d+/)![0], 10) || 14;
  const lines = textObject.unformattedTextValue!.split("\n");
  const textY = top + boundingBoxHeight / 2 - (fontSize * lines.length) / 2;
  let textX = xCenter;

  switch (textObject.textFormat) {
    case "LEFT":
      textX = left;
      break;
    case "RIGHT":
      textX = xCenter + boundingBoxWidth / 2;
      break;
    case "CENTER":
      textX = xCenter;
      break;
  }

  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.6)";
  context.fillRect(left, top, boundingBoxWidth, boundingBoxHeight);
  context.restore();

  drawText(context, textObject, textX, textY, finalColor);

  if (anchorPoint.x && anchorPoint.y && textObject.anchorpointVisibility) {
    drawLink(
      [{ x: anchorPoint.x, y: anchorPoint.y }],
      { x: xCenter, y: yCenter },
      { width: boundingBoxWidth, height: boundingBoxHeight, left, top },
      context,
      finalColor,
      2
    );
  }
}

/** Renders different types of compound annotation:
   (ELLIPSE,RECTANGLE,ARROW,MULTILINE,INFINITELINE,AXIS,RANGELINE,CUTLINE,RULER,CROSSHAIR) on the canvas, 
   adhering to DICOM graphic layer module (0070,0020) and annotation sequences.
 * @name renderTextAnnotation
 * @protected
 * @param  {CompoundDetails} compoundObject //object containing graphic parameters for annotations
 * @param  {CanvasRenderingContext2D} context //context on which annotations will be displayed
 * @param  {HTMLElement} element //viewport's element
 * @param  {string} color //annotation color
 * @param  {ViewportComplete} viewport 
 * @param  {Image} image 
 *
 * @returns {void}
 */
export function renderCompoundAnnotation(
  compoundObject: CompoundDetails,
  context: CanvasRenderingContext2D,
  element: HTMLElement,
  color: string,
  viewport: ViewportComplete,
  image: Image
) {
  const graphicType = compoundObject.graphicType;
  if (
    !graphicType ||
    !compoundObject.graphicData ||
    compoundObject.graphicData.length === 0
  )
    return;

  const xMultiplier = viewport.displayedArea?.brhc?.x
    ? viewport.displayedArea.brhc.x - viewport.displayedArea.tlhc!.x
    : 1;
  const xScope = viewport.displayedArea?.tlhc?.x ?? 0;
  const yMultiplier = viewport.displayedArea?.brhc?.y
    ? viewport.displayedArea.brhc.y - viewport.displayedArea.tlhc!.y
    : 1;
  const yScope = viewport.displayedArea?.tlhc?.y ?? 0;

  context.save();

  let finalColor = color || "#00ff3c";
  if (compoundObject.lineStyleSequence?.patternOnColorCIELabValue) {
    const rgb = convertCIELabToRGBWithRefs(
      compoundObject.lineStyleSequence.patternOnColorCIELabValue
    );
    finalColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1)`;
  }

  context.strokeStyle = finalColor;
  let lineWidth = compoundObject.lineStyleSequence?.lineThickness ?? 2;
  context.lineWidth = lineWidth;
  let lineDashed: number[] | number | false = false;

  if (compoundObject.lineStyleSequence?.lineDashingStyle === "DASHED") {
    lineDashed = [5, 5];
    context.setLineDash(lineDashed as number[]);
  } else {
    context.setLineDash([]);
  }

  if (compoundObject.lineStyleSequence?.shadowColorCIELabValue) {
    const shadowRgb = convertCIELabToRGBWithRefs(
      compoundObject.lineStyleSequence.shadowColorCIELabValue
    );
    context.shadowColor = `rgba(${shadowRgb[0]}, ${shadowRgb[1]}, ${shadowRgb[2]}, 1)`;
    context.shadowBlur = compoundObject.lineStyleSequence.shadowOpacity || 0;
    context.shadowOffsetX = compoundObject.lineStyleSequence.shadowOffsetX || 0;
    context.shadowOffsetY = compoundObject.lineStyleSequence.shadowOffsetY || 0;
  }

  const canvasPoints: Coords[] = [];
  for (let i = 0; i < compoundObject.graphicData.length; i += 2) {
    canvasPoints.push({
      x: compoundObject.graphicData[i],
      y: compoundObject.graphicData[i + 1]
    });
  }

  const transformedPoints = applyPixelToCanvas(
    canvasPoints,
    element,
    xMultiplier,
    yMultiplier,
    xScope,
    yScope,
    image,
    viewport,
    compoundObject.compoundGraphicUnits === "DISPLAY"
  );

  switch (graphicType) {
    case "ARROW": {
      let handles = calculateHandles(compoundObject.graphicData!, 0);
      let startHandle = handles.startHandle;
      let endHandle = handles.endHandle;
      let midpoint = handles.midpoint;

      if (compoundObject.rotationAngle) {
        const rotationCenter = compoundObject.rotationPoint
          ? {
              x: compoundObject.rotationPoint[0],
              y: compoundObject.rotationPoint[1]
            }
          : midpoint;
        [startHandle, endHandle] = applyRotationAndTranslation(
          [startHandle, endHandle],
          compoundObject.rotationAngle,
          rotationCenter
        );
      }

      context.beginPath();
      let [startHandleCanvas, endHandleCanvas] = applyPixelToCanvas(
        [startHandle, endHandle],
        element,
        xMultiplier,
        yMultiplier,
        xScope,
        yScope,
        image,
        viewport,
        compoundObject.compoundGraphicUnits === "DISPLAY"
      );

      context.beginPath();
      context.moveTo(startHandleCanvas.x, startHandleCanvas.y);
      context.lineTo(endHandleCanvas.x, endHandleCanvas.y);

      const headlen = 15;
      const angle = Math.atan2(
        endHandleCanvas.y - startHandleCanvas.y,
        endHandleCanvas.x - startHandleCanvas.x
      );

      context.lineTo(
        endHandleCanvas.x - headlen * Math.cos(angle - Math.PI / 6),
        endHandleCanvas.y - headlen * Math.sin(angle - Math.PI / 6)
      );
      context.moveTo(endHandleCanvas.x, endHandleCanvas.y);
      context.lineTo(
        endHandleCanvas.x - headlen * Math.cos(angle + Math.PI / 6),
        endHandleCanvas.y - headlen * Math.sin(angle + Math.PI / 6)
      );

      context.stroke();
      drawHandle(context, startHandleCanvas, finalColor);
      break;
    }

    case "ELLIPSE": {
      if (transformedPoints.length === 4) {
        const cx = (transformedPoints[0].x + transformedPoints[1].x) / 2;
        const cy = (transformedPoints[2].y + transformedPoints[3].y) / 2;
        const rx =
          Math.abs(transformedPoints[1].x - transformedPoints[0].x) / 2;
        const ry =
          Math.abs(transformedPoints[3].y - transformedPoints[2].y) / 2;
        const rotationAngle = Math.atan2(
          transformedPoints[1].y - transformedPoints[0].y,
          transformedPoints[1].x - transformedPoints[0].x
        );

        context.beginPath();
        context.ellipse(cx, cy, rx, ry, rotationAngle, 0, 2 * Math.PI);
        context.stroke();
        if (compoundObject.graphicFilled === "Y") {
          context.fillStyle = finalColor;
          context.fill();
        }

        drawHandle(context, transformedPoints[0], finalColor);
        drawHandle(context, transformedPoints[1], finalColor);
        drawHandle(context, transformedPoints[2], finalColor);
        drawHandle(context, transformedPoints[3], finalColor);
      }
      break;
    }

    case "RECTANGLE": {
      if (transformedPoints.length >= 2) {
        drawRectangle(
          context,
          transformedPoints[0],
          transformedPoints[1],
          finalColor,
          compoundObject.graphicFilled === "Y"
        );
        drawHandle(context, transformedPoints[0], finalColor);
        drawHandle(context, transformedPoints[1], finalColor);
      }
      break;
    }

    case "MULTILINE": {
      for (let i = 0; i < compoundObject.graphicData!.length; i += 4) {
        if (i + 1 < compoundObject.graphicData!.length) {
          const handles = calculateHandles(compoundObject.graphicData!, i);
          let startHandle = handles.startHandle;
          let endHandle = handles.endHandle;
          let midpoint = handles.midpoint;
          if (compoundObject.rotationAngle) {
            const rotationCenter = compoundObject.rotationPoint
              ? {
                  x: compoundObject.rotationPoint[0],
                  y: compoundObject.rotationPoint[1]
                }
              : midpoint;
            [startHandle, endHandle] = applyRotationAndTranslation(
              [startHandle, endHandle],
              compoundObject.rotationAngle,
              rotationCenter
            );
          }
          context.beginPath();
          const [startHandleCanvas, endHandleCanvas] = applyPixelToCanvas(
            [startHandle, endHandle],
            element,
            xMultiplier,
            yMultiplier,
            xScope,
            yScope,
            image,
            viewport,
            compoundObject.compoundGraphicUnits === "DISPLAY"
          );
          drawLine(context, element, startHandleCanvas, endHandleCanvas, {
            color: finalColor,
            lineWidth,
            lineDashed
          });
        }
      }
      break;
    }

    case "INFINITELINE": {
      let handles = calculateHandles(compoundObject.graphicData!, 0);
      let startHandle = handles.startHandle;
      let endHandle = handles.endHandle;
      let midpoint = handles.midpoint;

      if (compoundObject.rotationAngle) {
        const rotationCenter = compoundObject.rotationPoint
          ? {
              x: compoundObject.rotationPoint[0],
              y: compoundObject.rotationPoint[1]
            }
          : midpoint;
        [startHandle, endHandle] = applyRotationAndTranslation(
          [startHandle, endHandle],
          compoundObject.rotationAngle,
          rotationCenter
        );
      }
      let firstIntersection = intersect(
        startHandle.x,
        startHandle.y,
        endHandle.x,
        endHandle.y,
        image.width,
        0,
        image.width,
        image.height
      );
      let lastIntersection = intersect(
        startHandle.x,
        startHandle.y,
        endHandle.x,
        endHandle.y,
        0,
        0,
        0,
        image.height
      );

      context.beginPath();
      let [startHandleCanvas, endHandleCanvas] = applyPixelToCanvas(
        [startHandle, endHandle],
        element,
        xMultiplier,
        yMultiplier,
        xScope,
        yScope,
        image,
        viewport,
        compoundObject.compoundGraphicUnits === "DISPLAY"
      );

      drawLine(context, element, startHandleCanvas, endHandleCanvas, {
        color: finalColor,
        lineWidth,
        lineDashed: false
      });

      if (firstIntersection) {
        const [firstIntersectionCanvas] = applyPixelToCanvas(
          [firstIntersection],
          element,
          xMultiplier,
          yMultiplier,
          xScope,
          yScope,
          image,
          viewport,
          compoundObject.compoundGraphicUnits === "DISPLAY"
        );
        drawLine(context, element, firstIntersectionCanvas, startHandleCanvas, {
          color: finalColor,
          lineWidth,
          lineDashed: true
        });
      }

      if (lastIntersection) {
        const [lastIntersectionCanvas] = applyPixelToCanvas(
          [lastIntersection],
          element,
          xMultiplier,
          yMultiplier,
          xScope,
          yScope,
          image,
          viewport,
          compoundObject.compoundGraphicUnits === "DISPLAY"
        );
        drawLine(context, element, endHandleCanvas, lastIntersectionCanvas, {
          color: finalColor,
          lineWidth,
          lineDashed: true
        });
      }
      context.stroke();
      break;
    }

    case "CUTLINE": {
      let handles = calculateHandles(compoundObject.graphicData!, 0);
      let startHandle = handles.startHandle;
      let endHandle = handles.endHandle;
      let midpoint = handles.midpoint;
      if (compoundObject.rotationAngle) {
        const rotationCenter = compoundObject.rotationPoint
          ? {
              x: compoundObject.rotationPoint[0],
              y: compoundObject.rotationPoint[1]
            }
          : midpoint;
        [startHandle, endHandle] = applyRotationAndTranslation(
          [startHandle, endHandle],
          compoundObject.rotationAngle,
          rotationCenter
        );
      }
      let [startHandleCanvas, endHandleCanvas] = applyPixelToCanvas(
        [startHandle, endHandle],
        element,
        xMultiplier,
        yMultiplier,
        xScope,
        yScope,
        image,
        viewport,
        compoundObject.compoundGraphicUnits === "DISPLAY"
      );
      let dx = endHandleCanvas.x - startHandleCanvas.x;
      let dy = endHandleCanvas.y - startHandleCanvas.y;
      let length = Math.sqrt(dx * dx + dy * dy);

      let direction = { x: dx / length, y: dy / length };

      drawCutline(
        context,
        element,
        startHandleCanvas,
        endHandleCanvas,
        midpoint,
        direction,
        length,
        finalColor,
        lineWidth,
        compoundObject.gapLength,
        compoundObject.lineStyleSequence
      );
      context.stroke();
      break;
    }

    case "RANGELINE": {
      if (compoundObject.graphicData?.length !== 4) {
        context.restore();
        return;
      }
      let handles = calculateHandles(compoundObject.graphicData!, 0);
      let startHandle = handles.startHandle;
      let endHandle = handles.endHandle;
      let midpoint = handles.midpoint;
      if (compoundObject.rotationAngle) {
        const rotationCenter = compoundObject.rotationPoint
          ? {
              x: compoundObject.rotationPoint[0],
              y: compoundObject.rotationPoint[1]
            }
          : midpoint;
        [startHandle, endHandle] = applyRotationAndTranslation(
          [startHandle, endHandle],
          compoundObject.rotationAngle,
          rotationCenter
        );
      }
      let [startHandleCanvas, endHandleCanvas] = applyPixelToCanvas(
        [startHandle, endHandle],
        element,
        xMultiplier,
        yMultiplier,
        xScope,
        yScope,
        image,
        viewport,
        compoundObject.compoundGraphicUnits === "DISPLAY"
      );

      drawLine(context, element, startHandleCanvas, endHandleCanvas, {
        color: finalColor,
        lineWidth: compoundObject.lineStyleSequence?.lineThickness || 1,
        lineDashed: false
      });

      let dx = endHandleCanvas.x - startHandleCanvas.x;
      let dy = endHandleCanvas.y - startHandleCanvas.y;
      let length = Math.sqrt(dx * dx + dy * dy);

      let direction = { x: dx / length, y: dy / length };

      const tickLength = 10;
      drawPerpendicularTickAtPoint(
        startHandleCanvas,
        direction,
        context,
        tickLength
      );
      drawPerpendicularTickAtPoint(
        endHandleCanvas,
        direction,
        context,
        tickLength
      );

      context.stroke();
      break;
    }

    case "RULER":
    case "AXIS": {
      const majorTicks = compoundObject.majorTicks || [];
      const tickAlignment = compoundObject.tickFormat || "CENTER";
      const tickLabelAlignment = compoundObject.tickLabelFormat || "BOTTOM";
      let handles = calculateHandles(compoundObject.graphicData!, 0);
      let startHandle = handles.startHandle;
      let endHandle = handles.endHandle;
      let midpoint = handles.midpoint;

      if (compoundObject.rotationAngle) {
        const rotationCenter = compoundObject.rotationPoint
          ? {
              x: compoundObject.rotationPoint[0],
              y: compoundObject.rotationPoint[1]
            }
          : midpoint;
        [startHandle, endHandle] = applyRotationAndTranslation(
          [startHandle, endHandle],
          compoundObject.rotationAngle,
          rotationCenter
        );
      }
      let [startHandleCanvas, endHandleCanvas] = applyPixelToCanvas(
        [startHandle, endHandle],
        element,
        xMultiplier,
        yMultiplier,
        xScope,
        yScope,
        image,
        viewport,
        compoundObject.compoundGraphicUnits === "DISPLAY"
      );
      drawLine(context, element, startHandleCanvas, endHandleCanvas, {
        color: finalColor,
        lineWidth: compoundObject.lineStyleSequence?.lineThickness || lineWidth,
        lineDashed: false
      });
      let dx = endHandleCanvas.x - startHandleCanvas.x;
      let dy = endHandleCanvas.y - startHandleCanvas.y;
      let length = Math.sqrt(dx * dx + dy * dy);
      let direction = { x: dx / length, y: dy / length };

      majorTicks.forEach((tick: MajorTicks) => {
        const position = tick.tickPosition;
        const label = tick.tickLabel;

        drawTick(
          position! * length,
          label!,
          tickAlignment,
          tickLabelAlignment,
          context,
          direction,
          startHandleCanvas,
          compoundObject.showTick === "Y"
        );
      });

      context.stroke();
      break;
    }

    case "CROSSHAIR": {
      let origin = {
        x: compoundObject.graphicData![0],
        y: compoundObject.graphicData![1]
      };

      if (compoundObject.compoundGraphicUnits === "DISPLAY") {
        origin = rotateCoords(origin, image, viewport);
        origin = {
          x: origin.x * xMultiplier + xScope,
          y: origin.y * yMultiplier + yScope
        };
      }

      const originCanvas = cornerstone.pixelToCanvas(
        element,
        origin as PixelCoordinate
      );

      if (
        compoundObject.diameterOfVisibility &&
        compoundObject.diameterOfVisibility > 0
      ) {
        const radius = compoundObject.diameterOfVisibility / 2;

        context.beginPath();
        context.moveTo(originCanvas.x - radius, originCanvas.y);
        context.lineTo(originCanvas.x + radius, originCanvas.y);
        context.moveTo(originCanvas.x, originCanvas.y - radius);
        context.lineTo(originCanvas.x, originCanvas.y + radius);
        context.strokeStyle = finalColor;
        context.lineWidth =
          compoundObject.lineStyleSequence?.lineThickness || lineWidth;
        context.stroke();
      }

      if (compoundObject.gapLength && compoundObject.gapLength > 0) {
        const gapRadius = compoundObject.gapLength / 2;

        context.beginPath();
        context.arc(
          originCanvas.x,
          originCanvas.y,
          gapRadius,
          0,
          2 * Math.PI,
          false
        );
        context.lineWidth =
          compoundObject.lineStyleSequence?.lineThickness || lineWidth;
        context.strokeStyle = context.fillStyle = finalColor;
        context.fill();
        context.stroke();
      }
      if (compoundObject.showTick === "Y") {
        drawTick(
          0,
          "Tick Label",
          compoundObject.tickFormat || "CENTER",
          compoundObject.tickLabelFormat || "BOTTOM",
          context,
          { x: 0, y: 0 },
          originCanvas,
          true
        );
      }
      break;
    }
  }

  context.restore();
}

export function renderOverlay(data: AnnotationOverlay, image: Image) {
  if (data.visible === false) return;
  const layerCanvas = document.createElement("canvas");
  layerCanvas.width = image.width;
  layerCanvas.height = image.height;
  const layerContext = layerCanvas.getContext("2d");
  if (!layerContext) return;
  layerContext.fillStyle = data.fillStyle!;
  if (data.type === "R") {
    layerContext.fillRect(0, 0, layerCanvas.width, layerCanvas.height);
    layerContext.globalCompositeOperation = "xor";
  }
  let i = 0;
  for (let y = 0; y < data.rows!; y++) {
    for (let x = 0; x < data.columns!; x++) {
      if (data.pixelData![i++] > 0) layerContext.fillRect(x, y, 1, 1);
    }
  }
  const overlayX = !isNaN(data.x!) && isFinite(data.x!) ? data.x : 0;
  const overlayY = !isNaN(data.y!) && isFinite(data.y!) ? data.y : 0;
  layerContext.drawImage(layerCanvas, overlayX!, overlayY!);
}
