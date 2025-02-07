export type AnnotationDetails = {
  description?: string;
  annotationID?: string;
  annotationRenderingOrder?: number;
  presentationGSValue?: number;
  annotationCIELabColor?: [number, number, number];
  annotationDescription?: string;
  imageUIDsToApply?: string[];
};

export type AnnotationOverlay = {
  isGraphicAnnotation?: boolean;
  isOverlay?: boolean;
  columns?: number;
  description?: string;
  label?: string | number;
  pixelData?: number[];
  roiArea?: number;
  roiMean?: number;
  roiStandardDeviation?: number;
  rows?: number;
  x?: number;
  y?: number;
  visible?: boolean;
  type?: string; // Keep the original string type but also support "POINT" | "POLYLINE" | "CIRCLE" | "ELLIPSE"
  fillStyle?: string;
  renderingOrder?: number;
  canBeRendered?: boolean;
  bitsAllocated?: number;
  bitPosition?: number;
  subtype?: string;
  isTextAnnotation?: boolean;
  isgraphicFilled?: string;
  active?: boolean;
  color?: string;
  invalidated?: boolean;
  handles?: {
    start?: HandlePosition;
    end?: HandlePosition;
    points?: HandlePosition[];
    initialRotation?: number;
    textBox: AnnotationTextBox;
  };
};
interface AnnotationTextBox {
  text?: string;
  active: boolean;
  hasMoved: boolean;
  movesIndependently: boolean;
  drawnIndependently: boolean;
  allowedOutsideImage: boolean;
  hasBoundingBox: boolean;
  boundingBox?: {
    width: number;
    height: number;
    left: number;
    top: number;
  };
  anchorPoint?: {
    x: number | null;
    y: number | null;
  };
  anchorpointVisibility?: string;
  textFormat?: string;
  x?: number;
  y?: number;
}

export type TextDetails = {
  unformattedTextValue?: string; // Unformatted Text Value
  textFormat?: string;
  boundingBoxUnits?: string; // Bounding Box Annotation Units
  anchorPointUnits?: string; // Anchor Point Annotation Units
  boundingBox?: {
    tlhc?: { x: number | null; y: number | null };
    brhc?: { x: number | null; y: number | null };
  };
  isTextAnnotation?: boolean;
  anchorPointVisibility?: string; // Anchor Point Visibility
  anchorPoint?: { x: number | null; y: number | null };
  compoundGraphicInstanceUID?: number;
  graphicGroupID?: number;
  trackingID?: string;
  trackingUID?: string;
  textStyleSequence: {
    fontName?: string;
    fontNameType?: string;
    cssFontName?: string;
    textColorCIELabValue?: [number, number, number];
    horizontalAlignment?: number;
    verticalAlignment?: number;
    shadowStyle?: string;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowColorCIELabValue?: [number, number, number];
    shadowOpacity: number;
    underlined?: string;
    bold?: string;
    italic?: string;
  } | null;
};
export type GraphicDetails = {
  graphicAnnotationUnits?: string;
  graphicDimensions?: number;
  graphicPointsNumber?: number;
  graphicData?: number[];
  graphicType?: string;
  graphicFilled?: string;
  compoundGraphicInstanceUID?: number;
  graphicGroupID?: number;
  trackingID?: string;
  trackingUID?: string;
  lineStyleSequence: {
    patternOnColorCIELabValue?: [number, number, number];
    patternOffColorCIELabValue?: [number, number, number];
    patternOnOpacity?: number;
    patternOffOpacity?: number;
    lineThickness?: number;
    lineDashingStyle?: number;
    linePattern?: number;
    shadowStyle?: string;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowColorCIELabValue?: [number, number, number];
    shadowOpacity?: number;
  } | null;
};
export type CompoundDetails = {
  isCompoundAnnotation?: boolean;
  compoundGraphicUnits?: string;
  graphicDimensions?: number;
  graphicPointsNumber?: number;
  graphicData?: number[];
  graphicType?: string;
  graphicFilled?: string;
  compoundGraphicInstanceUID?: number;
  graphicGroupID?: number;
  rotationAngle?: number;
  rotationPoint?: [number, number];
  gapLength?: number;
  diameterOfVisibility?: number;
  majorTicks?: MajorTicks[];
  tickFormat?: string;
  tickLabelFormat?: string;
  showTick?: string;
  lineStyleSequence: {
    patternOnColorCIELabValue?: [number, number, number];
    patternOffColorCIELabValue?: [number, number, number];
    patternOnOpacity?: number;
    patternOffOpacity?: number;
    lineThickness?: number;
    lineDashingStyle?: number;
    linePattern?: number;
    shadowStyle?: string;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowColorCIELabValue?: [number, number, number];
    shadowOpacity?: number;
  } | null;
};

export type ToolAnnotations = MergedDetails[];
export type MergedDetails = TextDetails &
  GraphicDetails &
  CompoundDetails &
  Overlay & { imageUIDsToApply: string[] };

export type MajorTicks = {
  tickPosition?: number;
  tickLabel?: string;
};
