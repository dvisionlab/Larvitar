import { MetaData } from "../../../types";
import type { ViewportComplete, Coords } from "../../types";
import cornerstone, {
  Image,
  PixelCoordinate,
  Viewport
} from "cornerstone-core";

/**
 * Configures the viewport with LUT data using the given VOI LUT Sequence.
 * @name setLUT
 * @param {MetaData} voiLut - The metadata containing LUT Descriptor and LUT Data.
 * @param {Viewport} viewport - The viewport to apply LUT settings to.
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

/**
 * Adjusts the coordinates of a point based on the image rotation.
 * @name rotateCoords
 * @param {Coords} point - The point coordinates.
 * @param {Image} image - The cornerstone image object.
 * @param {ViewportComplete} viewport - The viewport containing rotation information.
 * @returns {Coords} - The adjusted coordinates.
 */
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

/**
 * Calculates ellipse coordinates from an array containing the start and end points of its two main axes.
 * @name calculateEllipseCoordinates
 * @param {number[]} graphicData - The array containing ellipse coordinate data.
 * @returns {Record<string, Coords>} - The calculated coordinates.
 */
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

/**
 * Calculates rectangle coordinates from an array containing top-left and bottom-right corners.
 * @name calculateRectangleCoordinates
 * @param {number[]} graphicData - The array containing rectangle coordinate data.
 * @returns {Record<string, Coords>} - The calculated coordinates.
 */
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

/**
 * Calculates the start, end, and midpoint handles of a segment.
 * @name calculateHandles
 * @param {number[]} graphicData - The array containing segment coordinate data.
 * @param {number} index - The starting index of the segment in the array.
 * @returns {Record<string, Coords>} - The calculated handle coordinates.
 */
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

/**
 * Converts coordinates to canvas space from pixel or display coordinates.
 * @name applyPixelToCanvas
 * @param {Coords[]} coords - The array of coordinates.
 * @param {HTMLElement} element - The HTML element associated with the canvas.
 * @param {number} xMultiplier - The multiplier for the x-axis.
 * @param {number} yMultiplier - The multiplier for the y-axis.
 * @param {number} xScope - The x-offset.
 * @param {number} yScope - The y-offset.
 * @param {Image} image - The cornerstone image.
 * @param {Viewport} viewport - The viewport settings.
 * @param {boolean} isDisplayUnit - Whether the coordinates are in display units.
 * @returns {Coords[]} - The transformed coordinates.
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
      } as PixelCoordinate);
    } else {
      return cornerstone.pixelToCanvas(element, coord as PixelCoordinate);
    }
  });
}

/**
 * Applies rotation and translation to a set of coordinates.
 * @name applyRotationAndTranslation
 * @param {Coords[]} coords - The array of coordinates.
 * @param {number} rotationAngle - The rotation angle in degrees.
 * @param {Coords} rotationPoint - The point around which to rotate.
 * @returns {Coords[]} - The transformed coordinates.
 */
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

/**
 * Finds the intersection point between two line segments, if it exists.
 * @name intersect
 * @param {number} x1 - x-coordinate of the first point of the first line.
 * @param {number} y1 - y-coordinate of the first point of the first line.
 * @param {number} x2 - x-coordinate of the second point of the first line.
 * @param {number} y2 - y-coordinate of the second point of the first line.
 * @param {number} x3 - x-coordinate of the first point of the second line.
 * @param {number} y3 - y-coordinate of the first point of the second line.
 * @param {number} x4 - x-coordinate of the second point of the second line.
 * @param {number} y4 - y-coordinate of the second point of the second line.
 * @returns {Coords|false} - The intersection coordinates or false if no intersection exists.
 */
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
