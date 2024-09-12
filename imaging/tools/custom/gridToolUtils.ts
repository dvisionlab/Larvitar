import { config } from "./gridTool";
import { getEnabledElement, Image } from "cornerstone-core";

export function mmToPixels(mm: number, pixelSpacing: any) {
  return Math.floor(mm / pixelSpacing);
}

export function getColors(bitDepth: number) {
  const maxVal = bitDepth === 8 ? config.maxVal8bit : config.maxVal16bit;
  const lightGray = `#${Math.ceil(maxVal * config.colorFractionLight).toString(
    16
  )}`;
  const darkGray = `#${Math.ceil(maxVal * config.colorFractionDark).toString(
    16
  )}`;

  return { lightGray, darkGray };
}

export function handleElement(element: HTMLElement): Promise<any> {
  try {
    const activeElement = getEnabledElement(element);

    // Return a promise that resolves when the image becomes available
    return new Promise((resolve, reject) => {
      const checkImageAvailability = setInterval(() => {
        if (activeElement.image !== undefined) {
          clearInterval(checkImageAvailability);
          console.debug("Image is now available", activeElement.image);
          resolve(activeElement); // Resolve the promise with the activeElement
        } else {
          console.debug("Image not yet available, continuing to poll...");
        }
      }, 100); // Poll every 100ms

      // Reject the promise if needed, e.g., after a timeout
      setTimeout(() => {
        clearInterval(checkImageAvailability);
        reject(new Error("Image did not become available in time"));
      }, 5000); // 5 seconds timeout
    });
  } catch (error) {
    console.error("Error processing element:", error);
    throw error; // Rethrow the error
  }
}
