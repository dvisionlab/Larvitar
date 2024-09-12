import { getColors, mmToPixels } from "./gridToolUtils";
import cornerstoneTools from "cornerstone-tools";
import { Image, PixelCoordinate, pixelToCanvas } from "cornerstone-core";
import { handleElement } from "./gridToolUtils";
import { MeasurementMouseEvent } from "../types";
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");

export const config = {
  dashHeightMM: 2, // Altezza del pattern in millimetri
  dashWidthMM: 10, // Larghezza del pattern in millimetri
  colorFractionLight: 2 / 3, // Frazione per calcolo del grigio chiaro
  colorFractionDark: 1 / 3, // Frazione per calcolo del grigio scuro
  maxVal8bit: 2 ** 8, // Valore massimo per immagini a 8-bit
  maxVal16bit: 2 ** 16 // Valore massimo per immagini a 16-bit
};
const MIN_PIXEL_SPACING = 0.1; //min pixel spacing
const GRID_SIZE_MM = 50; // Quadretti da 5 cm
const BaseTool = cornerstoneTools.importInternal("base/BaseTool");

export class GridTool extends BaseTool {
  constructor(props = {}) {
    super({
      name: "GridTool",
      configuration: {},
      ...props
    });
  }

  async activeCallback(element: HTMLElement) {
    const enabledElement = await handleElement(element);
    if (enabledElement) {
      this.enabledElement = enabledElement;
      this.triggerDrawGrid(enabledElement);
    }
  }

  renderToolData(evt: MeasurementMouseEvent) {
    if (this.enabledElement) {
      this.triggerDrawGrid(this.enabledElement);
    }
  }

  triggerDrawGrid(enabledElement: any) {
    const image = enabledElement.image;
    const pixelSpacing = {
      spacingX: image.columnPixelSpacing,
      spacingY: image.rowPixelSpacing
    };
    try {
      this.validatePixelSpacing(pixelSpacing.spacingX, pixelSpacing.spacingY);
    } catch (error: any) {
      console.error(error.message);
      return;
    }

    const context: CanvasRenderingContext2D = getNewContext(
      enabledElement.canvas
    );
    this.drawGridPattern(
      context,
      enabledElement.element,
      image.bitsAllocated,
      pixelSpacing,
      image!
    );
  }

  validatePixelSpacing(spacingX: number, spacingY: number) {
    if (spacingX < MIN_PIXEL_SPACING || spacingY < MIN_PIXEL_SPACING) {
      throw new Error("Pixel size is too small or invalid.");
    }
  }

  drawGridPattern(
    context: CanvasRenderingContext2D,
    element: HTMLElement,
    bitDepth: number,
    pixelSpacing: any,
    image: Image
  ) {
    const { lightGray, darkGray } = getColors(bitDepth); // Calculating the colors

    // Conversion of the grid square size from mm to pixels (50 mm x 50 mm)
    const patternHeight = mmToPixels(GRID_SIZE_MM, pixelSpacing.spacingY);
    const patternWidth = mmToPixels(GRID_SIZE_MM, pixelSpacing.spacingX);

    // Dashed line properties from the config
    const dashHeight = mmToPixels(config.dashHeightMM, pixelSpacing.spacingY);
    const dashWidth = mmToPixels(config.dashWidthMM, pixelSpacing.spacingX);

    // Get canvas dimensions
    const { start, end } = this.findImageCoords(element, image);

    // Variable to keep track of which color to use (alternating between lightGray and darkGray)
    let isLight = true;
    // Draw the grid pattern
    context.lineWidth = dashHeight; // Set line width for the grid
    for (let y = start.y; y < end.y; y += patternHeight) {
      for (let x = start.x; x < end.x; x += patternWidth) {
        // Set dashed line properties
        context.setLineDash([dashWidth, dashWidth]); // Dash and gap widths
        context.strokeStyle = isLight ? lightGray : darkGray;
        context.strokeRect(x, y, patternWidth, patternHeight);
        isLight = !isLight;
      }
      isLight = !isLight;
    }
  }
  findImageCoords(element: HTMLElement, image: Image) {
    // Set canvas size to match the image dimensions
    const start = pixelToCanvas(element, {
      x: 0,
      y: 0
    } as PixelCoordinate);
    const end = pixelToCanvas(element, {
      x: image.width,
      y: image.height
    } as PixelCoordinate);

    return { start, end };
  }

  getGridSizeInPixels(pixelSpacing: any) {
    return {
      gridSizeX: GRID_SIZE_MM / pixelSpacing.spacingX,
      gridSizeY: GRID_SIZE_MM / pixelSpacing.spacingY
    };
  }
}
