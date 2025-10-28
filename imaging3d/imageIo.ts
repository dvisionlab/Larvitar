/** @module imaging/imageIo
 *  @desc This file provides I/O functionalities on NRRD files and DICOM images
 */

// internal libraries
import { logger } from "../logger";

/**
 * Export 3D image rendered in a canvas to base64
 * @function exportImageToBase64
 * @param elementId - Id of the div element containing the canvas
 * @returns {String | null} base64 image (png full quality) or null if canvas does not exist
 */
export const export3DImageToBase64 = async function (
  elementId: string,
  imageType: "png" | "jpeg"
): Promise<string | null> {
  const element: HTMLElement | null = document.getElementById(elementId);
  if (!element) {
    logger.warn("Element not found, invalid elementId");
    return null;
  }

  const canvas: HTMLCanvasElement | null = element.querySelector("canvas");
  const svgElement: SVGSVGElement | null = element.querySelector("svg");

  if (!canvas || !svgElement) {
    logger.warn("Canvas not found inside element");
    return null;
  }

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  const combinedCanvas = document.createElement("canvas");
  const ctx = combinedCanvas.getContext("2d")!;

  combinedCanvas.width = width;
  combinedCanvas.height = height;

  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
  svgClone.setAttribute("width", `${width}px`);
  svgClone.setAttribute("height", `${height}px`);

  const svgString = new XMLSerializer().serializeToString(svgClone);

  const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
  const reader = new FileReader();
  const svgImage = new Image();

  return new Promise(resolve => {
    reader.onloadend = () => {
      const svgDataURL = reader.result as string;

      svgImage.onload = () => {
        ctx.drawImage(canvas, 0, 0, width, height);
        ctx.drawImage(svgImage, 0, 0, width, height);

        const finalDataURL = combinedCanvas.toDataURL(
          `image/${imageType}`,
          1.0
        );
        resolve(finalDataURL);
      };

      svgImage.onerror = error => {
        logger.error("SVG Image loading error:", error);
        resolve(null);
      };

      svgImage.src = svgDataURL;
    };

    reader.onerror = error => {
      logger.error("FileReader error:", error);
      resolve(null);
    };

    reader.readAsDataURL(svgBlob);
  });
};
