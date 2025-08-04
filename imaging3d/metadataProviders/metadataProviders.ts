// external libraries
import { metaData } from "@cornerstonejs/core";

// internal libraries
import { registerCineModuleProvider } from "./cineMetadataProvider";
import { registerGeneralSeriesModuleProvider } from "./generalSeriesProvider";
import { registerImageUrlModuleProvider } from "./imageUrlMetadataProvider";
import { registerImagePlaneModuleProvider } from "./imagePlaneMetadataProvider";

import type { MetaData } from "../../imaging/types";
import { CineMetadata, GeneralSeriesMetadata } from "../types";
import { logger } from "../../logger";

type MetadataType =
  | "calibrationModule"
  | "cineModule"
  | "generalImageModule"
  | "generalSeriesModule"
  | "generalStudyModule"
  | "imagePixelModule"
  | "imagePlaneModule"
  | "imageUrlModule"
  | "modalityLutModule"
  | "multiFrameModule"
  | "nmMultiframeGeometryModule"
  | "overlayPlaneModule"
  | "patientModule"
  | "patientStudyModule"
  | "petImageModule"
  | "petIsotopeModule"
  | "petSeriesModule"
  | "sopCommonModule"
  | "ultrasoundEnhancedRegionModule"
  | "voiLutModule";

const metadataMaps: Record<MetadataType, Map<string, any>> = {
  calibrationModule: new Map(),
  cineModule: new Map(),
  generalImageModule: new Map(),
  generalSeriesModule: new Map(),
  generalStudyModule: new Map(),
  imagePixelModule: new Map(),
  imagePlaneModule: new Map(),
  imageUrlModule: new Map(),
  modalityLutModule: new Map(),
  multiFrameModule: new Map(),
  nmMultiframeGeometryModule: new Map(),
  overlayPlaneModule: new Map(),
  patientModule: new Map(),
  patientStudyModule: new Map(),
  petImageModule: new Map(),
  petIsotopeModule: new Map(),
  petSeriesModule: new Map(),
  sopCommonModule: new Map(),
  ultrasoundEnhancedRegionModule: new Map(),
  voiLutModule: new Map()
};

function createProvider(type: MetadataType) {
  return (requestedType: string, imageId: string) => {
    if (requestedType === type) {
      return metadataMaps[type].get(imageId);
    }
    return undefined;
  };
}

export function registerAllMetadataProviders() {
  (Object.keys(metadataMaps) as MetadataType[]).forEach(type => {
    logger.debug(`Registering metadata provider for type: ${type}`);
    // Register each metadata provider with the meta
    metaData.addProvider(createProvider(type));
  });
}

export function addMetadataForImageId(imageId: string, metadata: MetaData) {
  // TODO: Implement logic to extract and add metadata for the imageId
  // const calibrationMetadata = getCalibrationMetadata(metadata);
  // https://github.com/cornerstonejs/cornerstone3D/blob/ffafeda5af8b68d84749c0a3c05acdc8c4de60ec/packages/dicomImageLoader/src/imageLoader/wadouri/metaData/metaDataProvider.ts#L304

  // CINE MODULE
  const cineMetadata: CineMetadata = {
    frameTime: 1000 / ((metadata.x00180040 as number) || 30),
    frameRate: (metadata.x00180040 as number) || 30,
    numberOfFrames: metadata.numberOfFrames || 1
  };
  metadataMaps.cineModule.set(imageId, cineMetadata);

  // GENERAL IMAGE MODULE
  const generalImageMetadata = {
    sopInstanceUID: metadata.x00080018 || "",
    instanceNumber: metadata.x00200013 || 0,
    lossyImageCompression: metadata.x00282110 || "",
    lossyImageCompressionRatio: metadata.x00282112 || 1,
    lossyImageCompressionMethod: metadata.x00282114 || ""
  };
  metadataMaps.generalImageModule.set(imageId, generalImageMetadata);

  // GENERAL SERIES MODULE
  const generalSeriesMetadata: GeneralSeriesMetadata = {
    seriesInstanceUID: metadata.x0020000e || "",
    studyInstanceUID: metadata.x0020000d || "",
    seriesNumber: metadata.x00200011 || 0,
    seriesDescription: metadata.x0008103e || "",
    modality: metadata.x00080060 || "",
    seriesDate: metadata.seriesDate || new Date().toISOString().split("T")[0],
    seriesTime:
      metadata["x00080031"] || new Date().toTimeString().split(" ")[0],
    acquisitionDate: metadata.x00080022 || "",
    acquisitionTime: metadata.x00080032 || ""
  };
  metadataMaps.generalSeriesModule.set(imageId, generalSeriesMetadata);

  // GENERAL STUDY MODULE
  const generalStudyMetadata = {
    studyDate: metadata.x00080020 || new Date().toISOString().split("T")[0],
    studyTime: metadata.x00080030 || new Date().toTimeString().split(" ")[0],
    studyDescription: metadata.x00081030 || "",
    accessionNumber: metadata.x00080050 || ""
  };
  metadataMaps.generalStudyModule.set(imageId, generalStudyMetadata);

  // IMAGE PIXEL MODULE
  // https://github.com/cornerstonejs/cornerstone3D/blob/ffafeda5af8b68d84749c0a3c05acdc8c4de60ec/packages/dicomImageLoader/src/imageLoader/wadouri/metaData/getImagePixelModule.ts
  // https://github.com/cornerstonejs/cornerstone3D/blob/ffafeda5af8b68d84749c0a3c05acdc8c4de60ec/packages/dicomImageLoader/src/imageLoader/wadors/metaData/metaDataProvider.ts#L235
  const imagePixelMetadata = {
    samplePerPixel: metadata.x00280002 || 1,
    photometricInterpretation: metadata.x00280004 || "",
    rows: metadata.x00280010 || 0,
    columns: metadata.x00280011 || 0,
    bitsAllocated: metadata.x00280100 || 0,
    bitsStored: metadata.x00280101 || 0,
    highBit: metadata.x00280102 || 0,
    pixelRepresentation: metadata.x00280103 || 0,
    planarConfiguration: metadata.x00280006 || 0,
    pixelAspectRatio: metadata.x00280034 || [1, 1],
    smallestPixelValue: metadata.x00280106 || 0,
    largestPixelValue: metadata.x00280107 || 0,
    redPaletteColorLookupTableDescriptor: metadata.x00281201 || [0, 0, 0],
    greenPaletteColorLookupTableDescriptor: metadata.x00281202 || [0, 0, 0],
    bluePaletteColorLookupTableDescriptor: metadata.x00281203 || [0, 0, 0],
    redPaletteColorLookupTableData: metadata.x00281201 || [0, 0, 0],
    greenPaletteColorLookupTableData: metadata.x00281202 || [0, 0, 0],
    bluePaletteColorLookupTableData: metadata.x00281203 || [0, 0, 0]
  };
  metadataMaps.imagePixelModule.set(imageId, imagePixelMetadata);

  // IMAGE PLANE MODULE
  let rowCosines = null;
  let columnCosines = null;
  let imageOrientationPatient = metadata.x00200037 || [];
  if (imageOrientationPatient.length === 6) {
    rowCosines = [
      imageOrientationPatient[0],
      imageOrientationPatient[1],
      imageOrientationPatient[2]
    ];
    columnCosines = [
      imageOrientationPatient[3],
      imageOrientationPatient[4],
      imageOrientationPatient[5]
    ];
  } else {
    rowCosines = [1, 0, 0];
    columnCosines = [0, 1, 0];
    imageOrientationPatient = [1, 0, 0, 0, 1, 0];
  }
  const imagePlaneMetadata = {
    frameOfReferenceUID: metadata.x00200052 || "",
    rows: metadata.x00280010 || 0,
    columns: metadata.x00280011 || 0,
    imageOrientationPatient: imageOrientationPatient,
    rowCosines: rowCosines || [],
    columnCosines: columnCosines || [],
    imagePositionPatient: metadata.x00200032 || [],
    sliceThickness: metadata.x00180050 || 0,
    sliceLocation: metadata.x00201041 || 0,
    pixelSpacing: metadata.x00280030 || [1, 1],
    rowPixelSpacing: metadata.x00280031 || [1],
    columnPixelSpacing: metadata.x00280032 || [1]
  };
  metadataMaps.imagePlaneModule.set(imageId, imagePlaneMetadata);

  // IMAGE URL MODULE
  // TO BE DEFINED AFTER VIDEO ENCODING SEPARATELY

  // MODALITY LUT MODULE
  const modalityLutMetadata = {
    rescaleIntercept: metadata.x00281052 || 0,
    rescaleSlope: metadata.x00281053 || 1,
    rescaleType: metadata.x00281054 || ""
  };
  metadataMaps.modalityLutModule.set(imageId, modalityLutMetadata);

  // MULTI FRAME MODULE
  // TO BE HANDLED SEPARATELY

  // NM_MULTIFRAME_GEOMETRY MODULE
  // TODO https://github.com/cornerstonejs/cornerstone3D/blob/ffafeda5af8b68d84749c0a3c05acdc8c4de60ec/packages/dicomImageLoader/src/imageLoader/wadors/metaData/metaDataProvider.ts#L126
  // const nmMultiframeGeometryMetadata = {};
  // metadataMaps.nmMultiframeGeometryModule.set(
  //   imageId,
  //   nmMultiframeGeometryMetadata
  // );

  // OVERLAY_PLANE MODULE
  // TODO  https://github.com/cornerstonejs/cornerstone3D/blob/ffafeda5af8b68d84749c0a3c05acdc8c4de60ec/packages/dicomImageLoader/src/imageLoader/wadors/metaData/getOverlayPlaneModule.ts#L5
  // const overlayPlaneMetadata = {};
  // metadataMaps.overlayPlaneModule.set(imageId, overlayPlaneMetadata);

  // PATIENT MODULE
  const patientMetadata = {
    patientName: metadata.x00100010 || "",
    patientID: metadata.x00100020 || ""
  };
  metadataMaps.patientModule.set(imageId, patientMetadata);

  // PATIENT STUDY MODULE
  const patientStudyMetadata = {
    patientAge: metadata.x00101010 || "",
    patientSex: metadata.x00101040 || "",
    patientSize: metadata.x00101020 || 0,
    patientWeight: metadata.x00101030 || 0
  };
  metadataMaps.patientStudyModule.set(imageId, patientStudyMetadata);

  // PET IMAGE MODULE
  // TODO

  // PET ISOTOPE MODULE
  // TODO

  // PET SERIES MODULE
  // TODO

  // SOP COMMON MODULE
  const sopCommonMetadata = {
    sopClassUID: metadata.x00080016 || "",
    sopInstanceUID: metadata.x00080018 || ""
  };
  metadataMaps.sopCommonModule.set(imageId, sopCommonMetadata);

  // ULTRASOUND ENHANCED REGION MODULE
  // TODO

  // VOI LUT MODULE
  const voiLutMetadata = {
    windowCenter: metadata.x00281050 || 0,
    windowWidth: metadata.x00281051 || 0,
    voiLutFunction: metadata.x00281056 || ""
  };
  metadataMaps.voiLutModule.set(imageId, voiLutMetadata);
}
/**
 * Registers all metadata providers for the imaging3d module.
 * This function should be called to ensure that all necessary metadata providers
 * are available for use in the application.
 * It includes providers for cine metadata, general series metadata, image URLs,
 * and image plane metadata.
 * @instance
 * @function registerMetadataProviders
 * @returns {void}
 */
export const registerMetadataProviders = function (): void {
  registerCineModuleProvider();
  registerGeneralSeriesModuleProvider();
  registerImageUrlModuleProvider();
  registerImagePlaneModuleProvider();
};
