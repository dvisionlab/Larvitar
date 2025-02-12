import { Image } from "cornerstone-core";
import { MetaData, Series } from "../../../types";
import {
  applyCircularShutter,
  applyPolygonalShutter,
  applyRectangularShutter
} from "./genericDrawingUtils";
import { convertCIELabToRGBWithRefs } from "./genericDrawingUtils";
import * as csTools from "cornerstone-tools";
import { ViewportComplete } from "../../types";
import { redrawImage, updateImage } from "../../../imageRendering";
import imageStore from "../../../imageStore";
const getNewContext = csTools.importInternal("drawing/getNewContext");

//SHUTTER

/*
 This function retrieves and applies a display shutter based on DICOM metadata,
 supporting rectangular, circular, and polygonal shutters (shape x00181600).
 */
export function retrieveDisplayShutter(
  metadata: MetaData,
  element: HTMLElement,
  image: Image,
  canvas: HTMLCanvasElement,
  viewport: ViewportComplete
) {
  const presentationValue = metadata.x00181622 ?? 0; // Shutter Presentation Value

  const ctx = getNewContext(canvas) as CanvasRenderingContext2D;
  const shutterPresentationColorValue = metadata.x00181624; // Shutter Presentation Value
  const shutterShape = metadata.x00181600;
  if (!shutterShape) {
    return;
  }
  const color: [number, number, number] = shutterPresentationColorValue
    ? convertCIELabToRGBWithRefs(shutterPresentationColorValue)
    : [presentationValue, presentationValue, presentationValue];
  switch (shutterShape) {
    case "RECTANGULAR":
      const leftEdge = metadata.x00181602; // Shutter Left Vertical Edge
      const rightEdge = metadata.x00181604; // Shutter Right Vertical Edge
      const upperEdge = metadata.x00181606; // Shutter Upper Horizontal Edge
      const lowerEdge = metadata.x00181608; // Shutter Lower Horizontal Edge
      if (
        leftEdge !== undefined &&
        rightEdge !== undefined &&
        upperEdge !== undefined &&
        lowerEdge !== undefined
      ) {
        applyRectangularShutter(
          leftEdge,
          rightEdge,
          upperEdge,
          lowerEdge,
          ctx,
          canvas,
          color
        );
      }
      break;
    case "CIRCULAR":
      const circularCenter = metadata.x00181610; // Center of Circular Shutter
      const circularRadius = metadata.x00181612; // Radius of Circular Shutter
      if (circularCenter !== undefined && circularRadius !== undefined) {
        applyCircularShutter(
          circularCenter,
          circularRadius,
          viewport,
          image,
          element,
          canvas,
          color,
          ctx
        );
      }

      break;
    case "POLYGONAL":
      const polygonVertices = metadata.x00181620; // Vertices of the Polygonal Shutter

      if (polygonVertices !== undefined && polygonVertices.length >= 6) {
        applyPolygonalShutter(polygonVertices, ctx, element, canvas);
      }
      break;
    default:
      console.warn("Unsupported shutter shape:", shutterShape);
      break;
  }

  redrawImage(element.id);
}

//MASK

/**
 * Enables and updates the Digital Subtraction Angiography (DSA) mask on
 * multi-frame series, ensuring the appropriate frame is displayed.
 */
export function applyMask(serie: Series, element: HTMLElement) {
  if (serie.isMultiframe) {
    const frameId = imageStore.get(["viewports", "viewer", "sliceId"]);
    imageStore.setDSAEnabled(element.id, true);
    updateImage(serie, element.id, frameId, false);
  }
}
