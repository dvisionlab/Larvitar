//MODALITY LUT
import { Image, Viewport } from "cornerstone-core";
import { MetaData } from "../../../types";
import { setLUT } from "./genericMathUtils";

/**
 * Applies the Modality LUT or rescale operation to map stored pixel values
 * to meaningful output values using DICOM attributes (x00283000, x00281052, x00281053).
 * Handles both LUT Sequence and linear rescale.
 */
export function applyModalityLUT(
  metadata: MetaData,
  image: Image,
  viewport: Viewport
) {
  const modalityLUTSequence = metadata.x00283000;
  const intercept = metadata.x00281052; // Rescale Intercept
  const slope = metadata.x00281053; // Rescale Slope

  if (modalityLUTSequence) {
    const voiLut = modalityLUTSequence[0];
    setLUT(voiLut, viewport);
  } else if (
    slope !== null &&
    slope !== undefined &&
    intercept !== null &&
    intercept !== undefined
  ) {
    image.intercept = intercept as number;
    image.slope = slope as number;
  }
}

// SOFTCOPY LUT

/**
 * Applies the Softcopy VOI LUT (Window Width and Window Center) to the viewport
 * based on the DICOM metadata (attributes: x00281050, x00281051, x00283010).
 * Handles both explicit VOI LUT Sequence and window settings.
 */
export function applySoftcopyLUT(metadata: MetaData, viewport: Viewport) {
  const voiLutMetadata = metadata.x00283110; // VOI LUT Sequence

  if (voiLutMetadata) {
    const windowCenterMetadata = voiLutMetadata[0].x00281050 as number;
    const windowWidthMetadata = voiLutMetadata[0].x00281051 as number;
    const softcopyLUTSequence = voiLutMetadata[0].x00283010;

    if (softcopyLUTSequence && softcopyLUTSequence.length > 0) {
      // Apply VOI LUT Sequence if present
      const voiLut = softcopyLUTSequence[0]; // Assuming we're using the first VOI LUT in the sequence
      setLUT(voiLut, viewport);
    } else if (
      windowCenterMetadata !== null &&
      windowCenterMetadata !== undefined &&
      windowWidthMetadata !== null &&
      windowWidthMetadata !== undefined
    ) {
      viewport.voi!.windowWidth = windowWidthMetadata;
      viewport.voi!.windowCenter = windowCenterMetadata;
    }
  }
}

//SOFTCOPY PRESENTATION LUT
/**
 * Applies the Presentation LUT Sequence or shape to the viewport,
 * modifying the display output as per DICOM attributes (x20500010, x20500020).
 * Supports both LUT application and inversion logic.
 */
export function applySoftcopyPresentationLUT(
  metadata: MetaData,
  viewport: Viewport
) {
  const presentationLUTSequence = metadata.x20500010; // Presentation LUT Sequence
  const presentationLUTShape = metadata.x20500020; // Presentation LUT Shape

  if (presentationLUTSequence && presentationLUTSequence.length > 0) {
    // Apply Presentation LUT Sequence if present
    const voiLut = presentationLUTSequence[0]; // Assuming we're using the first LUT in the sequence
    setLUT(voiLut, viewport);
  } else if (presentationLUTShape === "INVERSE") {
    // Apply Presentation LUT Shape if no LUT Sequence is present
    viewport.invert = true;
  }
}
