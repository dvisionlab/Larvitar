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
  export3DImageToBase64,
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
  registerExternalTool,
  registerCursor
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
  applySharpening,
  applyGaussianBlur,
  addCustomKernel,
  getKernels
} from "./imaging/postProcessing/applyKernel";
import {
  addMouseKeyHandlers,
  removeMouseKeyHandlers,
  toggleMouseToolsListeners
} from "./imaging/tools/interaction";

// Cornestone 3D
import * as _cornerstone from "@cornerstonejs/core"; // Imports the main entry point
import * as _cornerstoneTools from "@cornerstonejs/tools";
import { default as _cornerstoneDICOMImageLoader } from "@cornerstonejs/dicom-image-loader";
import { initializeImageLoader as _initializeImageLoader } from "./imaging3d/imageLoading";
import { registerStreamingImageVolume as _registerStreamingImageVolume } from "./imaging3d/imageLoading";
import { loadAndCacheMetadata as _loadAndCacheMetadata } from "./imaging3d/imageLoading";
import { readFiles as _readFiles } from "./imaging3d/imageParsing";
import { convertMetadata as _convertMetadata } from "./imaging3d/imageParsing";
import {
  renderImage as _renderImage,
  resetViewports as _resetViewports
} from "./imaging3d/imageRendering";
import { initializeRenderingEngine as _initializeRenderingEngine } from "./imaging3d/imageRendering";
import { destroyRenderingEngine as _destroyRenderingEngine } from "./imaging3d/imageRendering";
import { initializeVolumeViewports as _initializeVolumeViewports } from "./imaging3d/imageRendering";
import { loadAndCacheVolume as _loadAndCacheVolume } from "./imaging3d/imageRendering";
import { setVolumeForRenderingEngine as _setVolumeForRenderingEngine } from "./imaging3d/imageRendering";
import { resizeRenderingEngine as _resizeRenderingEngine } from "./imaging3d/imageRendering";
import { renderMpr as _renderMpr } from "./imaging3d/imageRendering";
import { unloadMpr as _unloadMpr } from "./imaging3d/imageRendering";
import { prefetchMetadataInformation as _prefetchMetadataInformation } from "./imaging3d/multiframe";
import { convertMultiframeImageIds as _convertMultiframeImageIds } from "./imaging3d/multiframe";
import { initializeVideoViewport as _initializeVideoViewport } from "./imaging3d/imageRendering";
import { renderVideo as _renderVideo } from "./imaging3d/imageRendering";
import { unloadVideo as _unloadVideo } from "./imaging3d/imageRendering";
import { playVideo as _playVideo } from "./imaging3d/video/videoInteractions";
import { pauseVideo as _pauseVideo } from "./imaging3d/video/videoInteractions";
import { toggleVideoPlayback as _toggleVideoPlayback } from "./imaging3d/video/videoInteractions";
import { scrollVideo as _scrollVideo } from "./imaging3d/video/videoInteractions";
import { setPlaybackRate as _setPlaybackRate } from "./imaging3d/video/videoInteractions";
import { setFrameNumber as _setFrameNumber } from "./imaging3d/video/videoInteractions";
import { setTime as _setTime } from "./imaging3d/video/videoInteractions";
import { setFrameRange as _setFrameRange } from "./imaging3d/video/videoInteractions";
import { getFrameNumber as _getFrameNumber } from "./imaging3d/video/videoInteractions";
import { enableAudioOnVideo as _enableAudioOnVideo } from "./imaging3d/video/videoInteractions";
import { disableAudioOnVideo as _disableAudioOnVideo } from "./imaging3d/video/videoInteractions";

import {
  addDefaultTools as _addDefaultTools,
  initializeCSTools as _initializeCSTools,
  setToolsStyle as _setToolsStyle,
  addTool as _addTool,
  setToolActive as _setToolActive,
  setToolPassive as _setToolPassive,
  setToolEnabled as _setToolEnabled,
  setToolDisabled as _setToolDisabled,
  syncViewportsSlabAndCamera as _syncViewportsSlabAndCamera,
  syncViewportsVOI as _syncViewportsVOI,
  syncViewports as _syncViewports,
  createToolGroup as _createToolGroup,
  destroyToolGroup as _destroyToolGroup,
  setSlab as _setSlab,
  setWWWL as _setWWWL
} from "./imaging3d/tools/main";
import _CustomWWWLTool from "./imaging3d/tools/custom/exampleCustomTool";

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
  // cs3D
  _cornerstone,
  _cornerstoneDICOMImageLoader,
  _cornerstoneTools,
  _initializeCSTools,
  _initializeImageLoader,
  _readFiles,
  _renderImage,
  // mpr
  _resetViewports,
  _renderMpr,
  _unloadMpr,
  _initializeRenderingEngine,
  _destroyRenderingEngine,
  _resizeRenderingEngine,
  _initializeVolumeViewports,
  _loadAndCacheVolume,
  _setVolumeForRenderingEngine,
  _registerStreamingImageVolume,
  _convertMetadata,
  _loadAndCacheMetadata,
  _prefetchMetadataInformation,
  // multiframe
  _convertMultiframeImageIds,
  //video
  _initializeVideoViewport,
  _renderVideo,
  _unloadVideo,
  _enableAudioOnVideo,
  _disableAudioOnVideo,
  _getFrameNumber,
  _playVideo,
  _pauseVideo,
  _toggleVideoPlayback,
  _scrollVideo,
  _setPlaybackRate,
  _setFrameNumber,
  _setTime,
  _setFrameRange,
  // tools
  _addDefaultTools,
  _addTool,
  _setToolActive,
  _setToolPassive,
  _setToolEnabled,
  _setToolDisabled,
  _syncViewportsSlabAndCamera,
  _syncViewportsVOI,
  _syncViewports,
  _createToolGroup,
  _destroyToolGroup,
  _setWWWL,
  _setSlab,
  _CustomWWWLTool,
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
  export3DImageToBase64,
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
  applySharpening,
  applyGaussianBlur,
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
  registerCursor,
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
