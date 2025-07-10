/** @module loaders/commonLoader
 *  @desc This file provides functionalities for
 *        custom DICOMImageLoaders
 */

// external libraries
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import { DataSet } from "dicom-parser";
import type { ImageFrame, MetaData } from "../types";

/*
 * This module provides the following functions to be exported:
 * getImageFrame(metadata, dataSet)
 */

/**
 * Compute and return image frame
 * @instance
 * @function getImageFrame
 * @param {MetaData} metadata metadata object
 * @param {DataSet} dataSet dicom dataset
 * @returns {Object} specific image frame
 */
export const getImageFrame = function (
  metadata: MetaData,
  dataSet?: DataSet
): ImageFrame {
  let imagePixelModule: Partial<ImageFrame>;

  if (dataSet) {
    imagePixelModule =
      cornerstoneDICOMImageLoader.wadouri.metaData.getImagePixelModule(dataSet);
  } else {
    imagePixelModule = {
      samplesPerPixel: metadata.x00280002,
      photometricInterpretation: metadata.x00280004,
      planarConfiguration: metadata.x00280006,
      rows: metadata.x00280010,
      columns: metadata.x00280011,
      bitsAllocated: metadata.x00280100 as number | undefined,
      pixelRepresentation: metadata.x00280103 as number | undefined,
      smallestPixelValue: metadata.x00280106,
      largestPixelValue: metadata.x00280107,
      redPaletteColorLookupTableDescriptor: metadata.x00281101,
      greenPaletteColorLookupTableDescriptor: metadata.x00281102,
      bluePaletteColorLookupTableDescriptor: metadata.x00281103,
      redPaletteColorLookupTableData: metadata.x00281201 as
        | Uint8Array
        | undefined,
      greenPaletteColorLookupTableData: metadata.x00281202 as
        | Uint8Array
        | undefined,
      bluePaletteColorLookupTableData: metadata.x00281203 as
        | Uint8Array
        | undefined
    };
  }

  return {
    samplesPerPixel: imagePixelModule.samplesPerPixel,
    photometricInterpretation: imagePixelModule.photometricInterpretation,
    planarConfiguration: imagePixelModule.planarConfiguration,
    rows: imagePixelModule.rows,
    columns: imagePixelModule.columns,
    bitsAllocated: imagePixelModule.bitsAllocated,
    pixelRepresentation: imagePixelModule.pixelRepresentation, // 0 = unsigned,
    smallestPixelValue: imagePixelModule.smallestPixelValue,
    largestPixelValue: imagePixelModule.largestPixelValue,
    redPaletteColorLookupTableDescriptor:
      imagePixelModule.redPaletteColorLookupTableDescriptor,
    greenPaletteColorLookupTableDescriptor:
      imagePixelModule.greenPaletteColorLookupTableDescriptor,
    bluePaletteColorLookupTableDescriptor:
      imagePixelModule.bluePaletteColorLookupTableDescriptor,
    redPaletteColorLookupTableData:
      imagePixelModule.redPaletteColorLookupTableData,
    greenPaletteColorLookupTableData:
      imagePixelModule.greenPaletteColorLookupTableData,
    bluePaletteColorLookupTableData:
      imagePixelModule.bluePaletteColorLookupTableData,
    pixelData: undefined, // populated later after decoding,
    imageData: undefined
  };
};
