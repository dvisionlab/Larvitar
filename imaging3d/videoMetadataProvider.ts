import { metaData } from "@cornerstonejs/core";
import { MetaData } from "../imaging/types";
import {
  CineMetadata,
  GeneralSeriesMetadata,
  ImagePlaneMetadata,
  ImageUrlMetadata
} from "./types";

// Maps to store metadata: imageId → Provider Type
const imageUrlModuleMap = new Map<string, ImageUrlMetadata>();
const generalSeriesModuleMap = new Map<string, GeneralSeriesMetadata>();
const cineModuleMap = new Map<string, CineMetadata>();
const imagePlaneModuleMap = new Map<string, ImagePlaneMetadata>();

function imageUrlModuleProvider(type: string, imageId: string) {
  if (type === "imageUrlModule") {
    return imageUrlModuleMap.get(imageId);
  }
  return undefined;
}

function generalSeriesModuleProvider(type: string, imageId: string) {
  if (type === "generalSeriesModule") {
    return generalSeriesModuleMap.get(imageId);
  }
  return undefined;
}

function cineModuleProvider(type: string, imageId: string) {
  if (type === "cineModule") {
    return cineModuleMap.get(imageId);
  }
  return undefined;
}

function imagePlaneModuleProvider(type: string, imageId: string) {
  if (type === "imagePlaneModule") {
    return imagePlaneModuleMap.get(imageId);
  }
  return undefined;
}

export function registerVideoMetadataProviders() {
  metaData.addProvider(imageUrlModuleProvider);
  metaData.addProvider(generalSeriesModuleProvider);
  metaData.addProvider(cineModuleProvider);
  metaData.addProvider(imagePlaneModuleProvider);
}

export function addCompleteVideoMetadata(params: {
  imageId: string;
  videoUrl: string;
  metadata: MetaData;
}) {
  const { imageId, videoUrl, metadata } = params;

  const frameRate = metadata["x00180040"] || 30;
  const frameTime = 1000 / frameRate;

  addVideoMetadata(imageId, {
    frameTime,
    numberOfFrames: metadata.numberOfFrames || 1,
    frameRate
  });

  addImageUrlMetadata(imageId, { rendered: videoUrl });

  addGeneralSeriesMetadata(imageId, {
    seriesInstanceUID: metadata.seriesUID!,
    studyInstanceUID: metadata.studyUID!,
    seriesNumber: metadata["x00200011"] || 1,
    seriesDescription: metadata.seriesDescription || "Video Series",
    modality: metadata.seriesModality || "XC",
    seriesDate: metadata.seriesDate || new Date().toISOString().split("T")[0],
    seriesTime: metadata["x00080031"] || new Date().toTimeString().split(" ")[0]
  });

  addImagePlaneMetadata(imageId, {
    frameOfReferenceUID: metadata["x00200052"] || metadata.studyUID!,
    rows: metadata.rows!,
    columns: metadata.cols!,
    imageOrientationPatient: metadata.imageOrientation || [1, 0, 0, 0, 1, 0],
    rowCosines: metadata["x00200037"]?.slice(0, 3) || [1, 0, 0],
    columnCosines: metadata["x00200037"]?.slice(3, 6) || [0, 1, 0],
    imagePositionPatient: metadata.imagePosition || [0, 0, 0],
    sliceThickness: (metadata.sliceThickness as number) || 1,
    sliceLocation: metadata["x00201041"] || 0,
    pixelSpacing: metadata.pixelSpacing || [1, 1],
    rowPixelSpacing: metadata.pixelSpacing ? metadata.pixelSpacing[1] : 1,
    columnPixelSpacing: metadata.pixelSpacing ? metadata.pixelSpacing[0] : 1
  });
}

export function addImageUrlMetadata(
  imageId: string,
  imageUrlMetadata: ImageUrlMetadata
) {
  imageUrlModuleMap.set(imageId, imageUrlMetadata);
}

export function addGeneralSeriesMetadata(
  imageId: string,
  seriesMetadata: GeneralSeriesMetadata
) {
  generalSeriesModuleMap.set(imageId, seriesMetadata);
}

export function addVideoMetadata(
  imageId: string,
  videoMetadata: {
    frameTime: number;
    numberOfFrames: number;
    frameRate: number;
  }
) {
  cineModuleMap.set(imageId, videoMetadata);
}

export function addImagePlaneMetadata(
  imageId: string,
  imagePlaneMetadata: ImagePlaneMetadata
) {
  imagePlaneModuleMap.set(imageId, imagePlaneMetadata);
}
