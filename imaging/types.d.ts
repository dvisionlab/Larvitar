import { vec2 } from "cornerstone-core";

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
}