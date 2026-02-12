import {
  convertCIELabToHex,
  convertCIELabToRGBWithRefs
} from "./genericDrawingUtils";
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
  defaultColor: string,
  viewport: ViewportComplete,
  image: Image
) {
  const graphicType = graphicObject.graphicType;
  if (!graphicType) return;

  context.save();

  let strokeColor = defaultColor;

  if (graphicObject.lineStyleSequence) {
    context.lineWidth = graphicObject.lineStyleSequence.lineThickness || 1;

    if (graphicObject.lineStyleSequence.patternOnColorCIELabValue) {
      strokeColor = convertCIELabToHex(
        graphicObject.lineStyleSequence.patternOnColorCIELabValue
      );
    }

    if (graphicObject.lineStyleSequence.lineDashingStyle === "DASHED") {
      context.setLineDash([8, 5]);
    } else if (graphicObject.lineStyleSequence.lineDashingStyle === "DOTTED") {
      context.setLineDash([2, 2]);
    } else {
      context.setLineDash([]);
    }

    if (graphicObject.lineStyleSequence.shadowStyle === "ON") {
      const shadowRgb = convertCIELabToRGBWithRefs(
        graphicObject.lineStyleSequence.shadowColorCIELabValue
      );
      context.shadowColor = `rgba(${shadowRgb[0]}, ${shadowRgb[1]}, ${shadowRgb[2]}, 1)`;
      context.shadowBlur = graphicObject.lineStyleSequence.shadowOpacity || 0;
      context.shadowOffsetX =
        graphicObject.lineStyleSequence.shadowOffsetX || 0;
      context.shadowOffsetY =
        graphicObject.lineStyleSequence.shadowOffsetY || 0;
    }
  }

  context.strokeStyle = strokeColor;
  context.fillStyle = strokeColor;

  const xMultiplier =
    viewport.displayedArea?.tlhc?.x && viewport.displayedArea?.brhc?.x
      ? viewport.displayedArea.brhc.x - viewport.displayedArea.tlhc.x
      : 1;
  const xScope = viewport.displayedArea?.tlhc?.x ?? 0;
  const yMultiplier =
    viewport.displayedArea?.tlhc?.y && viewport.displayedArea?.brhc?.y
      ? viewport.displayedArea.brhc.y - viewport.displayedArea.tlhc.y
      : 1;
  const yScope = viewport.displayedArea?.tlhc?.y ?? 0;

  const isDisplay = graphicObject.graphicAnnotationUnits === "DISPLAY";

  switch (graphicType) {
    case "POINT":
      const [pointCanvas] = applyPixelToCanvas(
        [
          { x: graphicObject.graphicData![0], y: graphicObject.graphicData![1] }
        ],
        element,
        xMultiplier,
        yMultiplier,
        xScope,
        yScope,
        image,
        viewport,
        isDisplay
      );
      context.fillRect(pointCanvas.x - 1, pointCanvas.y - 1, 3, 3);
      break;

    case "POLYLINE":
    case "INTERPOLATED":
      const points: Coords[] = [];
      for (let i = 0; i < graphicObject.graphicData!.length; i += 2) {
        const [p] = applyPixelToCanvas(
          [
            {
              x: graphicObject.graphicData![i],
              y: graphicObject.graphicData![i + 1]
            }
          ],
          element,
          xMultiplier,
          yMultiplier,
          xScope,
          yScope,
          image,
          viewport,
          isDisplay
        );
        points.push(p);
      }
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        context.lineTo(points[i].x, points[i].y);
      }
      if (graphicObject.graphicFilled === "Y") context.fill();
      context.stroke();
      break;

    case "CIRCLE":
      const [center, radiusPt] = applyPixelToCanvas(
        [
          {
            x: graphicObject.graphicData![0],
            y: graphicObject.graphicData![1]
          },
          { x: graphicObject.graphicData![2], y: graphicObject.graphicData![3] }
        ],
        element,
        xMultiplier,
        yMultiplier,
        xScope,
        yScope,
        image,
        viewport,
        isDisplay
      );
      const radius = Math.sqrt(
        Math.pow(center.x - radiusPt.x, 2) + Math.pow(center.y - radiusPt.y, 2)
      );
      context.beginPath();
      context.arc(center.x, center.y, radius, 0, 2 * Math.PI);
      if (graphicObject.graphicFilled === "Y") context.fill();
      context.stroke();
      break;

    case "ELLIPSE":
      const ellipseCoords = calculateEllipseCoordinates(
        graphicObject.graphicData!
      );
      const transformed = applyPixelToCanvas(
        [
          ellipseCoords.c,
          ellipseCoords.right,
          ellipseCoords.left,
          ellipseCoords.bottom,
          ellipseCoords.top
        ],
        element,
        xMultiplier,
        yMultiplier,
        xScope,
        yScope,
        image,
        viewport,
        isDisplay
      );
      drawEllipse(
        context,
        transformed[0],
        transformed[1],
        transformed[2],
        transformed[3],
        transformed[4],
        strokeColor,
        graphicObject.graphicFilled === "Y"
      );
      break;
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
  defaultColor: string,
  element: HTMLElement,
  image: Image,
  viewport: ViewportComplete
) {
  const color = textObject.textStyleSequence?.textColorCIELabValue
    ? convertCIELabToHex(textObject.textStyleSequence.textColorCIELabValue)
    : defaultColor;

  const xMultiplier =
    viewport.displayedArea?.tlhc?.x && viewport.displayedArea?.brhc?.x
      ? viewport.displayedArea.brhc.x - viewport.displayedArea.tlhc.x
      : 1;
  const xScope = viewport.displayedArea?.tlhc?.x ?? 0;
  const yMultiplier =
    viewport.displayedArea?.tlhc?.y && viewport.displayedArea?.brhc?.y
      ? viewport.displayedArea.brhc.y - viewport.displayedArea.tlhc.y
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

  const hasBox = brhc.x !== null && tlhc.x !== null;
  const xCenter = hasBox ? (brhc.x! + tlhc.x!) / 2 : (anchorPoint.x ?? 0);
  const yCenter = hasBox ? (brhc.y! + tlhc.y!) / 2 : (anchorPoint.y ?? 0);

  const boundingBoxWidth = hasBox ? Math.abs(brhc.x! - tlhc.x!) : 0;
  const boundingBoxHeight = hasBox ? Math.abs(brhc.y! - tlhc.y!) : 0;

  const left = xCenter - boundingBoxWidth / 2;
  const top = yCenter - boundingBoxHeight / 2;

  drawText(context, textObject, xCenter, yCenter, color);

  if (
    anchorPoint.x !== null &&
    anchorPoint.y !== null &&
    textObject.anchorPointVisibility === "Y"
  ) {
    context.save();
    context.setLineDash([5, 5]);
    context.strokeStyle = color;
    context.lineWidth = 1;

    drawLink(
      [
        {
          x: anchorPoint.x,
          y: anchorPoint.y
        }
      ],
      { x: xCenter, y: yCenter },
      {
        width: boundingBoxWidth,
        height: boundingBoxHeight,
        left,
        top
      },
      context,
      color,
      1
    );

    context.restore();
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
  //angle: number
) {
  const graphicType = compoundObject.graphicType;
  const xMultiplier =
    viewport.displayedArea?.tlhc?.x && viewport.displayedArea?.brhc?.x
      ? viewport.displayedArea.brhc.x - viewport.displayedArea.tlhc.x
      : 1;
  const xScope = viewport.displayedArea?.tlhc?.x ?? 0;
  const yMultiplier =
    viewport.displayedArea?.tlhc?.y && viewport.displayedArea?.brhc?.y
      ? viewport.displayedArea.brhc.y - viewport.displayedArea.tlhc.y
      : 1;
  const yScope = viewport.displayedArea?.tlhc?.y ?? 0;
  let lineWidth = 1;
  let lineDashed: number[] | number = [2, 3];
  if (compoundObject.lineStyleSequence) {
    lineWidth = compoundObject.lineStyleSequence.lineThickness ?? 1;
    lineDashed = compoundObject.lineStyleSequence.lineDashingStyle ?? [2, 3];
    context.lineWidth = lineWidth;
    const shadowRgb = convertCIELabToRGBWithRefs(
      compoundObject.lineStyleSequence?.shadowColorCIELabValue
    );
    context.shadowColor = `rgba(${shadowRgb[0]}, ${shadowRgb[1]}, ${shadowRgb[2]}, 1)`;
    context.shadowBlur = compoundObject.lineStyleSequence?.shadowOpacity!;
    context.shadowOffsetX = compoundObject.lineStyleSequence?.shadowOffsetX!;
    context.shadowOffsetY = compoundObject.lineStyleSequence?.shadowOffsetY!;
  }

  //TODO-Laura introduce rotation for CROSSHAIR
  if (!graphicType) return;
  switch (graphicType) {
    case "ELLIPSE":
      const { c, right, left, bottom, top } = calculateEllipseCoordinates(
        compoundObject.graphicData!
      );

      let coords = [c, right, left, bottom, top];

      if (compoundObject.rotationAngle && compoundObject.rotationPoint) {
        const rotationCenter = {
          x: compoundObject.rotationPoint[0],
          y: compoundObject.rotationPoint[1]
        };
        coords = applyRotationAndTranslation(
          coords,
          compoundObject.rotationAngle,
          rotationCenter
        );
      }

      context.beginPath();

      const transformedCoords = applyPixelToCanvas(
        coords,
        element,
        xMultiplier,
        yMultiplier,
        xScope,
        yScope,
        image,
        viewport,
        compoundObject.compoundGraphicUnits === "DISPLAY"
      );
      const [
        canvasCenter,
        transformedRight,
        transformedLeft,
        transformedBottom,
        transformedTop
      ] = transformedCoords;

      drawEllipse(
        context,
        canvasCenter,
        transformedRight,
        transformedLeft,
        transformedBottom,
        transformedTop,
        color,
        compoundObject.graphicFilled === "Y"
      );
      break;
    case "RECTANGLE":
      let { tlhc, brhc } = calculateRectangleCoordinates(
        compoundObject.graphicData!
      );

      if (compoundObject.rotationAngle && compoundObject.rotationPoint) {
        const rotationCenter = {
          x: compoundObject.rotationPoint[0],
          y: compoundObject.rotationPoint[1]
        };

        [tlhc, brhc] = applyRotationAndTranslation(
          [tlhc, brhc],
          compoundObject.rotationAngle,
          rotationCenter
        );
      }

      context.beginPath();

      const [tlhcCanvas, brhcCanvas] = applyPixelToCanvas(
        [tlhc, brhc],
        element,
        xMultiplier,
        yMultiplier,
        xScope,
        yScope,
        image,
        viewport,
        compoundObject.compoundGraphicUnits === "DISPLAY"
      );

      drawRectangle(
        context,
        tlhcCanvas,
        brhcCanvas,
        color,
        compoundObject.graphicFilled === "Y"
      );
      break;
    case "ARROW":
      let handles = calculateHandles(compoundObject.graphicData!, 0);
      let startHandle = handles.startHandle;
      let endHandle = handles.endHandle;
      let midpoint = handles.midpoint;
      if (compoundObject.rotationAngle) {
        // Rotate around the rotation point if defined
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
      drawArrow(
        context,
        startHandleCanvas,
        endHandleCanvas,
        color,
        lineWidth,
        lineDashed
      );
      break;
    case "MULTILINE":
      for (let i = 0; i < compoundObject.graphicData!.length; i += 4) {
        if (i + 1 < compoundObject.graphicData!.length) {
          const handles = calculateHandles(compoundObject.graphicData!, i);
          let startHandle = handles.startHandle;
          let endHandle = handles.endHandle;
          midpoint = handles.midpoint;
          if (compoundObject.rotationAngle) {
            // Rotate around the rotation point if defined
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
            color,
            lineWidth,
            lineDashed
          });
        }
      }
      break;
    case "INFINITELINE":
      handles = calculateHandles(compoundObject.graphicData!, 0);
      startHandle = handles.startHandle;
      endHandle = handles.endHandle;
      midpoint = handles.midpoint;

      if (compoundObject.rotationAngle) {
        // Rotate around the rotation point if defined
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
      [startHandleCanvas, endHandleCanvas] = applyPixelToCanvas(
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
      // Draw the solid line between startHandle and endHandle
      drawLine(context, element, startHandleCanvas, endHandleCanvas, {
        color,
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
        // Draw the dashed line from firstIntersection to startHandle
        drawLine(context, element, firstIntersectionCanvas, startHandleCanvas, {
          color,
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
        // Draw the dashed line from endHandle to lastIntersection
        drawLine(context, element, endHandleCanvas, lastIntersectionCanvas, {
          color,
          lineWidth,
          lineDashed: true
        });
      }

      context.stroke();
      break;
    case "CUTLINE":
      // Points defining the cutline
      handles = calculateHandles(compoundObject.graphicData!, 0);
      startHandle = handles.startHandle;
      endHandle = handles.endHandle;
      midpoint = handles.midpoint;
      // Handle rotation if necessary
      if (compoundObject.rotationAngle) {
        // Rotate around the rotation point if defined
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
      [startHandleCanvas, endHandleCanvas] = applyPixelToCanvas(
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
        color,
        lineWidth,
        compoundObject.gapLength,
        compoundObject.lineStyleSequence
      );
      context.stroke();

      break;
    case "RANGELINE":
      if (compoundObject.graphicData?.length !== 4) {
        logger.error("RANGELINE requires exactly two points.");
        return;
      }

      handles = calculateHandles(compoundObject.graphicData!, 0);
      startHandle = handles.startHandle;
      endHandle = handles.endHandle;
      midpoint = handles.midpoint;
      if (compoundObject.rotationAngle) {
        // Rotate around the rotation point if defined
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
      [startHandleCanvas, endHandleCanvas] = applyPixelToCanvas(
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

      // Draw the line segment
      drawLine(context, element, startHandleCanvas, endHandleCanvas, {
        color,
        lineWidth: compoundObject.lineStyleSequence?.lineThickness || 1,
        lineDashed: false
      });

      dx = endHandleCanvas.x - startHandleCanvas.x;
      dy = endHandleCanvas.y - startHandleCanvas.y;
      length = Math.sqrt(dx * dx + dy * dy);

      direction = { x: dx / length, y: dy / length };

      // Draw perpendicular ticks at start and end points
      const tickLength = 10; // Customize this length as needed
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
    case "RULER":
    case "AXIS":
      // Major Ticks Sequence (0070,0287)
      const majorTicks = compoundObject.majorTicks || []; // Assume it's an array of tick data
      const tickAlignment = compoundObject.tickFormat || "CENTER"; // Assume value for tick alignment
      const tickLabelAlignment = compoundObject.tickLabelFormat || "BOTTOM"; // Assume value for label alignment
      handles = calculateHandles(compoundObject.graphicData!, 0);
      startHandle = handles.startHandle;
      endHandle = handles.endHandle;
      midpoint = handles.midpoint;

      if (compoundObject.rotationAngle) {
        // Rotate around the rotation point if defined
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
      [startHandleCanvas, endHandleCanvas] = applyPixelToCanvas(
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
        color,
        lineWidth: compoundObject.lineStyleSequence?.lineThickness || lineWidth,
        lineDashed: false
      });
      dx = endHandleCanvas.x - startHandleCanvas.x;
      dy = endHandleCanvas.y - startHandleCanvas.y;
      length = Math.sqrt(dx * dx + dy * dy);
      // Normalize the direction vector
      direction = { x: dx / length, y: dy / length };
      majorTicks.forEach((tick: MajorTicks) => {
        const position = tick.tickPosition; // Position along the ruler line (0 to 1 for normalized)
        const label = tick.tickLabel; // Label for the tick (e.g., a number)

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

    case "CROSSHAIR":
      // Origin point of the crosshair
      let origin = {
        x: compoundObject.graphicData![0],
        y: compoundObject.graphicData![1]
      };

      // Transform coordinates if necessary
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

      // Draw the crosshair
      if (
        compoundObject.diameterOfVisibility &&
        compoundObject.diameterOfVisibility > 0
      ) {
        const radius = compoundObject.diameterOfVisibility / 2;

        // Draw the horizontal and vertical lines
        context.beginPath();
        context.moveTo(originCanvas.x - radius, originCanvas.y);
        context.lineTo(originCanvas.x + radius, originCanvas.y);
        context.moveTo(originCanvas.x, originCanvas.y - radius);
        context.lineTo(originCanvas.x, originCanvas.y + radius);
        context.strokeStyle = color;
        context.lineWidth =
          compoundObject.lineStyleSequence?.lineThickness || lineWidth;
        context.stroke();
      }

      // Draw the gap (if specified)
      if (compoundObject.gapLength && compoundObject.gapLength > 0) {
        const gapRadius = compoundObject.gapLength / 2;

        // Draw circles or gaps
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
        context.strokeStyle = context.fillStyle = color;
        context.fill();
        context.stroke();
      }
      if (compoundObject.showTick === "Y") {
        // Assuming ticks are always centered for CROSSHAIR
        drawTick(
          0, // Crosshair ticks are not positioned along a line
          "Tick Label", // Placeholder for tick label
          compoundObject.tickFormat || "CENTER", // Tick alignment
          compoundObject.tickLabelFormat || "BOTTOM", // Tick label alignment
          context,
          { x: 0, y: 0 }, // No direction for crosshair
          originCanvas,
          true
        );
      }
      break;
    default:
      return;
  }
}

/** Renders an overlay on the image canvas based on annotation data, following DICOM standards 
   for overlay planes and pixel data (60xx,3000).
 * @name renderOverlay
 * @protected
 * @param  {AnnotationOverlay} data //object containing graphic parameters for annotations
 * @param  {Image} image 
 *
 * @returns {void}
 */
export function renderOverlay(data: AnnotationOverlay, image: Image) {
  if (data.visible === false) {
    return;
  }

  const layerCanvas = document.createElement("canvas");
  layerCanvas.width = image.width;
  layerCanvas.height = image.height;

  const layerContext = layerCanvas.getContext("2d");
  if (!layerContext) {
    logger.error("Failed to get 2D context for layerCanvas.");
    return;
  }

  layerContext.fillStyle = data.fillStyle!;

  if (data.type === "R") {
    layerContext.fillRect(0, 0, layerCanvas.width, layerCanvas.height);
    layerContext.globalCompositeOperation = "xor";
  }

  let i = 0;
  for (let y = 0; y < data.rows!; y++) {
    for (let x = 0; x < data.columns!; x++) {
      if (data.pixelData![i++] > 0) {
        layerContext.fillRect(x, y, 1, 1);
      }
    }
  }

  // Guard against non-number values for overlay coordinates
  const overlayX = !isNaN(data.x!) && isFinite(data.x!) ? data.x : 0;
  const overlayY = !isNaN(data.y!) && isFinite(data.y!) ? data.y : 0;

  // Draw the overlay layer onto the canvas
  layerContext.drawImage(layerCanvas, overlayX!, overlayY!);
}
