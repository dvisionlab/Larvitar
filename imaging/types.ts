import { vec2 } from "cornerstone-core";
import { DataSet } from "dicom-parser";
import { MetaDataTypes } from "./MetaDataTypes";
import { MetaDataReadable } from "./MetaDataReadable";
import { Element } from "dicom-parser";
import { Coords, DisplayAreaVisualizations, Overlay } from "./tools/types";
import { sample } from "lodash";
import { ICamera, VolumeViewport } from "../imaging3d/types";
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

export type pdfType = { getPage: Function; numPages: number };

export type StoreViewport = {
  loading: number | null;
  ready: boolean;
  minSliceId: number;
  maxSliceId: number;
  sliceId: number;
  pendingSliceId?: number;
  uniqueUID?: string;
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
  isVideo: boolean;
  isVideoSupported?: boolean; // true if the video is supported by cornerstone
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
  filterName?: string;
  viewport: {
    scale: number;
    rotation: number;
    translation: {
      x: number;
      y: number;
    };
    voi: VOI;
    // redundant fields ?
    rows: number;
    cols: number;
    spacing_x: number;
    spacing_y: number;
    thickness: number;
    camera?: ICamera;
    mpr?: VolumeViewport;
  };
  default: {
    scale: number;
    rotation: number;
    translation: {
      x: number;
      y: number;
    };
    voi: VOI;
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
  tag?: string;
  referencedSOPInstanceUID?: string;
  positionerPrimaryAngle?: string; // LAO >= 0, RAO < 0
  positionerSecondaryAngle?: string; // CRA >= 0, CAU < 0
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
  imageIds3D: string[];
  instances: { [key: string]: Instance };
  seriesDescription?: string;
  anonymized?: boolean;
  bytes: number;
  seriesUID: string;
  currentImageIdIndex: number;
  numberOfImages?: number;
  isMultiframe: boolean;
  isVideo?: boolean;
  isVideoSupported?: boolean; // true if the video is supported by cornerstone
  color?: boolean;
  dataSet: DataSet | null;
  metadata?: MetaData;
  frameDelay?: number;
  frameTime?: number;
  rWaveTimeVector?: number[];
  instanceUIDs: { [key: string]: string };
  instanceUIDs3D: { [key: string]: string };
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
  uniqueUID: string;
  elements?: { [key: string]: any } | null;
  layer: Layer;
  orientation?: "axial" | "coronal" | "sagittal"; // this is needed for legacy reslice
};

export interface Layer extends cornerstone.EnabledElementLayer {
  id: string;
}

export interface Viewport extends cornerstone.Viewport {
  newImageIdIndex: number;
  overlayColor?: boolean | string;
}

export type DisplayedArea = {
  tlhc?: Coords;
  brhc?: Coords;
  presentationSizeMode?: DisplayAreaVisualizations;
  rowPixelSpacing?: number;
  columnPixelSpacing?: number;
};

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
  [imageId: string]: MetaData | Volume;
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

export type ImageManager = {
  [key: string]: NrrdSeries | Series;
} | null;

export type GSPSManager = {
  [key: string]: { seriesId: string | null; imageId: string | null }[] | null;
} | null;

export type FileManager = {
  [key: string]: string;
} | null;

export type ImageFrame = {
  samplesPerPixel?: number;
  photometricInterpretation?: string;
  planarConfiguration?: number;
  rows?: number;
  columns?: number;
  bitsAllocated?: number;
  pixelRepresentation?: number;
  smallestPixelValue?: number;
  largestPixelValue?: number;
  redPaletteColorLookupTableDescriptor?: number[];
  greenPaletteColorLookupTableDescriptor?: number[];
  bluePaletteColorLookupTableDescriptor?: number[];
  redPaletteColorLookupTableData?: Uint8Array;
  greenPaletteColorLookupTableData?: Uint8Array;
  bluePaletteColorLookupTableData?: Uint8Array;
  pixelData?: Uint8ClampedArray | Uint16Array | Int16Array | Uint8Array;
  imageData?: ImageData;
};

export type ImageTracker = {
  [key: string]: string;
} | null;

// the result of readFile or from data buffer
export type ImageObject = {
  file?: File;
  instanceUID: string;
  metadata: MetaData;
  dataSet?: DataSet;
  imageId?: string;
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

export type TypedArray =
  | Float64Array
  | Uint8Array
  | Uint8ClampedArray
  | Int8Array
  | Uint16Array
  | Int16Array
  | Int32Array
  | Uint32Array
  | Float32Array;

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
  imageIds3D: string[];
  instances: { [key: string]: Instance };
  instanceUIDs: { [key: string]: string };
  instanceUIDs3D: { [key: string]: string };
  numberOfImages: number;
  seriesDescription: string;
  seriesUID: string;
  uniqueUID: string;
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

export type SingleFrameCache = {
  pixelData: TypedArray;
  metadata: MetaData;
};

type contrast = { windowCenter: number; windowWidth: number };
type translation = { x: number; y: number };

export type KernelConfig = {
  label: string;
  size: number;
  kernel: number[][];
  modality?: string[];
};
export type ColormapPoint = {
  value: number;
  opacity: number;
  color: [number, number, number];
  layer: number;
};

export type ColormapCurve = {
  interpolationMethod: string;
  points: ColormapPoint[];
};

export type Colormap = {
  name: string;
  colormapCurves: ColormapCurve[];
};

export type VOI = {
  windowWidth: number;
  windowCenter: number;
  invert?: boolean;
};

export type ColormapConfig = {
  name: string;
  colormapCurves: ColormapCurve[];
};

export type FilterImageFrame = {
  width: number;
  height: number;
  pixelData: TypedArray;
};
export type ConvolutionKernels = { [key: string]: KernelConfig };
export type RenderProps = {
  filterName?: string;
  cached?: boolean;
  imageIndex?: number;
  scale?: number;
  rotation?: number;
  translation?: translation;
  voi?: contrast;
  colormap?: string;
  default?: {
    scale?: number;
    rotation?: number;
    translation?: translation;
    voi?: contrast;
  };
};
// Type definitions needed for the above functions

export interface CornerstoneElement {
  element: HTMLElement & {
    id: string;
  };
}
