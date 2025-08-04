import type { TextDetails } from "./types";
import { Image } from "cornerstone-core";
import { Coords, ViewportComplete } from "../../types";
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
export declare function applyCircularShutter(center: [number, number], radius: number, viewport: ViewportComplete, image: Image, element: HTMLElement, canvas: HTMLCanvasElement, color: [number, number, number], ctx: CanvasRenderingContext2D): void;
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
export declare function applyRectangularShutter(left: number, right: number, upper: number, lower: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, color: [number, number, number]): void;
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
export declare function applyPolygonalShutter(vertices: number[], ctx: CanvasRenderingContext2D, element: HTMLElement, canvas: HTMLCanvasElement): void;
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
export declare function drawText(context: CanvasRenderingContext2D, textObject: TextDetails, textX: number, textY: number, color: string): void;
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
export declare function drawBoundingBox(context: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, color: string): void;
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
export declare function drawEllipse(context: CanvasRenderingContext2D, canvasCenter: Coords, right: Coords, left: Coords, bottom: Coords, top: Coords, color: string, shouldFill: boolean): void;
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
export declare function drawRectangle(context: CanvasRenderingContext2D, tlhcCanvas: Coords, brhcCanvas: Coords, color: string, shouldFill: boolean): void;
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
export declare function drawCutline(context: CanvasRenderingContext2D, element: HTMLElement, startHandleCanvas: Coords, endHandleCanvas: Coords, midpoint: Coords, direction: Coords, length: number, color: string, lineWidth: number, gapLength?: number, lineStyleSequence?: any): void;
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
export declare function drawPerpendicularTickAtPoint(point: Coords, direction: Coords, context: CanvasRenderingContext2D, tickLength: number): void;
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
export declare function drawTick(position: number, label: string, alignment: string, labelAlignment: string, context: CanvasRenderingContext2D, direction: Coords, startPoint: Coords, showLabel: boolean): void;
/**
 * Converts CIELab color values to RGB format using reference white values,
 * as outlined in the DICOM color space transformations.
 * @name convertCIELabToRGBWithRefs
 * @param {number[]} cieLabColor - An array containing CIELab values.
 * @returns {[number, number, number]} - The converted RGB values.
 */
export declare function convertCIELabToRGBWithRefs(cieLabColor: number[]): [number, number, number];
/**
 * Converts CIELab color values to XYZ coordinates, following DICOM guidelines for color transformations
 * and reference illuminants.
 * @name CIELabToXYZ
 * @param {number} l - The lightness component of CIELab.
 * @param {number} a - The 'a' component of CIELab.
 * @param {number} b - The 'b' component of CIELab.
 * @returns {[number, number, number]} - The converted XYZ values.
 */
export declare function CIELabToXYZ(l: number, a: number, b: number): number[];
/**
 * Converts XYZ color values to RGB using DICOM color space transformations.
 * @name XYZToRGB
 * @param {number} x - The X component of the XYZ color space.
 * @param {number} y - The Y component of the XYZ color space.
 * @param {number} z - The Z component of the XYZ color space.
 * @returns {[number, number, number]} - The converted RGB values.
 */
export declare function XYZToRGB(x: number, y: number, z: number): [number, number, number];
