import { MetaData } from "../../../types";
import type { ViewportComplete, Coords } from "../../types";
import cornerstone, { Image, Viewport } from "cornerstone-core";

/**
 * Configures the viewport with LUT data using the given VOI LUT Sequence,
 * translating the LUT descriptor and data into a usable form for display.
 */
export function setLUT(voiLut: MetaData, viewport: Viewport) {
  const lutDescriptor = voiLut.x00283002; // LUT Descriptor
  const lutData = voiLut.x00283006; // LUT Data

  // Apply LUT Data to the viewport (pseudo-code)
  if (lutDescriptor && lutData) {
    // Apply the Modality LUT to the viewport
    viewport.modalityLUT = {
      firstValueMapped: lutDescriptor[1],
      numBitsPerEntry: lutDescriptor[2],
      lut: lutData
    };
  }
}

/* Adjusts the coordinates of a point based on the image rotation.*/
export function rotateCoords(
  point: Coords,
  image: Image,
  viewport: ViewportComplete
) {
  if (viewport.rotation === 90) {
    point = {
      x: point.y,
      y: point.x
    };
  } else if (viewport.rotation === 270) {
    point = {
      x: image.height - point.y,
      y: image.width - point.x
    };
  } else if (viewport.rotation === 180) {
    point = {
      x: image.width - point.x,
      y: image.height - point.y
    };
  }
  return point;
}

/*Calculates ellipse coordinates from a starting array containing start and end point of its two main axis*/
export function calculateEllipseCoordinates(
  graphicData: number[]
): Record<string, Coords> {
  return {
    c: {
      x: (graphicData[2] + graphicData[0]) / 2,
      y: (graphicData[7] + graphicData[5]) / 2
    },
    right: {
      x: graphicData[2],
      y: graphicData[3]
    },
    left: {
      x: graphicData[0],
      y: graphicData[1]
    },
    bottom: {
      x: graphicData[6],
      y: graphicData[7]
    },
    top: {
      x: graphicData[4],
      y: graphicData[5]
    }
  };
}

/*Calculates rectangle coordinates from a starting array containing top left corner and
 bottom right corner */
export function calculateRectangleCoordinates(
  graphicData: number[]
): Record<string, Coords> {
  return {
    tlhc: {
      x: graphicData[0],
      y: graphicData[1]
    },
    brhc: {
      x: graphicData[2],
      y: graphicData[3]
    }
  };
}

/*Calculates start, end and mid handles of a segment */
export function calculateHandles(
  graphicData: number[],
  index: number
): Record<string, Coords> {
  const startHandle = {
    x: graphicData[index],
    y: graphicData[index + 1]
  };
  const endHandle = {
    x: graphicData[index + 2],
    y: graphicData[index + 3]
  };
  return {
    startHandle,
    endHandle,
    midpoint: {
      x: (startHandle.x + endHandle.x) / 2,
      y: (startHandle.y + endHandle.y) / 2
    }
  };
}

/*
  Converts coordinates to canvas starting from PIXEL coordinates (referred to original image system)
  or DISPLAY coordinates (referred to the currently displayed area of the image system)
 */
export function applyPixelToCanvas(
  coords: Coords[],
  element: HTMLElement,
  xMultiplier: number,
  yMultiplier: number,
  xScope: number,
  yScope: number,
  image: Image,
  viewport: Viewport,
  isDisplayUnit: boolean
): Coords[] {
  return coords.map(coord => {
    if (isDisplayUnit) {
      coord = rotateCoords(coord, image, viewport as ViewportComplete);
      return cornerstone.pixelToCanvas(element, {
        x: coord.x * xMultiplier + xScope,
        y: coord.y * yMultiplier + yScope
      } as any);
    } else {
      return cornerstone.pixelToCanvas(element, coord as any);
    }
  });
}

export function applyRotationAndTranslation(
  coords: Coords[],
  rotationAngle: number,
  rotationPoint: Coords
) {
  const radians = (Math.PI / 180) * rotationAngle;
  const cosTheta = Math.cos(radians);
  const sinTheta = Math.sin(radians);

  return coords.map(point => {
    // Translate point back to origin
    const x = point.x - rotationPoint.x;
    const y = point.y - rotationPoint.y;

    // Apply rotation
    const xNew = x * cosTheta - y * sinTheta + rotationPoint.x;
    const yNew = x * sinTheta + y * cosTheta + rotationPoint.y;

    return { x: xNew, y: yNew };
  });
}

/* Finds the intersection, if present, between two lines */
export function intersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
) {
  // Check if none of the lines are of length 0
  if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
    return false;
  }

  const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  // Lines are parallel
  if (denominator === 0) {
    return false;
  }

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  // is the intersection along the segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return false;
  }

  // Return a object with the x and y coordinates of the intersection
  const x = x1 + ua * (x2 - x1);
  const y = y1 + ua * (y2 - y1);

  return { x, y };
}
