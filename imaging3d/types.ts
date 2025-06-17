// larvitar/types/cornerstone.ts

// Core enums & types
import { Enums } from "@cornerstonejs/core";
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
