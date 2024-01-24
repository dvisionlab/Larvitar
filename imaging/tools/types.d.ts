type ToolOptions = {
  mouseButtonMask?: number | number[];
  supportedInteractionTypes?: string[];
  loop?: boolean;
  allowSkipping?: boolean;
  invert?: boolean;
} & { [key: string]: unknown };

export type ToolConfig = {
  name: string;
  viewports: string | string[];
  configuration: Object;
  options: ToolOptions;
  class: string;
  sync?: string;
  cleanable?: boolean;
  defaultActive?: boolean;
  shortcut?: string;
  type?: "utils" | "annotation" | "segmentation" | "overlay";
  description?: string;
  currentMode?: string;
};

export type ToolStyle = {
  width: number;
  color: string; // "#00FF00"
  activeColor: string; // "#00FF00"
  fillColor: string; // "#00FF00"
  fontFamily: string; // "Arial"
  fontSize: number;
  backgroundColor: string; // "rgba(1,1,1,0.7)"
};

export type ToolSettings = {
  mouseEnabled: boolean;
  touchEnabled: boolean;
  showSVGCursors: boolean;
  globalToolSyncEnabled: boolean;
  autoResizeViewports: boolean;
  lineDash: [number, number];
};

export type ToolMouseKeys = {
  debug: boolean;
  mouse_button_left: {
    shift: string;
    ctrl: string;
    default: string;
  };
  mouse_button_right: {
    shift: string;
    ctrl: string;
    default: string;
  };
  keyboard_shortcuts: {
    // alt key + letter
    // key in the form "KEY_A"
    [key: string]: string;
  };
};

type HandlePosition = {
  active: boolean;
  allowedOutsideImage?: boolean;
  drawnIndependently?: boolean;
  highlight: boolean;
  index?: number;
  locked?: boolean;
  moving?: boolean;
  x: number;
  y: number;
};

type HandleTextBox = {
  active: boolean;
  allowedOutsideImage: boolean;
  boundingBox: { height: number; left: number; top: number; width: number };
  drawnIndependently: boolean;
  hasBoundingBox: boolean;
  hasMoved: boolean;
  highlight?: boolean;
  index?: number;
  movesIndependently: boolean;
  x: number;
  y: number;
};

type BaseToolStateData = {
  active: boolean;
  color: string;
  invalidated: boolean;
  uuid: string;
  visible: boolean;
};

type AngleStateData = BaseToolStateData & {
  handles: {
    end: HandlePosition;
    middle: HandlePosition;
    start: HandlePosition;
    textBox: HandleTextBox;
  };
  rAngle: number;
};

type ArrowAnnotateStateData = BaseToolStateData & {
  handles: {
    end: HandlePosition;
    start: HandlePosition;
    textBox: HandleTextBox;
  };
  text: string;
};

type BidirectionalStateData = BaseToolStateData & {
  handles: {
    end: HandlePosition;
    perpendicularEnd: HandlePosition;
    perpendicularStart: HandlePosition;
    start: HandlePosition;
    textBox: HandleTextBox;
  };
  isCreating: boolean;
  longestDiameter: number;
  shortestDiameter: number;
  toolName: "Bidirectional";
  toolType: "Bidirectional";
};

type EllipticalRoiStateData = BaseToolStateData & {
  cachedStats: {
    area: number;
    count: number;
    max: number;
    mean: number;
    meanStdDevSUV?: number;
    min: number;
    stdDev: number;
    variance: number;
  };
  handles: {
    end: HandlePosition;
    initialRotation: number;
    start: HandlePosition;
    textBox: HandleTextBox;
  };
  unit: string;
};

type FreehandRoiStateData = BaseToolStateData & {
  area: number;
  canComplete: boolean;
  handles: {
    points: number[];
    textBox: HandleTextBox;
    invalidHandlePlacement: boolean;
  };
  highlight: boolean;
  meanStdDev: { count: number; mean: number; variance: number; stdDev: number };
  meanStdDevSUV: undefined;
  polyBoundingBox: { left: number; top: number; width: number; height: number };
  unit: string;
};

type LengthStateData = BaseToolStateData & {
  handles: {
    end: HandlePosition;
    start: HandlePosition;
    textBox: HandleTextBox;
  };
  length: number;
  unit: string;
};

type ProbeStateData = BaseToolStateData;

type RectangleRoiStateData = BaseToolStateData & {
  cachedStats: {
    area: number;
    count: number;
    max: number;
    mean: number;
    meanStdDevSUV?: number;
    min: number;
    perimeter: number;
    stdDev: number;
    variance: number;
  };
  handles: {
    end: HandlePosition;
    initialRotation: number;
    start: HandlePosition;
    textBox: HandleTextBox;
  };
  unit: string;
};

export type ToolState = {
  [imageId: string]: {
    Angle: AngleStateData;
    ArrowAnnotate: ArrowAnnotateStateData;
    Bidirectional: BidirectionalStateData;
    EllipticalRoi: EllipticalRoiStateData;
    FreehandRoi: FreehandRoiStateData;
    Length: LengthStateData;
    Probe: ProbeStateData;
    RectangleRoi: RectangleRoiStateData;
  };
};

export type SegmentationConfig = {
  arrayType: number;
  renderOutline: boolean;
  renderFill: boolean;
  shouldRenderInactiveLabelmaps: boolean;
  radius: number;
  minRadius: number;
  maxRadius: number;
  segmentsPerLabelmap: number;
  fillAlpha: number;
  fillAlphaInactive: number;
  outlineAlpha: number;
  outlineAlphaInactive: number;
  outlineWidth: number;
  storeHistory: boolean;
};

export const enum MaskVisualizations {
  FILL,
  CONTOUR,
  HIDDEN,
}

export type MaskProperties = {
  color: string;
  labelId: number;
  opacity: number;
  visualization: MaskVisualizations;
};

export type BrushProperties = {
  radius: number; // px
  thresholds: [number, number]; // [min, max] in px
};
