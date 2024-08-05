import {
  getLarvitarImageTracker,
  getLarvitarManager
} from "../../loaders/commonLoader";
import {
  AnnotationDetails,
  CompoundDetails,
  GraphicDetails,
  DisplayAreaVisualizations,
  ViewportComplete,
  MajorTicks,
  TextDetails,
  AnnotationOverlay
} from "../types";
import { Image, Viewport, getEnabledElement } from "cornerstone-core";
import { LarvitarManager, MetaData, Series } from "../../types";
import { MetaDataTypes } from "../../MetaDataTypes";
import store from "../../imageStore";
import {
  flipImageHorizontal,
  redrawImage,
  updateImage
} from "../../imageRendering";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";

//gsps related algorithms

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
    viewport.invert = !viewport.invert;
  }
}

export function setLUT(voiLut: MetaDataTypes, viewport: Viewport) {
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

export function applyZoomPan(metadata: MetaData, viewport: ViewportComplete) {
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
export function applySpatialTransformation(
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

export function applyMask(serie: Series, element: HTMLElement) {
  if (serie.isMultiframe) {
    const frameId = store.get(["viewports", "viewer", "sliceId"]);
    store.setDSAEnabled(element.id, true);
    updateImage(serie, element.id, frameId, false);
  }
}

export function applyDisplayShutter(
  metadata: MetaData,
  element: HTMLElement,
  image: Image
) {
  const presentationValue = metadata.x00181622 ?? 0; // Shutter Presentation Value
  const { rows, columns } = image;
  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const shutterPresentationColorValue = metadata.x00181624; // Shutter Presentation Value
  const shutterShape = metadata.x00181600;
  if (!shutterShape) {
    return;
  }
  const color = shutterPresentationColorValue
    ? convertCIELabToRGB(shutterPresentationColorValue)
    : [presentationValue, presentationValue, presentationValue];

  // Helper function to apply rectangular shutter
  const applyRectangularShutter = (
    left: number,
    right: number,
    upper: number,
    lower: number
  ) => {
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.fillRect(0, 0, columns, upper);
    ctx.fillRect(0, lower, columns, rows - lower);
    ctx.fillRect(0, upper, left, lower - upper);
    ctx.fillRect(right, upper, columns - right, lower - upper);
  };

  // Helper function to apply circular shutter
  const applyCircularShutter = (center: [number, number], radius: number) => {
    const [centerX, centerY] = center;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.rect(columns, 0, -columns, rows);
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.fill();
  };

  // Helper function to apply polygonal shutter
  const applyPolygonalShutter = (vertices: number[]) => {
    ctx.beginPath();
    ctx.moveTo(vertices[1], vertices[0]);
    for (let i = 2; i < vertices.length; i += 2) {
      ctx.lineTo(vertices[i + 1], vertices[i]);
    }
    ctx.closePath();
    ctx.rect(columns, 0, -columns, rows);
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.fill();
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

  redrawImage(element.id);
}
export function setPixelData(pixelData: number[]) {
  return () => {
    if (!pixelData) {
      console.warn("no pixel data available");
      return [];
    }
    return Array.from(pixelData);
  };
}

export function retrieveOverlayToolData(
  metadata: MetaData,
  toolAnnotations: AnnotationOverlay[],
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
  const rows = metadata[("x" + shutterOverlayGroup + "0010") as keyof MetaData];
  const cols = metadata[("x" + shutterOverlayGroup + "0011") as keyof MetaData];
  const type = metadata[("x" + shutterOverlayGroup + "0040") as keyof MetaData];
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
    ? convertCIELabToRGB(overlayCIELabColor)
    : [0, 0, 0];

  const overlay: AnnotationOverlay = {
    isOverlay: true,
    renderingOrder: overlayRenderingOrder,
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
  if (overlay) setToolAnnotationsAndOverlays(overlay, toolAnnotations);
}

export function retrieveAnnotationsToolData(
  metadata: MetaData,
  image: Image,
  toolAnnotations: AnnotationOverlay[],
  canvas: HTMLCanvasElement | null,
  graphicLayers?: MetaDataTypes[],
  graphicGroups?: MetaDataTypes[]
) {
  // Extract Graphic Annotation Sequence
  const graphicAnnotationSequence = metadata.x00700001; // Graphic Annotation Sequence
  if (graphicAnnotationSequence) {
    graphicAnnotationSequence.forEach(annotation => {
      const annotationID = annotation.x00700002; // Graphic Layer

      const targetLayer: MetaDataTypes = findGraphicLayer(
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
          const textDetails = retrieveTextObjectDetails(textObject);
          handleTextAnnotation(
            annotationDetails,
            textDetails,
            toolAnnotations,
            canvas
          );
        });
      }

      // Extract Graphics Objects
      const graphicObjectSequence = annotation.x00700009; // Graphic Object Sequence
      if (graphicObjectSequence) {
        graphicObjectSequence.forEach(graphicObject => {
          const graphicDetails = retrieveGraphicObjectDetails(graphicObject);
          handleGraphicAnnotation(
            annotationDetails,
            graphicDetails,
            toolAnnotations,
            canvas
          );
        });
      }
      // Extract Graphics Objects
      const compoundGraphicSequence = annotation.x00700209; // Graphic Object Sequence
      if (compoundGraphicSequence) {
        compoundGraphicSequence.forEach(compoundObject => {
          const compoundDetails = retrieveCompoundObjectDetails(compoundObject);
          //TODO-Laura MULTILINE,INFINITELINE,CUTLINE,RANGELINE,RULER,AXIS,CROSSHAIR,ARROW,RECTANGLE,ELLIPSE
          //this.handleCompoundAnnotation(annotationDetails, compoundDetails);
        });
      }
    });
  }
}

export function retrieveTextObjectDetails(
  textObject: MetaDataTypes
): TextDetails {
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

export function retrieveGraphicObjectDetails(
  graphicObject: MetaDataTypes
): GraphicDetails {
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

export function retrieveCompoundObjectDetails(
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

export function findGraphicLayer(annotationID?: string, graphicLayers?: any) {
  if (graphicLayers) {
    for (const layer of graphicLayers) {
      if (layer.x00700002 === annotationID) {
        return layer;
      }
    }
  }
}

export function handleTextAnnotation(
  annotation: AnnotationDetails,
  textObject: TextDetails,
  toolAnnotations: AnnotationOverlay[],
  canvas: HTMLCanvasElement | null
) {
  let anchorPointX = null;
  let anchorPointY = null;
  const isCenteredOnAnchorPoints: boolean =
    (textObject.boundingBox?.brhc?.x === null ||
      textObject.boundingBox?.tlhc?.x === null) &&
    textObject.anchorPoint?.x !== null;
  const xMultiplier =
    textObject.anchorPointUnits === "DISPLAY" && canvas?.clientWidth
      ? canvas.clientWidth
      : 1;
  const yMultiplier =
    textObject.anchorPointUnits === "DISPLAY" && canvas?.clientHeight
      ? canvas.clientHeight
      : 1;
  const xCenter =
    (isCenteredOnAnchorPoints
      ? textObject.anchorPoint?.x!
      : (textObject.boundingBox?.brhc?.x! + textObject.boundingBox?.tlhc?.x!) /
        2) * xMultiplier!;
  const yCenter =
    (isCenteredOnAnchorPoints
      ? textObject.anchorPoint?.y!
      : (textObject.boundingBox?.brhc?.y! + textObject.boundingBox?.tlhc?.y!) /
        2) * yMultiplier!;
  if (isCenteredOnAnchorPoints) {
    anchorPointX = textObject.anchorPoint!.x! * xMultiplier!;
    anchorPointY = textObject.anchorPoint!.y! * yMultiplier!;
  }
  const boundingBoxWidth =
    (textObject.boundingBox?.brhc?.x! - textObject.boundingBox?.tlhc?.x!) *
    xMultiplier!;
  const boundingBoxHeight =
    (textObject.boundingBox?.brhc?.y! - textObject.boundingBox?.tlhc?.y!) *
    yMultiplier!;

  setToolAnnotationsAndOverlays(
    {
      isTextAnnotation: true,
      renderingOrder: annotation.annotationRenderingOrder,
      handles: {
        textBox: {
          text: textObject.unformattedTextValue,
          active: false,
          allowedOutsideImage: true,
          boundingBox: {
            width: boundingBoxWidth,
            height: boundingBoxHeight,
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
    } as AnnotationOverlay,
    toolAnnotations
  );
}
export function handleGraphicAnnotation(
  annotation: AnnotationDetails,
  graphicObject: GraphicDetails,
  toolAnnotations: AnnotationOverlay[],
  canvas: HTMLCanvasElement | null
) {
  const graphicType = graphicObject.graphicType;
  const xMultiplier =
    graphicObject.graphicAnnotationUnits === "DISPLAY" && canvas?.clientWidth
      ? canvas.clientWidth
      : 1;
  const yMultiplier =
    graphicObject.graphicAnnotationUnits === "DISPLAY" && canvas?.clientHeight
      ? canvas.clientHeight
      : 1;
  if (!graphicType) return;
  switch (graphicType) {
    case "POINT":
      setToolAnnotationsAndOverlays(
        {
          isGraphicAnnotation: true,
          renderingOrder: annotation.annotationRenderingOrder,
          isgraphicFilled: graphicObject.graphicFilled,
          type: "POINT",
          visible: true,
          active: true,
          color: undefined,
          invalidated: true,
          handles: {
            start: {
              x: graphicObject.graphicData![0] * xMultiplier!,
              y: graphicObject.graphicData![1] * yMultiplier!,
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
        } as AnnotationOverlay,
        toolAnnotations
      );
      break;
    case "POLYLINE":
      const xy: any[] = [];
      if (graphicObject.graphicData) {
        for (let i = 0; i < graphicObject.graphicData.length; i += 2) {
          if (i + 1 < graphicObject.graphicData.length) {
            xy.push({
              x: graphicObject.graphicData[i] * xMultiplier!,
              y: graphicObject.graphicData[i + 1] * yMultiplier!,
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

      setToolAnnotationsAndOverlays(
        {
          isGraphicAnnotation: true,
          renderingOrder: annotation.annotationRenderingOrder,
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
        } as AnnotationOverlay,
        toolAnnotations
      );
      break;
    case "INTERPOLATED":
      //TODO-Laura interpolated graph case
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
      setToolAnnotationsAndOverlays(
        {
          isGraphicAnnotation: true,
          renderingOrder: annotation.annotationRenderingOrder,
          type: "CIRCLE",
          isgraphicFilled: graphicObject.graphicFilled,
          visible: true,
          active: true,
          color: undefined,
          invalidated: true,
          handles: {
            start: {
              x: (center.x - radius / 2) * xMultiplier!,
              y: (center.y - radius / 2) * yMultiplier!,
              highlight: true,
              active: false
            },
            end: {
              x: (center.x + radius / 2) * xMultiplier!,
              y: (center.y + radius / 2) * yMultiplier!,
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
        } as AnnotationOverlay,
        toolAnnotations
      );
      break;
    case "ELLIPSE":
      //push so that this.toolAnnotations is sorted by layer priority order
      setToolAnnotationsAndOverlays(
        {
          isGraphicAnnotation: true,
          renderingOrder: annotation.annotationRenderingOrder,
          type: "ELLIPSE",
          isgraphicFilled: graphicObject.graphicFilled,
          visible: true,
          active: true,
          color: undefined,
          invalidated: true,
          handles: {
            start: {
              x: graphicObject.graphicData![0] * xMultiplier!,
              y: graphicObject.graphicData![5] * yMultiplier!,
              highlight: true,
              active: false
            },
            end: {
              x: graphicObject.graphicData![2] * xMultiplier!,
              y: graphicObject.graphicData![7] * yMultiplier!,
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
        } as AnnotationOverlay,
        toolAnnotations
      );
      break;
    default:
      return;
  }
}

//setters
export function setToolAnnotationsAndOverlays(
  newData: AnnotationOverlay,
  toolAnnotations: AnnotationOverlay[]
) {
  const renderingOrder = newData.renderingOrder!;

  // Find the correct position to insert the new data
  let insertIndex = toolAnnotations.findIndex(
    (item: AnnotationOverlay) => item.renderingOrder! > renderingOrder
  );

  // If no such position is found, insert at the end
  if (insertIndex === -1) {
    insertIndex = toolAnnotations.length;
  }

  // Insert the new data at the determined position
  toolAnnotations.splice(insertIndex, 0, newData);
}

export function convertCIELabToRGB(lab: [number, number, number]) {
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

//cornerstone and larvitar management functions

export function retrieveLarvitarManager(imageId: string) {
  const parsedImageId: { scheme: string; url: string } =
    cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId);

  const rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
  const imageTracker = getLarvitarImageTracker();
  const seriesId: string = imageTracker[rootImageId];
  const manager = getLarvitarManager() as LarvitarManager;
  return { manager, seriesId };
}

//TODO-Laura understand how to manage getEnabledElement(element) async (property image is undefined at first)
export async function handleElement(element: HTMLElement): Promise<any> {
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
