import { vec2 } from "cornerstone-core";
import { DataSet } from "dicom-parser";

// TODO-ts: differentiate each single metadata
export type MetadataValue =
  | string
  | number
  | string[]
  | number[]
  | boolean
  | null
  | undefined; // null or undefined is only for nrrd

export interface Image extends cornerstone.Image {
  render?: Function;
  decodeTimeInMS?: number;
  loadTimeInMS?: number;
  webWorkerTimeInMS?: number;
  metadata: { [key: string]: MetadataValue };
  data?: DataSet;
  floatPixelData?: Float32Array;
}

export type Instance = {
  metadata: { [key: string]: MetadataValue };
  pixelData: TypedArray;
  dataSet?: DataSet | null;
  file?: File | null;
};

export type ReslicedInstance = {
  metadata: { [key: string]: MetadataValue };
  instanceId?: string;
  permuteTable?: [number, number, number];
};

export type Series = {
  imageIds: string[];
  instances: { [key: string]: Instance };
  seriesDescription?: string;
  anonymized?: boolean;
  bytes: number;
  seriesUID: string;
  currentImageIdIndex: number;
  numberOfImages: number;
  isMultiframe: boolean;
  color?: boolean;
  dataSet: DataSet | null;
  frameDelay?: number;
  frameTime?: number;
  instanceUIDs: { [key: string]: string };
  is4D: boolean;
  isPDF: boolean;
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

export interface Layer extends cornerstone.EnabledElementLayer {
  id: string;
}

export interface Viewport extends cornerstone.Viewport {
  newImageIdIndex: number;
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
  [key: string]: NrrdSeries;
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
  metadata: { [key: string]: MetadataValue };
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