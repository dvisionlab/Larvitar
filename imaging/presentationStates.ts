import dcmjs from "dcmjs";
import { Types } from "@cornerstonejs/core";
import * as _cornerstone from "@cornerstonejs/core";
import * as _cornerstoneTools from "@cornerstonejs/tools";
import { getImageManager } from "./imageManagers";
import { MetaData } from "./types";
import { convertHexToCIELab } from "./tools/custom/gspsUtils/genericDrawingUtils";

interface PresentationContext {
  viewport: Types.IStackViewport;
  imageId: string;
  metadata: MetaData;
  canvas: HTMLCanvasElement;
}

/**
 * Creates a DICOM GSPS blob from the current viewport state.
 * with : W/L (VOI LUT), displayed area (zoom/pan), spatial transforms
 * (rotation/flip), graphic annotations, and text objects for every
 * Cornerstone Tools annotation in the current frame-of-reference.
 */
export function createPresentationStateBlob(
  elementId: string,
  renderingEngineId: string
): Blob {
  const enabledElement = _cornerstone.getEnabledElementByIds(
    elementId,
    renderingEngineId
  );
  const { viewport } = enabledElement;

  if (!(viewport instanceof _cornerstone.StackViewport)) {
    throw new Error(
      "Presentation State creation currently supports StackViewports only."
    );
  }

  const imageId = viewport.getCurrentImageId()!;
  const manager = getImageManager();
  const seriesId = Object.keys(manager)[0];
  const metadata = manager[seriesId].instances[imageId].metadata;

  const frameOfReferenceUID = viewport.getFrameOfReferenceUID();
  const allAnnotations =
    _cornerstoneTools.annotation.state.getAllAnnotations() || [];
  const filteredAnnotations = allAnnotations.filter(
    a => a.metadata?.FrameOfReferenceUID === frameOfReferenceUID
  );

  const context: PresentationContext = {
    viewport,
    imageId,
    metadata,
    canvas: viewport.canvas
  };

  const dataset = buildPresentationDataset(context, filteredAnnotations);

  const meta = {
    FileMetaInformationVersion: new Uint8Array([0, 1]),
    MediaStorageSOPClassUID: dataset.SOPClassUID,
    MediaStorageSOPInstanceUID: dataset.SOPInstanceUID,
    TransferSyntaxUID: "1.2.840.10008.1.2.1",
    ImplementationClassUID: "1.2.826.0.1.3680043.9.5830.100"
  };

  const dicomDict = new dcmjs.data.DicomDict(meta);
  dicomDict.dict = dcmjs.data.DicomMetaDictionary.denaturalizeDataset(dataset);
  const buffer = dicomDict.write();

  return new Blob([buffer], { type: "application/dicom" });
}

export function downloadDICOM(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildPresentationDataset(
  context: PresentationContext,
  annotations: any[]
) {
  const { metadata, viewport } = context;

  const patientName = metadata.patientName || metadata.x00100010 || "UNKNOWN";
  const patientID = metadata.x00100020 || "UNKNOWN";
  const patientBirthDate =
    metadata.patientBirthdate || metadata.x00100030 || "";
  const patientSex = metadata.x00101040 || "";
  const studyUID = metadata.studyUID || metadata.x0020000d || generateUID();
  const seriesUID = metadata.seriesUID || metadata.x0020000e || generateUID();
  const studyDate = metadata.x00080020 || "";
  const studyTime = metadata.x00080030 || "";
  const accessionNumber = metadata.accessionNumber || metadata.x00080050 || "";

  const referencedSOPClassUID = metadata.sopClassUID || metadata.x00080016;
  const referencedSOPInstanceUID = metadata.instanceUID || metadata.x00080018;

  const presentationSeriesUID = generateUID();
  const presentationInstanceUID = generateUID();

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");

  const referencedSeriesSequence = [
    {
      SeriesInstanceUID: seriesUID,
      ReferencedInstanceSequence: [
        {
          ReferencedSOPClassUID: referencedSOPClassUID,
          ReferencedSOPInstanceUID: referencedSOPInstanceUID
        }
      ]
    }
  ];

  //  VOI LUT (Window / Level)
  const softcopyVOILUTSequence = buildVOILUTSequence(
    context,
    referencedSOPClassUID!,
    referencedSOPInstanceUID!
  );

  // Displayed Area (zoom / pan)
  const displayedAreaSelectionSequence = buildDisplayedAreaSequence(
    context,
    referencedSOPClassUID!,
    referencedSOPInstanceUID!
  );

  //  Spatial Transformation (rotation + flip)
  const spatialTransformationSequence = buildSpatialTransformationSequence(
    viewport as _cornerstone.StackViewport
  );

  //  Graphic Layer
  const globalStyle = getLarvitarStyle();
  const defaultColor =
    annotations.length > 0
      ? getAnnotationStyle(annotations[0]).color
      : globalStyle?.color || "#02FAE5";

  const graphicLayerSequence = [
    {
      GraphicLayer: "DRAWING",
      GraphicLayerOrder: 1,
      GraphicLayerRecommendedDisplayCIELabValue:
        convertHexToCIELab(defaultColor),
      GraphicLayerDescription: "Larvitar Annotations"
    }
  ];

  const graphicAnnotationSequence = buildGraphicAnnotationSequence(
    context,
    annotations,
    referencedSOPClassUID!,
    referencedSOPInstanceUID!
  );

  return {
    // Patient / Study
    PatientName: patientName,
    PatientID: patientID,
    PatientBirthDate: patientBirthDate,
    PatientSex: patientSex,
    StudyInstanceUID: studyUID,
    StudyDate: studyDate,
    StudyTime: studyTime,
    AccessionNumber: accessionNumber,

    // PR module
    Modality: "PR",
    SOPClassUID: "1.2.840.10008.5.1.4.1.1.11.1",
    SOPInstanceUID: presentationInstanceUID,
    SeriesInstanceUID: presentationSeriesUID,
    InstanceNumber: 1,
    SeriesNumber: 999,
    SeriesDescription: "Presentation State",
    Manufacturer: "Larvitar/DvisionLab",
    ContentLabel: "ANNOTATION_PR",
    ContentDescription: "Larvitar Annotation State",
    ContentCreatorName: "Larvitar User",
    PresentationCreationDate: dateStr,
    PresentationCreationTime: timeStr,
    PresentationLUTShape: "IDENTITY",

    // Sequences
    ReferencedSeriesSequence: referencedSeriesSequence,
    SoftcopyVOILUTSequence: softcopyVOILUTSequence,
    DisplayedAreaSelectionSequence: displayedAreaSelectionSequence,
    SpatialTransformationSequence: spatialTransformationSequence,
    GraphicLayerSequence: graphicLayerSequence,
    GraphicAnnotationSequence: graphicAnnotationSequence
  };
}

// VOI LUT
function buildVOILUTSequence(
  context: PresentationContext,
  sopClassUID: string,
  sopInstanceUID: string
): any[] {
  const { viewport } = context;

  const voiRange = (viewport as _cornerstone.StackViewport).getProperties()
    .voiRange;

  let windowCenter: number;
  let windowWidth: number;

  if (voiRange) {
    const wl = _cornerstone.utilities.windowLevel.toWindowLevel(
      voiRange.lower,
      voiRange.upper
    );
    windowCenter = wl.windowCenter;
    windowWidth = wl.windowWidth;
  } else {
    windowCenter = 40;
    windowWidth = 400;
  }

  return [
    {
      ReferencedImageSequence: [
        {
          ReferencedSOPClassUID: sopClassUID,
          ReferencedSOPInstanceUID: sopInstanceUID
        }
      ],
      WindowCenter: windowCenter,
      WindowWidth: windowWidth,
      VOILUTFunction: "LINEAR"
    }
  ];
}

// DISPLAYED AREA  (zoom / pan)
function buildDisplayedAreaSequence(
  context: PresentationContext,
  sopClassUID: string,
  sopInstanceUID: string
): any[] {
  const { viewport, imageId, canvas, metadata } = context;
  const sv = viewport as _cornerstone.StackViewport;

  const topLeftWorld = sv.canvasToWorld([0, 0]);
  const bottomRightWorld = sv.canvasToWorld([canvas.width, canvas.height]);

  const tlImg = _cornerstone.utilities.worldToImageCoords(
    imageId,
    topLeftWorld
  )!;
  const brImg = _cornerstone.utilities.worldToImageCoords(
    imageId,
    bottomRightWorld
  )!;

  const tlhc = [
    Math.max(1, Math.round(tlImg[0]) + 1),
    Math.max(1, Math.round(tlImg[1]) + 1)
  ];
  const brhc = [
    Math.max(1, Math.round(brImg[0]) + 1),
    Math.max(1, Math.round(brImg[1]) + 1)
  ];

  const camera = sv.getCamera();
  const pixelSpacing = metadata.pixelSpacing || [1.0, 1.0];

  const pxPerWorldUnit = canvas.height / 2 / camera.parallelScale!;
  const worldUnitsPerImagePixel = pixelSpacing[0]; // mm per pixel
  const magnification = pxPerWorldUnit * worldUnitsPerImagePixel;

  return [
    {
      ReferencedImageSequence: [
        {
          ReferencedSOPClassUID: sopClassUID,
          ReferencedSOPInstanceUID: sopInstanceUID
        }
      ],
      DisplayedAreaTopLeftHandCorner: tlhc,
      DisplayedAreaBottomRightHandCorner: brhc,
      PresentationSizeMode: "SCALE TO FIT",
      PresentationPixelMagnificationRatio: parseFloat(magnification.toFixed(6)),
      PresentationPixelAspectRatio: [1, 1],
      PresentationPixelSpacing: pixelSpacing
    }
  ];
}

// SPATIAL TRANSFORMATION (rotation / flip)
function buildSpatialTransformationSequence(
  viewport: _cornerstone.StackViewport
): any[] {
  const properties = viewport.getProperties();

  const rawRotation = (properties as any).rotation ?? 0;
  const rotation = (((Math.round(rawRotation / 90) * 90) % 360) + 360) % 360;

  const flipHorizontal = (properties as any).flipHorizontal ?? false;
  const flipVertical = (properties as any).flipVertical ?? false;

  let dicomRotation = rotation;
  let dicomFlip = "N";

  if (flipHorizontal && !flipVertical) {
    dicomFlip = "Y";
  } else if (!flipHorizontal && flipVertical) {
    dicomFlip = "Y";
    dicomRotation = (dicomRotation + 180) % 360;
  } else if (flipHorizontal && flipVertical) {
    dicomRotation = (dicomRotation + 180) % 360;
    dicomFlip = "N";
  }

  return [
    {
      ImageRotation: dicomRotation,
      ImageHorizontalFlip: dicomFlip
    }
  ];
}

// GRAPHIC ANNOTATION SEQUENCE
function buildGraphicAnnotationSequence(
  context: PresentationContext,
  annotations: any[],
  sopClassUID: string,
  sopInstanceUID: string
): any[] {
  if (!annotations || annotations.length === 0) return [];

  const layerItem: any = {
    GraphicLayer: "DRAWING",
    ReferencedImageSequence: [
      {
        ReferencedSOPClassUID: sopClassUID,
        ReferencedSOPInstanceUID: sopInstanceUID
      }
    ],
    GraphicObjectSequence: [] as any[],
    TextObjectSequence: [] as any[],
    CompoundGraphicSequence: [] as any[]
  };

  for (const annotation of annotations) {
    const style = getAnnotationStyle(annotation);
    const toolName: string = annotation.metadata?.toolName ?? "";

    if (toolName === "ArrowAnnotate") {
      const compound = createArrowCompound(context, annotation, style);
      if (compound) layerItem.CompoundGraphicSequence.push(compound);
    } else {
      const graphicObj = createGraphicObject(context, annotation, style);
      if (graphicObj) layerItem.GraphicObjectSequence.push(graphicObj);
    }

    const textObj = createTextObject(context, annotation, style);
    if (textObj) layerItem.TextObjectSequence.push(textObj);
  }

  return [layerItem];
}

// GRAPHIC OBJECT
function createGraphicObject(
  context: PresentationContext,
  annotation: any,
  style: any
): any | null {
  const toolName: string = annotation.metadata?.toolName ?? "";
  switch (toolName) {
    case "Length":
    case "Probe":
      return createPolylineGraphic(context, annotation, style);
    case "Angle":
      return createAngleGraphic(context, annotation, style);

    case "CobbAngle":
      return createCobbAngleGraphics(context, annotation, style);

    case "Bidirectional":
      return createBidirectionalGraphics(context, annotation, style);

    case "RectangleROI":
      return createRectangleGraphic(context, annotation, style);

    case "EllipticalROI":
      return createEllipseGraphic(context, annotation, style);

    case "PlanarFreehandROI":
    case "FreehandROI":
      return createFreehandGraphic(context, annotation, style);

    default:
      if (annotation.data?.handles?.points?.length >= 2) {
        return createPolylineGraphic(context, annotation, style);
      }
      return null;
  }
}

function worldPointsToImagePixels(
  imageId: string,
  worldPoints: Types.Point3[]
): number[] | null {
  const imagePoints = worldPoints.map(wp =>
    _cornerstone.utilities.worldToImageCoords(imageId, wp)
  );
  if (imagePoints.some(p => p == null)) return null;
  return (imagePoints as [number, number][]).flatMap(p => [p[0], p[1]]);
}

function baseLineStyle(style: any): any {
  return {
    LineThickness: parseFloat(style.lineWidth) || 1,
    LineDashingStyle:
      style.lineDash && style.lineDash !== "" ? "DASHED" : "SOLID",
    PatternOnColorCIELabValue: convertHexToCIELab(style.color)
  };
}

//  POLYLINE (Length, Probe)
function createPolylineGraphic(
  context: PresentationContext,
  annotation: any,
  style: any
): any | null {
  const worldPoints: Types.Point3[] = annotation.data?.handles?.points;
  if (!worldPoints?.length) return null;

  const graphicData = worldPointsToImagePixels(context.imageId, worldPoints);
  if (!graphicData) return null;

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "POLYLINE",
    NumberOfGraphicPoints: worldPoints.length,
    GraphicData: graphicData,
    GraphicFilled: "N",
    LineStyleSequence: [baseLineStyle(style)]
  };
}

// ARROW
function createArrowCompound(
  context: PresentationContext,
  annotation: any,
  style: any
): any | null {
  const worldPoints: Types.Point3[] = annotation.data?.handles?.points;
  if (!worldPoints || worldPoints.length < 2) return null;

  const graphicData = worldPointsToImagePixels(context.imageId, [
    worldPoints[1],
    worldPoints[0]
  ]);
  if (!graphicData) return null;

  return {
    CompoundGraphicType: "ARROW",
    CompoundGraphicUnits: "PIXEL",
    GraphicData: graphicData,
    GraphicDimensions: 2,
    NumberOfGraphicPoints: 2,
    GraphicFilled: "N",
    LineStyleSequence: [baseLineStyle(style)]
  };
}

//  ANGLE
function createAngleGraphic(
  context: PresentationContext,
  annotation: any,
  style: any
): any | null {
  const worldPoints: Types.Point3[] = annotation.data?.handles?.points;
  if (!worldPoints || worldPoints.length < 3) return null;

  const pts = worldPoints.slice(0, 3);
  const graphicData = worldPointsToImagePixels(context.imageId, pts);
  if (!graphicData) return null;

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "POLYLINE",
    NumberOfGraphicPoints: 3,
    GraphicData: graphicData,
    GraphicFilled: "N",
    LineStyleSequence: [baseLineStyle(style)]
  };
}

// COBB ANGLE
function createCobbAngleGraphics(
  context: PresentationContext,
  annotation: any,
  style: any
): any[] {
  const worldPoints: Types.Point3[] = annotation.data?.handles?.points;
  if (!worldPoints || worldPoints.length < 4) return [];

  const line1 = worldPointsToImagePixels(context.imageId, [
    worldPoints[0],
    worldPoints[1]
  ]);
  const line2 = worldPointsToImagePixels(context.imageId, [
    worldPoints[2],
    worldPoints[3]
  ]);

  const result = [];
  if (line1)
    result.push({
      GraphicAnnotationUnits: "PIXEL",
      GraphicDimensions: 2,
      GraphicType: "POLYLINE",
      NumberOfGraphicPoints: 2,
      GraphicData: line1,
      GraphicFilled: "N",
      LineStyleSequence: [baseLineStyle(style)]
    });
  if (line2)
    result.push({
      GraphicAnnotationUnits: "PIXEL",
      GraphicDimensions: 2,
      GraphicType: "POLYLINE",
      NumberOfGraphicPoints: 2,
      GraphicData: line2,
      GraphicFilled: "N",
      LineStyleSequence: [baseLineStyle(style)]
    });
  return result;
}

//  BIDIRECTIONAL
function createBidirectionalGraphics(
  context: PresentationContext,
  annotation: any,
  style: any
): any[] {
  const worldPoints: Types.Point3[] = annotation.data?.handles?.points;
  if (!worldPoints || worldPoints.length < 4) return [];

  const longAxis = worldPointsToImagePixels(context.imageId, [
    worldPoints[0],
    worldPoints[1]
  ]);
  const shortAxis = worldPointsToImagePixels(context.imageId, [
    worldPoints[2],
    worldPoints[3]
  ]);

  const result = [];
  if (longAxis)
    result.push({
      GraphicAnnotationUnits: "PIXEL",
      GraphicDimensions: 2,
      GraphicType: "POLYLINE",
      NumberOfGraphicPoints: 2,
      GraphicData: longAxis,
      GraphicFilled: "N",
      LineStyleSequence: [baseLineStyle(style)]
    });
  if (shortAxis)
    result.push({
      GraphicAnnotationUnits: "PIXEL",
      GraphicDimensions: 2,
      GraphicType: "POLYLINE",
      NumberOfGraphicPoints: 2,
      GraphicData: shortAxis,
      GraphicFilled: "N",
      LineStyleSequence: [baseLineStyle(style)]
    });
  return result;
}

//  RECTANGLE ROI
function createRectangleGraphic(
  context: PresentationContext,
  annotation: any,
  style: any
): any | null {
  const worldPoints: Types.Point3[] = annotation.data?.handles?.points;
  if (!worldPoints || worldPoints.length < 2) return null;

  const { imageId } = context;

  const p1 = _cornerstone.utilities.worldToImageCoords(imageId, worldPoints[0]);
  const p2 = _cornerstone.utilities.worldToImageCoords(
    imageId,
    worldPoints[worldPoints.length - 1]
  );
  if (!p1 || !p2) return null;

  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  const graphicData = [
    minX,
    minY,
    maxX,
    minY,
    maxX,
    maxY,
    minX,
    maxY,
    minX,
    minY
  ];

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "POLYLINE",
    NumberOfGraphicPoints: 5,
    GraphicData: graphicData,
    GraphicFilled: style.fillOpacity && style.fillOpacity > 0 ? "Y" : "N",
    LineStyleSequence: [baseLineStyle(style)]
  };
}

//  ELLIPTICAL ROI
function createEllipseGraphic(
  context: PresentationContext,
  annotation: any,
  style: any
): any | null {
  const worldPoints: Types.Point3[] = annotation.data?.handles?.points;
  if (!worldPoints || worldPoints.length < 4) return null;

  const { imageId } = context;

  const top = _cornerstone.utilities.worldToImageCoords(
    imageId,
    worldPoints[0]
  );
  const bottom = _cornerstone.utilities.worldToImageCoords(
    imageId,
    worldPoints[1]
  );
  const left = _cornerstone.utilities.worldToImageCoords(
    imageId,
    worldPoints[2]
  );
  const right = _cornerstone.utilities.worldToImageCoords(
    imageId,
    worldPoints[3]
  );

  if (!top || !bottom || !left || !right) return null;

  const graphicData = [
    left[0],
    left[1],
    right[0],
    right[1],
    top[0],
    top[1],
    bottom[0],
    bottom[1]
  ];

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "ELLIPSE",
    NumberOfGraphicPoints: 4,
    GraphicData: graphicData,
    GraphicFilled: style.fillOpacity && style.fillOpacity > 0 ? "Y" : "N",
    LineStyleSequence: [baseLineStyle(style)]
  };
}

//  CIRCLE ROI
function createCircleGraphic(
  context: PresentationContext,
  annotation: any,
  style: any
): any | null {
  const worldPoints: Types.Point3[] = annotation.data?.handles?.points;
  if (!worldPoints || worldPoints.length < 2) return null;

  const { imageId } = context;
  const center = _cornerstone.utilities.worldToImageCoords(
    imageId,
    worldPoints[0]
  );
  const edgePt = _cornerstone.utilities.worldToImageCoords(
    imageId,
    worldPoints[1]
  );
  if (!center || !edgePt) return null;

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "CIRCLE",
    NumberOfGraphicPoints: 2,
    GraphicData: [center[0], center[1], edgePt[0], edgePt[1]],
    GraphicFilled: style.fillOpacity && style.fillOpacity > 0 ? "Y" : "N",
    LineStyleSequence: [baseLineStyle(style)]
  };
}

//  FREEHAND ROI
function createFreehandGraphic(
  context: PresentationContext,
  annotation: any,
  style: any
): any | null {
  const rawPoints: Types.Point3[] =
    annotation.data?.polyline ?? annotation.data?.handles?.points;

  if (!rawPoints?.length) return null;

  const graphicData = worldPointsToImagePixels(context.imageId, rawPoints);
  if (!graphicData) return null;

  const isClosed = annotation.data?.isOpenUShapeContour === false;
  const nPoints = rawPoints.length;

  const finalData = isClosed
    ? [...graphicData, graphicData[0], graphicData[1]]
    : graphicData;
  const finalCount = isClosed ? nPoints + 1 : nPoints;

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "POLYLINE",
    NumberOfGraphicPoints: finalCount,
    GraphicData: finalData,
    GraphicFilled: isClosed && style.fillOpacity > 0 ? "Y" : "N",
    LineStyleSequence: [baseLineStyle(style)]
  };
}

// TEXT OBJECT
function createTextObject(
  context: PresentationContext,
  annotation: any,
  style: any
): any | null {
  const { imageId } = context;
  const toolName: string = annotation.metadata?.toolName ?? "";
  const worldPoints: Types.Point3[] = annotation.data?.handles?.points;
  if (!worldPoints?.length) return null;

  const textBoxWorld =
    annotation.data?.handles?.textBox?.worldPosition ??
    worldPoints[worldPoints.length - 1];
  console.log(toolName);
  const anchorWorldPoint =
    toolName === "ArrowAnnotate"
      ? worldPoints[0]
      : worldPoints[worldPoints.length - 1];

  const anchor = _cornerstone.utilities.worldToImageCoords(
    imageId,
    anchorWorldPoint
  );
  const textBoxAnchor = _cornerstone.utilities.worldToImageCoords(
    imageId,
    textBoxWorld
  );

  if (!anchor || !textBoxAnchor) return null;

  const textContent = getAnnotationText(annotation, imageId);
  if (!textContent || textContent === "N/A") return null;

  const offsetX = 5;
  const offsetY = 5;
  const boxWidth = 120;
  const boxHeight = 24;

  const tlhc = [
    textBoxAnchor[0] + offsetX,
    textBoxAnchor[1] - offsetY - boxHeight
  ];
  const brhc = [
    textBoxAnchor[0] + offsetX + boxWidth,
    textBoxAnchor[1] - offsetY
  ];

  const textColor = style.textBoxColor || style.color || "#02FAE5";

  return {
    UnformattedTextValue: textContent,
    BoundingBoxAnnotationUnits: "PIXEL",
    AnchorPointAnnotationUnits: "PIXEL",
    BoundingBoxTopLeftHandCorner: tlhc,
    BoundingBoxBottomRightHandCorner: brhc,
    AnchorPoint: [anchor[0], anchor[1]],
    AnchorPointVisibility: "Y",
    TextStyleSequence: [
      {
        FontName: style.textBoxFontFamily || "Arial",
        CSSFontName: style.textBoxFontFamily || "Arial",
        TextColorCIELabValue: convertHexToCIELab(textColor),
        HorizontalAlignment: "LEFT",
        VerticalAlignment: "TOP"
      }
    ],
    LineStyleSequence: [
      {
        LineThickness: 1,
        LineDashingStyle: "DASHED",
        PatternOnColorCIELabValue: convertHexToCIELab(style.color)
      }
    ]
  };
}

// TEXT CONTENT
function getAnnotationText(annotation: any, imageId: string): string {
  const toolName: string = annotation.metadata?.toolName ?? "";
  const cachedStats = annotation.data?.cachedStats ?? {};
  const statsKey = `imageId:${imageId}`;
  const stats = cachedStats[statsKey] ?? {};

  switch (toolName) {
    case "Length":
      return stats.length !== undefined
        ? `${stats.length.toFixed(2)} ${stats.unit || "mm"}`
        : "N/A";

    case "Probe":
      return stats.value !== undefined
        ? `HU: ${stats.value.toFixed(2)}`
        : "N/A";

    case "Angle":
      return stats.angle !== undefined ? `${stats.angle.toFixed(1)}°` : "N/A";

    case "CobbAngle":
      return stats.angle !== undefined
        ? `Cobb: ${stats.angle.toFixed(1)}°`
        : "N/A";

    case "RectangleROI":
    case "EllipticalROI":
    case "CircleROI": {
      const parts: string[] = [];
      if (stats.area !== undefined)
        parts.push(`Area: ${stats.area.toFixed(2)} ${stats.areaUnit || "mm²"}`);
      if (stats.mean !== undefined)
        parts.push(`Mean: ${stats.mean.toFixed(2)}`);
      if (stats.stdDev !== undefined)
        parts.push(`SD: ${stats.stdDev.toFixed(2)}`);
      if (stats.max !== undefined) parts.push(`Max: ${stats.max.toFixed(2)}`);
      if (stats.min !== undefined) parts.push(`Min: ${stats.min.toFixed(2)}`);
      return parts.length ? parts.join(" | ") : "N/A";
    }

    case "Bidirectional":
      return stats.length !== undefined && stats.width !== undefined
        ? `${stats.length.toFixed(2)} × ${stats.width.toFixed(2)} ${stats.unit || "mm"}`
        : "N/A";

    case "ArrowAnnotate":
      return annotation.data.label || "";

    case "PlanarFreehandROI":
    case "Freehand":
      return stats.area !== undefined
        ? `Area: ${stats.area.toFixed(2)} ${stats.areaUnit || "mm²"}`
        : "N/A";

    default:
      if (stats.length !== undefined)
        return `${stats.length.toFixed(2)} ${stats.unit || "mm"}`;
      return "N/A";
  }
}

// STYLE
function getAnnotationStyle(annotation: any) {
  const defaultStyle = getLarvitarStyle() ?? {};
  const fallback = {
    color: "#02FAE5",
    lineWidth: "1",
    lineDash: "",
    fillOpacity: 0,
    textBoxFontFamily: "Arial",
    textBoxFontSize: "14",
    textBoxColor: "#02FAE5",
    textBoxLinkLineWidth: "1",
    textBoxLinkLineDash: "2,3"
  };

  if (annotation.data?.style) {
    return { ...fallback, ...defaultStyle, ...annotation.data.style };
  }

  const toolName = annotation.metadata?.toolName;
  if (toolName) {
    try {
      const toolStyle =
        _cornerstoneTools.annotation.config.style.getStyleProperty(
          toolName,
          {}
        );
      if (toolStyle && Object.keys(toolStyle).length > 0) {
        return { ...fallback, ...defaultStyle, ...toolStyle };
      }
    } catch {}
  }

  return { ...fallback, ...defaultStyle };
}

function getLarvitarStyle() {
  try {
    return _cornerstoneTools.annotation.config.style.config.default.global;
  } catch {
    return null;
  }
}

// UTILITIES

function generateUID(): string {
  const root = "1.2.826.0.1.3680043.9.5830";
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${root}.${timestamp}.${random}`;
}
