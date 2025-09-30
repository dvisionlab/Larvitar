import type { AnnotationOverlay, CompoundDetails, GraphicDetails, TextDetails } from "./types";
import { Image } from "cornerstone-core";
import { ViewportComplete } from "../../types";
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
export declare function renderGraphicAnnotation(graphicObject: GraphicDetails, context: CanvasRenderingContext2D, element: HTMLElement, color: string, viewport: ViewportComplete, image: Image): void;
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
export declare function renderTextAnnotation(textObject: TextDetails, context: CanvasRenderingContext2D, color: string, element: HTMLElement, image: Image, viewport: ViewportComplete): void;
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
export declare function renderCompoundAnnotation(compoundObject: CompoundDetails, context: CanvasRenderingContext2D, element: HTMLElement, color: string, viewport: ViewportComplete, image: Image): void;
/** Renders an overlay on the image canvas based on annotation data, following DICOM standards
   for overlay planes and pixel data (60xx,3000).
 * @name renderOverlay
 * @protected
 * @param  {AnnotationOverlay} data //object containing graphic parameters for annotations
 * @param  {Image} image
 *
 * @returns {void}
 */
export declare function renderOverlay(data: AnnotationOverlay, image: Image): void;
