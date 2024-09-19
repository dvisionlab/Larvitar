import pkg from "./package.json";
const VERSION: string = pkg.version;
console.groupCollapsed(
  `%cLARVITAR %cv${VERSION}`,
  "color: #404888; background: #209A71; font-weight: 900;",
  "color: #BED730; background: #209A71; font-weight: 900;"
);

import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import { parseDicom } from "dicom-parser";
import cornerstoneFileImageLoader from "cornerstone-file-image-loader";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
const segModule = cornerstoneTools.getModule("segmentation");

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
  updateECGFrame,
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
  registerDsaImageLoader,
  updateLoadedStack
} from "./imaging/imageLoading";

import {
  readFile,
  readFiles,
  parseDataSet,
  clearImageParsing
} from "./imaging/imageParsing";

import {
  clearImageCache,
  loadAndCacheImages,
  renderFileImage,
  renderDICOMPDF,
  renderWebImage,
  disableViewport,
  unloadViewport,
  resizeViewport,
  renderImage,
  updateImage,
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
  csToolsCreateStack,
  csToolsUpdateImageIds,
  csToolsUpdateImageIndex,
  initializeCSTools,
  setToolsStyle,
  addDefaultTools,
  addTool,
  setToolActive,
  setToolDisabled,
  setToolEnabled,
  setToolPassive,
  exportAnnotations
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

import {
  updateLarvitarManager,
  populateLarvitarManager,
  populateInstanceGSPSDict,
  getLarvitarManager,
  getInstanceGSPSDict,
  getLarvitarImageTracker,
  resetLarvitarManager,
  resetInstanceGSPSDict,
  removeSeriesFromLarvitarManager,
  getSeriesDataFromLarvitarManager,
  getImageFrame,
  getSopInstanceUIDFromLarvitarManager
} from "./imaging/loaders/commonLoader";

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

import { populateDsaImageIds } from "./imaging/loaders/dsaImageLoader";

import {
  getFileManager,
  resetFileLoader,
  resetFileManager,
  populateFileManager,
  getFileImageId
} from "./imaging/loaders/fileLoader";

import {
  getColormapsList,
  applyColorMap,
  addColorMap,
  fillPixelData,
  HSVToRGB
} from "./imaging/imageColormaps";

import { applyDSAShift } from "./imaging/postProcessing/applyDSA";

import { saveAnnotations, loadAnnotations } from "./imaging/tools/io";

import {
  addMouseKeyHandlers,
  removeMouseKeyHandlers,
  toggleMouseToolsListeners
} from "./imaging/tools/interaction";

// Cornestone 3D
import * as _cornerstone from "@cornerstonejs/core";
import * as _cornerstoneTools from "@cornerstonejs/tools";
import { default as _cornerstoneDICOMImageLoader } from "@cornerstonejs/dicom-image-loader";
import { initializeImageLoader as _initializeImageLoader } from "./imaging3d/imageLoading";
import { registerStreamingImageVolume as _registerStreamingImageVolume } from "./imaging3d/imageLoading";
import { loadAndCacheMetadata as _loadAndCacheMetadata } from "./imaging3d/imageLoading";
import { readFiles as _readFiles } from "./imaging3d/imageParsing";
import { convertMetadata as _convertMetadata } from "./imaging3d/imageParsing";
import { renderImage as _renderImage } from "./imaging3d/imageRendering";
import { renderMpr as _renderMpr } from "./imaging3d/imageRendering";
import { prefetchMetadataInformation as _prefetchMetadataInformation } from "./imaging3d/multiframe";
import { convertMultiframeImageIds as _convertMultiframeImageIds } from "./imaging3d/multiframe";
import { addDefaultTools as _addDefaultTools } from "./imaging3d/tools/main";

export {
  // cs3D
  _cornerstone,
  _cornerstoneDICOMImageLoader,
  _cornerstoneTools,
  _initializeImageLoader,
  _readFiles,
  _renderImage,
  _renderMpr,
  _registerStreamingImageVolume,
  _convertMetadata,
  _loadAndCacheMetadata,
  _prefetchMetadataInformation,
  _convertMultiframeImageIds,
  _addDefaultTools,
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
  updateECGFrame,
  getDefaultECGLayout,
  // imagePresets
  getImagePresets,
  setImagePreset,
  setImageCustomPreset,
  // imageUtils
  getNormalOrientation,
  getMinPixelValue,
  getMaxPixelValue,
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
  registerDsaImageLoader,
  updateLoadedStack,
  // imageParsing
  readFile,
  readFiles,
  parseDataSet,
  clearImageParsing,
  // imageRendering
  clearImageCache,
  loadAndCacheImages,
  renderFileImage,
  renderDICOMPDF,
  renderWebImage,
  disableViewport,
  unloadViewport,
  resizeViewport,
  renderImage,
  updateImage,
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
  updateLarvitarManager,
  populateLarvitarManager,
  populateInstanceGSPSDict,
  getLarvitarManager,
  getInstanceGSPSDict,
  getLarvitarImageTracker,
  resetLarvitarManager,
  resetInstanceGSPSDict,
  removeSeriesFromLarvitarManager,
  getSeriesDataFromLarvitarManager,
  getImageFrame,
  getSopInstanceUIDFromLarvitarManager,
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
  // loaders/dsaImageLoader
  populateDsaImageIds,
  // loaders/fileLoader
  getFileManager,
  resetFileLoader,
  resetFileManager,
  populateFileManager,
  getFileImageId,
  // imaging/postProcessing
  applyDSAShift,
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
  csToolsCreateStack,
  csToolsUpdateImageIds,
  csToolsUpdateImageIndex,
  initializeCSTools,
  setToolsStyle,
  addDefaultTools,
  addTool,
  setToolActive,
  setToolDisabled,
  setToolEnabled,
  setToolPassive,
  exportAnnotations,
  // tools/default
  DEFAULT_TOOLS,
  dvTools,
  getDefaultToolsByType,
  setDefaultToolsProps,
  registerExternalTool,
  // tools/io
  saveAnnotations,
  loadAnnotations,
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
  updateTemporalViewportData
};
