import dcmjs from "dcmjs";
import { Types } from "@cornerstonejs/core";
import * as _cornerstone from "@cornerstonejs/core";
import * as _cornerstoneTools from "@cornerstonejs/tools";
import { getImageManager } from "../imaging/imageManagers";
import { convertHexToCIELab } from "../imaging/tools/custom/gspsUtils/genericDrawingUtils";
import type {
  PresentationContext,
  PresentationStateDataset,
  PresentationStateExport,
  PresentationStateDicomExport,
  PresentationStateMetadataExport,
  ReferencedSeriesItem,
  SoftcopyVOILUTItem,
  DisplayedAreaSelectionItem,
  SpatialTransformationItem,
  GraphicLayerItem,
  GraphicAnnotationItem,
  GraphicObjectItem,
  CompoundGraphicItem,
  TextObjectItem,
  LineStyleItem,
  ResolvedAnnotationStyle
} from "./types";
import { MetaData } from "../imaging/types";

/**
 * Exports the current viewport Presentation State either as a DICOM
 * binary blob or as a tag-map object.
 *
 * @function exportPresentationState
 * @param {string} elementId - The DOM element ID of the enabled Cornerstone viewport.
 * @param {string} renderingEngineId - The ID of the Cornerstone rendering engine.
 * @param {"dicom" | "metadata"} format - Export format.
 * @returns {PresentationStateExport} Discriminated union — narrow on `.format`.
 */
export function exportPresentationState(
  elementId: string,
  renderingEngineId: string,
  format: "dicom" | "metadata" = "dicom"
): PresentationStateExport {
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
  const filename = dataset.SOPInstanceUID + "_PR.dcm";

  if (format === "metadata") {
    const data = dcmjs.data.DicomMetaDictionary.denaturalizeDataset(
      dataset
    ) as MetaData;

    return {
      format,
      dataset,
      data
    } as PresentationStateMetadataExport;
  }

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

  return {
    format: "dicom",
    blob: new Blob([buffer], { type: "application/dicom" }),
    filename
  } satisfies PresentationStateDicomExport;
}

/**
 * Assembles the full naturalised DICOM Presentation State dataset from the
 * current viewport context and the set of filtered annotations.
 * @function buildPresentationDataset
 * @param {PresentationContext} context - Viewport context (viewport, imageId, metadata, canvas).
 * @param {any[]} annotations - Cornerstone Tools annotation objects pre-filtered
 *   to the current Frame of Reference.
 * @returns {PresentationStateDataset} Naturalised DICOM dataset
 */
function buildPresentationDataset(
  context: PresentationContext,
  annotations: any[]
): PresentationStateDataset {
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

  const referencedSeriesSequence: ReferencedSeriesItem[] = [
    {
      SeriesInstanceUID: seriesUID as string,
      ReferencedInstanceSequence: [
        {
          ReferencedSOPClassUID: referencedSOPClassUID as string,
          ReferencedSOPInstanceUID: referencedSOPInstanceUID as string
        }
      ]
    }
  ];

  const softcopyVOILUTSequence = buildVOILUTSequence(
    context,
    referencedSOPClassUID as string,
    referencedSOPInstanceUID as string
  );

  const displayedAreaSelectionSequence = buildDisplayedAreaSequence(
    context,
    referencedSOPClassUID as string,
    referencedSOPInstanceUID as string
  );

  const spatialTransformationSequence = buildSpatialTransformationSequence(
    viewport as _cornerstone.StackViewport
  );

  const globalStyle = getLarvitarStyle();
  const defaultColor =
    annotations.length > 0
      ? getAnnotationStyle(annotations[0]).color
      : globalStyle?.color || "#02FAE5";

  const graphicLayerSequence: GraphicLayerItem[] = [
    {
      GraphicLayer: "DRAWING",
      GraphicLayerOrder: 1,
      GraphicLayerRecommendedDisplayCIELabValue: convertHexToCIELab(
        defaultColor as string
      ),
      GraphicLayerDescription: "Larvitar Annotations"
    }
  ];

  const graphicAnnotationSequence = buildGraphicAnnotationSequence(
    context,
    annotations,
    referencedSOPClassUID as string,
    referencedSOPInstanceUID as string
  );

  return {
    PatientName: patientName as string,
    PatientID: patientID as string,
    PatientBirthDate: patientBirthDate as string,
    PatientSex: patientSex as string,
    StudyInstanceUID: studyUID as string,
    StudyDate: studyDate as string,
    StudyTime: studyTime as string,
    AccessionNumber: accessionNumber as string,

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

    ReferencedSeriesSequence: referencedSeriesSequence,
    SoftcopyVOILUTSequence: softcopyVOILUTSequence,
    DisplayedAreaSelectionSequence: displayedAreaSelectionSequence,
    SpatialTransformationSequence: spatialTransformationSequence,
    GraphicLayerSequence: graphicLayerSequence,
    GraphicAnnotationSequence: graphicAnnotationSequence
  };
}

/**
 * Builds the Softcopy VOI LUT Sequence (0028,3110) from the viewport's
 * current VOI range or falls back to sensible CT defaults (WC 40 / WW 400).
 *
 * @function buildVOILUTSequence
 * @param {PresentationContext} context - Viewport context.
 * @param {string} sopClassUID - Referenced SOP Class UID of the source image.
 * @param {string} sopInstanceUID - Referenced SOP Instance UID of the source image.
 * @returns {SoftcopyVOILUTItem[]} Array with a single VOI LUT sequence item.
 */
function buildVOILUTSequence(
  context: PresentationContext,
  sopClassUID: string,
  sopInstanceUID: string
): SoftcopyVOILUTItem[] {
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

/**
 * Builds the Displayed Area Selection Sequence (0070,005A) by mapping the
 * current viewport canvas corners to image-pixel coordinates and computing
 * the effective magnification ratio from the camera's parallel scale.
 *
 * @function buildDisplayedAreaSequence
 * @param {PresentationContext} context - Viewport context.
 * @param {string} sopClassUID - Referenced SOP Class UID of the source image.
 * @param {string} sopInstanceUID - Referenced SOP Instance UID of the source image.
 * @returns {DisplayedAreaSelectionItem[]} Array with a single displayed-area item.
 */
function buildDisplayedAreaSequence(
  context: PresentationContext,
  sopClassUID: string,
  sopInstanceUID: string
): DisplayedAreaSelectionItem[] {
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

  const tlhc: [number, number] = [
    Math.max(1, Math.round(tlImg[0]) + 1),
    Math.max(1, Math.round(tlImg[1]) + 1)
  ];
  const brhc: [number, number] = [
    Math.max(1, Math.round(brImg[0]) + 1),
    Math.max(1, Math.round(brImg[1]) + 1)
  ];

  const camera = sv.getCamera();
  const pixelSpacing = (metadata.pixelSpacing as [number, number]) || [
    1.0, 1.0
  ];

  const pxPerWorldUnit = canvas.height / 2 / camera.parallelScale!;
  const magnification = pxPerWorldUnit * pixelSpacing[0];

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

/**
 * Builds the Spatial Transformation Sequence (0070,0308) from the viewport's
 * current rotation and flip state, converting Cornerstone's representation
 * to the DICOM `ImageRotation` + `ImageHorizontalFlip` encoding.
 *
 * @function buildSpatialTransformationSequence
 * @param {_cornerstone.StackViewport} viewport - The active stack viewport.
 * @returns {SpatialTransformationItem[]} Array with a single spatial transform item.
 */
function buildSpatialTransformationSequence(
  viewport: _cornerstone.StackViewport
): SpatialTransformationItem[] {
  const properties = viewport.getProperties();

  const rawRotation = (properties as any).rotation ?? 0;
  const rotation = (((Math.round(rawRotation / 90) * 90) % 360) + 360) % 360;

  const flipHorizontal = (properties as any).flipHorizontal ?? false;
  const flipVertical = (properties as any).flipVertical ?? false;

  let dicomRotation = rotation;
  let dicomFlip: "Y" | "N" = "N";

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
      ImageRotation:
        dicomRotation as SpatialTransformationItem["ImageRotation"],
      ImageHorizontalFlip: dicomFlip
    }
  ];
}

/**
 * Builds the Graphic Annotation Sequence (0070,0001).
 * Arrows are encoded as Compound Graphics (0070,0209); all other tool types
 * produce standard Graphic Objects (0070,0009). All annotations also produce
 * a Text Object (0070,0008) carrying the formatted measurement value.
 *
 * @function buildGraphicAnnotationSequence
 * @param {PresentationContext} context - Viewport context.
 * @param {any[]} annotations - Filtered Cornerstone Tools annotation objects.
 * @param {string} sopClassUID - Referenced SOP Class UID of the source image.
 * @param {string} sopInstanceUID - Referenced SOP Instance UID of the source image.
 * @returns {GraphicAnnotationItem[]} Array with at most one layer item, or
 *   an empty array if there are no annotations.
 */
function buildGraphicAnnotationSequence(
  context: PresentationContext,
  annotations: any[],
  sopClassUID: string,
  sopInstanceUID: string
): GraphicAnnotationItem[] {
  if (!annotations || annotations.length === 0) return [];

  const layerItem: GraphicAnnotationItem = {
    GraphicLayer: "DRAWING",
    ReferencedImageSequence: [
      {
        ReferencedSOPClassUID: sopClassUID,
        ReferencedSOPInstanceUID: sopInstanceUID
      }
    ],
    GraphicObjectSequence: [],
    TextObjectSequence: [],
    CompoundGraphicSequence: []
  };

  for (const annotation of annotations) {
    const style = getAnnotationStyle(annotation);
    const toolName: string = annotation.metadata?.toolName ?? "";

    if (toolName === "ArrowAnnotate") {
      const compound = createArrowCompound(context, annotation, style);
      if (compound) layerItem.CompoundGraphicSequence.push(compound);
    } else {
      const graphicObj = createGraphicObject(context, annotation, style);
      if (graphicObj) {
        // CobbAngle and Bidirectional return arrays; others return a single item.
        if (Array.isArray(graphicObj)) {
          layerItem.GraphicObjectSequence.push(...graphicObj);
        } else {
          layerItem.GraphicObjectSequence.push(graphicObj);
        }
      }
    }

    const textObj = createTextObject(context, annotation, style);
    if (textObj) layerItem.TextObjectSequence.push(textObj);
  }

  return [layerItem];
}

/**
 * @function createGraphicObject
 * @param {PresentationContext} context - Viewport context.
 * @param {any} annotation - Cornerstone Tools annotation object.
 * @param {ResolvedAnnotationStyle} style - Resolved style for this annotation.
 * @returns {GraphicObjectItem | GraphicObjectItem[] | null} One or more
 *   Graphic Object items, or `null` if the annotation cannot be encoded.
 */
function createGraphicObject(
  context: PresentationContext,
  annotation: any,
  style: ResolvedAnnotationStyle
): GraphicObjectItem | GraphicObjectItem[] | null {
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

/**
 * Converts an array of Cornerstone world-space 3-D points to a flat DICOM
 * PIXEL-unit graphic data array `[x0, y0, x1, y1, …]`.
 *
 * @function worldPointsToImagePixels
 * @param {string} imageId - Cornerstone imageId used for the world→image transform.
 * @param {Types.Point3[]} worldPoints - World-coordinate points to convert.
 * @returns {number[] | null} Flat pixel coordinate array
 */
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

/**
 * Builds a base DICOM Line Style Sequence item from a resolved annotation style.
 *
 * @function baseLineStyle
 * @param {ResolvedAnnotationStyle} style - Resolved annotation style.
 * @returns {LineStyleItem} A single line-style item for use in
 *   `GraphicObjectItem.LineStyleSequence`.
 */
function baseLineStyle(style: ResolvedAnnotationStyle): LineStyleItem {
  return {
    LineThickness: parseFloat(style.lineWidth) || 1,
    LineDashingStyle:
      style.lineDash && style.lineDash !== "" ? "DASHED" : "SOLID",
    PatternOnColorCIELabValue: convertHexToCIELab(style.color)
  };
}

/**
 * Creates a POLYLINE Graphic Object for Length and Probe tool annotations.
 *
 * @function createPolylineGraphic
 * @param {PresentationContext} context - Viewport context.
 * @param {any} annotation - Annotation with `data.handles.points` in world space.
 * @param {ResolvedAnnotationStyle} style - Resolved annotation style.
 * @returns {GraphicObjectItem | null}
 */
function createPolylineGraphic(
  context: PresentationContext,
  annotation: any,
  style: ResolvedAnnotationStyle
): GraphicObjectItem | null {
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

/**
 * Creates a DICOM ARROW Compound Graphic item for ArrowAnnotate tool annotations.
 *
 * The arrow tail and head are encoded in reverse order of Cornerstone's
 * internal representation: DICOM expects `[tailX, tailY, headX, headY]`.
 *
 * @function createArrowCompound
 * @param {PresentationContext} context - Viewport context.
 * @param {any} annotation - Annotation with `data.handles.points[0]` (head)
 *   and `data.handles.points[1]` (tail).
 * @param {ResolvedAnnotationStyle} style - Resolved annotation style.
 * @returns {CompoundGraphicItem | null}
 */
function createArrowCompound(
  context: PresentationContext,
  annotation: any,
  style: ResolvedAnnotationStyle
): CompoundGraphicItem | null {
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

/**
 * Creates a 3-point POLYLINE Graphic Object for the Angle tool annotation.
 *
 * @function createAngleGraphic
 * @param {PresentationContext} context - Viewport context.
 * @param {any} annotation - Annotation with at least 3 world-space handle points.
 * @param {ResolvedAnnotationStyle} style - Resolved annotation style.
 * @returns {GraphicObjectItem | null}
 */
function createAngleGraphic(
  context: PresentationContext,
  annotation: any,
  style: ResolvedAnnotationStyle
): GraphicObjectItem | null {
  const worldPoints: Types.Point3[] = annotation.data?.handles?.points;
  if (!worldPoints || worldPoints.length < 3) return null;

  const graphicData = worldPointsToImagePixels(
    context.imageId,
    worldPoints.slice(0, 3)
  );
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

/**
 * Creates two separate 2-point POLYLINE Graphic Objects for the CobbAngle tool,
 * one for each spine line.
 *
 * @function createCobbAngleGraphics
 * @param {PresentationContext} context - Viewport context.
 * @param {any} annotation - Annotation with 4 world-space handle points
 *   (points[0–1] = first line, points[2–3] = second line).
 * @param {ResolvedAnnotationStyle} style - Resolved annotation style.
 * @returns {GraphicObjectItem[]} Zero, one, or two graphic items.
 */
function createCobbAngleGraphics(
  context: PresentationContext,
  annotation: any,
  style: ResolvedAnnotationStyle
): GraphicObjectItem[] {
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

  const result: GraphicObjectItem[] = [];
  const makePolyline = (data: number[]): GraphicObjectItem => ({
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "POLYLINE",
    NumberOfGraphicPoints: 2,
    GraphicData: data,
    GraphicFilled: "N",
    LineStyleSequence: [baseLineStyle(style)]
  });

  if (line1) result.push(makePolyline(line1));
  if (line2) result.push(makePolyline(line2));
  return result;
}

/**
 * Creates two separate 2-point POLYLINE Graphic Objects for the Bidirectional
 * tool: one for the long axis and one for the short axis.
 *
 * @function createBidirectionalGraphics
 * @param {PresentationContext} context - Viewport context.
 * @param {any} annotation - Annotation with 4 world-space handle points
 *   (points[0–1] = long axis, points[2–3] = short axis).
 * @param {ResolvedAnnotationStyle} style - Resolved annotation style.
 * @returns {GraphicObjectItem[]} Zero, one, or two graphic items.
 */
function createBidirectionalGraphics(
  context: PresentationContext,
  annotation: any,
  style: ResolvedAnnotationStyle
): GraphicObjectItem[] {
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

  const result: GraphicObjectItem[] = [];
  const makePolyline = (data: number[]): GraphicObjectItem => ({
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "POLYLINE",
    NumberOfGraphicPoints: 2,
    GraphicData: data,
    GraphicFilled: "N",
    LineStyleSequence: [baseLineStyle(style)]
  });

  if (longAxis) result.push(makePolyline(longAxis));
  if (shortAxis) result.push(makePolyline(shortAxis));
  return result;
}

/**
 * Creates a 5-point closed POLYLINE Graphic Object for the RectangleROI tool,
 * representing the rectangle as `[TL, TR, BR, BL, TL]`.
 *
 * @function createRectangleGraphic
 * @param {PresentationContext} context - Viewport context.
 * @param {any} annotation - Annotation with at least 2 world-space handle points
 *   (opposite corners of the bounding box).
 * @param {ResolvedAnnotationStyle} style - Resolved annotation style.
 * @returns {GraphicObjectItem | null}
 */
function createRectangleGraphic(
  context: PresentationContext,
  annotation: any,
  style: ResolvedAnnotationStyle
): GraphicObjectItem | null {
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
  const minX = Math.min(x1, x2),
    maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2),
    maxY = Math.max(y1, y2);

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "POLYLINE",
    NumberOfGraphicPoints: 5,
    GraphicData: [minX, minY, maxX, minY, maxX, maxY, minX, maxY, minX, minY],
    GraphicFilled: style.fillOpacity > 0 ? "Y" : "N",
    LineStyleSequence: [baseLineStyle(style)]
  };
}

/**
 * Creates an ELLIPSE Graphic Object for the EllipticalROI tool.
 *
 * DICOM ELLIPSE requires exactly 4 points in the order:
 * `[leftX, leftY, rightX, rightY, topX, topY, bottomX, bottomY]`.
 *
 * @function createEllipseGraphic
 * @param {PresentationContext} context - Viewport context.
 * @param {any} annotation - Annotation with 4 world-space handle points
 *   (indices: 0=top, 1=bottom, 2=left, 3=right).
 * @param {ResolvedAnnotationStyle} style - Resolved annotation style.
 * @returns {GraphicObjectItem | null}
 */
function createEllipseGraphic(
  context: PresentationContext,
  annotation: any,
  style: ResolvedAnnotationStyle
): GraphicObjectItem | null {
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

  return {
    GraphicAnnotationUnits: "PIXEL",
    GraphicDimensions: 2,
    GraphicType: "ELLIPSE",
    NumberOfGraphicPoints: 4,
    GraphicData: [
      left[0],
      left[1],
      right[0],
      right[1],
      top[0],
      top[1],
      bottom[0],
      bottom[1]
    ],
    GraphicFilled: style.fillOpacity > 0 ? "Y" : "N",
    LineStyleSequence: [baseLineStyle(style)]
  };
}

/**
 * Creates a POLYLINE Graphic Object for PlanarFreehandROI / FreehandROI tool
 * annotations.
 * @function createFreehandGraphic
 * @param {PresentationContext} context - Viewport context.
 * @param {any} annotation - Annotation object with `data.polyline` or
 *   `data.handles.points` in world space, and optional `data.isOpenUShapeContour`.
 * @param {ResolvedAnnotationStyle} style - Resolved annotation style.
 * @returns {GraphicObjectItem | null}
 */
function createFreehandGraphic(
  context: PresentationContext,
  annotation: any,
  style: ResolvedAnnotationStyle
): GraphicObjectItem | null {
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

/**
 * Creates a DICOM Text Object Sequence item (0070,0008) for an annotation,
 * placing the formatted measurement value inside a bounding box derived from
 * the annotation's textBox world bounding box (or estimated from the anchor
 * point when the textBox world bounding box is unavailable).
 *
 * @function createTextObject
 * @param {PresentationContext} context - Viewport context.
 * @param {any} annotation - Cornerstone Tools annotation object.
 * @param {ResolvedAnnotationStyle} style - Resolved annotation style.
 * @returns {TextObjectItem | null} Text object item, or `null` if no meaningful
 *   text content could be derived or coordinate projection failed.
 */
function createTextObject(
  context: PresentationContext,
  annotation: any,
  style: ResolvedAnnotationStyle
): TextObjectItem | null {
  const { imageId } = context;
  const toolName: string = annotation.metadata?.toolName ?? "";
  const worldPoints: Types.Point3[] = annotation.data?.handles?.points;
  if (!worldPoints?.length) return null;

  const textContent = getAnnotationText(annotation, imageId);
  if (!textContent || textContent === "N/A") return null;

  const lines = textContent.split("\n");
  const lineHeight = 14;
  const boxWidth = 160;
  const boxHeight = lineHeight * lines.length + 8;

  const anchorWorldPoint =
    toolName === "ArrowAnnotate"
      ? worldPoints[0]
      : worldPoints[worldPoints.length - 1];

  const anchor = _cornerstone.utilities.worldToImageCoords(
    imageId,
    anchorWorldPoint
  );
  if (!anchor) return null;

  const worldBBox = annotation.data?.handles?.textBox?.worldBoundingBox;
  let tlhc: [number, number];
  let brhc: [number, number];

  if (worldBBox) {
    const topLeft = _cornerstone.utilities.worldToImageCoords(
      imageId,
      worldBBox.topLeft as Types.Point3
    );
    const bottomRight = _cornerstone.utilities.worldToImageCoords(
      imageId,
      worldBBox.bottomRight as Types.Point3
    );
    if (topLeft && bottomRight) {
      tlhc = [
        Math.min(topLeft[0], bottomRight[0]),
        Math.min(topLeft[1], bottomRight[1])
      ];
      brhc = [
        Math.max(topLeft[0], bottomRight[0]),
        Math.max(topLeft[1], bottomRight[1])
      ];
    } else {
      const pos = _cornerstone.utilities.worldToImageCoords(
        imageId,
        annotation.data?.handles?.textBox?.worldPosition ?? anchorWorldPoint
      );
      if (!pos) return null;
      tlhc = [pos[0] + 5, pos[1] - boxHeight - 5];
      brhc = [pos[0] + 5 + boxWidth, pos[1] - 5];
    }
  } else {
    const pos = _cornerstone.utilities.worldToImageCoords(
      imageId,
      annotation.data?.handles?.textBox?.worldPosition ?? anchorWorldPoint
    );
    if (!pos) return null;
    tlhc = [pos[0] + 5, pos[1] - boxHeight - 5];
    brhc = [pos[0] + 5 + boxWidth, pos[1] - 5];
  }

  const textColor = style.textBoxColor || style.color;

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

/**
 * Derives the human-readable measurement text for a Cornerstone annotation,
 * drawing values from `annotation.data.cachedStats`.
 *
 * Supported tools: Length, Probe, Angle, CobbAngle, RectangleROI,
 * EllipticalROI, CircleROI, Bidirectional, ArrowAnnotate,
 * PlanarFreehandROI / Freehand.
 *
 * @function getAnnotationText
 * @param {any} annotation - Cornerstone Tools annotation object.
 * @param {string} imageId - Current imageId used as the cachedStats key prefix.
 * @returns {string} Formatted measurement string, or `"N/A"` when stats are
 *   unavailable or the tool is unrecognised.
 */
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
      return parts.length ? parts.join("\n") : "N/A";
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

/**
 * Resolves the final display style for a single annotation by merging — in
 * ascending priority order — the global Larvitar style, the Cornerstone
 * tool-level style, and any per-annotation style override.
 *
 * @function getAnnotationStyle
 * @param {any} annotation - Cornerstone Tools annotation object.
 * @returns {ResolvedAnnotationStyle} Fully resolved style object.
 */
function getAnnotationStyle(annotation: any): ResolvedAnnotationStyle {
  const defaultStyle = getLarvitarStyle() ?? {};
  const fallback: ResolvedAnnotationStyle = {
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

  return { ...fallback, ...defaultStyle } as ResolvedAnnotationStyle;
}

/**
 * Returns the global Larvitar annotation style object from the Cornerstone
 * Tools style configuration, or `null` if it cannot be accessed.
 *
 * @function getLarvitarStyle
 * @returns {Record<string, any> | null}
 */
function getLarvitarStyle() {
  try {
    return _cornerstoneTools.annotation.config.style.config.default.global;
  } catch {
    return null;
  }
}

/**
 * DICOM UID generator compliant with dicom standard
 */
let counter = 0;
function generateUID(): string {
  const DICOM_ROOT = "1.2.826.0.1.3680043.9.5830";

  const now = Date.now();
  counter = (counter + 1) % 100000;
  const random = crypto.getRandomValues(new Uint32Array(1))[0];
  let uid = `${DICOM_ROOT}.${now}.${counter}.${random}`;

  if (uid.length > 64) {
    const maxRandomLength = 64 - `${DICOM_ROOT}.${now}.${counter}.`.length;
    uid = `${DICOM_ROOT}.${now}.${counter}.${random.toString().slice(0, maxRandomLength)}`;
  }

  return uid;
}
