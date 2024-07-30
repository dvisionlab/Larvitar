import {
  getInstanceGSPSDict,
  getLarvitarImageTracker,
  getLarvitarManager
} from "./loaders/commonLoader";
import cornerstone, {
  getEnabledElement,
  Image,
  Viewport
} from "cornerstone-core";
import csTools from "cornerstone-tools";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import { Coords } from "./tools/types";
import { LarvitarManager, MetaData, Overlay, Series } from "./types";
import { MetaDataTypes } from "./MetaDataTypes";
import store from "./imageStore";
import { resetViewports, updateImage } from "./imageRendering";
import { Metadata } from "pdfjs-dist/types/src/display/metadata";

const external = csTools.external;
const BaseTool = csTools.importInternal("base/BaseTool");
const { wwwcCursor } = csTools.importInternal("tools/cursors");

/**
 * @public
 * @class WwwcManualTool
 * @memberof Tools
 *
 * @classdesc Tool for setting wwwc by dragging with mouse/touch.
 * @extends Tools.Base.BaseTool
 */
export default class GspsTool extends BaseTool {
  public name: string;
  public configuration: any = {};
  public pixelData?: number[];
  constructor(props: any = {}) {
    const defaultProps = {
      name: "Gsps",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        orientation: 0
      },
      svgCursor: wwwcCursor
    };

    super(props, defaultProps);
    this.configuration = super.configuration;
    this.name = defaultProps.name;
  }

  retrieveLarvitarManager(imageId: string) {
    const parsedImageId: { scheme: string; url: string } =
      cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId);

    const rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
    const imageTracker = getLarvitarImageTracker();
    const seriesId: string = imageTracker[rootImageId];
    const manager = getLarvitarManager() as LarvitarManager;
    return { manager, seriesId };
  }
  async handleElement(element: HTMLElement): Promise<any> {
    try {
      const activeElement = getEnabledElement(element);

      // Return a promise that resolves when the image becomes available
      return new Promise((resolve, reject) => {
        const checkImageAvailability = setInterval(() => {
          if (activeElement.image !== undefined) {
            clearInterval(checkImageAvailability);
            console.log("Image is now available", activeElement.image);
            resolve(activeElement); // Resolve the promise with the activeElement
          } else {
            console.log("Image not yet available, continuing to poll...");
          }
        }, 100); // Poll every 100ms

        // Optional: reject the promise if needed, e.g., after a timeout
        const timeout = setTimeout(() => {
          clearInterval(checkImageAvailability);
          reject(new Error("Image did not become available in time"));
        }, 10000); // 10 seconds timeout
      });
    } catch (error) {
      console.error("Error processing element:", error);
      throw error; // Rethrow the error to propagate it
    }
  }

  async disabledCallback(element: HTMLElement) {
    resetViewports([element.id]);
    const activeElement = await this.handleElement(element);
    const image = activeElement.image;
    if (this.pixelData) {
      image.getPixelData = this.setPixelData(this.pixelData!);
    }
  }

  async activeCallback(element: HTMLElement) {
    const gspsDict = getInstanceGSPSDict();
    const activeElement = await this.handleElement(element);
    const image = activeElement.image;
    if (image) {
      const { manager, seriesId } = this.retrieveLarvitarManager(image.imageId);
      if (manager) {
        //const viewports: boolean = store.get(["viewports", element.id]);
        const serie = manager[seriesId];
        const instanceUID =
          serie.instances[image.imageId].metadata.instanceUID!;
        //const index=serie.imageIds.findIndex(index=>index===image.imageId)
        if (gspsDict && gspsDict[instanceUID]) {
          const gspsSeriesId = gspsDict[instanceUID]![0];
          const gspsSeries = manager[gspsSeriesId.seriesId];
          const gspsMetadata =
            gspsSeries.instances[gspsSeriesId.imageId].metadata;

          this.applySoftcopyLUT(gspsMetadata, element);
          this.applyModalityLUT(gspsMetadata, element, image);
          this.applySoftcopyPresentationLUT(gspsMetadata, element);
          //this.applyZoomPan(metadata: MetaData, viewport: Viewport, image: Image) {}
          //this.applySpatialTransformation(metadata: MetaData,viewport: Viewport,image: Image) {}
          //this.pixelData = image.getPixelData();
          //this.applyMask(serie as Series, element);
          //this.applyDisplayShutter(gspsMetadata, element, image,this.pixelData);
          //this.applyOverlay(gspsMetadata, image);
        }
      }
    }
  }

  applySoftcopyLUT(metadata: MetaData, element: HTMLElement) {
    const voiLutMetadata = metadata.x00283110; // VOI LUT Sequence

    if (voiLutMetadata) {
      const windowCenterMetadata = voiLutMetadata[0].x00281050 as number;
      const windowWidthMetadata = voiLutMetadata[0].x00281051 as number;
      const softcopyLUTSequence = voiLutMetadata[0].x00283010;

      const viewport = cornerstone.getViewport(element);
      if (viewport) {
        if (softcopyLUTSequence && softcopyLUTSequence.length > 0) {
          // Apply VOI LUT Sequence if present
          const voiLut = softcopyLUTSequence[0]; // Assuming we're using the first VOI LUT in the sequence
          this.setLUT(voiLut, viewport);
        } else if (
          windowCenterMetadata !== null &&
          windowCenterMetadata !== undefined &&
          windowWidthMetadata !== null &&
          windowWidthMetadata !== undefined
        ) {
          viewport.voi.windowWidth = windowWidthMetadata;
          viewport.voi.windowCenter = windowCenterMetadata;
        }

        cornerstone.setViewport(element, viewport);
      }
    }
  }

  applyModalityLUT(metadata: MetaData, element: HTMLElement, image: Image) {
    const modalityLUTSequence = metadata.x00283000;
    const intercept = metadata.x00281052; // Rescale Intercept
    const slope = metadata.x00281053; // Rescale Slope
    const viewport = cornerstone.getViewport(element);

    if (viewport) {
      if (modalityLUTSequence) {
        const voiLut = modalityLUTSequence[0];
        this.setLUT(voiLut, viewport);
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
    cornerstone.setViewport(element, viewport);
  }

  applySoftcopyPresentationLUT(metadata: MetaData, element: HTMLElement) {
    const presentationLUTSequence = metadata.x20500010; // Presentation LUT Sequence
    const presentationLUTShape = metadata.x20500020; // Presentation LUT Shape

    const viewport = cornerstone.getViewport(element);

    if (viewport) {
      if (presentationLUTSequence && presentationLUTSequence.length > 0) {
        // Apply Presentation LUT Sequence if present
        const voiLut = presentationLUTSequence[0]; // Assuming we're using the first LUT in the sequence
        this.setLUT(voiLut, viewport);
      } else if (presentationLUTShape === "INVERSE") {
        // Apply Presentation LUT Shape if no LUT Sequence is present
        viewport.invert = !viewport.invert;
      }

      cornerstone.setViewport(element, viewport);
    }
  }

  setLUT(voiLut: MetaDataTypes, viewport: Viewport) {
    const lutDescriptor = voiLut.x00283002; // LUT Descriptor
    const lutData = voiLut.x00283006; // LUT Data

    // Apply LUT Data to the viewport (pseudo-code)
    if (lutDescriptor && lutData) {
      // Apply the Modality LUT to the viewport
      viewport.modalityLUT = {
        firstValueMapped: lutDescriptor[1],
        numBitsPerEntry: lutDescriptor[2],
        lut: lutData
      };
    }
  }

  applyZoomPan(metadata: MetaData, viewport: Viewport, image: Image) {}
  applySpatialTransformation(
    metadata: MetaData,
    viewport: Viewport,
    image: Image
  ) {}

  applyMask(serie: Series, element: HTMLElement) {
    if (serie.isMultiframe) {
      const frameId = store.get(["viewports", "viewer", "sliceId"]);
      store.setDSAEnabled(element.id, true);
      updateImage(serie, element.id, frameId, false);
    }
  }

  applyDisplayShutter(
    metadata: MetaData,
    element: HTMLElement,
    image: Image,
    pixelData: number[]
  ) {
    const presentationValue = metadata.x00181622 ?? 0; // Shutter Presentation Value
    const shutterPresentationColorValue = metadata.x00181624; // Shutter Presentation Value
    const shutterShape = metadata.x00181600;

    if (!presentationValue) {
      return;
    }

    const { rows, columns } = image;

    // Convert CIELab to RGB (assuming RGB display)
    const convertCIELabToRGB = (lab: any) => {
      const [L, a, b] = lab;
      console.log(lab);
      // Conversion code here
      // This is a placeholder. In practice, use a library or implement the conversion.
      return [0, 0, 0]; // Placeholder: should return [R, G, B]
    };

    const color = shutterPresentationColorValue
      ? convertCIELabToRGB(shutterPresentationColorValue)
      : [0, 0, 0];

    const applyRectangularShutter = (
      left: number,
      right: number,
      upper: number,
      lower: number
    ) => {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          if (r < upper || r > lower || c < left || c > right) {
            if (image.color) {
              const index = (r * columns + c) * 3;
              pixelData[index] = color[0]; // Red channel
              pixelData[index + 1] = color[1]; // Green channel
              pixelData[index + 2] = color[2]; // Blue channel
            } else {
              pixelData[r * columns + c] = presentationValue;
            }
          }
        }
      }
    };

    // Helper function to apply circular shutter
    const applyCircularShutter = (center: [number, number], radius: number) => {
      const [centerX, centerY] = center;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          const distance = Math.sqrt((r - centerY) ** 2 + (c - centerX) ** 2);
          if (distance > radius) {
            if (image.color) {
              const index = (r * columns + c) * 3;
              pixelData[index] = color[0]; // Red channel
              pixelData[index + 1] = color[1]; // Green channel
              pixelData[index + 2] = color[2]; // Blue channel
            } else {
              pixelData[r * columns + c] = presentationValue;
            }
          }
        }
      }
    };

    // Helper function to apply polygonal shutter
    const applyPolygonalShutter = (vertices: number[]) => {
      const points = [];
      for (let i = 0; i < vertices.length; i += 2) {
        points.push({ x: vertices[i + 1], y: vertices[i] });
      }

      const isInsidePolygon = (x: number, y: number, polygon: Coords[]) => {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const xi = polygon[i].x,
            yi = polygon[i].y;
          const xj = polygon[j].x,
            yj = polygon[j].y;

          const intersect =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
          if (intersect) inside = !inside;
        }
        return inside;
      };

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          if (!isInsidePolygon(c, r, points)) {
            if (image.color) {
              const index = (r * columns + c) * 3;
              pixelData[index] = color[0]; // Red channel
              pixelData[index + 1] = color[1]; // Green channel
              pixelData[index + 2] = color[2]; // Blue channel
            } else {
              pixelData[r * columns + c] = presentationValue;
            }
          }
        }
      }
    };

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
          applyRectangularShutter(leftEdge, rightEdge, upperEdge, lowerEdge);
        }
        break;
      case "CIRCULAR":
        const circularCenter = metadata.x00181610; // Center of Circular Shutter
        const circularRadius = metadata.x00181612; // Radius of Circular Shutter
        if (circularCenter !== undefined && circularRadius !== undefined) {
          applyCircularShutter(circularCenter, circularRadius);
        }

        break;
      case "POLYGONAL":
        const polygonVertices = metadata.x00181620; // Vertices of the Polygonal Shutter
        if (polygonVertices !== undefined && polygonVertices.length >= 6) {
          applyPolygonalShutter(polygonVertices);
        }

        break;
      default:
        console.warn("Unsupported shutter shape:", shutterShape);
        break;
    }

    image.getPixelData = this.setPixelData(pixelData);
    cornerstone.updateImage(element);
  }
  setPixelData(pixelData: number[]) {
    return () => {
      if (!pixelData) {
        console.warn("no pixel data available");
        return [];
      }
      return Array.from(pixelData);
    };
  }

  applyOverlay(metadata: MetaData, image: Image) {
    const presentationValue = metadata.x00181622 ?? 0; // Shutter Presentation Value
    const shutterPresentationColorValue = metadata.x00181624; // Shutter Presentation Color Value
    const shutterShape = metadata.x00181600; // Shutter Shape (should be BITMAP)
    const shutterOverlayGroup = metadata.x00181623; // Shutter Overlay Group
    const rows =
      metadata[("x" + shutterOverlayGroup + "0010") as keyof MetaData];
    const cols =
      metadata[("x" + shutterOverlayGroup + "0011") as keyof MetaData];
    const type =
      metadata[("x" + shutterOverlayGroup + "0040") as keyof MetaData];
    const origin =
      metadata[("x" + shutterOverlayGroup + "0050") as keyof MetaData];
    const bitsAllocated =
      metadata[("x" + shutterOverlayGroup + "0100") as keyof MetaData];
    const bitPosition =
      metadata[("x" + shutterOverlayGroup + "0102") as keyof MetaData];
    const overlayData =
      metadata[("x" + shutterOverlayGroup + "3000") as keyof MetaData];
    const description =
      metadata[("x" + shutterOverlayGroup + "0022") as keyof MetaData];
    const subtype =
      metadata[("x" + shutterOverlayGroup + "0045") as keyof MetaData];
    const label =
      metadata[("x" + shutterOverlayGroup + "1500") as keyof MetaData];
    const roiArea =
      metadata[("x" + shutterOverlayGroup + "1301") as keyof MetaData];
    const roiMean =
      metadata[("x" + shutterOverlayGroup + "1302") as keyof MetaData];
    const roiStandardDeviation =
      metadata[("x" + shutterOverlayGroup + "1303") as keyof MetaData];

    if (shutterShape !== "BITMAP") {
      console.error("Unsupported shutter shape: ", shutterShape);
      return;
    }

    // Assuming you have a function to convert the shutter presentation value to a color
    const convertCIELabToRGB = (lab: any) => {
      const [L, a, b] = lab;
      console.log(lab);
      // Conversion code here
      // This is a placeholder. In practice, use a library or implement the conversion.
      return [0, 0, 0]; // Placeholder: should return [R, G, B]
    };

    const color = shutterPresentationColorValue
      ? convertCIELabToRGB(shutterPresentationColorValue)
      : [0, 0, 0];

    // Create a Cornerstone overlay
    const overlay: Overlay = {
      rows: rows,
      columns: cols,
      type: type,
      //bitsAllocated: bitsAllocated,
      //bitPosition: bitPosition,
      pixelData: overlayData, // Assuming overlayData contains the pixel data
      description: description,
      //subtype: subtype,
      label: label,
      roiArea: roiArea,
      roiMean: roiMean,
      roiStandardDeviation: roiStandardDeviation,
      fillStyle: `rgba(${presentationValue}, ${presentationValue}, ${presentationValue}, 0.5)`, // Example fill style, adjust as needed
      visible: true, // Example visibility flag, adjust as needed
      x: origin ? origin[1] - 1 : 0, // Adjust x based on origin
      y: origin ? origin[0] - 1 : 0 // Adjust y based on origin
    };
    const layerCanvas = document.createElement("canvas");

    layerCanvas.width = image.width;
    layerCanvas.height = image.height;

    const layerContext: CanvasRenderingContext2D =
      layerCanvas.getContext("2d")!;
    this.renderOverlay(overlay, image.width, image.height, layerContext);
  }
  renderOverlay(
    overlay: Overlay,
    imageWidth: number,
    imageHeight: number,
    canvasContext: CanvasRenderingContext2D
  ) {
    if (overlay.visible === false) {
      return;
    }

    const layerCanvas = document.createElement("canvas");
    layerCanvas.width = imageWidth;
    layerCanvas.height = imageHeight;

    const layerContext = layerCanvas.getContext("2d");
    if (!layerContext) {
      console.error("Failed to get 2D context for layerCanvas.");
      return;
    }

    layerContext.fillStyle = overlay.fillStyle;

    if (overlay.type === "R") {
      layerContext.fillRect(0, 0, layerCanvas.width, layerCanvas.height);
      layerContext.globalCompositeOperation = "xor";
    }

    let i = 0;
    for (let y = 0; y < overlay.rows!; y++) {
      for (let x = 0; x < overlay.columns!; x++) {
        if (overlay.pixelData[i++] > 0) {
          layerContext.fillRect(x, y, 1, 1);
        }
      }
    }

    // Guard against non-number values for overlay coordinates
    const overlayX = !isNaN(overlay.x!) && isFinite(overlay.x!) ? overlay.x : 0;
    const overlayY = !isNaN(overlay.y!) && isFinite(overlay.y!) ? overlay.y : 0;

    // Draw the overlay layer onto the canvas
    canvasContext.drawImage(layerCanvas, overlayX!, overlayY!);
  }
}
