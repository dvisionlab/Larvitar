// larvitar/types/cornerstone.ts

// Core enums & types
import { Enums, StackViewport } from "@cornerstonejs/core";
import { MetaData } from "../imaging/types";
export type {
  Types,
  VolumeViewport,
  StackViewport,
  BaseVolumeViewport
} from "@cornerstonejs/core";
export type {
  IEnabledElement,
  Point2,
  Point3,
  ICamera
} from "@cornerstonejs/core/dist/esm/types";

// Tool system types
export type {
  Annotation,
  CanvasCoordinates,
  EventTypes,
  InteractionTypes,
  PublicToolProps,
  SVGDrawingHelper,
  TextBoxHandle,
  ToolHandle,
  ToolProps
} from "@cornerstonejs/tools/dist/esm/types";

export type { Handles } from "@cornerstonejs/tools/dist/esm/types/AnnotationTypes";

export type { ROICachedStats } from "@cornerstonejs/tools/dist/esm/types/ToolSpecificAnnotationTypes";

// Larvitar-specific mapped types
export type MprViewport = {
  viewportId: string;
  orientation: Enums.OrientationAxis;
};

export type VideoViewport = {
  viewportId: string;
  background: [number, number, number];
};

export type ImageUrlMetadata = {
  rendered: string;
};

export type GeneralSeriesMetadata = {
  seriesInstanceUID: string;
  studyInstanceUID: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: string;
  seriesDate: string;
  seriesTime: string;
  acquisitionDate?: string;
  acquisitionTime?: string;
};

export type CineMetadata = {
  frameTime: number;
  frameRate?: number;
  numberOfFrames?: number;
};

export type ImagePlaneMetadata = {
  frameOfReferenceUID: string;
  rows: number;
  columns: number;
  imageOrientationPatient: number[];
  rowCosines: number[];
  columnCosines: number[];
  imagePositionPatient: number[];
  sliceThickness: number;
  sliceLocation: number;
  pixelSpacing: number[];
  rowPixelSpacing: number;
  columnPixelSpacing: number;
};

export type AddCompleteVideoMetadataParams = {
  imageId: string;
  videoUrl: string;
  metadata: MetaData;
};

export type GeneralSeriesDataInput = {
  seriesUID: string;
  studyUID: string;
  seriesNumber?: number;
  seriesDescription?: string;
  modality?: string;
  seriesDate?: string;
  seriesTime?: string;
};

export type VideoMetadataInput = {
  frameTime: number;
  numberOfFrames: number;
  frameRate: number;
};

export type ImagePlaneMetadataInput = {
  frameOfReferenceUID: string;
  rows: number;
  columns: number;
  imageOrientationPatient: number[];
  rowCosines: number[];
  columnCosines: number[];
  imagePositionPatient: number[];
  sliceThickness: number;
  sliceLocation: number;
  pixelSpacing: number[];
  rowPixelSpacing: number;
  columnPixelSpacing: number;
};

export type PositionerAngles = {
  positionerPrimaryAngle: number;
  positionerSecondaryAngle: number;
  positionerPrimaryDirection: "LAO" | "RAO";
  positionerSecondaryDirection: "CRA" | "CAU";
};
export interface PresentationContext {
  viewport: StackViewport;
  imageId: string;
  metadata: MetaData;
  canvas: HTMLCanvasElement;
}

//Presentation State Types

export interface ReferencedImageItem {
  ReferencedSOPClassUID: string;
  ReferencedSOPInstanceUID: string;
}

export interface ReferencedSeriesItem {
  SeriesInstanceUID: string;
  ReferencedInstanceSequence: ReferencedImageItem[];
}

export interface SoftcopyVOILUTItem {
  ReferencedImageSequence: ReferencedImageItem[];
  WindowCenter: number;
  WindowWidth: number;
  VOILUTFunction: "LINEAR" | "LINEAR_EXACT" | "SIGMOID";
}

export type PresentationSizeMode = "SCALE TO FIT" | "TRUE SIZE" | "MAGNIFY";

export interface DisplayedAreaSelectionItem {
  ReferencedImageSequence: ReferencedImageItem[];
  DisplayedAreaTopLeftHandCorner: [number, number];
  DisplayedAreaBottomRightHandCorner: [number, number];
  PresentationSizeMode: PresentationSizeMode;
  PresentationPixelSpacing: [number, number];
  PresentationPixelAspectRatio: [number, number];
  PresentationPixelMagnificationRatio?: number;
}

export interface SpatialTransformationItem {
  ImageRotation: 0 | 90 | 180 | 270;
  ImageHorizontalFlip: "Y" | "N";
}

export interface GraphicLayerItem {
  GraphicLayer: string;
  GraphicLayerOrder: number;
  GraphicLayerRecommendedDisplayCIELabValue: [number, number, number];
  GraphicLayerDescription?: string;
}

export interface LineStyleItem {
  LineThickness: number;
  LineDashingStyle: "SOLID" | "DASHED";
  PatternOnColorCIELabValue: [number, number, number];
  PatternOffColorCIELabValue?: [number, number, number];
}

export interface TextStyleItem {
  FontName?: string;
  CSSFontName?: string;
  TextColorCIELabValue: [number, number, number];
  HorizontalAlignment: "LEFT" | "RIGHT" | "CENTER";
  VerticalAlignment: "TOP" | "BOTTOM" | "CENTER" | "TOP_LEFT";
  ShadowStyle?: "NORMAL" | "OUTLINED" | "OFF";
  ShadowOffsetX?: number;
  ShadowOffsetY?: number;
  ShadowColorCIELabValue?: [number, number, number];
}

export interface GraphicObjectItem {
  GraphicAnnotationUnits: "PIXEL" | "DISPLAY" | "MATRIX";
  GraphicDimensions: 2;
  GraphicType: "POINT" | "POLYLINE" | "INTERPOLATED" | "CIRCLE" | "ELLIPSE";
  NumberOfGraphicPoints: number;
  GraphicData: number[];
  GraphicFilled: "Y" | "N";
  LineStyleSequence?: LineStyleItem[];
  FillStyleSequence?: FillStyleItem[];
}

export interface FillStyleItem {
  PatternOnColorCIELabValue: [number, number, number];
  FillMode: "SOLID" | "STIPPELED";
  PatternOnOpacity?: number;
}

export interface CompoundGraphicItem {
  CompoundGraphicType:
    | "MULTILINE"
    | "INFINITELINE"
    | "CUTPLANE"
    | "RANGELINE"
    | "RULER"
    | "AXIS"
    | "CROSSHAIR"
    | "ARROW"
    | "RECTANGLE"
    | "ELLIPSE";
  CompoundGraphicUnits: "PIXEL" | "DISPLAY" | "MATRIX";
  GraphicData: number[];
  GraphicDimensions: 2;
  NumberOfGraphicPoints: number;
  GraphicFilled: "Y" | "N";
  LineStyleSequence?: LineStyleItem[];
}

export interface TextObjectItem {
  UnformattedTextValue: string;
  BoundingBoxAnnotationUnits: "PIXEL" | "DISPLAY" | "MATRIX";
  AnchorPointAnnotationUnits: "PIXEL" | "DISPLAY" | "MATRIX";
  BoundingBoxTopLeftHandCorner: [number, number];
  BoundingBoxBottomRightHandCorner: [number, number];
  AnchorPoint: [number, number];
  AnchorPointVisibility: "Y" | "N";
  TextStyleSequence?: TextStyleItem[];
  LineStyleSequence?: LineStyleItem[];
}

export interface GraphicAnnotationItem {
  GraphicLayer: string;
  ReferencedImageSequence: ReferencedImageItem[];
  GraphicObjectSequence: GraphicObjectItem[];
  TextObjectSequence: TextObjectItem[];
  CompoundGraphicSequence: CompoundGraphicItem[];
}

export interface PresentationStateDataset {
  PatientName: string;
  PatientID: string;
  PatientBirthDate: string;
  PatientSex: string;

  StudyInstanceUID: string;
  StudyDate: string;
  StudyTime: string;
  AccessionNumber: string;

  Modality: "PR";
  SOPClassUID: string;
  SOPInstanceUID: string;
  SeriesInstanceUID: string;
  InstanceNumber: number;
  SeriesNumber: number;
  SeriesDescription: string;
  Manufacturer: string;
  ContentLabel: string;
  ContentDescription: string;
  ContentCreatorName: string;
  PresentationCreationDate: string;
  PresentationCreationTime: string;
  PresentationLUTShape: "IDENTITY" | "INVERSE";

  ReferencedSeriesSequence: ReferencedSeriesItem[];

  SoftcopyVOILUTSequence: SoftcopyVOILUTItem[];
  DisplayedAreaSelectionSequence: DisplayedAreaSelectionItem[];
  SpatialTransformationSequence: SpatialTransformationItem[];

  GraphicLayerSequence: GraphicLayerItem[];
  GraphicAnnotationSequence: GraphicAnnotationItem[];
}

export interface PresentationStateDicomExport {
  format: "dicom";
  blob: Blob;
  filename: string;
}

export interface PresentationStateMetadataExport {
  format: "metadata";
  data: MetaData;
  dataset: PresentationStateDataset;
}

export type PresentationStateExport =
  | PresentationStateDicomExport
  | PresentationStateMetadataExport;

export interface PresentationContext {
  viewport: StackViewport;
  imageId: string;
  metadata: MetaData;
  canvas: HTMLCanvasElement;
}

export interface ResolvedAnnotationStyle {
  color: string;
  lineWidth: string;
  lineDash: string;
  fillOpacity: number;
  textBoxFontFamily: string;
  textBoxFontSize: string;
  textBoxColor: string;
  textBoxLinkLineWidth: string;
  textBoxLinkLineDash: string;
}
