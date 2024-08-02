import {
  getInstanceGSPSDict,
  getLarvitarImageTracker,
  getLarvitarManager
} from "./loaders/commonLoader";
import cornerstone, {
  getEnabledElement,
  Image,
  vec2,
  Viewport
} from "cornerstone-core";
import csTools from "cornerstone-tools";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import {
  Coords,
  DisplayAreaVisualizations,
  ViewportComplete
} from "./tools/types";
import {
  AnnotationDetails,
  CompoundDetails,
  GraphicDetails,
  LarvitarManager,
  MajorTicks,
  MetaData,
  Overlay,
  Series,
  TextDetails
} from "./types";
import { MetaDataTypes } from "./MetaDataTypes";
import store from "./imageStore";
import {
  flipImageHorizontal,
  redrawImage,
  resetViewports,
  updateImage
} from "./imageRendering";
const drawJoinedLines = csTools.importInternal("drawing/drawJoinedLines");
const toolColors = csTools.toolColors;
const setShadow = csTools.importInternal("drawing/setShadow");
const drawEllipse = csTools.importInternal("drawing/drawEllipse");
const getNewContext = csTools.importInternal("drawing/getNewContext");
const draw = csTools.importInternal("drawing/draw");
const drawHandles = csTools.importInternal("drawing/drawHandles");
const BaseTool = csTools.importInternal("base/BaseTool");
const { wwwcCursor } = csTools.importInternal("tools/cursors");
const drawLink = csTools.importInternal("drawing/drawLink");
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
  public originalPixelData: number[] | null = null;
  public maskedPixelData: number[] | null = null;
  public gspsImageId: string | null = null;
  public instanceUID: string | null = null;
  public toolAnnotations: any = [];
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
  //TODO-Laura understand how to manage getEnabledElement(element) async (property image is undefined at first)
  async handleElement(element: HTMLElement): Promise<any> {
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

        // Optional: reject the promise if needed, e.g., after a timeout
        setTimeout(() => {
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
    const activeElement = await this.handleElement(element);
    const image = activeElement.image;
    if (this.originalPixelData) {
      image.getPixelData = this.setPixelData(this.originalPixelData!);
    }
    redrawImage(element.id);
    resetViewports([element.id]);
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
          const viewport = cornerstone.getViewport(element);
          if (viewport) {
            this.applySoftcopyLUT(gspsMetadata, viewport);
            this.applyModalityLUT(gspsMetadata, image, viewport);
            this.applySoftcopyPresentationLUT(gspsMetadata, viewport);
            this.applyMask(serie as Series, element);
            const isSameInstanceAnsPS =
              instanceUID === this.instanceUID &&
              gspsSeriesId.imageId === this.gspsImageId;
            if (!isSameInstanceAnsPS) {
              this.originalPixelData = image.getPixelData();
              this.instanceUID = instanceUID;
              this.gspsImageId = gspsSeriesId.imageId;
              this.maskedPixelData = null;
              this.applyDisplayShutter(
                gspsMetadata,
                element,
                image,
                this.originalPixelData!
              );
            } else if (isSameInstanceAnsPS && this.maskedPixelData) {
              image.getPixelData = this.setPixelData(this.maskedPixelData);
              redrawImage(element.id);
            }

            const graphicLayers = gspsMetadata.x00700060; // Assuming this is the parsed Graphic Layer Sequence
            //understand how to integrate graphic Groups
            const graphicGroups = gspsMetadata.x00700234;
            this.retrieveOverlayToolData(
              gspsMetadata,
              image,
              graphicLayers,
              graphicGroups
            );
            this.retrieveAnnotationsToolData(
              gspsMetadata,
              image,
              graphicLayers,
              graphicGroups
            );
            this.applyZoomPan(gspsMetadata, viewport as ViewportComplete);
            this.applySpatialTransformation(
              gspsMetadata,
              element,
              viewport as ViewportComplete
            );

            cornerstone.setViewport(element, viewport);
          }
        }
      }
    }
  }

  applySoftcopyLUT(metadata: MetaData, viewport: Viewport) {
    const voiLutMetadata = metadata.x00283110; // VOI LUT Sequence

    if (voiLutMetadata) {
      const windowCenterMetadata = voiLutMetadata[0].x00281050 as number;
      const windowWidthMetadata = voiLutMetadata[0].x00281051 as number;
      const softcopyLUTSequence = voiLutMetadata[0].x00283010;

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
        viewport.voi!.windowWidth = windowWidthMetadata;
        viewport.voi!.windowCenter = windowCenterMetadata;
      }
    }
  }

  applyModalityLUT(metadata: MetaData, image: Image, viewport: Viewport) {
    const modalityLUTSequence = metadata.x00283000;
    const intercept = metadata.x00281052; // Rescale Intercept
    const slope = metadata.x00281053; // Rescale Slope

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

  applySoftcopyPresentationLUT(metadata: MetaData, viewport: Viewport) {
    const presentationLUTSequence = metadata.x20500010; // Presentation LUT Sequence
    const presentationLUTShape = metadata.x20500020; // Presentation LUT Shape

    if (presentationLUTSequence && presentationLUTSequence.length > 0) {
      // Apply Presentation LUT Sequence if present
      const voiLut = presentationLUTSequence[0]; // Assuming we're using the first LUT in the sequence
      this.setLUT(voiLut, viewport);
    } else if (presentationLUTShape === "INVERSE") {
      // Apply Presentation LUT Shape if no LUT Sequence is present
      viewport.invert = !viewport.invert;
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

  applyZoomPan(metadata: MetaData, viewport: ViewportComplete) {
    if (!viewport.displayedArea) viewport.displayedArea = {};
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
      if (tlhc) {
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
      if (brhc) {
        let brhcX = brhc[0];
        let brhcY = brhc[1];
        if (pixelOriginInterpretation === "VOLUME") {
          brhcX += totalPixelMatrixOrigin.x;
          brhcY += totalPixelMatrixOrigin.y;
        }
        viewport.displayedArea.brhc = { x: brhcX, y: brhcY };
      }

      // Set the row and column pixel spacing
      if (displayedArea.x00700101) {
        //  Presentation Pixel Spacing
        const spacing = displayedArea.x00700101;
        viewport.displayedArea.rowPixelSpacing = spacing[0];
        viewport.displayedArea.columnPixelSpacing = spacing[1];
      } else if (displayedArea.x00700102) {
        //  Presentation Pixel Aspect Ratio
        const aspectRatio = displayedArea.x00700102;
        viewport.displayedArea.rowPixelSpacing = aspectRatio[0];
        viewport.displayedArea.columnPixelSpacing = aspectRatio[1];
      }

      // Set the presentation size mode
      viewport.displayedArea.presentationSizeMode =
        displayedArea.x00700100 as unknown as DisplayAreaVisualizations; // (0070,0100) - Presentation Size Mode
      // Handle magnification ratio if applicable
      if (displayedArea.x00700100 === "MAGNIFY" && displayedArea.x00700100) {
        //  Presentation Pixel Magnification Ratio
        viewport.scale = displayedArea.x00700103;
      }
    }
  }
  applySpatialTransformation(
    metadata: MetaData,
    element: HTMLElement,
    viewport: ViewportComplete
  ) {
    const angle = metadata.x00700042;
    const initialRotation = viewport.initialRotation
      ? viewport.initialRotation
      : viewport.rotation!;
    if (angle) viewport.rotation = initialRotation + angle;
    const horizontalFlip = metadata.x00700041;
    if (horizontalFlip === "Y") flipImageHorizontal(element.id);
  }

  applyMask(serie: Series, element: HTMLElement) {
    if (serie.isMultiframe) {
      const frameId = store.get(["viewports", "viewer", "sliceId"]);
      store.setDSAEnabled(element.id, true);
      updateImage(serie, element.id, frameId, false);
    }
  }

  async applyDisplayShutter(
    metadata: MetaData,
    element: HTMLElement,
    image: Image,
    originalpixelData: number[]
  ) {
    const presentationValue = metadata.x00181622 ?? 0; // Shutter Presentation Value
    const shutterPresentationColorValue = metadata.x00181624; // Shutter Presentation Value
    const shutterShape = metadata.x00181600;
    if (!shutterShape) {
      return;
    }
    const { rows, columns } = image;
    let pixelData = originalpixelData.slice();
    const color = shutterPresentationColorValue
      ? this.convertCIELabToRGB(shutterPresentationColorValue)
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
    const applyPolygonalShutter = async (vertices: number[]) => {
      const points: Coords[] = [];
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

      const processPixel = async (r: number, c: number) => {
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
      };

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          await processPixel(r, c);
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
          await applyPolygonalShutter(polygonVertices);
        }
        break;
      default:
        console.warn("Unsupported shutter shape:", shutterShape);
        break;
    }

    image.getPixelData = this.setPixelData(pixelData);
    this.maskedPixelData = pixelData;
    redrawImage(element.id);
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

  retrieveOverlayToolData(
    metadata: MetaData,
    image: Image,
    graphicLayers?: MetaDataTypes[],
    graphicGroups?: MetaDataTypes[]
  ) {
    const presentationValue = metadata.x00181622 ?? 0; // Shutter Presentation Value
    const shutterPresentationColorValue = metadata.x00181624; // Shutter Presentation Color Value
    const shutterShape = metadata.x00181600; // Shutter Shape (should be BITMAP)
    const shutterOverlayGroup = metadata.x00181623; // Shutter Overlay Group

    // Guard clause for undefined shutterOverlayGroup
    if (!shutterOverlayGroup) {
      console.warn("Shutter overlay group is undefined.");
      return;
    }

    // Retrieve overlay metadata based on shutterOverlayGroup
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
    const overlayActivationLayer =
      metadata[("x" + shutterOverlayGroup + "1001") as keyof MetaData]; //equal to layerOrder

    /*if (shutterShape !== "BITMAP") {
      console.error("Unsupported shutter shape: ", shutterShape);
      return;
    }*/
    let overlayRenderingOrder = overlayActivationLayer;
    let presentationGSValue = presentationValue;
    let overlayCIELabColor = shutterPresentationColorValue;
    let overlayDescription = description;

    const color = overlayCIELabColor
      ? this.convertCIELabToRGB(overlayCIELabColor)
      : [0, 0, 0];

    const overlay: Overlay = {
      isOverlay: true,
      overlayRenderingOrder: overlayRenderingOrder,
      canBeRendered: overlayActivationLayer ? true : false,
      rows: rows,
      columns: cols,
      type: type,
      pixelData: overlayData, // Assuming overlayData contains the pixel data
      description: overlayDescription,
      label: label,
      roiArea: roiArea,
      roiMean: roiMean,
      roiStandardDeviation: roiStandardDeviation,
      fillStyle: presentationGSValue
        ? `rgba(${presentationGSValue}, ${presentationGSValue}, ${presentationGSValue}, 1)`
        : `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`, // Example fill style, adjust as needed
      visible: true, // Example visibility flag, adjust as needed
      x: origin ? origin[1] - 1 : 0, // Adjust x based on origin
      y: origin ? origin[0] - 1 : 0, // Adjust y based on origin,
      bitsAllocated,
      bitPosition,
      subtype
    };
    if (overlay) this.setToolAnnotationsAndOverlays(overlay);
  }

  retrieveAnnotationsToolData(
    metadata: MetaData,
    image: Image,
    graphicLayers?: MetaDataTypes[],
    graphicGroups?: MetaDataTypes[]
  ) {
    // Extract Graphic Annotation Sequence
    const graphicAnnotationSequence = metadata.x00700001; // Graphic Annotation Sequence
    if (graphicAnnotationSequence) {
      graphicAnnotationSequence.forEach(annotation => {
        const annotationID = annotation.x00700002; // Graphic Layer

        const targetLayer: MetaDataTypes = this.findGraphicLayer(
          annotationID,
          graphicLayers
        );

        const annotationDetails = {
          description: targetLayer?.x00700068,
          annotationID,
          annotationRenderingOrder: targetLayer.x00700062,
          presentationGSValue: targetLayer.x00700066,
          annotationCIELabColor: targetLayer.x00700401,
          annotationDescription: targetLayer.x00700068
        };

        // Extract Text Objects
        const textObjectSequence = annotation.x00700008; // Text Object Sequence
        if (textObjectSequence) {
          textObjectSequence.forEach(textObject => {
            const textDetails = this.retrieveTextObjectDetails(textObject);
            this.handleTextAnnotation(annotationDetails, textDetails, image);
          });
        }

        // Extract Graphics Objects
        const graphicObjectSequence = annotation.x00700009; // Graphic Object Sequence
        if (graphicObjectSequence) {
          graphicObjectSequence.forEach(graphicObject => {
            const graphicDetails =
              this.retrieveGraphicObjectDetails(graphicObject);
            this.handleGraphicAnnotation(
              annotationDetails,
              graphicDetails,
              image
            );
          });
        }
        // Extract Graphics Objects
        const compoundGraphicSequence = annotation.x00700209; // Graphic Object Sequence
        if (compoundGraphicSequence) {
          compoundGraphicSequence.forEach(compoundObject => {
            const compoundDetails =
              this.retrieveCompoundObjectDetails(compoundObject);
            this.handleCompoundAnnotation(annotationDetails, compoundDetails);
          });
        }
      });
    }
  }

  retrieveTextObjectDetails(textObject: MetaDataTypes): TextDetails {
    return {
      unformattedTextValue: textObject.x00700006, // Unformatted Text Value
      textFormat: textObject.x00700012,
      boundingBoxUnits: textObject.x00700003, // Bounding Box Annotation Units
      anchorPointUnits: textObject.x00700004, // Anchor Point Annotation Units
      boundingBox: {
        tlhc: {
          x:
            textObject.x00700010 && textObject.x00700010[0]
              ? textObject.x00700010[0]
              : null,
          y:
            textObject.x00700010 && textObject.x00700010[1]
              ? textObject.x00700010[1]
              : null
        },
        brhc: {
          x:
            textObject.x00700011 && textObject.x00700011[0]
              ? textObject.x00700011[0]
              : null,
          y:
            textObject.x00700011 && textObject.x00700011[1]
              ? textObject.x00700011[1]
              : null
        }
      },
      anchorPointVisibility: textObject.x00700015, // Anchor Point Visibility
      anchorPoint: {
        x:
          textObject.x00700014 && textObject.x00700014[0]
            ? textObject.x00700014[0]
            : null,
        y:
          textObject.x00700014 && textObject.x00700014[1]
            ? textObject.x00700014[1]
            : null
      },
      compoundGraphicInstanceUID: textObject.x00700226,
      graphicGroupID: textObject.x00700295,
      trackingID: textObject.x00620020,
      trackingUID: textObject.x00620021
    };
  }

  retrieveGraphicObjectDetails(graphicObject: MetaDataTypes): GraphicDetails {
    return {
      graphicAnnotationUnits: graphicObject.x00700005,
      graphicDimensions: graphicObject.x00700020,
      graphicPointsNumber: graphicObject.x00700021,
      graphicData: graphicObject.x00700022,
      graphicType: graphicObject.x00700023,
      graphicFilled: graphicObject.x00700024,
      compoundGraphicInstanceUID: graphicObject.x00700226,
      graphicGroupID: graphicObject.x00700295,
      trackingID: graphicObject.x00620020,
      trackingUID: graphicObject.x00620021
    };
  }
  retrieveCompoundObjectDetails(
    compoundObject: MetaDataTypes
  ): CompoundDetails {
    const compoundDetails = {
      compoundGraphicUnits: compoundObject.x00700282,
      graphicDimensions: compoundObject.x00700020,
      graphicPointsNumber: compoundObject.x00700021,
      graphicData: compoundObject.x00700022,
      compoundGraphicType: compoundObject.x00700294,
      graphicFilled: compoundObject.x00700024,
      compoundGraphicInstanceUID: compoundObject.x00700226,
      graphicGroupID: compoundObject.x00700295,
      rotationAngle: compoundObject.x00700230,
      rotationPoint: compoundObject.x00700273,
      gapLength: compoundObject.x00700261,
      diameterOfVisibility: compoundObject.x00700262,
      majorTicks: [] as MajorTicks[],
      tickFormat: compoundObject.x00700274,
      tickLabelFormat: compoundObject.x00700279,
      showTick: compoundObject.x00700278
    };
    if (compoundObject.x00700287?.length) {
      const ticks = compoundObject.x00700287;
      for (let i = 0; i < ticks?.length; i++) {
        compoundDetails.majorTicks.push({
          tickPosition: ticks[i].x00700288,
          tickLabel: ticks[i].x00700289
        });
      }
    }
    return compoundDetails;
  }

  findGraphicLayer(annotationID?: string, graphicLayers?: any) {
    if (graphicLayers) {
      for (const layer of graphicLayers) {
        if (layer.x00700002 === annotationID) {
          return layer;
        }
      }
    }
  }

  handleTextAnnotation(
    annotation: AnnotationDetails,
    textObject: TextDetails,
    image: Image
  ) {
    let anchorPointX = null;
    let anchorPointY = null;
    const isCenteredOnAnchorPoints: boolean =
      (textObject.boundingBox?.brhc?.x === null ||
        textObject.boundingBox?.tlhc?.x === null) &&
      textObject.anchorPoint?.x !== null;
    //TODO-Laura for DISPLAY UNITS use canvas px sizes width and height and NOT image
    const xCenter =
      (isCenteredOnAnchorPoints
        ? textObject.anchorPoint?.x!
        : (textObject.boundingBox?.brhc?.x! +
            textObject.boundingBox?.tlhc?.x!) /
          2) * (textObject.anchorPointUnits === "DISPLAY" ? image.columns : 1);
    const yCenter =
      (isCenteredOnAnchorPoints
        ? textObject.anchorPoint?.y!
        : (textObject.boundingBox?.brhc?.y! +
            textObject.boundingBox?.tlhc?.y!) /
          2) * (textObject.anchorPointUnits === "DISPLAY" ? image.rows : 1);
    if (isCenteredOnAnchorPoints) {
      anchorPointX =
        textObject.anchorPoint!.x! *
        (textObject.anchorPointUnits === "DISPLAY" ? image.columns : 1);
      anchorPointY =
        textObject.anchorPoint!.y! *
        (textObject.anchorPointUnits === "DISPLAY" ? image.rows : 1);
    }
    const boundingBoxWidth =
      (textObject.boundingBox?.brhc?.x! - textObject.boundingBox?.tlhc?.x!) *
      (textObject.anchorPointUnits === "DISPLAY" ? image.columns : 1);
    const boundingBoxHeight =
      (textObject.boundingBox?.brhc?.y! - textObject.boundingBox?.tlhc?.y!) *
      (textObject.anchorPointUnits === "DISPLAY" ? image.rows : 1);

    this.setToolAnnotationsAndOverlays({
      isTextAnnotation: true,
      annotationRenderingOrder: annotation.annotationRenderingOrder,
      handles: {
        textBox: {
          text: textObject.unformattedTextValue,
          active: false,
          allowedOutsideImage: true,
          boundingBox: {
            width: boundingBoxWidth,
            height: boundingBoxHeight,
            //TODO-Laura check textObject.textFormat before setting left and top
            left: xCenter! - boundingBoxWidth! / 2,
            top: yCenter! - boundingBoxHeight! / 2
          },
          anchorPoint: {
            x: anchorPointX,
            y: anchorPointY
          },
          anchorpointVisibility: textObject.anchorPointVisibility,
          drawnIndependently: true,
          hasBoundingBox: true,
          hasMoved: false,
          movesIndependently: false,
          textFormat: textObject.textFormat,
          x: xCenter,
          y: yCenter
        }
      }
    });
  }
  handleGraphicAnnotation(
    annotation: AnnotationDetails,
    graphicObject: GraphicDetails,
    image: Image
  ) {
    const graphicType = graphicObject.graphicType;
    if (!graphicType) return;
    switch (graphicType) {
      case "POINT":
        this.setToolAnnotationsAndOverlays({
          isGraphicAnnotation: true,
          annotationRenderingOrder: annotation.annotationRenderingOrder,
          isgraphicFilled: graphicObject.graphicFilled,
          type: "POINT",
          visible: true,
          active: true,
          color: undefined,
          invalidated: true,
          handles: {
            start: {
              x:
                graphicObject.graphicData![0] *
                (graphicObject.graphicAnnotationUnits === "DISPLAY"
                  ? image.columns
                  : 1),
              y:
                graphicObject.graphicData![1] *
                (graphicObject.graphicAnnotationUnits === "DISPLAY"
                  ? image.rows
                  : 1),
              highlight: true,
              active: false
            },

            initialRotation: 0,
            textBox: {
              active: false,
              hasMoved: false,
              movesIndependently: false,
              drawnIndependently: true,
              allowedOutsideImage: true,
              hasBoundingBox: true
            }
          }
        });
        break;
      case "POLYLINE":
        const xy: any[] = [];
        if (graphicObject.graphicData) {
          for (let i = 0; i < graphicObject.graphicData.length; i += 2) {
            if (i + 1 < graphicObject.graphicData.length) {
              xy.push({
                x:
                  graphicObject.graphicData[i] *
                  (graphicObject.graphicAnnotationUnits === "DISPLAY"
                    ? image.columns
                    : 1),
                y:
                  graphicObject.graphicData[i + 1] *
                  (graphicObject.graphicAnnotationUnits === "DISPLAY"
                    ? image.rows
                    : 1),
                lines: []
              });
            }
          }
          for (let insertIndex = 0; insertIndex < xy.length; insertIndex++) {
            if (xy.length + 1 === xy.length - 1) {
              xy[insertIndex].lines.push(xy[0]);
            } else {
              xy[insertIndex].lines.push(xy[insertIndex + 1]);
            }
          }
        }

        this.setToolAnnotationsAndOverlays({
          isGraphicAnnotation: true,
          annotationRenderingOrder: annotation.annotationRenderingOrder,
          type: "POLYLINE",
          isgraphicFilled: graphicObject.graphicFilled,
          visible: true,
          active: true,
          color: undefined,
          invalidated: true,
          handles: {
            points: xy,
            initialRotation: 0,
            textBox: {
              active: false,
              hasMoved: false,
              movesIndependently: false,
              drawnIndependently: true,
              allowedOutsideImage: true,
              hasBoundingBox: true
            }
          }
        });
        break;
      case "INTERPOLATED":
        break;
      case "CIRCLE":
        const center = {
          x: graphicObject.graphicData![0],
          y: graphicObject.graphicData![1]
        };
        const point = {
          x: graphicObject.graphicData![2],
          y: graphicObject.graphicData![3]
        };
        const radius = Math.sqrt(
          Math.pow(center.x - point.x, 2) + Math.pow(center.y - point.y, 2)
        );
        this.setToolAnnotationsAndOverlays({
          isGraphicAnnotation: true,
          annotationRenderingOrder: annotation.annotationRenderingOrder,
          type: "CIRCLE",
          isgraphicFilled: graphicObject.graphicFilled,
          visible: true,
          active: true,
          color: undefined,
          invalidated: true,
          handles: {
            start: {
              x:
                (center.x - radius / 2) *
                (graphicObject.graphicAnnotationUnits === "DISPLAY"
                  ? image.columns
                  : 1),
              y:
                (center.y - radius / 2) *
                (graphicObject.graphicAnnotationUnits === "DISPLAY"
                  ? image.rows
                  : 1),
              highlight: true,
              active: false
            },
            end: {
              x:
                (center.x + radius / 2) *
                (graphicObject.graphicAnnotationUnits === "DISPLAY"
                  ? image.columns
                  : 1),
              y:
                (center.y + radius / 2) *
                (graphicObject.graphicAnnotationUnits === "DISPLAY"
                  ? image.rows
                  : 1),
              highlight: true,
              active: true
            },
            initialRotation: 0,
            textBox: {
              active: false,
              hasMoved: false,
              movesIndependently: false,
              drawnIndependently: true,
              allowedOutsideImage: true,
              hasBoundingBox: true
            }
          }
        });
        break;
      case "ELLIPSE":
        //push so that this.toolAnnotations is sorted by layer priority order
        this.setToolAnnotationsAndOverlays({
          isGraphicAnnotation: true,
          annotationRenderingOrder: annotation.annotationRenderingOrder,
          type: "ELLIPSE",
          isgraphicFilled: graphicObject.graphicFilled,
          visible: true,
          active: true,
          color: undefined,
          invalidated: true,
          handles: {
            start: {
              x:
                graphicObject.graphicData![0] *
                (graphicObject.graphicAnnotationUnits === "DISPLAY"
                  ? image.columns
                  : 1),
              y:
                graphicObject.graphicData![5] *
                (graphicObject.graphicAnnotationUnits === "DISPLAY"
                  ? image.rows
                  : 1),
              highlight: true,
              active: false
            },
            end: {
              x:
                graphicObject.graphicData![2] *
                (graphicObject.graphicAnnotationUnits === "DISPLAY"
                  ? image.columns
                  : 1),
              y:
                graphicObject.graphicData![7] *
                (graphicObject.graphicAnnotationUnits === "DISPLAY"
                  ? image.rows
                  : 1),
              highlight: true,
              active: true
            },
            initialRotation: 0,
            textBox: {
              active: false,
              hasMoved: false,
              movesIndependently: false,
              drawnIndependently: true,
              allowedOutsideImage: true,
              hasBoundingBox: true
            }
          }
        });
        break;
      default:
        return;
    }
  }
  renderToolData(evt: any) {
    const toolData = this.getToolAnnotations();

    if (!toolData) {
      return;
    }

    const eventData = evt.detail;
    const { element, image } = eventData;

    const context = getNewContext(eventData.canvasContext.canvas);
    // Configure

    draw(context, (context: CanvasRenderingContext2D) => {
      // If we have tool data for this element - iterate over each set and draw it
      for (let i = 0; i < toolData.length; i++) {
        const data = toolData[i];
        const color = toolColors.getColorIfActive(data);
        if (data.isOverlay === true) {
          if (data.visible === false) {
            return;
          }

          const layerCanvas = document.createElement("canvas");
          layerCanvas.width = image.width;
          layerCanvas.height = image.height;

          const layerContext = layerCanvas.getContext("2d");
          if (!layerContext) {
            console.error("Failed to get 2D context for layerCanvas.");
            return;
          }

          layerContext.fillStyle = data.fillStyle;

          if (data.type === "R") {
            layerContext.fillRect(0, 0, layerCanvas.width, layerCanvas.height);
            layerContext.globalCompositeOperation = "xor";
          }

          let i = 0;
          for (let y = 0; y < data.rows!; y++) {
            for (let x = 0; x < data.columns!; x++) {
              if (data.pixelData[i++] > 0) {
                layerContext.fillRect(x, y, 1, 1);
              }
            }
          }

          // Guard against non-number values for overlay coordinates
          const overlayX = !isNaN(data.x!) && isFinite(data.x!) ? data.x : 0;
          const overlayY = !isNaN(data.y!) && isFinite(data.y!) ? data.y : 0;

          // Draw the overlay layer onto the canvas
          layerContext.drawImage(layerCanvas, overlayX!, overlayY!);
        } else if (data.isGraphicAnnotation === true) {
          if (data.visible === false) {
            continue;
          }

          setShadow(context, this.configuration);

          if (data.type === "POINT") {
            const options = {
              color,
              fillStyle: data.isgraphicFilled ? color : null,
              handleRadius: 6
            };
            drawHandles(
              context,
              eventData,
              this.configuration.mouseLocation.handles,
              options
            );
          } else if (data.type === "ELLIPSE" || data.type === "CIRCLE") {
            const ellipseCircleOptions = {
              color,
              fillStyle: data.isgraphicFilled ? color : null
            };
            drawEllipse(
              context,
              element,
              data.handles.start,
              data.handles.end,
              ellipseCircleOptions,
              "pixel",
              data.handles.initialRotation
            );
          } else if ((data.type = "POLYLINE")) {
            const isNotTheFirstHandle = data.handles.points.length > 1;
            const polylineOptions = {
              color,
              fillStyle: data.isgraphicFilled ? color : null
            };
            if (isNotTheFirstHandle) {
              for (let j = 0; j < data.handles.points.length; j++) {
                const lines = [...data.handles.points[j].lines];

                drawJoinedLines(
                  context,
                  element,
                  data.handles.points[j],
                  lines,
                  polylineOptions
                );
              }
            }
          }
        } else if (data.isTextAnnotation === true) {
          const textBox = data.handles.textBox;
          context.font = "Arial";
          context.fillStyle = color;
          context.textAlign = textBox.textFormat;

          // Set the text baseline to top
          context.textBaseline = "top";
          let textX = textBox.x;
          let textY = textBox.y;
          switch (textBox.textFormat) {
            case "LEFT":
              //modify textX and textY
              break;
            case "RIGHT":
              //modify textX and textY
              break;
            case "CENTER":
              break;
          }
          //TODO-Laura consider text format inside of bounding box
          // Draw the text
          context.fillText(textBox.text, textX, textY);

          // Set the stroke style for the rectangle
          context.strokeStyle = color; // You can set this to a different color if needed

          // Define the rectangle path

          context.rect(
            textBox.boundingBox.left,
            textBox.boundingBox.top,
            textBox.boundingBox.width,
            textBox.boundingBox.height
          );

          // Draw the rectangle stroke
          context.stroke();

          // Draw dashed link line between tool and text
          if (
            textBox.anchorPoint.x &&
            textBox.anchorPoint.y &&
            textBox.anchorpointVisibility
          )
            drawLink(
              [textBox.anchorPoint],
              { x: textBox.x, y: textBox.y },
              textBox.boundingBox,
              context,
              color,
              2
            );
        }
      }
    });
  }
  //setters
  setToolAnnotationsAndOverlays(newData: any) {
    //TODO-Laura implement the sorting logic (following the layer rendering order)
    this.toolAnnotations.push(newData);
  }
  //getters
  getToolAnnotations() {
    return this.toolAnnotations;
  }

  convertCIELabToRGB(lab: [number, number, number]) {
    const l = lab[0];
    const a = lab[1];
    const b = lab[2];
    let varY = (l + 16) / 116;
    let varX = a / 500 + varY;
    let varZ = varY - b / 200;

    if (Math.pow(varY, 3) > 0.008856) varY = Math.pow(varY, 3);
    else varY = (varY - 16 / 116) / 7.787;

    if (Math.pow(varX, 3) > 0.008856) varX = Math.pow(varX, 3);
    else varX = (varX - 16 / 116) / 7.787;

    if (Math.pow(varZ, 3) > 0.008856) varZ = Math.pow(varZ, 3);
    else varZ = (varZ - 16 / 116) / 7.787;

    let X = 95.047 * varX; // ref_X =  95.047     Observer= 2°, Illuminant= D65
    let Y = 100.0 * varY; // ref_Y = 100.000
    let Z = 108.883 * varZ; // ref_Z = 108.883

    varX = X / 100; // X from 0 to  95.047      (Observer = 2°, Illuminant = D65)
    varY = Y / 100; // Y from 0 to 100.000
    varZ = Z / 100; // Z from 0 to 108.883

    let varR = varX * 3.2406 + varY * -1.5372 + varZ * -0.4986;
    let varG = varX * -0.9689 + varY * 1.8758 + varZ * 0.0415;
    let varB = varX * 0.0557 + varY * -0.204 + varZ * 1.057;

    if (varR > 0.0031308) varR = 1.055 * Math.pow(varR, 1 / 2.4) - 0.055;
    else varR = 12.92 * varR;

    if (varG > 0.0031308) varG = 1.055 * Math.pow(varG, 1 / 2.4) - 0.055;
    else varG = 12.92 * varG;

    if (varB > 0.0031308) varB = 1.055 * Math.pow(varB, 1 / 2.4) - 0.055;
    else varB = 12.92 * varB;

    let R = varR * 255;
    let G = varG * 255;
    let B = varB * 255;

    return [R, G, B];
  }
}
