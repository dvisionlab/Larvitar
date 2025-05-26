//SPATIAL TRANSFORMATIONS

import cornerstone from "cornerstone-core";
import { MetaData } from "../../../types";
import {
  DisplayAreaVisualizations,
  ViewportComplete
} from "../../types";

/**
 * Applies spatial transformations like rotation and flipping to the viewport
   using the DICOM Graphic Layer Module (x00700041, x00700042).
   Considers initial rotation and flip settings.
 * @name applySpatialTransformation
 * @protected
 * @param  {MetaData} metadata //ps metadata
 * @param  {ViewportComplete} viewport //viewport object containing display settings
 *
 * @returns {void}
 */
export function applySpatialTransformation(
  metadata: MetaData,
  viewport: ViewportComplete
) {
  const angle = metadata.x00700042;
  const initialRotation = viewport.initialRotation
    ? viewport.initialRotation
    : viewport.rotation!;
  if (angle) {
    viewport.rotation = initialRotation + angle;
  }
  const horizontalFlip = metadata.x00700041;
  if ((angle === 90 || angle === 270) && horizontalFlip === "Y") {
    viewport.vflip = !viewport.vflip;
  } else if ((angle === 0 || angle === 180) && horizontalFlip === "Y") {
    viewport.hflip = !viewport.hflip;
  }
}

//ZOOM PAN

/**
 * Applies zoom and pan transformations to the viewport based on the
   DICOM Displayed Area Selection Sequence (x0070005a). Handles pixel
   origin interpretation, top-left/bottom-right coordinates, pixel spacing,
   and magnification.
 * @name applyZoomPan
 * @protected
 * @param  {MetaData} metadata //ps metadata
 * @param  {ViewportComplete} viewport //viewport properties
 * @param  {HTMLElement} element //
 *
 * @returns {void}
 */
export function applyZoomPan(
  metadata: MetaData,
  viewport: ViewportComplete,
  element: HTMLElement
) {
  // Extract the first item from the Displayed Area Selection Sequence
  if (metadata.x0070005a && metadata.x0070005a.length) {
    const displayedArea = metadata.x0070005a[0];
    // Determine if Pixel Origin Interpretation is defined and its value
    let pixelOriginInterpretation = "FRAME"; // Default interpretation
    if (displayedArea.x00480301) {
      pixelOriginInterpretation = displayedArea.x00480301;
    }

    // Get Total Pixel Matrix Origin if Pixel Origin Interpretation is VOLUME
    //TODO-Laura understand how to use matrix pixel origin sequence
    let totalPixelMatrixOrigin = { x: 0, y: 0 }; // Default origin
    if (
      pixelOriginInterpretation === "VOLUME" &&
      metadata.x00480008 &&
      metadata.x00480008.length
    ) {
      const matrixOrigin = metadata.x00480008[0];

      totalPixelMatrixOrigin = {
        x: 0,
        y: 0
      };
    }

    // Set the top left hand corner (TLHC) coordinates
    const tlhc = displayedArea.x00700052; // (0070,0052) - Displayed Area Top Left Hand Corner

    if (tlhc && tlhc.length === 2) {
      if (!viewport.displayedArea) viewport.displayedArea = {};
      let tlhcX = tlhc[0];
      let tlhcY = tlhc[1];
      if (pixelOriginInterpretation === "VOLUME") {
        tlhcX += totalPixelMatrixOrigin.x;
        tlhcY += totalPixelMatrixOrigin.y;
      }
      viewport.displayedArea.tlhc = { x: tlhcX, y: tlhcY };
    }

    // Set the bottom right hand corner (BRHC) coordinates
    const brhc = displayedArea.x00700053; // (0070,0053) - Displayed Area Bottom Right Hand Corner
    if (brhc && brhc.length === 2) {
      if (!viewport.displayedArea) viewport.displayedArea = {};
      let brhcX = brhc[0];
      let brhcY = brhc[1];
      if (pixelOriginInterpretation === "VOLUME") {
        brhcX += totalPixelMatrixOrigin.x;
        brhcY += totalPixelMatrixOrigin.y;
      }
      viewport.displayedArea.brhc = { x: brhcX, y: brhcY };
      viewport.displayedArea.tlhc = viewport.displayedArea.tlhc ?? {
        x: 0,
        y: 0
      };
    }

    if (displayedArea.x00700100) {
      if (!viewport.displayedArea) viewport.displayedArea = {};
      // Set the presentation size mode
      viewport.displayedArea.presentationSizeMode =
        displayedArea.x00700100 as unknown as DisplayAreaVisualizations; // (0070,0100) - Presentation Size Mode
      // Handle magnification ratio if applicable
      if (displayedArea.x00700100 === "MAGNIFY") {
        //  Presentation Pixel Magnification Ratio
        viewport.scale = displayedArea.x00700103!;
      }
    }
    // Set the row and column pixel spacing
    if (!viewport.displayedArea) {
      viewport.displayedArea = {};
    }

    const defaultSpacing = metadata.pixelSpacing ?? [1, 1];

    if (displayedArea.x00700101) {
      handlePixelSpacing(viewport, displayedArea.x00700101, defaultSpacing);
    } else if (displayedArea.x00700102) {
      handleAspectRatio(viewport, displayedArea.x00700102);
    }
    cornerstone.setViewport(element, viewport);
  }
}

/**
 * Sets the viewport's row and column pixel spacing 
   based on the presentation size mode
 * @name handlePixelSpacing
 * @protected
 * @param  {ViewportComplete} viewport //viewport object containing display settings
 * @param  {[number, number]} spacing //pixel spacing values 
 * @param  {[number, number]} defaultSpacing //default pixel spacing values
 *
 * @returns {void}
 */
function handlePixelSpacing(
  viewport: ViewportComplete,
  spacing: [number, number],
  defaultSpacing: [number, number]
) {
  const presentationSizeMode = viewport.displayedArea.presentationSizeMode;
  if (
    presentationSizeMode ===
    ("TRUE SIZE" as unknown as DisplayAreaVisualizations)
  ) {
    viewport.displayedArea.rowPixelSpacing = spacing[0];
    viewport.displayedArea.columnPixelSpacing = spacing[1];
  } else {
    viewport.displayedArea.rowPixelSpacing = defaultSpacing[0];
    viewport.displayedArea.columnPixelSpacing = defaultSpacing[1];
    // TODO: Investigate using spacing values to compute image pixel aspect ratio.
  }
}

/**
 * Sets the row and column pixel spacing of the viewport's displayed area 
   based on the provided aspect ratio.
 * @name handleAspectRatio
 * @protected
 * @param  {ViewportComplete} viewport //viewport object containing display settings
 * @param  {[number, number]} aspectRatio //tuple representing the aspect ratio
 *
 * @returns {void}
 */
function handleAspectRatio(
  viewport: ViewportComplete,
  aspectRatio: [number, number]
) {
  viewport.displayedArea.rowPixelSpacing = aspectRatio[0];
  viewport.displayedArea.columnPixelSpacing = aspectRatio[1];
  // TODO: Investigate handling potential aspect ratio issues.
}
