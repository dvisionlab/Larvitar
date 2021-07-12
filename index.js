import pkg from "./package.json";
const VERSION = pkg.version;
console.log(`LARVITAR v${VERSION}`);

import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";

import larvitarModule from "./modules/vuex/larvitar";

import {
  checkMemoryAllocation,
  getUsedMemory,
  getAvailableMemory
} from "./imaging/monitors/memory";

import { initLarvitarStore, larvitar_store } from "./imaging/image_store";

import { parseContours } from "./imaging/image_contours";

import {
  getImagePresets,
  setImagePreset,
  setImageCustomPreset
} from "./imaging/image_presets";

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
  getDistanceBetweenSlices
} from "./imaging/image_utils";

import {
  buildHeader,
  getCachedPixelData,
  buildData,
  buildDataAsync,
  importNRRDImage
} from "./imaging/image_io";

import {
  buildLayer,
  updateLayer,
  getActiveLayer,
  setActiveLayer
} from "./imaging/image_layers";

import {
  initializeImageLoader,
  initializeWebImageLoader,
  initializeFileImageLoader,
  registerNRRDImageLoader,
  registerResliceLoader,
  registerMultiFrameImageLoader,
  updateLoadedStack
} from "./imaging/image_loading";

import {
  readFile,
  readFiles,
  dumpDataSet,
  clearImageParsing
} from "./imaging/image_parsing";

import {
  clearImageCache,
  loadAndCacheImages,
  renderFileImage,
  renderWebImage,
  disableViewport,
  unloadViewport,
  resizeViewport,
  renderImage,
  updateImage,
  resetViewports,
  updateViewportData,
  // toggleMouseHandlers,
  storeViewportData,
  invertImage,
  flipImageHorizontal,
  flipImageVertical,
  rotateImageLeft,
  rotateImageRight
} from "./imaging/image_rendering";

import { resliceSeries } from "./imaging/image_reslice";

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
} from "./imaging/image_tools";

import {
  csToolsCreateStack,
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
} from "./imaging/tools/tools.main";

import {
  DEFAULT_TOOLS,
  getDefaultToolsByType,
  setDefaultToolsProps
} from "./imaging/tools/tools.default";

import {
  initSegmentationModule,
  addSegmentationMask,
  setActiveLabelmap,
  setActiveSegment,
  undoLastStroke,
  redoLastStroke
} from "./imaging/tools/tools.segmentation";

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
} from "./imaging/image_colormaps";

import { saveAnnotations, loadAnnotations } from "./imaging/tools/tools.io";

import {
  addMouseKeyHandlers,
  toggleMouseToolsListeners
} from "./imaging/tools/tools.interaction";

export {
  VERSION,
  // global cornerstone variables
  cornerstone,
  cornerstoneTools,
  cornerstoneWADOImageLoader,
  // vuex module
  larvitarModule,
  // memory module
  checkMemoryAllocation,
  getUsedMemory,
  getAvailableMemory,
  // larvitar store
  initLarvitarStore,
  larvitar_store,
  // image_presets
  getImagePresets,
  setImagePreset,
  setImageCustomPreset,
  // image_utils
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
  // image_io
  buildHeader,
  getCachedPixelData,
  buildData,
  buildDataAsync,
  importNRRDImage,
  // image_layers
  buildLayer,
  updateLayer,
  getActiveLayer,
  setActiveLayer,
  // image_loading
  initializeImageLoader,
  initializeWebImageLoader,
  initializeFileImageLoader,
  registerNRRDImageLoader,
  registerResliceLoader,
  registerMultiFrameImageLoader,
  updateLoadedStack,
  // image_parsing
  readFile,
  readFiles,
  dumpDataSet,
  clearImageParsing,
  // image_rendering
  clearImageCache,
  loadAndCacheImages,
  renderFileImage,
  renderWebImage,
  disableViewport,
  unloadViewport,
  resizeViewport,
  renderImage,
  updateImage,
  resetViewports,
  updateViewportData,
  // toggleMouseHandlers,
  toggleMouseToolsListeners,
  storeViewportData,
  invertImage,
  flipImageHorizontal,
  flipImageVertical,
  rotateImageLeft,
  rotateImageRight,
  // image_reslice
  resliceSeries,
  // image_colormaps
  getColormapsList,
  applyColorMap,
  addColorMap,
  fillPixelData,
  HSVToRGB,
  // image_contours
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
  // loaders/multiFrameLoader
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
  // image_tools
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
  // tools.main
  csToolsCreateStack,
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
  // tools.default
  DEFAULT_TOOLS,
  getDefaultToolsByType,
  setDefaultToolsProps,
  // tools.io
  saveAnnotations,
  loadAnnotations,
  // tools.interaction
  addMouseKeyHandlers,
  // tools.segmentation
  initSegmentationModule,
  addSegmentationMask,
  setActiveLabelmap,
  setActiveSegment,
  undoLastStroke,
  redoLastStroke
};
