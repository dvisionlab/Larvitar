import type { TextDetails } from "./types";
import { rotateCoords } from "./genericMathUtils";
import * as csTools from "cornerstone-tools";
import cornerstone, { Image } from "cornerstone-core";
import { Coords, ViewportComplete } from "../../types";
const drawArrow = csTools.importInternal("drawing/drawArrow");
const drawLine = csTools.importInternal("drawing/drawLine");

//SHUTTERS

/** 
  Implements a circular shutter by calculating the center and radius,
  then drawing the circular area on the canvas,
  masking out the areas outside the circle.
 * @name applyCircularShutter
 * @protected
 * @param  {[number, number]} center 
 * @param  {number} radius 
 * @param  {ViewportComplete} viewport 
 * @param  {Image} image 
 * @param  {HTMLElement} element 
 * @param  {HTMLCanvasElement} canvas 
 * @param  {[number, number, number]} color 
 * @param  {CanvasRenderingContext2D} ctx 
 *
 * @returns {void}
 */
export function applyCircularShutter(
  center: [number, number],
  radius: number,
  viewport: ViewportComplete,
  image: Image,
  element: HTMLElement,
  canvas: HTMLCanvasElement,
  color: [number, number, number],
  ctx: CanvasRenderingContext2D
) {
  ctx.beginPath();
  const centerRotated = rotateCoords(
    { x: center[0], y: center[1] },
    image,
    viewport as ViewportComplete
  );

  const canvasPoints = cornerstone.pixelToCanvas(element, centerRotated as any);
  const point = cornerstone.pixelToCanvas(element, {
    x: centerRotated.x,
    y: centerRotated.y + radius
  } as any);

  const canvasRadius = Math.sqrt(
    Math.pow(point.x - canvasPoints.x, 2) +
      Math.pow(point.y - canvasPoints.y, 2)
  );

  // Create the circular cutout
  ctx.arc(canvasPoints.x, canvasPoints.y, canvasRadius, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.rect(canvas.width, 0, -canvas.width, canvas.height);
  // Draw the black background
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  ctx.fill();
}

/** 
    Implements a rectangular shutter by drawing black rectangles on the areas
    outside the defined shutter edges, masking the rest of the image.
 * @name applyRectangularShutter
 * @protected
 * @param  {number} left 
 * @param  {number} right 
 * @param  {number} upper 
 * @param  {number} lower 
 * @param  {HTMLElement} ctx 
 * @param  {HTMLCanvasElement} canvas 
 * @param  {[number, number, number]} color 
 *
 * @returns {void}
 */
export function applyRectangularShutter(
  left: number,
  right: number,
  upper: number,
  lower: number,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  color: [number, number, number]
) {
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  ctx.fillRect(0, 0, canvas.width, upper);
  ctx.fillRect(0, lower, canvas.width, canvas.height - lower);
  ctx.fillRect(0, upper, left, lower - upper);
  ctx.fillRect(right, upper, canvas.width - right, lower - upper);
}

/** 
 Implements a polygonal shutter by defining a polygon shape using vertex
 coordinates and clipping the canvas to mask the image outside the polygon.
 * @name applyPolygonalShutter
 * @protected
 * @param  {number[]} vertices 
 * @param  {HTMLElement} ctx 
 * @param  {HTMLCanvasElement} canvas 
 *
 * @returns {void}
 */
export function applyPolygonalShutter(
  vertices: number[],
  ctx: CanvasRenderingContext2D,
  element: HTMLElement,
  canvas: HTMLCanvasElement
) {
  // Save the current context state
  ctx.save();
  // Begin path for the polygon
  ctx.beginPath();

  // Move to the first vertex
  const startPoint = cornerstone.pixelToCanvas(element, {
    x: vertices[0],
    y: vertices[1]
  } as any);
  ctx.moveTo(startPoint.x, startPoint.y);

  // Draw lines to subsequent vertices
  for (let i = 2; i < vertices.length; i += 2) {
    const point = cornerstone.pixelToCanvas(element, {
      x: vertices[i],
      y: vertices[i + 1]
    } as any);
    ctx.lineTo(point.x, point.y);
  }
  // Close the polygon path
  ctx.closePath();
  // Create a rectangular path that covers the entire canvas
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);

  // Set the polygon as a clipping region (hole in the rect)
  ctx.moveTo(startPoint.x, startPoint.y); // Move to the first polygon vertex again
  for (let i = 2; i < vertices.length; i += 2) {
    const point = cornerstone.pixelToCanvas(element, {
      x: vertices[i],
      y: vertices[i + 1]
    } as any);
    ctx.lineTo(point.x, point.y);
  }

  // Close the polygon path again and clip it
  ctx.closePath();
  ctx.clip("evenodd"); // This ensures the polygon acts as a hole

  // Fill the rectangle (outside the polygon)
  ctx.fillStyle = "black";
  ctx.fill();

  // Restore the context to avoid clipping for other drawings
  ctx.restore();
}

/** 
  Draws text on the canvas, respecting various styles such as bold, italic,
  shadow, and color based on a textObject.
  It also handles the text alignment and multiline text rendering.
 * @name drawText
 * @protected
 * @param  {CanvasRenderingContext2D} context 
 * @param  {TextDetails} textObject 
 * @param  {number} textX 
 * @param  {number} textY 
 * @param  {string} color 
 *
 * @returns {void}
 */
export function drawText(
  context: CanvasRenderingContext2D,
  textObject: TextDetails,
  textX: number,
  textY: number,
  color: string
) {
  context.save();

  let fontName = "Arial";
  let textColor = color;

  if (textObject.textStyleSequence) {
    const style = textObject.textStyleSequence;
    fontName = style.fontName! ?? style.cssFontName!;
    if (style.bold === "Y") fontName = "bold " + fontName;
    if (style.italic === "Y") fontName = "italic " + fontName;
    if (style.shadowStyle) {
      const shadowRgb = convertCIELabToRGBWithRefs(
        style.shadowColorCIELabValue!
      );
      context.shadowColor = `rgba(${shadowRgb[0]}, ${shadowRgb[1]}, ${shadowRgb[2]}, 1)`;
      context.shadowBlur = style.shadowOpacity;
      context.shadowOffsetX = style.shadowOffsetX!;
      context.shadowOffsetY = style.shadowOffsetY!;
    }
    const rgb = convertCIELabToRGBWithRefs(style.textColorCIELabValue!);
    textColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1)`;
  }

  context.font = fontName;
  context.fillStyle = textColor;
  context.textAlign = textObject.textFormat as any;
  context.textBaseline = "top";

  const fontSize = parseInt(context.font.match(/\d+/)![0], 10);
  const lines = textObject.unformattedTextValue!.split("\n");

  lines.forEach((line, index) => {
    context.fillText(line, textX, textY + index * fontSize);
  });

  context.restore();
}

/**This function draws a rectangular bounding box around the text->
  Useful for visualizing the area occupied by the text on the canvas.
 * @name drawBoundingBox
 * @protected
 * @param  {CanvasRenderingContext2D} context 
 * @param  {TextDetails} textObject 
 * @param  {number} left 
 * @param  {number} top 
 * @param  {number} width 
 * @param  {number} height 
 * @param  {string} color 
 *
 * @returns {void}
 */

export function drawBoundingBox(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  color: string
) {
  context.save();
  context.strokeStyle = color;
  context.rect(left, top, width, height);
  context.stroke();
  context.restore();
}

/** 
  Draws ellipse on context
  * @name drawEllipse
 * @protected
 * @param  {CanvasRenderingContext2D} context 
 * @param  {Coords} canvasCenter 
 * @param  {Coords} left 
 * @param  {Coords} right 
 * @param  {Coords} bottom 
 * @param  {Coords} top 
 * @param  {string} color 
 * @param  {boolean} shouldFill 
 *
 * @returns {void}
 */
export function drawEllipse(
  context: CanvasRenderingContext2D,
  canvasCenter: Coords,
  right: Coords,
  left: Coords,
  bottom: Coords,
  top: Coords,
  color: string,
  shouldFill: boolean
) {
  const rx = Math.sqrt(Math.pow(right.x - left.x, 2)) / 2;
  const ry = Math.sqrt(Math.pow(top.x - bottom.x, 2)) / 2;

  context.ellipse(canvasCenter.x, canvasCenter.y, rx, ry, 0, 0, 2 * Math.PI);
  if (shouldFill) {
    context.fillStyle = color;
    context.fill();
  }
  context.strokeStyle = color;
  context.stroke();
}

/** 
  Draws rectangle on context
  * @name drawRectangle
 * @protected
 * @param  {CanvasRenderingContext2D} context 
 * @param  {Coords} tlhcCanvas 
 * @param  {Coords} brhcCanvas 
 * @param  {string} color 
 * @param  {boolean} shouldFill 
 *
 * @returns {void}
 */
export function drawRectangle(
  context: CanvasRenderingContext2D,
  tlhcCanvas: Coords,
  brhcCanvas: Coords,
  color: string,
  shouldFill: boolean
) {
  context.rect(
    tlhcCanvas.x,
    brhcCanvas.y,
    brhcCanvas.x - tlhcCanvas.x,
    brhcCanvas.y - tlhcCanvas.y
  );

  if (shouldFill) {
    context.fillStyle = color;
    context.fill();
  }

  context.strokeStyle = color;
  context.stroke();
}

/**Allows to draw a cutline on the canvas
 * @name drawCutline
 * @param {CanvasRenderingContext2D} context - The rendering context of the canvas.
 * @param {HTMLElement} element - The HTML element associated with the canvas.
 * @param {Coords} startHandleCanvas - The starting coordinates of the cutline.
 * @param {Coords} endHandleCanvas - The ending coordinates of the cutline.
 * @param {Coords} midpoint - The midpoint coordinates of the cutline.
 * @param {Coords} direction - The direction vector of the cutline.
 * @param {number} length - The total length of the cutline.
 * @param {string} color - The color of the cutline.
 * @param {number} lineWidth - The width of the cutline.
 * @param {number} [gapLength] - The optional length of the gap in the cutline.
 * @param {any} [lineStyleSequence] - Optional style configuration for the cutline.
 * @returns {void}
 */
export function drawCutline(
  context: CanvasRenderingContext2D,
  element: HTMLElement,
  startHandleCanvas: Coords,
  endHandleCanvas: Coords,
  midpoint: Coords,
  direction: Coords,
  length: number,
  color: string,
  lineWidth: number,
  gapLength?: number,
  lineStyleSequence?: any
) {
  const halfLength = length / 2;

  if (gapLength && gapLength > 0) {
    const gapRadius = gapLength / 2;

    drawLine(context, element, startHandleCanvas, midpoint, {
      color,
      lineWidth: lineStyleSequence?.lineThickness || lineWidth,
      lineDashed: false
    });

    const gapStart = {
      x: midpoint.x + direction.x * gapRadius,
      y: midpoint.y + direction.y * gapRadius
    };
    const gapEnd = {
      x: endHandleCanvas.x - direction.x * gapRadius,
      y: endHandleCanvas.y - direction.y * gapRadius
    };

    drawLine(context, element, gapStart, gapEnd, {
      color,
      lineWidth: lineStyleSequence?.lineThickness || lineWidth,
      lineDashed: false
    });
  } else {
    drawLine(context, element, startHandleCanvas, endHandleCanvas, {
      color,
      lineWidth: lineStyleSequence?.lineThickness || lineWidth,
      lineDashed: false
    });
  }

  const firstArrowPos = {
    x: startHandleCanvas.x + direction.x * (halfLength / 2),
    y: startHandleCanvas.y + direction.y * (halfLength / 2)
  };
  const secondArrowPos = {
    x: midpoint.x + direction.x * (halfLength / 2),
    y: midpoint.y + direction.y * (halfLength / 2)
  };

  drawArrow(
    context,
    firstArrowPos,
    midpoint,
    color,
    lineStyleSequence?.lineThickness || lineWidth,
    false
  );
  drawArrow(
    context,
    secondArrowPos,
    midpoint,
    color,
    lineStyleSequence?.lineThickness || lineWidth,
    false
  );

  context.stroke();
}

/**
 * Draws a perpendicular tick to a segment at a certain coordinate.
 * Useful for ruler and crosshair annotations.
 * @name drawPerpendicularTickAtPoint
 * @param {Coords} point - The coordinate where the tick is drawn.
 * @param {Coords} direction - The direction vector of the segment.
 * @param {CanvasRenderingContext2D} context - The rendering context of the canvas.
 * @param {number} tickLength - The length of the perpendicular tick.
 * @returns {void}
 */
export function drawPerpendicularTickAtPoint(
  point: Coords,
  direction: Coords,
  context: CanvasRenderingContext2D,
  tickLength: number
) {
  const perpendicularDirection = { x: -direction.y, y: direction.x };

  const tickStart = {
    x: point.x + perpendicularDirection.x * tickLength,
    y: point.y + perpendicularDirection.y * tickLength
  };
  const tickEnd = {
    x: point.x - perpendicularDirection.x * tickLength,
    y: point.y - perpendicularDirection.y * tickLength
  };

  context.beginPath();
  context.moveTo(tickStart.x, tickStart.y);
  context.lineTo(tickEnd.x, tickEnd.y);
  context.stroke();
}

/**
 * Draws a tick of a certain length on a segment, which can be positioned at TOP, CENTER, or BOTTOM.
 * @name drawTick
 * @param {number} position - The position of the tick along the segment.
 * @param {string} label - The label of the tick.
 * @param {string} alignment - The alignment of the tick (TOP, CENTER, BOTTOM).
 * @param {string} labelAlignment - The alignment of the label (TOP, BOTTOM).
 * @param {CanvasRenderingContext2D} context - The rendering context of the canvas.
 * @param {Coords} direction - The direction vector of the segment.
 * @param {Coords} startPoint - The starting point of the segment.
 * @param {boolean} showLabel - Whether to display the label.
 * @returns {void}
 */
export function drawTick(
  position: number,
  label: string,
  alignment: string,
  labelAlignment: string,
  context: CanvasRenderingContext2D,
  direction: Coords,
  startPoint: Coords,
  showLabel: boolean
) {
  // Calculate the tick position on the line
  const tickPosX = startPoint.x + direction.x * position;
  const tickPosY = startPoint.y + direction.y * position;

  // Set the tick length (you can customize this)
  const tickLength = 10;

  // Calculate the tick's start and end points based on alignment
  let tickStart: Coords = { x: 0, y: 0 };
  let tickEnd: Coords = { x: 0, y: 0 };

  switch (alignment) {
    case "BOTTOM":
      tickStart = {
        x: tickPosX + direction.y * tickLength,
        y: tickPosY - direction.x * tickLength
      };
      tickEnd = {
        x: tickPosX - direction.y * tickLength,
        y: tickPosY + direction.x * tickLength
      };
      break;
    case "CENTER":
      tickStart = {
        x: tickPosX + direction.y * (tickLength / 2),
        y: tickPosY - direction.x * (tickLength / 2)
      };
      tickEnd = {
        x: tickPosX - direction.y * (tickLength / 2),
        y: tickPosY + direction.x * (tickLength / 2)
      };
      break;
    case "TOP":
      tickStart = {
        x: tickPosX - direction.y * tickLength,
        y: tickPosY + direction.x * tickLength
      };
      tickEnd = {
        x: tickPosX + direction.y * tickLength,
        y: tickPosY - direction.x * tickLength
      };
      break;
  }

  // Draw the tick
  context.beginPath();
  context.moveTo(tickStart!.x, tickStart!.y);
  context.lineTo(tickEnd!.x, tickEnd!.y);
  context.stroke();

  if (showLabel) {
    // Calculate label position based on labelAlignment
    let labelPosX: number = 0;
    let labelPosY: number = 0;

    switch (labelAlignment) {
      case "BOTTOM":
        labelPosX = tickPosX + direction.y * (tickLength + 5);
        labelPosY = tickPosY - direction.x * (tickLength + 5);
        break;
      case "TOP":
        labelPosX = tickPosX - direction.y * (tickLength + 5);
        labelPosY = tickPosY + direction.x * (tickLength + 5);
        break;
    }

    // Draw the label
    context.fillText(label, labelPosX!, labelPosY!);
  }
}

//STYLE
/**
 * Converts CIELab color values to RGB format using reference white values,
 * as outlined in the DICOM color space transformations.
 * @name convertCIELabToRGBWithRefs
 * @param {number[]} cieLabColor - An array containing CIELab values.
 * @returns {[number, number, number]} - The converted RGB values.
 */

export function convertCIELabToRGBWithRefs(
  cieLabColor: number[]
): [number, number, number] {
  const l = (cieLabColor[0] / 65535) * 100;
  const a = (cieLabColor[1] / 65535) * 255 - 128;
  const b = (cieLabColor[2] / 65535) * 255 - 128;
  //const [x, y, z] = CIELabToXYZ(l, a, b)
  //XYZToRGB(x, y, z)

  const converter = new ColorConversion();
  const rgb = converter.convertCIELabToRGB(l, a, b); // Example values for L, a, b
  return [rgb.red, rgb.green, rgb.blue];
}
class ColorConversion {
  private readonly REF_X = 95.047; // Observer= 2°, Illuminant= D65
  private readonly REF_Y = 100.0;
  private readonly REF_Z = 108.883;

  private _l: number = NaN;
  private _a: number = NaN;
  private _b: number = NaN;

  private _x: number = NaN;
  private _y: number = NaN;
  private _z: number = NaN;

  private _red: number = NaN;
  private _green: number = NaN;
  private _blue: number = NaN;

  // Converts CIELab to RGB
  public convertCIELabToRGB(
    l: number,
    a: number,
    b: number
  ): { red: number; green: number; blue: number } {
    this._l = l;
    this._a = a;
    this._b = b;

    this.CIELabToXYZ();
    this.XYZToRGB();

    return {
      red: Math.min(Math.max(Math.round(this._red), 0), 255),
      green: Math.min(Math.max(Math.round(this._green), 0), 255),
      blue: Math.min(Math.max(Math.round(this._blue), 0), 255)
    };
  }

  // CIELab to XYZ conversion
  private CIELabToXYZ(): void {
    let varY = (this._l + 16.0) / 116.0;
    let varX = this._a / 500.0 + varY;
    let varZ = varY - this._b / 200.0;

    const y = Math.pow(varY, 3.0);
    const x = Math.pow(varX, 3.0);
    const z = Math.pow(varZ, 3.0);

    if (y <= 0.008856) varY = (varY - 16.0 / 116.0) / 7.787;
    if (x <= 0.008856) varX = (varX - 16.0 / 116.0) / 7.787;
    if (z <= 0.008856) varZ = (varZ - 16.0 / 116.0) / 7.787;

    this._x = varX * this.REF_X;
    this._y = varY * this.REF_Y;
    this._z = varZ * this.REF_Z;
  }

  // XYZ to RGB conversion
  private XYZToRGB(): void {
    const varX = this._x / 100.0;
    const varY = this._y / 100.0;
    const varZ = this._z / 100.0;

    let varR = varX * 3.2406 + varY * -1.5372 + varZ * -0.4986;
    let varG = varX * -0.9689 + varY * 1.8758 + varZ * 0.0415;
    let varB = varX * 0.0557 + varY * -0.204 + varZ * 1.057;

    varR =
      varR > 0.0031308
        ? 1.055 * Math.pow(varR, 1.0 / 2.4) - 0.055
        : 12.92 * varR;
    varG =
      varG > 0.0031308
        ? 1.055 * Math.pow(varG, 1.0 / 2.4) - 0.055
        : 12.92 * varG;
    varB =
      varB > 0.0031308
        ? 1.055 * Math.pow(varB, 1.0 / 2.4) - 0.055
        : 12.92 * varB;

    this._red = varR * 255.0;
    this._green = varG * 255.0;
    this._blue = varB * 255.0;
  }
}

/**
 * Converts CIELab color values to XYZ coordinates, following DICOM guidelines for color transformations
 * and reference illuminants.
 * @name CIELabToXYZ
 * @param {number} l - The lightness component of CIELab.
 * @param {number} a - The 'a' component of CIELab.
 * @param {number} b - The 'b' component of CIELab.
 * @returns {[number, number, number]} - The converted XYZ values.
 */
export function CIELabToXYZ(l: number, a: number, b: number) {
  const REF_X = 95.047;
  const REF_Y = 100.0;
  const REF_Z = 108.883;
  let varY = (l + 16.0) / 116.0;
  let varX = a / 500.0 + varY;
  let varZ = varY - b / 200.0;

  const y = Math.pow(varY, 3.0);
  const x = Math.pow(varX, 3.0);
  const z = Math.pow(varZ, 3.0);

  if (y > 0.008856) varY = y;
  else varY = (varY - 16.0 / 116.0) / 7.787;

  if (x > 0.008856) varX = x;
  else varX = (varX - 16.0 / 116.0) / 7.787;

  if (z > 0.008856) varZ = z;
  else varZ = (varZ - 16.0 / 116.0) / 7.787;

  return [REF_X * varX, REF_Y * varY, REF_Z * varZ];
}

/**
 * Converts XYZ color values to RGB using DICOM color space transformations.
 * @name XYZToRGB
 * @param {number} x - The X component of the XYZ color space.
 * @param {number} y - The Y component of the XYZ color space.
 * @param {number} z - The Z component of the XYZ color space.
 * @returns {[number, number, number]} - The converted RGB values.
 */
export function XYZToRGB(
  x: number,
  y: number,
  z: number
): [number, number, number] {
  const varX = x / 100.0; // _x  0 ÷  95.047
  const varY = y / 100.0; // _y  0 ÷ 100.000
  const varZ = z / 100.0; // _z  0 ÷ 108.883

  let varR = varX * 3.2406 + varY * -1.5372 + varZ * -0.4986;
  let varG = varX * -0.9689 + varY * 1.8758 + varZ * 0.0415;
  let varB = varX * 0.0557 + varY * -0.204 + varZ * 1.057;

  const exp = 1.0 / 2.4;

  if (varR > 0.0031308) varR = 1.055 * Math.pow(varR, exp) - 0.055;
  else varR = 12.92 * varR;

  if (varG > 0.0031308) varG = 1.055 * Math.pow(varG, exp) - 0.055;
  else varG = 12.92 * varG;

  if (varB > 0.0031308) varB = 1.055 * Math.pow(varB, exp) - 0.055;
  else varB = 12.92 * varB;

  return [varR * 255.0, varG * 255.0, varB * 255.0];
}
