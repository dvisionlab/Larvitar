// larvitar/types/cornerstone.ts

// Core enums & types
import { Enums } from "@cornerstonejs/core";
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
  Point3
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
