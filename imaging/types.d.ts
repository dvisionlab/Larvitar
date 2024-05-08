import { vec2 } from "cornerstone-core";
import { DataSet } from "dicom-parser";
import { MetaDataTypes } from "./MetaDataTypes";
import { MetaDataReadable } from "./MetaDataReadable";
import { Element } from "dicom-parser";
// TODO-ts: differentiate each single metadata @szanchi
/*export type MetadataValue =
  | string
  | number
  | string[]
  | number[]
  | boolean
  | null
  | Array
  | undefined; // null or undefined is only for nrrd*/

export type tags = { [x: string]: Element }[];

export type customTags = {
  tag: string;
  value: string;
  offset: number;
  index: number;
}[];

export type sortedTags = {
  sortedTags: tags;
  sortedCustomTags: customTags;
  shiftTotal: number;
};

export type pdfType = { getPage: function; numPages: number };

export type StoreViewport = {
  loading: number;
  ready: boolean;
  minSliceId: number;
  maxSliceId: number;
  sliceId: number;
  pendingSliceId?: number;
  seriesUID?: string;
  minTimeId: number;
  maxTimeId: number;
  timeId: number;
  timestamp: number;
  timestamps: number[];
  timeIds: number[];
  pixelShift?: number[];
  rows: number;
  cols: number;
  spacing_x: number;
  spacing_y: number;
  thickness: number;
  minPixelValue: number;
  maxPixelValue: number;
  isColor: boolean;
  isMultiframe: boolean;
  isTimeserie: boolean;
  modality: string;
  isDSAEnabled: boolean;
  isPDF: boolean;
  waveform: boolean;
  dsa: boolean;
  imageIndex?: number;
  imageId?: string;
  numberOfSlices?: number;
  numberOfTemporalPositions?: number;
  numberOfFrames?: number;
  timeIndex?: number;
  viewport: {
    scale: number;
    rotation: number;
    translation: {
      x: number;
      y: number;
    };
    voi: {
      windowCenter: number;
      windowWidth: number;
    };
    // redundant fields ?
    rows: number;
    cols: number;
    spacing_x: number;
    spacing_y: number;
    thickness: number;
  };
  default: {
    scale: number;
    rotation: number;
    translation: {
      x: number;
      y: number;
    };
    voi: {
      windowCenter: number;
      windowWidth: number;
      invert: boolean;
    };
  };
};

export type MetaData = MetaDataTypes & MetaDataReadable;

export interface Image extends cornerstone.Image {
  render?: Function;
  decodeTimeInMS?: number;
  loadTimeInMS?: number;
  webWorkerTimeInMS?: number;
  metadata: MetaData;
  data?: DataSet;
  floatPixelData?: Float32Array;
}

export type Instance = {
  metadata: MetaData;
  pixelData?: TypedArray | null;
  dataSet?: DataSet | null;
  file?: File | null;
  instanceId?: string;
  frame?: number;
  overlays?: { overlays: Overlay[] };
};

export type ReslicedInstance = {
  metadata: MetaData;
  instanceId?: string;
  permuteTable?: [number, number, number];
};

export type StagedProtocol = {
  numberOfStages: number; // Number of stages
  numberOfViews: number; // Number of views in stage
  stageName?: string; // Name of the stage
  stageNumber?: number; // Number of the stage
  viewName?: string; // Name of the view
  viewNumber?: number; // Number of the view
};

export type BiPlane = {
  tag: string;
  referencedSOPInstanceUID: string;
  positionerPrimaryAngle: string; // LAO >= 0, RAO < 0
  positionerSecondaryAngle: number; // CRA >= 0, CAU < 0
};

export type DSA = {
  imageIds: string[];
  x00286101?: string; // DSA MaskOperation
  x00286102?: number[]; // DSA ApplicableFrameRange
  x00286110?: number | number[]; // DSA MaskFrameNumbers
  x00286112?: number; // DSA ContrastFrameAveraging
  x00286114?: number[]; // DSA MaskSubPixelShift
  x00286120?: number; // DSA TIDOffset
  x00286190?: string; // DSA MaskOperationExplanation
  x00289416?: number; // DSA SubtractionItemID
  x00289454?: string; // DSA MaskSelectionMode
};

export type Series = {
  imageIds: string[];
  instances: { [key: string]: Instance };
  seriesDescription?: string;
  anonymized?: boolean;
  bytes: number;
  seriesUID: string;
  currentImageIdIndex: number;
  numberOfImages?: number;
  isMultiframe: boolean;
  color?: boolean;
  dataSet: DataSet | null;
  metadata?: MetaData;
  frameDelay?: number;
  frameTime?: number;
  rWaveTimeVector?: number[];
  instanceUIDs: { [key: string]: string };
  is4D: boolean;
  waveform: boolean;
  ecgData?: number[];
  traceData?: Partial<Plotly.PlotData>[];
  isPDF: boolean;
  stagedProtocol?: StagedProtocol;
  dsa?: DSA;
  modality: string;
  numberOfFrames: number;
  numberOfSlices: number;
  numberOfTemporalPositions: number;
  studyUID: string;
  larvitarSeriesInstanceUID: string;
  elements?: { [key: string]: any } | null;
  layer: Layer;
  orientation?: "axial" | "coronal" | "sagittal"; // this is needed for legacy reslice
};

export type Overlay = {
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
  fillStyle: CanvasGradient;
};
export interface Layer extends cornerstone.EnabledElementLayer {
  id: string;
}

export interface Viewport extends cornerstone.Viewport {
  newImageIdIndex: number;
  displayedArea: {
    brhc: {
      x: number;
      y: number;
    };
  };
  overlayColor?: boolean | string;
}

export type Contours = {
  [key: string]: {
    [key: string]: Array<{
      x?: number;
      y?: number;
      lines: vec2[][];
    }>;
  };
};

export type Header = {
  volume: Volume;
  [imageId: string]: Instance.metadata;
};

export type Volume = {
  imageIds: string[];
  seriesId: string;
  rows: number;
  cols: number;
  slope: number;
  repr: string;
  intercept: number;
  imagePosition: [number, number];
  numberOfSlices: number;
  imageOrientation: [number, number, number];
  pixelSpacing: [number, number];
  sliceThickness: number;
  phase?: string;
  study_description?: string;
  series_description?: string;
  acquisition_date?: string;
};

export type LarvitarManager = {
  [key: string]: NrrdSeries | Series;
} | null;

export type ImageFrame = {
  pixelData?: Uint8ClampedArray | Uint16Array | Int16Array | Uint8Array;
  bitsAllocated: number;
  rows: number;
  columns: number;
  photometricInterpretation: string;
  samplesPerPixel: number;
  smallestPixelValue: number;
  largestPixelValue: number;
  imageData?: ImageData;
  pixelRepresentation: number;
};

export type ImageTracker = {
  [key: string]: string;
} | null;

// the result of readFile
export type ImageObject = {
  file: File;
  instanceUID: string;
  metadata: MetaData;
  dataSet: DataSet;
};

export type CachingResponse = {
  seriesId: string;
  loading: number;
  series: Partial<Series>;
};

export interface CustomDataSet extends DataSet {
  repr?: string;
}

type Orientation = "axial" | "coronal" | "sagittal";

type TypedArray =
  | Float64Array
  | Uint8Array
  | Int8Array
  | Uint16Array
  | Int16Array
  | Int32Array
  | Uint32Array
  | Float32Array;

type StoreViewport = typeof DEFAULT_VIEWPORT;

type StoreViewportOptions = {
  numberOfSlices?: number;
  sliceNumber?: number;
  wc?: number;
  ww?: number;
  defaultWC?: number;
  defaultWW?: number;
  scale?: number;
  colormap?: string;
  tr_x?: number;
  tr_y?: number;
};

export type NrrdInputVolume = {
  header: {
    sizes: number[];
    "space directions": number[][]; // a property with a space in the name ?? Seriously ??
    "space origin": [number, number];
    kinds: string[];
    type: string;
  };
  data: Uint16Array; // TODO-ts: other typed arrays ?
};

export type NrrdSeries = {
  currentImageIdIndex: number;
  imageIds: string[];
  instances: { [key: string]: Instance };
  instanceUIDs: { [key: string]: string };
  numberOfImages: number;
  seriesDescription: string;
  seriesUID: string;
  customLoader: string;
  nrrdHeader: NrrdHeader;
  bytes: number;
  dataSet?: DataSet;
  metadata?: MetaData;
  ecgData?: number[];
  isMultiframe?: boolean;
  numberOfFrames?: number;
};

export type NrrdHeader = {
  volume: Volume;
  intercept: number;
  slope: number;
  repr: string;
  phase: string;
  study_description: string;
  series_description: string;
  acquisition_date: string;
  [imageId: string]: string | number | Volume | NrrdInstance; // TODO-ts: fix this: we need just NrrdInstance
};

export type NrrdInstance = {
  instanceUID: string;
  seriesDescription: string;
  seriesModality: string;
  patientName: string;
  bitsAllocated: number;
  pixelRepresentation: string;
};
