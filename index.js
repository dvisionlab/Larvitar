import pkg from "./package.json";
const VERSION = pkg.version;
console.log(`LARVITAR v${VERSION}`);

import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
const segModule = cornerstoneTools.getModule("segmentation");

import larvitarModule from "./modules/vuex/larvitar";

import {
  checkMemoryAllocation,
  getUsedMemory,
  getAvailableMemory
} from "./imaging/monitors/memory";

import { initLarvitarStore, larvitar_store } from "./imaging/imageStore";

import { parseContours } from "./imaging/imageContours";

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
  getPixelTypedArray,
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
  importNRRDImage
} from "./imaging/imageIo";

import { anonymize } from "./imaging/imageAnonymization";

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
  resetViewports,
  updateViewportData,
  storeViewportData,
  invertImage,
  flipImageHorizontal,
  flipImageVertical,
  rotateImageLeft,
  rotateImageRight
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
  getDefaultToolsByType,
  setDefaultToolsProps
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
  getLarvitarManager,
  getLarvitarImageTracker,
  resetLarvitarManager,
  removeSeriesFromLarvitarManager,
  getSeriesDataFromLarvitarManager,
  getImageFrame
} from "./imaging/loaders/commonLoader";

import {
  buildNrrdImage,
  getNrrdImageId,
  loadNrrdImage,
  getImageIdFromSlice,
  getSliceNumberFromImageId,
  getNrrdSerieDimensions
} from "./imaging/loaders/nrrdLoader";

import { getDicomImageId, cacheImages } from "./imaging/loaders/dicomLoader";

import { loadReslicedImage } from "./imaging/loaders/resliceLoader";

import {
  loadMultiFrameImage,
  buildMultiFrameImage,
  getMultiFrameImageId,
  clearMultiFrameCache
} from "./imaging/loaders/multiframeLoader";

import {
  fileManager,
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

import { saveAnnotations, loadAnnotations } from "./imaging/tools/io";

import {
  addMouseKeyHandlers,
  removeMouseKeyHandlers,
  toggleMouseToolsListeners
} from "./imaging/tools/interaction";

export {
  VERSION,
  // global cornerstone variables
  cornerstone,
  cornerstoneTools,
  segModule,
  cornerstoneWADOImageLoader,
  // vuex module
  larvitarModule,
  // memory module
  checkMemoryAllocation,
  getUsedMemory,
  getAvailableMemory,
  // larvitarStore
  initLarvitarStore,
  larvitar_store,
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
  getPixelTypedArray,
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
  // imageAnonymization
  anonymize,
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
  getLarvitarManager,
  getLarvitarImageTracker,
  resetLarvitarManager,
  removeSeriesFromLarvitarManager,
  getSeriesDataFromLarvitarManager,
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
  cacheImages,
  // loaders/multiframeLoader
  loadMultiFrameImage,
  buildMultiFrameImage,
  getMultiFrameImageId,
  clearMultiFrameCache,
  // loaders/fileLoader
  fileManager,
  resetFileLoader,
  resetFileManager,
  populateFileManager,
  getFileImageId,
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
  getDefaultToolsByType,
  setDefaultToolsProps,
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
  getActiveLabelmapBuffer
};
