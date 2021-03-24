import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import { initLarvitarStore, larvitar_store } from "./imaging/image_store";

import { parseContours } from "./imaging/image_contours";

import { getImagePresets, setImagePreset } from "./imaging/image_presets";

import {
  getNormalOrientation,
  getMinPixelValue,
  getMaxPixelValue,
  getPixelRepresentation,
  getTypedArrayFromDataType,
  getPixelTypedArray,
  getSortedStack,
  getTagValue,
  randomId,
  getMeanValue,
  getReslicedMetadata,
  getReslicedPixeldata,
  getDistanceBetweenSlices,
  parseImageId,
  remapVoxel
} from "./imaging/image_utils";

import {
  buildVolume,
  buildHeader,
  buildData,
  importNRRDImage
} from "./imaging/image_io";

import {
  getMainLayer,
  loadImageLayers,
  changeOpacityLayer,
  updateImageLayer
} from "./imaging/image_layers";

import {
  initializeImageLoader,
  initializeWebImageLoader,
  initializeFileImageLoader,
  registerNRRDImageLoader,
  registerResliceLoader,
  updateLoadedStack
} from "./imaging/image_loading";

import { resetImageParsing, readFiles } from "./imaging/image_parsing";

import {
  clearImageCache,
  renderFileImage,
  renderWebImage,
  disableViewport,
  unloadViewport,
  resizeViewport,
  renderImage,
  reloadImage,
  updateImage,
  resetViewports,
  updateViewportData,
  toggleMouseHandlers,
  storeViewportData
} from "./imaging/image_rendering";

import { resliceSeries, cleanResliceStore } from "./imaging/image_reslice";

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
  getLarvitarManager,
  getLarvitarImageLoader,
  getSeriesData,
  getCustomImageId,
  getImageFrame
} from "./imaging/loaders/commonLoader";

import {
  nrrdManager,
  nrrdImageTracker,
  buildNrrdImage,
  resetNrrdLoader,
  getNrrdImageId,
  removeSeriesFromNrrdManager,
  getSeriesDataFromNrrdLoader,
  loadNrrdImage,
  getImageIdFromSlice,
  getSliceNumberFromImageId,
  getNrrdSerieDimensions
} from "./imaging/loaders/nrrdLoader";

import {
  dicomManager,
  resetImageLoader,
  resetDicomManager,
  removeSeriesFromDicomManager,
  getSeriesDataFromDicomLoader,
  populateDicomManager,
  getDicomImageId,
  cacheImages
} from "./imaging/loaders/dicomLoader";

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

export {
  // global cornerstone variables
  cornerstone,
  cornerstoneTools,
  // larvitar store
  initLarvitarStore,
  larvitar_store,
  // image_presets
  getImagePresets,
  setImagePreset,
  // image_utils
  getNormalOrientation,
  getMinPixelValue,
  getMaxPixelValue,
  getPixelRepresentation,
  getTypedArrayFromDataType,
  getPixelTypedArray,
  getSortedStack,
  getTagValue,
  randomId,
  getMeanValue,
  getReslicedMetadata,
  getReslicedPixeldata,
  getDistanceBetweenSlices,
  parseImageId,
  remapVoxel,
  // image_io
  buildVolume,
  buildHeader,
  buildData,
  importNRRDImage,
  // image_layers
  getMainLayer,
  loadImageLayers,
  changeOpacityLayer,
  updateImageLayer,
  // image_loading
  initializeImageLoader,
  initializeWebImageLoader,
  initializeFileImageLoader,
  registerNRRDImageLoader,
  registerResliceLoader,
  updateLoadedStack,
  // image_parsing
  resetImageParsing,
  readFiles,
  // image_rendering
  clearImageCache,
  renderFileImage,
  renderWebImage,
  disableViewport,
  unloadViewport,
  resizeViewport,
  renderImage,
  reloadImage,
  updateImage,
  resetViewports,
  updateViewportData,
  toggleMouseHandlers,
  storeViewportData,
  // image_reslice
  resliceSeries,
  cleanResliceStore,
  // image_colormaps
  getColormapsList,
  applyColorMap,
  addColorMap,
  fillPixelData,
  HSVToRGB,
  // image_contours
  parseContours,
  // loaders/commonLoader
  getLarvitarManager,
  getLarvitarImageLoader,
  getSeriesData,
  getCustomImageId,
  getImageFrame,
  // loaders/nrrdLoader
  nrrdManager,
  nrrdImageTracker,
  buildNrrdImage,
  resetNrrdLoader,
  getNrrdImageId,
  removeSeriesFromNrrdManager,
  getSeriesDataFromNrrdLoader,
  loadNrrdImage,
  getImageIdFromSlice,
  getSliceNumberFromImageId,
  getNrrdSerieDimensions,
  // loaders/dicomLoader
  dicomManager,
  resetImageLoader,
  resetDicomManager,
  removeSeriesFromDicomManager,
  getSeriesDataFromDicomLoader,
  populateDicomManager,
  getDicomImageId,
  cacheImages,
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
  loadAnnotations
};
