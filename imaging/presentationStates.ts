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
 * Main entry point to create a DICOM Presentation State Blob.
 * Orchestrates the data gathering, dataset construction, and binary writing.
 */
export function createPresentationStateBlob(elementId: string): Blob {
  const element = document.getElementById(elementId) as HTMLElement;
  const enabledElement = _cornerstone.getEnabledElementByIds("viewer", "2d");
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

  const annotationManager = _cornerstoneTools.annotation.state;

  const frameOfReferenceUID = viewport.getFrameOfReferenceUID();
  const allAnnotations = annotationManager.getAllAnnotations() || [];

  const filteredAnnotations = allAnnotations.filter(annotation => {
    return annotation.metadata?.FrameOfReferenceUID === frameOfReferenceUID;
  });

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

  let referencedSOPClassUID = metadata.sopClassUID || metadata.x00080016;
  let referencedSOPInstanceUID = metadata.instanceUID || metadata.x00080018;

  const patientStudyModule = {
    PatientName: patientName,
    PatientID: patientID,
    PatientBirthDate: patientBirthDate,
    PatientSex: patientSex,
    StudyInstanceUID: studyUID,
    StudyDate: studyDate,
    StudyTime: studyTime,
    AccessionNumber: accessionNumber
  };

  const presentationSeriesUID = generateUID();
  const presentationInstanceUID = generateUID();

  const generalPRModule = {
    Modality: "PR",
    SeriesInstanceUID: presentationSeriesUID,
    SOPInstanceUID: presentationInstanceUID,
    SOPClassUID: "1.2.840.10008.5.1.4.1.1.11.1",
    InstanceNumber: 1,
    SeriesNumber: 999,
    SeriesDescription: "Presentation State",
    Manufacturer: "Larvitar/DvisionLab",
    ContentLabel: "ANNOTATION_PR",
    ContentDescription: "Larvitar Annotation State - All Tools",
    ContentCreatorName: "Larvitar User",
    PresentationCreationDate: new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, ""),
    PresentationCreationTime: new Date()
      .toTimeString()
      .slice(0, 8)
      .replace(/:/g, "")
  };

  // 3. Referenced Series Sequence
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

  const { windowWidth, windowCenter } = getWindowLevel(viewport);
  const { tlhc, brhc } = getDisplayedArea(context);
  const { rotation, flip } = getCameraSettings(viewport);

  const softcopyVOILUTSequence = [
    {
      ReferencedImageSequence: [
        {
          ReferencedSOPClassUID: referencedSOPClassUID,
          ReferencedSOPInstanceUID: referencedSOPInstanceUID
        }
      ],
      WindowCenter: windowCenter,
      WindowWidth: windowWidth,
      VOILUTFunction: "LINEAR"
    }
  ];

  const displayedAreaSelectionSequence = [
    {
      ReferencedImageSequence: [
        {
          ReferencedSOPClassUID: referencedSOPClassUID,
          ReferencedSOPInstanceUID: referencedSOPInstanceUID
        }
      ],
      DisplayedAreaTopLeftHandCorner: tlhc,
      DisplayedAreaBottomRightHandCorner: brhc,
      PresentationSizeMode: "SCALE TO FIT",
      PresentationPixelAspectRatio: [1, 1],
      PresentationPixelSpacing: metadata.pixelSpacing || [1.0, 1.0]
    }
  ];

  const spatialTransformationSequence = [
    {
      ImageRotation: rotation,
      ImageHorizontalFlip: flip
    }
  ];

  const graphicAnnotationSequence = buildGraphicAnnotationSequence(
    context,
    annotations,
    referencedSOPClassUID!,
    referencedSOPInstanceUID!
  );

  const defaultColor = annotations[0]
    ? getAnnotationStyle(annotations[0]).color
    : "#00FF00";
  console.log(defaultColor);
  const graphicLayerSequence = [
    {
      GraphicLayer: "DRAWING",
      GraphicLayerOrder: 1,
      GraphicLayerRecommendedDisplayCIELabValue:
        convertHexToCIELab(defaultColor),
      GraphicLayerDescription: "Larvitar Annotations"
    }
  ];

  return {
    ...patientStudyModule,
    ...generalPRModule,
    ReferencedSeriesSequence: referencedSeriesSequence,
    PresentationLUTShape: "IDENTITY",
    SoftcopyVOILUTSequence: softcopyVOILUTSequence,
    DisplayedAreaSelectionSequence: displayedAreaSelectionSequence,
    SpatialTransformationSequence: spatialTransformationSequence,
    ContentLabel: "ANNOTATION_PR",
    GraphicLayerSequence: graphicLayerSequence,
    GraphicAnnotationSequence: graphicAnnotationSequence
  };
}

/**
 * Defines the Graphic Layer.
 * Corresponds to DICOM tag (0070,0060).
 * This provides the "Order" (0070,0062) that the reader looks for.
 */
function buildGraphicLayerSequence(annotations: any[]): any[] {
  const globalStyle = getLarvitarStyle();

  const layers = [
    {
      GraphicLayer: "DRAWING",
      GraphicLayerOrder: 1,
      GraphicLayerRecommendedDisplayCIELabValue: convertHexToCIELab(
        globalStyle!.color as string
      ),
      GraphicLayerDescription: "Cornerstone Annotations - All Tools"
    }
  ];

  const toolTypes = new Set(
    annotations.map(a => a.metadata?.toolName).filter(Boolean)
  );

  if (toolTypes.size > 1) {
    // TODO: Could add additional layers here for better organization
    // For example: MEASUREMENTS, ANNOTATIONS, DRAWINGS, etc.
  }

  return layers;
}

/**
 * Builds the Sequence containing the actual drawings.
 * Corresponds to DICOM tag (0070,0001).
 */
function buildGraphicAnnotationSequence(
  context: PresentationContext,
  annotations: any[],
  referencedSOPClassUID: string,
  referencedSOPInstanceUID: string
): any[] {
  if (!annotations || annotations.length === 0) {
    return [];
  }

  const layerItem = {
    GraphicLayer: "DRAWING",
    ReferencedImageSequence: [
      {
        ReferencedSOPClassUID: referencedSOPClassUID,
        ReferencedSOPInstanceUID: referencedSOPInstanceUID
      }
    ],
    GraphicObjectSequence: [] as any[],
    TextObjectSequence: [] as any[]
  };

  annotations.forEach(annotation => {
    const annotationStyle = getAnnotationStyle(annotation);

    const graphicObj = createGraphicObject(
      context,
      annotation,
      annotationStyle
    );

    if (graphicObj) {
      graphicObj.GraphicAnnotationUnits = "PIXEL";
      layerItem.GraphicObjectSequence.push(graphicObj);
    }

    const textObj = createTextObject(context, annotation, annotationStyle);
    if (textObj) {
      layerItem.TextObjectSequence.push(textObj);
    }
  });

  return [layerItem];
}
/**
 * Get annotation-specific style, falling back to tool-specific or global style
 * Handles Cornerstone Tools 3D style structure properly
 */
function getAnnotationStyle(annotation: any) {
  const defaultStyle = getLarvitarStyle();

  if (annotation.data?.style) {
    return { ...defaultStyle, ...annotation.data.style };
  }

  const toolName = annotation.metadata?.toolName;
  if (toolName) {
    try {
      const toolConfig = _cornerstoneTools.annotation.config.style;

      if (toolConfig && typeof toolConfig.getStyleProperty === "function") {
        const toolStyle = toolConfig.getStyleProperty(toolName, {});
        if (toolStyle && Object.keys(toolStyle).length > 0) {
          return { ...defaultStyle, ...toolStyle };
        }
      }
    } catch (e) {
      console.warn(`Could not get style for tool ${toolName}:`, e);
    }
  }

  return {
    color: defaultStyle?.color || "#00FF00",
    lineWidth: defaultStyle?.lineWidth || "1",
    lineDash: defaultStyle?.lineDash || "",
    fillOpacity: defaultStyle?.fillOpacity || 0,
    textBoxFontFamily: defaultStyle?.textBoxFontFamily || "Arial",
    textBoxFontSize: defaultStyle?.textBoxFontSize || "14",
    textBoxColor:
      defaultStyle?.textBoxColor || defaultStyle?.color || "#00FF00",
    textBoxLinkLineWidth: defaultStyle?.textBoxLinkLineWidth || "1",
    textBoxLinkLineDash: defaultStyle?.textBoxLinkLineDash || "2,3"
  };
}

/**
 * Convert annotation to appropriate DICOM graphic type based on tool
 */
function createGraphicObject(
  context: PresentationContext,
  annotation: any,
  style: any
) {
  const { imageId } = context;
  const toolName = annotation.metadata?.toolName;

  if (toolName === "Length" || toolName === "Probe") {
    return createPolylineGraphic(context, annotation, style);
  } else if (toolName === "RectangleROI" || toolName === "EllipticalROI") {
    return createShapeGraphic(context, annotation, style, toolName);
  } else if (toolName === "Angle") {
    return createAngleGraphic(context, annotation, style);
  } else if (toolName === "Bidirectional") {
    return createBidirectionalGraphic(context, annotation, style);
  } else if (toolName === "CobbAngle") {
    return createCobbAngleGraphic(context, annotation, style);
  } else if (toolName === "ArrowAnnotate") {
    return createArrowGraphic(context, annotation, style);
  } else if (annotation.data.handles?.points) {
    return createPolylineGraphic(context, annotation, style);
  }

  return null;
}

function createPolylineGraphic(
  context: PresentationContext,
  annotation: any,
  style: any
) {
  const { imageId } = context;
  const worldPoints = annotation.data.handles?.points;
  if (!worldPoints) return null;

  const imagePoints = worldPoints.map((wp: Types.Point3) =>
    worldToImage(imageId, wp)
  );
  const graphicData = imagePoints.flatMap((p: Types.Point3) => [p[0], p[1]]);

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "POLYLINE",
    NumberOfGraphicPoints: imagePoints.length,
    GraphicData: graphicData,
    GraphicFilled: "N",
    LineStyleSequence: [
      {
        LineThickness: parseFloat(style.lineWidth) || 1,
        LineDashingStyle: style.lineDash ? "DASHED" : "SOLID",
        PatternOnColorCIELabValue: convertHexToCIELab(style.color)
      }
    ]
  };
}

function createShapeGraphic(
  context: PresentationContext,
  annotation: any,
  style: any,
  toolName: string
) {
  const { imageId } = context;
  const worldPoints = annotation.data.handles?.points;

  if (!worldPoints || worldPoints.length < 2) return null;

  const p1 = worldToImage(imageId, worldPoints[0]);
  const p2 = worldToImage(imageId, worldPoints[1]);

  if (!p1 || !p2) return null;

  let graphicType = "POLYLINE";
  let graphicData: number[] = [];

  if (toolName === "RectangleROI") {
    graphicType = "POLYLINE";
    graphicData = [
      p1[0],
      p1[1],
      p2[0],
      p1[1],
      p2[0],
      p2[1],
      p1[0],
      p2[1],
      p1[0],
      p1[1]
    ];
  } else if (toolName === "EllipticalROI") {
    graphicType = "ELLIPSE";
    const centerX = (p1[0] + p2[0]) / 2;
    const centerY = (p1[1] + p2[1]) / 2;
    const radiusX = Math.abs(p2[0] - p1[0]) / 2;
    const radiusY = Math.abs(p2[1] - p1[1]) / 2;

    graphicData = [
      centerX - radiusX,
      centerY - radiusY,
      centerX + radiusX,
      centerY - radiusY,
      centerX + radiusX,
      centerY + radiusY,
      centerX - radiusX,
      centerY + radiusY
    ];
  }

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: graphicType,
    NumberOfGraphicPoints: graphicData.length / 2,
    GraphicData: graphicData,
    GraphicFilled: style.fillOpacity && style.fillOpacity > 0 ? "Y" : "N",
    LineThickness: parseFloat(style.lineWidth as string) || 1,
    LineDashingStyle:
      style.lineDash && style.lineDash !== "" ? "DASHED" : "SOLID",
    GraphicLayerRecommendedDisplayCIELabValue: convertHexToCIELab(
      style.color as string
    )
  };
}

function createAngleGraphic(
  context: PresentationContext,
  annotation: any,
  style: any
) {
  const { imageId } = context;
  const worldPoints = annotation.data.handles?.points;

  if (!worldPoints || worldPoints.length < 3) return null;

  const imagePoints = worldPoints
    .slice(0, 3)
    .map((wp: Types.Point3) => worldToImage(imageId, wp))
    .filter((p: any) => p !== null);

  if (imagePoints.length < 3) return null;

  const graphicData = imagePoints.flatMap((p: number[]) => [p[0], p[1]]);

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "POLYLINE",
    NumberOfGraphicPoints: 3,
    GraphicData: graphicData,
    GraphicFilled: "N",
    LineThickness: parseFloat(style.lineWidth as string) || 1,
    LineDashingStyle:
      style.lineDash && style.lineDash !== "" ? "DASHED" : "SOLID",
    GraphicLayerRecommendedDisplayCIELabValue: convertHexToCIELab(
      style.color as string
    )
  };
}

function createBidirectionalGraphic(
  context: PresentationContext,
  annotation: any,
  style: any
) {
  const { imageId } = context;
  const worldPoints = annotation.data.handles?.points;

  if (!worldPoints || worldPoints.length < 4) return null;

  const imagePoints = worldPoints
    .map((wp: Types.Point3) => worldToImage(imageId, wp))
    .filter((p: any) => p !== null);

  if (imagePoints.length < 4) return null;

  const graphicData = imagePoints.flatMap((p: number[]) => [p[0], p[1]]);

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "POLYLINE",
    NumberOfGraphicPoints: imagePoints.length,
    GraphicData: graphicData,
    GraphicFilled: "N",
    LineThickness: parseFloat(style.lineWidth as string) || 1,
    LineDashingStyle:
      style.lineDash && style.lineDash !== "" ? "DASHED" : "SOLID",
    GraphicLayerRecommendedDisplayCIELabValue: convertHexToCIELab(
      style.color as string
    )
  };
}

function createCobbAngleGraphic(
  context: PresentationContext,
  annotation: any,
  style: any
) {
  const { imageId } = context;
  const worldPoints = annotation.data.handles?.points;

  if (!worldPoints || worldPoints.length < 4) return null;

  const imagePoints = worldPoints
    .map((wp: Types.Point3) => worldToImage(imageId, wp))
    .filter((p: any) => p !== null);

  if (imagePoints.length < 4) return null;

  const graphicData = imagePoints.flatMap((p: number[]) => [p[0], p[1]]);

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "POLYLINE",
    NumberOfGraphicPoints: imagePoints.length,
    GraphicData: graphicData,
    GraphicFilled: "N",
    LineThickness: parseFloat(style.lineWidth as string) || 1,
    LineDashingStyle:
      style.lineDash && style.lineDash !== "" ? "DASHED" : "SOLID",
    GraphicLayerRecommendedDisplayCIELabValue: convertHexToCIELab(
      style.color as string
    )
  };
}

function createArrowGraphic(
  context: PresentationContext,
  annotation: any,
  style: any
) {
  const { imageId } = context;
  const worldPoints = annotation.data.handles?.points;

  if (!worldPoints || worldPoints.length < 2) return null;

  const p1 = worldToImage(imageId, worldPoints[0]);
  const p2 = worldToImage(imageId, worldPoints[1]);

  if (!p1 || !p2) return null;

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "POLYLINE",
    NumberOfGraphicPoints: 2,
    GraphicData: [p1[0], p1[1], p2[0], p2[1]],
    GraphicFilled: "N",
    LineThickness: parseFloat(style.lineWidth as string) || 1,
    LineDashingStyle:
      style.lineDash && style.lineDash !== "" ? "DASHED" : "SOLID",
    GraphicLayerRecommendedDisplayCIELabValue: convertHexToCIELab(
      style.color as string
    )
  };
}
function createTextObject(
  context: PresentationContext,
  annotation: any,
  style: any
) {
  const { imageId } = context;
  const worldPoints = annotation.data.handles?.points;
  if (!worldPoints || worldPoints.length === 0) return null;

  const anchor = worldToImage(imageId, worldPoints[worldPoints.length - 1])!;
  const textContent = getAnnotationText(annotation, imageId);

  const offsetX = 30;
  const offsetY = 30;
  const boxWidth = 100;
  const boxHeight = 20;

  return {
    UnformattedTextValue: textContent,
    BoundingBoxAnnotationUnits: "PIXEL",
    AnchorPointAnnotationUnits: "PIXEL",

    BoundingBoxTopLeftHandCorner: [
      anchor[0] + offsetX,
      anchor[1] - offsetY - boxHeight
    ],
    BoundingBoxBottomRightHandCorner: [
      anchor[0] + offsetX + boxWidth,
      anchor[1] - offsetY
    ],

    AnchorPoint: [anchor[0], anchor[1]],
    AnchorPointVisibility: "Y",

    TextStyleSequence: [
      {
        FontName: style.textBoxFontFamily || "Arial",
        TextColorCIELabValue: convertHexToCIELab(
          style.textBoxColor || style.color
        ),
        HorizontalAlignment: "CENTER",
        VerticalAlignment: "CENTER"
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
/**
 * Extract text content from annotation based on tool type
 */
function getAnnotationText(annotation: any, imageId: string): string {
  const cachedStats = annotation.data.cachedStats || {};
  const statsKey = `imageId:${imageId}`;
  const toolName = annotation.metadata?.toolName;

  if (!cachedStats[statsKey]) return "N/A";

  const stats = cachedStats[statsKey];

  if (toolName === "Length" && stats.length !== undefined) {
    return `${stats.length.toFixed(2)} ${stats.unit || "mm"}`;
  } else if (toolName === "Angle" && stats.angle !== undefined) {
    return `${stats.angle.toFixed(1)}°`;
  } else if (toolName === "CobbAngle" && stats.angle !== undefined) {
    return `Cobb: ${stats.angle.toFixed(1)}°`;
  } else if (toolName === "RectangleROI" || toolName === "EllipticalROI") {
    if (stats.area !== undefined) {
      const areaText = `Area: ${stats.area.toFixed(2)} ${stats.areaUnit || "mm²"}`;
      const meanText =
        stats.mean !== undefined ? ` Mean: ${stats.mean.toFixed(2)}` : "";
      return areaText + meanText;
    }
  } else if (toolName === "Bidirectional") {
    if (stats.length && stats.width) {
      return `${stats.length.toFixed(2)} × ${stats.width.toFixed(2)} ${stats.unit || "mm"}`;
    }
  } else if (toolName === "Probe" && stats.value !== undefined) {
    return `${stats.value.toFixed(2)}`;
  } else if (toolName === "ArrowAnnotate" && annotation.data.text) {
    return annotation.data.text;
  }

  if (stats.length !== undefined) {
    return `${stats.length.toFixed(2)} ${stats.unit || "mm"}`;
  }

  return "N/A";
}

function createAnchorLine(
  context: PresentationContext,
  annotation: any,
  style: any
) {
  const { imageId } = context;
  const worldPoints = annotation.data.handles?.points;
  if (!worldPoints) return null;

  const p1 = worldToImage(imageId, worldPoints[worldPoints.length - 1])!;
  const p2 = [p1[0], p1[1]];

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "POLYLINE",
    NumberOfGraphicPoints: 2,
    GraphicData: [p1[0], p1[1], p1[0] + 10, p1[1] - 10],
    GraphicFilled: "N",
    LineStyleSequence: [
      {
        LineThickness: parseFloat(style.textBoxLinkLineWidth) || 1,
        LineDashingStyle: "DASHED",
        PatternOnColorCIELabValue: convertHexToCIELab(style.color) // x00700251
      }
    ]
  };
}

function worldToImage(imageId: string, worldPoint: Types.Point3) {
  return _cornerstone.utilities.worldToImageCoords(imageId, worldPoint);
}

function getWindowLevel(viewport: Types.IStackViewport) {
  const { lower, upper } = viewport.getProperties().voiRange!;
  return _cornerstone.utilities.windowLevel.toWindowLevel(lower, upper);
}

function getDisplayedArea(context: PresentationContext) {
  const { viewport, imageId, canvas } = context;

  const topLeftWorld = viewport.canvasToWorld([0, 0]);
  const bottomRightWorld = viewport.canvasToWorld([
    canvas.width,
    canvas.height
  ]);

  const topLeftImage = worldToImage(imageId, topLeftWorld)!;
  const bottomRightImage = worldToImage(imageId, bottomRightWorld)!;

  return {
    tlhc: [Math.floor(topLeftImage[0]) + 1, Math.floor(topLeftImage[1]) + 1],
    brhc: [
      Math.ceil(bottomRightImage[0]) + 1,
      Math.ceil(bottomRightImage[1]) + 1
    ]
  };
}

function getCameraSettings(viewport: Types.IStackViewport) {
  //TODO
  const camera = viewport.getCamera();

  return {
    rotation: 0,
    flip: "N"
  };
}

function getLarvitarStyle() {
  return _cornerstoneTools.annotation.config.style.config.default.global;
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);

  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

// Standard RGB → LAB conversion
function rgbToLab(r: number, g: number, b: number) {
  let [x, y, z] = rgbToXyz(r, g, b);

  x /= 95.047;
  y /= 100.0;
  z /= 108.883;

  x = pivot(x);
  y = pivot(y);
  z = pivot(z);

  return {
    L: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z)
  };
}

function pivot(n: number) {
  return n > 0.008856 ? Math.pow(n, 1 / 3) : 7.787 * n + 16 / 116;
}

function rgbToXyz(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  return [
    r * 100 * 0.4124 + g * 100 * 0.3576 + b * 100 * 0.1805,
    r * 100 * 0.2126 + g * 100 * 0.7152 + b * 100 * 0.0722,
    r * 100 * 0.0193 + g * 100 * 0.1192 + b * 100 * 0.9505
  ];
}

/**
 * Generate a DICOM UID using a simple timestamp-based approach
 */
function generateUID(): string {
  const root = "1.2.826.0.1.3680043.9.5830";
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${root}.${timestamp}.${random}`;
}
