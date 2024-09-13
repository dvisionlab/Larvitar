//external imports
import {
  getEnabledElement,
  PixelCoordinate,
  pixelToCanvas,
  Image,
  canvasToPixel,
  CanvasCoordinate
} from "cornerstone-core";
//internal imports
import { Coords } from "../../../types";
import { config } from "../../gridTool";

export type GridData = {
  from: Coords;
  to: Coords;
  color: string;
};
let lightColorCode = 1;
let darkColorCode = 0;

//retrieves cornerstone active enabled element
export function handleElement(element: HTMLElement): Promise<any> {
  try {
    const activeElement = getEnabledElement(element);

    return new Promise((resolve, reject) => {
      // Polling
      const checkImageAvailability = setInterval(() => {
        if (activeElement.image !== undefined) {
          clearInterval(checkImageAvailability);
          console.debug("Image is now available", activeElement.image);
          resolve(activeElement); // Resolve the promise with the activeElement
        } else {
          console.debug("Image not yet available, continuing to poll...");
        }
      }, 100);

      // Reject the promise if needed after a timeout
      setTimeout(() => {
        clearInterval(checkImageAvailability);
        reject(new Error("Image did not become available in time"));
      }, 5000);
    });
  } catch (error) {
    console.error("Error processing element:", error);
    throw error;
  }
}

//checks if pixel spacing is valid
export function validatePixelSpacing(spacingX: number, spacingY: number) {
  if (spacingX < config.minPixelSpacing || spacingY < config.minPixelSpacing) {
    throw new Error("Pixel size is too small or invalid.");
  }
}

//converts units from mm to pixel
export function mmToPixels(mm: number, pixelSpacing: any) {
  return Math.floor(mm / pixelSpacing);
}
// Set canvas size to match the image dimensions
export function findImageCoords(element: HTMLElement, image: Image) {
  const start = pixelToCanvas(element, {
    x: 0,
    y: 0
  } as PixelCoordinate);
  const end = pixelToCanvas(element, {
    x: image.width,
    y: image.height
  } as PixelCoordinate);

  return { start, end };
}

//converts dimensions from image system to canvas system
export function convertDimensionsToCanvas(
  element: HTMLElement,
  width: number,
  height: number
) {
  const startPattern = pixelToCanvas(element, {
    x: 0,
    y: 0
  } as PixelCoordinate);
  const endPattern = pixelToCanvas(element, {
    x: width,
    y: height
  } as PixelCoordinate);
  width = endPattern.x - startPattern.x;
  height = endPattern.y - startPattern.y;
  return { width, height };
}

//retrieves dash colors based on image bitDepth
export function getColors(bitDepth: number) {
  const maxVal = bitDepth === 8 ? config.maxVal8bit : config.maxVal16bit;
  const lightGray = `#${Math.ceil(maxVal * config.colorFractionLight).toString(
    16
  )}`;
  const darkGray = `#${Math.ceil(maxVal * config.colorFractionDark).toString(
    16
  )}`;
  lightColorCode = config.colorFractionLight;
  darkColorCode = config.colorFractionDark;
  return { lightGray, darkGray };
}

//draws the dashed line
export function drawDashedLine(
  context: CanvasRenderingContext2D,
  from: Coords,
  to: Coords,
  color: string
) {
  context.strokeStyle = color;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
  context.closePath();
}

//draws the vertical lines
export function drawVerticalLines(
  context: CanvasRenderingContext2D,
  xCenter: number,
  start: Coords,
  end: Coords,
  patternWidth: number,
  dashWidth: number,
  dashHeight: number,
  lightGray: string,
  darkGray: string,
  gridPixelArray: number[],
  image: Image,
  element: HTMLElement
) {
  context.lineWidth = dashHeight;
  context.setLineDash([dashWidth, dashWidth]);

  // Draw lines to the right of the center
  for (let x = xCenter; x < end.x; x += patternWidth) {
    let from = { x: x, y: start.y };
    let to = { x: x, y: end.y };
    drawDashedLine(context, from, to, lightGray);

    updatePixelArrayWithVerticalDashedLine(
      canvasToPixel(element, from as CanvasCoordinate),
      canvasToPixel(element, to as CanvasCoordinate),
      dashWidth,
      image.width,
      image.height,
      gridPixelArray,
      lightColorCode
    );

    from = { x: x + dashHeight, y: start.y };
    to = { x: x + dashHeight, y: end.y };
    drawDashedLine(context, from, to, darkGray);

    updatePixelArrayWithVerticalDashedLine(
      canvasToPixel(element, from as CanvasCoordinate),
      canvasToPixel(element, to as CanvasCoordinate),
      dashWidth,
      image.width,
      image.height,
      gridPixelArray,
      darkColorCode
    );
  }

  // Draw lines to the left of the center
  for (let x = xCenter; x > start.x; x -= patternWidth) {
    let from = { x: x, y: start.y };
    let to = { x: x, y: end.y };
    drawDashedLine(
      context,
      { x: x, y: start.y },
      { x: x, y: end.y },
      lightGray
    );

    updatePixelArrayWithVerticalDashedLine(
      canvasToPixel(element, from as CanvasCoordinate),
      canvasToPixel(element, to as CanvasCoordinate),
      dashWidth,
      image.width,
      image.height,
      gridPixelArray,
      lightColorCode
    );

    from = { x: x + dashHeight, y: start.y };
    to = { x: x + dashHeight, y: end.y };
    drawDashedLine(
      context,
      { x: x + dashHeight, y: start.y },
      { x: x + dashHeight, y: end.y },
      darkGray
    );

    updatePixelArrayWithVerticalDashedLine(
      canvasToPixel(element, from as CanvasCoordinate),
      canvasToPixel(element, to as CanvasCoordinate),
      dashWidth,
      image.width,
      image.height,
      gridPixelArray,
      darkColorCode
    );
  }
}

//updates grid's pixel array with vertical dashed lines
function updatePixelArrayWithVerticalDashedLine(
  from: Coords,
  to: Coords,
  dashWidth: number,
  imageWidth: number,
  imageHeight: number,
  pixelArray: number[],
  value: number // 1 for light gray, 2 for dark gray
) {
  const dashPattern = [dashWidth, dashWidth];
  let currentLength = 0;
  const lineLength = to.y - from.y;

  let dashIndex = 0;
  while (currentLength < lineLength) {
    const dashLength = dashPattern[dashIndex % dashPattern.length];
    const y0 = from.y + currentLength;
    let y1 = from.y + (currentLength + dashLength);

    if (currentLength + dashLength > lineLength) {
      y1 = from.y + dashLength;
    }

    for (
      let y = y0 < 0 ? Math.round(y0) : Math.floor(y0);
      y < (y1 > imageWidth ? Math.floor(y1) : Math.round(y1));
      y++
    ) {
      if (y >= 0 && y < imageHeight) {
        let xOffset =
          from.x > imageWidth && from.x > 0
            ? Math.floor(from.x)
            : Math.round(from.x);
        const index = y * imageWidth + xOffset;
        pixelArray[index] = value;
      }
    }

    currentLength += dashLength * 2;
    dashIndex++;
  }
}

//draws horizontal lines
export function drawHorizontalLines(
  context: CanvasRenderingContext2D,
  yCenter: number,
  start: Coords,
  end: Coords,
  patternHeight: number,
  dashWidth: number,
  dashHeight: number,
  lightGray: string,
  darkGray: string,
  gridPixelArray: number[],
  image: Image,
  element: HTMLElement
) {
  context.lineWidth = dashHeight;
  context.setLineDash([dashWidth, dashWidth]);

  // Draw lines below the center
  for (let y = yCenter; y < end.y; y += patternHeight) {
    let from = { x: start.x, y: y };
    let to = { x: end.x, y: y };
    drawDashedLine(
      context,
      { x: start.x, y: y },
      { x: end.x, y: y },
      lightGray
    );
    updatePixelArrayWithHorizontalDashedLine(
      canvasToPixel(element, from as CanvasCoordinate),
      canvasToPixel(element, to as CanvasCoordinate),
      dashWidth,
      image.width,
      image.height,
      gridPixelArray,
      lightColorCode
    );
    from = { x: start.x, y: y + dashHeight };
    to = { x: end.x, y: y + dashHeight };
    drawDashedLine(context, from, to, darkGray);
    updatePixelArrayWithHorizontalDashedLine(
      canvasToPixel(element, from as CanvasCoordinate),
      canvasToPixel(element, to as CanvasCoordinate),
      dashWidth,
      image.width,
      image.height,
      gridPixelArray,
      darkColorCode
    );
  }

  // Draw lines above the center
  for (let y = yCenter; y > start.y; y -= patternHeight) {
    let from = { x: start.x, y: y };
    let to = { x: end.x, y: y };
    drawDashedLine(
      context,
      { x: start.x, y: y },
      { x: end.x, y: y },
      lightGray
    );
    updatePixelArrayWithHorizontalDashedLine(
      canvasToPixel(element, from as CanvasCoordinate),
      canvasToPixel(element, to as CanvasCoordinate),
      dashWidth,
      image.width,
      image.height,
      gridPixelArray,
      lightColorCode
    );
    from = { x: start.x, y: y + dashHeight };
    to = { x: end.x, y: y + dashHeight };
    drawDashedLine(context, from, to, darkGray);
    updatePixelArrayWithHorizontalDashedLine(
      canvasToPixel(element, from as CanvasCoordinate),
      canvasToPixel(element, to as CanvasCoordinate),
      dashWidth,
      image.width,
      image.height,
      gridPixelArray,
      darkColorCode
    );
  }
}

//updates grid's pixel array with horizontal dashed lines
function updatePixelArrayWithHorizontalDashedLine(
  from: Coords,
  to: Coords,
  dashWidth: number,
  imageWidth: number,
  imageHeight: number,
  pixelArray: number[],
  value: number // 1 for light gray, 2 for dark gray
) {
  const dashPattern = [dashWidth, dashWidth];
  let currentLength = 0;
  const lineLength = to.x - from.x;

  let dashIndex = 0;
  while (currentLength < lineLength) {
    const dashLength = dashPattern[dashIndex % dashPattern.length];
    const x0 = from.x + currentLength;
    let x1 = from.x + (currentLength + dashLength);

    if (currentLength + dashLength > lineLength) {
      x1 = from.x + dashLength;
    }

    for (
      let x = x0 < 0 ? Math.round(x0) : Math.floor(x0);
      x < (x1 > imageWidth ? Math.floor(x1) : Math.round(x1));
      x++
    ) {
      if (x >= 0 && x < imageWidth) {
        let yOffset =
          from.y > imageHeight && from.y > 0
            ? Math.floor(from.y)
            : Math.round(from.y);
        const index = x * imageHeight + yOffset;
        pixelArray[index] = value;
      }
    }

    currentLength += dashLength * 2;
    dashIndex++;
  }
}
