import pkg from "./package.json";
const VERSION: string = pkg.version;
console.groupCollapsed(
  `%cLARVITAR %cv${VERSION}`,
  "color: #404888; background: #209A71; font-weight: 900;",
  "color: #BED730; background: #209A71; font-weight: 900;"
);

function warnDeprecation(originalName: string, aliasName: string) {
  console.warn(
    `%cDeprecation Warning: %c${aliasName} is deprecated and will be removed in a future release. Please use %c${originalName}%c instead.`,
    "color: orange; font-weight: bold;",
    "color: red;",
    "color: green; font-weight: bold;",
    "color: unset;"
  );
}

function createAliasWithWarning(
  originalFunction: Function,
  originalName: string,
  aliasName: string,
  onlyWarn: boolean = false
) {
  return function (...args: any) {
    warnDeprecation(originalName, aliasName);
    if (onlyWarn) {
      return;
    }
    return originalFunction(...args);
  };
}

import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import { parseDicom } from "dicom-parser";
import cornerstoneFileImageLoader from "cornerstone-file-image-loader";

import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
const segModule = cornerstoneTools.getModule("segmentation");

import { logger, setLogLevel, getLogLevel } from "./logger";
console.log(`Logging level set to: ${getLogLevel()}`);

import {
  checkAndClearMemory,
  checkMemoryAllocation,
  getUsedMemory,
  getAvailableMemory
} from "./imaging/monitors/memory";

import {
  getPerformanceMonitor,
  activatePerformanceMonitor,
  deactivatePerformanceMonitor
} from "./imaging/monitors/performance";

import store from "./imaging/imageStore";
console.log(store);
console.groupEnd();

import { parseContours } from "./imaging/imageContours";

import { parseECG } from "./imaging/parsers/ecg";

import {
  renderECG,
  unrenderECG,
  syncECGFrame,
  updateECGMarker,
  updateECGTotalTime,
  getDefaultECGLayout
} from "./imaging/waveforms/ecg";

import {
  getImagePresets,
  setImagePreset,
  setImageCustomPreset
} from "./imaging/imagePresets";

import {
  getNormalOrientation,
  getMinPixelValue,
  getMaxPixelValue,
  getMinMaxPixelValue,
  getPixelRepresentation,
  getTypedArrayFromDataType,
  getSortedStack,
  randomId,
  getMeanValue,
  getReslicedMetadata,
  getReslicedPixeldata,
  getDistanceBetweenSlices,
  getImageMetadata
} from "./imaging/imageUtils";

import {
  buildHeader,
  getCachedPixelData,
  buildData,
  buildDataAsync,
  importNRRDImage,
  exportImageToBase64,
  exportImageToBase64OriginalSizes
} from "./imaging/imageIo";

import { anonymize } from "./imaging/imageAnonymization";

import { customizeByteArray } from "./imaging/imageCustomization";

import {
  buildLayer,
  updateLayer,
  getActiveLayer,
  setActiveLayer
} from "./imaging/imageLayers";

import {
  initializeImageLoader,
  initializeWebImageLoader,
  initializeFileImageLoader,
  registerNRRDImageLoader,
  registerResliceLoader,
  registerMultiFrameImageLoader,
  registerSingleFrameImageLoader,
  registerDsaImageLoader,
  updateLoadedStack,
  reset
} from "./imaging/imageLoading";

import {
  readFile,
  readFiles,
  parseDataSet,
  clearImageParsing,
  convertQidoMetadata
} from "./imaging/imageParsing";

import {
  clearImageCache,
  clearStandardImageCache,
  clearDSAImageCache,
  loadAndCacheImages,
  renderFileImage,
  renderDICOMPDF,
  renderWebImage,
  disableViewport,
  unloadViewport,
  resizeViewport,
  renderImage,
  redrawImage,
  resetViewports,
  updateViewportData,
  storeViewportData,
  invertImage,
  flipImageHorizontal,
  flipImageVertical,
  rotateImageLeft,
  rotateImageRight,
  updateTemporalViewportData
} from "./imaging/imageRendering";

import { resliceSeries } from "./imaging/imageReslice";

import {
  addDiameterTool,
  addContoursTool,
  addMaskEditingTool,
  getCurrentMaskData,
  addStackStateToElement,
  addSeedsTool,
  clearMeasurements,
  getToolState,
  clearToolStateByName,
  updateDiameterTool,
  addToolStateSingleSlice,
  clearCornerstoneElements,
  syncToolStack,
  updateStackToolState,
  setSegmentationConfig
} from "./imaging/imageTools";

import {
  csToolsUpdateStack,
  initializeCSTools,
  setToolsStyle,
  addDefaultTools,
  addTool,
  setToolActive,
  setToolDisabled,
  setToolEnabled,
  setToolPassive
} from "./imaging/tools/main";

import {
  DEFAULT_TOOLS,
  dvTools,
  getDefaultToolsByType,
  setDefaultToolsProps,
  registerExternalTool
} from "./imaging/tools/default";

import {
  initSegmentationModule,
  addSegmentationMask,
  clearSegmentationState,
  deleteMask,
  setActiveLabelmap,
  setActiveSegment,
  enableBrushTool,
  disableBrushTool,
  undoLastStroke,
  redoLastStroke,
  setBrushProps,
  toggleContourMode,
  toggleVisibility,
  hexToRgb,
  rgbToHex,
  getActiveLabelmapBuffer
} from "./imaging/tools/segmentation";

import { getImageFrame } from "./imaging/loaders/commonLoader";

import {
  buildNrrdImage,
  getNrrdImageId,
  loadNrrdImage,
  getImageIdFromSlice,
  getSliceNumberFromImageId,
  getNrrdSerieDimensions
} from "./imaging/loaders/nrrdLoader";

import {
  getDicomImageId,
  cacheImage,
  cacheImages,
  loadAndCacheImageStack,
  loadAndCacheDsaImageStack
} from "./imaging/loaders/dicomLoader";

import { loadReslicedImage } from "./imaging/loaders/resliceLoader";

import {
  loadMultiFrameImage,
  buildMultiFrameImage,
  getMultiFrameImageId,
  clearMultiFrameCache
} from "./imaging/loaders/multiframeLoader";

import {
  setSingleFrameCache,
  clearSingleFrameCache,
  loadSingleFrameImage
} from "./imaging/loaders/singleFrameLoader";

import { populateDsaImageIds } from "./imaging/loaders/dsaImageLoader";

import {
  resetFileLoader,
  getFileCustomImageId
} from "./imaging/loaders/fileLoader";

import {
  getColormapsList,
  applyColorMap,
  addColorMap,
  fillPixelData,
  HSVToRGB
} from "./imaging/imageColormaps";

import { applyDSAShift } from "./imaging/postProcessing/applyDSA";
import {
  applyConvolutionFilter,
  addCustomKernel,
  getKernels
} from "./imaging/postProcessing/applyKernel";
import {
  addMouseKeyHandlers,
  removeMouseKeyHandlers,
  toggleMouseToolsListeners
} from "./imaging/tools/interaction";

import {
  updateImageManager,
  populateImageManager,
  getImageManager,
  resetImageManager,
  removeDataFromImageManager,
  getDataFromImageManager,
  getSopInstanceUIDFromImageManager,
  getImageTracker,
  populateGSPSManager,
  getGSPSManager,
  resetGSPSManager,
  getFileManager,
  resetFileManager,
  populateFileManager,
  getDataFromFileManager
} from "./imaging/imageManagers";

export {
  VERSION,
  // global cornerstone variables
  cornerstone,
  cornerstoneTools,
  parseDicom,
  cornerstoneFileImageLoader,
  segModule,
  cornerstoneDICOMImageLoader,
  // memory module
  checkAndClearMemory,
  checkMemoryAllocation,
  getUsedMemory,
  getAvailableMemory,
  // performance module
  getPerformanceMonitor,
  activatePerformanceMonitor,
  deactivatePerformanceMonitor,
  // larvitarStore
  store,
  // parsers
  parseECG,
  // waveforms
  renderECG,
  unrenderECG,
  syncECGFrame,
  updateECGMarker,
  updateECGTotalTime,
  getDefaultECGLayout,
  // imagePresets
  getImagePresets,
  setImagePreset,
  setImageCustomPreset,
  // imageUtils
  getNormalOrientation,
  getMinPixelValue,
  getMaxPixelValue,
  getMinMaxPixelValue,
  getPixelRepresentation,
  getTypedArrayFromDataType,
  getSortedStack,
  randomId,
  getMeanValue,
  getReslicedMetadata,
  getReslicedPixeldata,
  getDistanceBetweenSlices,
  getImageMetadata,
  // imageIo
  buildHeader,
  getCachedPixelData,
  buildData,
  buildDataAsync,
  importNRRDImage,
  exportImageToBase64,
  exportImageToBase64OriginalSizes,
  // imageAnonymization
  anonymize,
  //imageCustomization
  customizeByteArray,
  // imageLayers
  buildLayer,
  updateLayer,
  getActiveLayer,
  setActiveLayer,
  // imageLoading
  initializeImageLoader,
  initializeWebImageLoader,
  initializeFileImageLoader,
  registerNRRDImageLoader,
  registerResliceLoader,
  registerMultiFrameImageLoader,
  registerSingleFrameImageLoader,
  registerDsaImageLoader,
  updateLoadedStack,
  // General reset of cache, store and managers
  reset,
  // imageParsing
  readFile,
  readFiles,
  parseDataSet,
  clearImageParsing,
  convertQidoMetadata,
  // imageRendering
  clearImageCache,
  clearStandardImageCache,
  clearDSAImageCache,
  loadAndCacheImages,
  renderFileImage,
  renderDICOMPDF,
  renderWebImage,
  disableViewport,
  unloadViewport,
  resizeViewport,
  renderImage,
  redrawImage,
  resetViewports,
  updateViewportData,
  toggleMouseToolsListeners,
  storeViewportData,
  invertImage,
  flipImageHorizontal,
  flipImageVertical,
  rotateImageLeft,
  rotateImageRight,
  // imageManagers
  updateImageManager,
  populateImageManager,
  getImageManager,
  resetImageManager,
  removeDataFromImageManager,
  getDataFromImageManager,
  getSopInstanceUIDFromImageManager,
  getImageTracker,
  populateGSPSManager,
  getGSPSManager,
  resetGSPSManager,
  populateFileManager,
  getFileManager,
  resetFileManager,
  getDataFromFileManager,
  // imageReslice
  resliceSeries,
  // imageColormaps
  getColormapsList,
  applyColorMap,
  addColorMap,
  fillPixelData,
  HSVToRGB,
  // imageContours
  parseContours,
  // loaders/commonLoader
  getImageFrame,
  // loaders/nrrdLoader
  buildNrrdImage,
  getNrrdImageId,
  loadNrrdImage,
  getImageIdFromSlice,
  getSliceNumberFromImageId,
  getNrrdSerieDimensions,
  // loaders/resliceLoader
  loadReslicedImage,
  // loaders/dicomLoader
  getDicomImageId,
  cacheImage,
  cacheImages,
  loadAndCacheImageStack,
  loadAndCacheDsaImageStack,
  // loaders/multiframeLoader
  loadMultiFrameImage,
  buildMultiFrameImage,
  getMultiFrameImageId,
  clearMultiFrameCache,
  // loaders/singleFrameLoader
  setSingleFrameCache,
  clearSingleFrameCache,
  loadSingleFrameImage,
  // loaders/dsaImageLoader
  populateDsaImageIds,
  // loaders/fileLoader
  resetFileLoader,
  getFileCustomImageId,
  // imaging/postProcessing
  applyDSAShift,
  applyConvolutionFilter,
  addCustomKernel,
  getKernels,
  // imageTools
  addDiameterTool,
  addContoursTool,
  addMaskEditingTool,
  getCurrentMaskData,
  addStackStateToElement,
  addSeedsTool,
  clearMeasurements,
  getToolState,
  clearToolStateByName,
  updateDiameterTool,
  addToolStateSingleSlice,
  clearCornerstoneElements,
  syncToolStack,
  updateStackToolState,
  setSegmentationConfig,
  // tools/main
  csToolsUpdateStack,
  initializeCSTools,
  setToolsStyle,
  addDefaultTools,
  addTool,
  setToolActive,
  setToolDisabled,
  setToolEnabled,
  setToolPassive,
  // tools/default
  DEFAULT_TOOLS,
  dvTools,
  getDefaultToolsByType,
  setDefaultToolsProps,
  registerExternalTool,
  // tools/interaction
  addMouseKeyHandlers,
  removeMouseKeyHandlers,
  // tools/segmentation
  initSegmentationModule,
  addSegmentationMask,
  setActiveLabelmap,
  setActiveSegment,
  undoLastStroke,
  redoLastStroke,
  setBrushProps,
  hexToRgb,
  rgbToHex,
  clearSegmentationState,
  deleteMask,
  enableBrushTool,
  disableBrushTool,
  toggleContourMode,
  toggleVisibility,
  getActiveLabelmapBuffer,
  updateTemporalViewportData,
  // Logger
  logger,
  setLogLevel
};

// alias for backward compatibility
// deprecate in future release
export const updateLarvitarManager = createAliasWithWarning(
  updateImageManager,
  "updateImageManager",
  "updateLarvitarManager"
);

export const populateLarvitarManager = createAliasWithWarning(
  populateImageManager,
  "populateImageManager",
  "populateLarvitarManager"
);

export const getLarvitarManager = createAliasWithWarning(
  getImageManager,
  "getImageManager",
  "getLarvitarManager"
);

export const resetLarvitarManager = createAliasWithWarning(
  resetImageManager,
  "resetImageManager",
  "resetLarvitarManager"
);

export const removeSeriesFromLarvitarManager = createAliasWithWarning(
  removeDataFromImageManager,
  "removeDataFromImageManager",
  "removeSeriesFromLarvitarManager"
);

export const getSeriesDataFromLarvitarManager = createAliasWithWarning(
  getDataFromImageManager,
  "getDataFromImageManager",
  "getSeriesDataFromLarvitarManager"
);

export const getSopInstanceUIDFromLarvitarManager = createAliasWithWarning(
  getSopInstanceUIDFromImageManager,
  "getSopInstanceUIDFromImageManager",
  "getSopInstanceUIDFromLarvitarManager"
);

export const getLarvitarImageTracker = createAliasWithWarning(
  getImageTracker,
  "getImageTracker",
  "getLarvitarImageTracker"
);

export const populateInstanceGSPSDict = createAliasWithWarning(
  populateGSPSManager,
  "populateGSPSManager",
  "populateInstanceGSPSDict"
);

export const getInstanceGSPSDict = createAliasWithWarning(
  getGSPSManager,
  "getGSPSManager",
  "getInstanceGSPSDict"
);

export const resetInstanceGSPSDict = createAliasWithWarning(
  resetGSPSManager,
  "resetGSPSManager",
  "resetInstanceGSPSDict"
);

export const getFileImageId = createAliasWithWarning(
  getDataFromFileManager,
  "getDataFromFileManager",
  "getFileImageId"
);

export const updateImage = createAliasWithWarning(
  renderImage,
  "renderImage",
  "updateImage",
  true
);

export const csToolsUpdateImageIds = createAliasWithWarning(
  csToolsUpdateStack,
  "csToolsUpdateStack",
  "csToolsUpdateImageIds"
);

export const csToolsCreateStack = createAliasWithWarning(
  csToolsUpdateStack,
  "csToolsUpdateStack",
  "csToolsCreateStack"
);
