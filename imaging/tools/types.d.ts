import { EnabledElement } from "cornerstone-core";

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
  offset?: number;
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
export type WSConfig = {
  multiImage: boolean;
  startIndex: number | null;
  endIndex: number | null;
  masksNumber: number;
  onload?: boolean;
};
export type WSToolConfig = {
  name: string;
  viewports: string | string[];
  configuration: WSConfig;
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

export type WSMouseEvent = {
  detail: WSEventData;
};

interface WSEventData {
  currentPoints: {
    image: { x: number; y: number };
  };
  element: Element | HTMLElement;
  buttons: number;
  shiftKey: boolean;
  event: {
    altKey: boolean;
    shiftKey: boolean;
  };
  image: Image;
}
export type pixelData3D = {
  pixelData: number[];
  segmentsOnLabelmap: number[];
}[];

export type CachedImage = {
  image: {
    imageId: string;
    getPixelData: () => number[];
  };
};

export type LabelMapType = {
  pixelData?: number[];
  labelmaps2D?: labelmaps2DType[];
};

export type labelmaps2DType = {
  pixelData: number[];
  segmentsOnLabelmap: number[];
};
type HandlePosition = {
  active?: boolean;
  allowedOutsideImage?: boolean;
  drawnIndependently?: boolean;
  highlight?: boolean;
  index?: number;
  locked?: boolean;
  moving?: boolean;
  x: number;
  y: number;
  lines?: HandlePosition[];
  hasBoundingBox?: boolean;
  boundingBox?: HandleTextBox;
};
export type Overlay = {
  isGraphicAnnotation?: boolean;
  isOverlay?: boolean;
  columns?: number;
  description?: string;
  label?: string | number;
  pixelData: number[];
  roiArea?: number;
  roiMean?: number;
  roiStandardDeviation?: number;
  rows?: number;
  type?: string;
  x?: number;
  y?: number;
  visible: boolean;
  type: string;
  fillStyle: string;
  renderingOrder?: number;
  canBeRendered?: boolean;
  bitsAllocated?: number;
  bitPosition?: number;
  subtype?: string;
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
    points: HandlePosition[];
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
  HIDDEN
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
export type dataSets = {
  points: number[];
  pixelValues: number[];
  color: string;
}[];

export type PixelSpacing = {
  rowPixelSpacing: number;
  colPixelSpacing: number;
};
export interface MeasurementData {
  polyBoundingBox?: Rectangle;
  meanStdDev?: number;
  meanStdDevSUV?: { mean: number; stdDev: number };
  area?: number;
  unit?: string;
  visible: boolean;
  active: boolean;
  color?: string;
  invalidated: boolean;
  handles: Handles;
  length?: number;
  cachedStats?: Stats;
}

export type Stats = {
  area: number;
  perimeter?: number;
  count: number;
  mean: number;
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  meanStdDev?: {
    mean: number;
    stdDev: number;
  };
  meanStdDevSUV?: {
    mean: number;
    stdDev: number;
  };
  unit?: string;
};

export type MeasurementConfig = {
  handleRadius?: number;
  drawHandlesOnHover?: boolean;
  hideHandlesIfMoving?: boolean;
  renderDashed?: boolean;
  color?: string;
  drawHandlesIfActive?: boolean;
  lineDash?: boolean;
  fill?: boolean;
};

export type PixelSpacing = {
  colPixelSpacing: number;
  rowPixelSpacing: number;
};

export type Rectangle = {
  left: number;
  top: number;
  width: number;
  height: number;
};
export interface Handles {
  start?: HandlePosition;
  end?: HandlePosition;
  offset?: number;
  textBox?: HandleTextBox;
  initialRotation?: number;
  points?: HandlePosition[];
}

export interface MeasurementMouseEvent {
  detail: EventData;
  currentTarget: any;
}

export interface Coords {
  x: number;
  y: number;
}

export interface EventData {
  currentPoints: {
    image: Coords;
    canvas?: Coords;
  };
  element: HTMLElement;
  buttons: number;
  shiftKey: boolean;
  viewport: Viewport;
  event: {
    altKey: boolean;
    shiftKey: boolean;
    ctrlKey: boolean;
  };
  image: cornerstone.Image;
  enabledElement?: EnabledElement;
  canvasContext: CanvasRenderingContext2D;
}

export type PreventEvent = {
  stopImmediatePropagation: Function;
  stopPropagation: Function;
  preventDefault: Function;
};

export interface PlotlyData {
  x: number[];
  y: number[];
  type: string;
  line: {
    color: string;
  };
}
