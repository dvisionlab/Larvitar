import { vec2 } from "cornerstone-core";
import { DataSet } from "dicom-parser";

// TODO-ts: differentiate each single metadata
export type MetadataValue = string | number | string[] | number[] | boolean | null | undefined; // null or undefined is only for nrrd

export type Instance = {
  metadata: { [key: string]: MetadataValue };
  pixelData: Uint16Array; //TODO-ts: check if this is correct
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
  dataSet: DataSet; 
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
   [key: string]: NrrdSeries ;
} | null;

export type ImageFrame = {
  pixelData: Uint8ClampedArray;
  bitsAllocated: number;
  rows: number;           
  columns: number;
  photometricInterpretation: string;  
  samplesPerPixel: number;
  smallestPixelValue: number;
  largestPixelValue: number;
  imageData: ImageData;
}

export type ImageTracker = {
  [key: string]: string;
} | null;

// the result of readFile
export type ImageObject = {
  file: File;
  instanceUID: string;
  metadata: { [key: string]: MetadataValue };
  dataSet: DataSet;
}

export type CachingResponse = {
  seriesId: string,
  loading: number,
  series: Partial<Series>
}
