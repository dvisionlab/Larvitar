// external libraries
import cornerstoneTools from "cornerstone-tools";
import { Viewport } from "../../types";
import { EventData } from "../types";
const external = cornerstoneTools.external;
const BaseTool = cornerstoneTools.importInternal("base/BaseTool");

type Overlay = {
  pixelData: number[];
  visible: boolean;
  rows: number;
  columns: number;
  x: number;
  y: number;
  type: string;
  fillStyle: CanvasGradient;
};
interface ToolMouseEvent {
  detail: EventData;
  currentTarget: any;
}
/**
 *
 * http://dicom.nema.org/dicom/2013/output/chtml/part03/sect_C.9.html
 *
 * @public
 * @class Overlay
 * @memberof Tools
 *
 * @classdesc Tool for displaying a scale overlay on the image.  Uses viewport.overlayColor to set the default colour.
 * @extends Tools.Base.BaseTool
 */
export default class OverlayTool extends BaseTool {
  constructor(configuration = {}) {
    const defaultConfig = {
      name: "Overlay",
      configuration: {},
      mixins: ["enabledOrDisabledBinaryTool"]
    };
    const initialConfiguration = Object.assign(defaultConfig, configuration);

    super(initialConfiguration);

    this.initialConfiguration = initialConfiguration;
  }

  enabledCallback(element: HTMLElement) {
    this.forceImageUpdate(element);
  }

  disabledCallback(element: HTMLElement) {
    this.forceImageUpdate(element);
  }

  forceImageUpdate(element: HTMLElement) {
    const enabledElement = external.cornerstone.getEnabledElement(element);

    if (enabledElement.image) {
      external.cornerstone.updateImage(element);
    }
  }

  setupRender(image: cornerstone.Image) {
    if (!image) {
      return;
    }
    const overlayPlaneMetadata: { overlays: Overlay[] } =
      external.cornerstone.metaData.get("overlayPlaneModule", image.imageId);

    if (
      !overlayPlaneMetadata ||
      !overlayPlaneMetadata.overlays ||
      !overlayPlaneMetadata.overlays.length
    ) {
      return;
    }

    return overlayPlaneMetadata;
  }

  setupViewport(viewport: Viewport) {
    if (viewport.overlayColor === undefined) {
      viewport.overlayColor = "white";
    }
    // Allow turning off overlays by setting overlayColor to false
    if (viewport.overlayColor === false) {
      return;
    }

    return true;
  }

  renderToolData(evt: ToolMouseEvent) {
    const eventData = evt.detail;
    const { enabledElement, image, viewport, canvasContext } = eventData;
    const overlayPlaneMetadata = this.setupRender(image);

    if (!eventData || !enabledElement || !overlayPlaneMetadata) {
      return;
    }
    if (!this.setupViewport(viewport)) {
      return;
    }

    const imageWidth = image.columns;
    const imageHeight = image.rows;

    overlayPlaneMetadata.overlays.forEach(overlay => {
      if (overlay.visible === false) {
        return;
      }

      const layerCanvas = document.createElement("canvas");

      layerCanvas.width = imageWidth;
      layerCanvas.height = imageHeight;

      const layerContext: CanvasRenderingContext2D =
        layerCanvas.getContext("2d")!;

      layerContext.fillStyle = overlay.fillStyle || viewport.overlayColor;

      if (overlay.type === "R") {
        layerContext.fillRect(0, 0, layerCanvas.width, layerCanvas.height);
        layerContext.globalCompositeOperation = "xor";
      }

      let i = 0;

      for (let y = 0; y < overlay.rows; y++) {
        for (let x = 0; x < overlay.columns; x++) {
          if (overlay.pixelData[i++] > 0) {
            layerContext.fillRect(x, y, 1, 1);
          }
        }
      }

      // Guard against non-number values

      const overlayX: number =
        //@ts-ignore
        !isNaN(overlay.x) && isFinite(overlay.x) ? overlay.x : 0;

      const overlayY: number =
        //@ts-ignore
        !isNaN(overlay.y) && isFinite(overlay.y) ? overlay.y : 0;
      // Draw the overlay layer onto the canvas

      canvasContext.drawImage(layerCanvas, overlayX, overlayY);
    });
  }
}
