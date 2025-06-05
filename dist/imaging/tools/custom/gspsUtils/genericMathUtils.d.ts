import { MetaData } from "../../../types";
import type { ViewportComplete, Coords } from "../../types";
import { Image, Viewport } from "cornerstone-core";
/**
 * Configures the viewport with LUT data using the given VOI LUT Sequence.
 * @name setLUT
 * @param {MetaData} voiLut - The metadata containing LUT Descriptor and LUT Data.
 * @param {Viewport} viewport - The viewport to apply LUT settings to.
 */
export declare function setLUT(voiLut: MetaData, viewport: Viewport): void;
/**
 * Adjusts the coordinates of a point based on the image rotation.
 * @name rotateCoords
 * @param {Coords} point - The point coordinates.
 * @param {Image} image - The cornerstone image object.
 * @param {ViewportComplete} viewport - The viewport containing rotation information.
 * @returns {Coords} - The adjusted coordinates.
 */
export declare function rotateCoords(point: Coords, image: Image, viewport: ViewportComplete): Coords;
/**
 * Calculates ellipse coordinates from an array containing the start and end points of its two main axes.
 * @name calculateEllipseCoordinates
 * @param {number[]} graphicData - The array containing ellipse coordinate data.
 * @returns {Record<string, Coords>} - The calculated coordinates.
 */
export declare function calculateEllipseCoordinates(graphicData: number[]): Record<string, Coords>;
/**
 * Calculates rectangle coordinates from an array containing top-left and bottom-right corners.
 * @name calculateRectangleCoordinates
 * @param {number[]} graphicData - The array containing rectangle coordinate data.
 * @returns {Record<string, Coords>} - The calculated coordinates.
 */
export declare function calculateRectangleCoordinates(graphicData: number[]): Record<string, Coords>;
/**
 * Calculates the start, end, and midpoint handles of a segment.
 * @name calculateHandles
 * @param {number[]} graphicData - The array containing segment coordinate data.
 * @param {number} index - The starting index of the segment in the array.
 * @returns {Record<string, Coords>} - The calculated handle coordinates.
 */
export declare function calculateHandles(graphicData: number[], index: number): Record<string, Coords>;
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
export declare function applyPixelToCanvas(coords: Coords[], element: HTMLElement, xMultiplier: number, yMultiplier: number, xScope: number, yScope: number, image: Image, viewport: Viewport, isDisplayUnit: boolean): Coords[];
/**
 * Applies rotation and translation to a set of coordinates.
 * @name applyRotationAndTranslation
 * @param {Coords[]} coords - The array of coordinates.
 * @param {number} rotationAngle - The rotation angle in degrees.
 * @param {Coords} rotationPoint - The point around which to rotate.
 * @returns {Coords[]} - The transformed coordinates.
 */
export declare function applyRotationAndTranslation(coords: Coords[], rotationAngle: number, rotationPoint: Coords): {
    x: number;
    y: number;
}[];
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
export declare function intersect(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): false | {
    x: number;
    y: number;
};
