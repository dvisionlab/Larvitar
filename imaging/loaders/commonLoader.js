/*
 This file provides functionalities for
 custom WadoImageLoaders
*/

// external libraries
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";

// internal libraries
import { getCustomImageId, getSerieDimensions } from "./nrrdLoader";
import { getDicomImageId } from "./dicomLoader";
import { getSeriesData as getSeriesDataFromNrrdLoader } from "./nrrdLoader";
import { getSeriesData as getSeriesDataFromDicomLoader } from "./dicomLoader";
/*
 * This module provides the following functions to be exported:
 * getCustomImageId(loaderName)
 * getSerieDimensions()
 * getImageFrame(metadata, dataSet)
 * getSeriesData(loaderName, seriesId)
 */

// ===========================================================================
// Return the data of a specific seriesId stored in a custom Loader Manager ==
// ===========================================================================
export const getSeriesData = function(seriesId, loaderName) {
  if (loaderName == "nrrdLoader") {
  } else {
  }
  return loaderName == "nrrdLoader"
    ? getSeriesDataFromNrrdLoader(seriesId)
    : getSeriesDataFromDicomLoader(seriesId);
};

// ============================================
// Generate a custom ImageId from loader name ==
// ============================================
export const getCustomImageId = function(loaderName) {
  if (loaderName == "nrrdLoader") {
    return getCustomImageId(loaderName);
  } else {
    return getDicomImageId(loaderName);
  }
};

// ==========================
// Return series dimension ==
// ==========================
export const getSerieDimensions = function() {
  // TODO FOR DICOM LOADER
  return getSerieDimensions();
};

// =================================
// Compute and return image frame ==
// =================================
export const getImageFrame = function(metadata, dataSet) {
  let imagePixelModule;

  if (dataSet) {
    imagePixelModule = cornerstoneWADOImageLoader.wadouri.getImagePixelModule(
      dataSet
    );
  } else {
    imagePixelModule = {
      samplesPerPixel: metadata.x00280002,
      photometricInterpretation: metadata.x00280004,
      planarConfiguration: metadata.x00280006,
      rows: metadata.x00280010,
      columns: metadata.x00280011,
      bitsAllocated: metadata.x00280100,
      pixelRepresentation: metadata.x00280103,
      smallestPixelValue: metadata.x00280106,
      largestPixelValue: metadata.x00280107,
      redPaletteColorLookupTableDescriptor: metadata.x00281101,
      greenPaletteColorLookupTableDescriptor: metadata.x00281102,
      bluePaletteColorLookupTableDescriptor: metadata.x00281103,
      redPaletteColorLookupTableData: metadata.x00281201,
      greenPaletteColorLookupTableData: metadata.x00281202,
      bluePaletteColorLookupTableData: metadata.x00281203
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
    pixelData: undefined // populated later after decoding
  };
};
