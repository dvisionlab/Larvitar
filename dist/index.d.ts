/// <reference path="../decs.d.ts" />
declare const VERSION: string;
import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import { parseDicom } from "dicom-parser";
import cornerstoneFileImageLoader from "cornerstone-file-image-loader";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
declare const segModule: any;
import { checkAndClearMemory, checkMemoryAllocation, getUsedMemory, getAvailableMemory } from "./imaging/monitors/memory";
import { getPerformanceMonitor, activatePerformanceMonitor, deactivatePerformanceMonitor } from "./imaging/monitors/performance";
import store from "./imaging/imageStore";
import { parseContours } from "./imaging/imageContours";
import { parseECG } from "./imaging/parsers/ecg";
import { renderECG, unrenderECG, syncECGFrame, updateECGMarker, updateECGTotalTime, getDefaultECGLayout } from "./imaging/waveforms/ecg";
import { getImagePresets, setImagePreset, setImageCustomPreset } from "./imaging/imagePresets";
import { getNormalOrientation, getMinPixelValue, getMaxPixelValue, getPixelRepresentation, getTypedArrayFromDataType, getSortedStack, randomId, getMeanValue, getReslicedMetadata, getReslicedPixeldata, getDistanceBetweenSlices, getImageMetadata } from "./imaging/imageUtils";
import { buildHeader, getCachedPixelData, buildData, buildDataAsync, importNRRDImage, exportImageToBase64, exportImageToBase64OriginalSizes } from "./imaging/imageIo";
import { anonymize } from "./imaging/imageAnonymization";
import { customizeByteArray } from "./imaging/imageCustomization";
import { buildLayer, updateLayer, getActiveLayer, setActiveLayer } from "./imaging/imageLayers";
import { initializeImageLoader, initializeWebImageLoader, initializeFileImageLoader, registerNRRDImageLoader, registerResliceLoader, registerMultiFrameImageLoader, registerDsaImageLoader, updateLoadedStack, reset } from "./imaging/imageLoading";
import { readFile, readFiles, parseDataSet, clearImageParsing } from "./imaging/imageParsing";
import { clearImageCache, loadAndCacheImages, renderFileImage, renderDICOMPDF, renderWebImage, disableViewport, unloadViewport, resizeViewport, renderImage, updateImage, redrawImage, resetViewports, updateViewportData, storeViewportData, invertImage, flipImageHorizontal, flipImageVertical, rotateImageLeft, rotateImageRight, updateTemporalViewportData } from "./imaging/imageRendering";
import { resliceSeries } from "./imaging/imageReslice";
import { addDiameterTool, addContoursTool, addMaskEditingTool, getCurrentMaskData, addStackStateToElement, addSeedsTool, clearMeasurements, getToolState, clearToolStateByName, updateDiameterTool, addToolStateSingleSlice, clearCornerstoneElements, syncToolStack, updateStackToolState, setSegmentationConfig } from "./imaging/imageTools";
import { csToolsCreateStack, csToolsUpdateImageIds, initializeCSTools, setToolsStyle, addDefaultTools, addTool, setToolActive, setToolDisabled, setToolEnabled, setToolPassive, exportAnnotations } from "./imaging/tools/main";
import { DEFAULT_TOOLS, dvTools, getDefaultToolsByType, setDefaultToolsProps, registerExternalTool } from "./imaging/tools/default";
import { initSegmentationModule, addSegmentationMask, clearSegmentationState, deleteMask, setActiveLabelmap, setActiveSegment, enableBrushTool, disableBrushTool, undoLastStroke, redoLastStroke, setBrushProps, toggleContourMode, toggleVisibility, hexToRgb, rgbToHex, getActiveLabelmapBuffer } from "./imaging/tools/segmentation";
import { getImageFrame } from "./imaging/loaders/commonLoader";
import { buildNrrdImage, getNrrdImageId, loadNrrdImage, getImageIdFromSlice, getSliceNumberFromImageId, getNrrdSerieDimensions } from "./imaging/loaders/nrrdLoader";
import { getDicomImageId, cacheImage, cacheImages, loadAndCacheImageStack, loadAndCacheDsaImageStack } from "./imaging/loaders/dicomLoader";
import { loadReslicedImage } from "./imaging/loaders/resliceLoader";
import { loadMultiFrameImage, buildMultiFrameImage, getMultiFrameImageId, clearMultiFrameCache } from "./imaging/loaders/multiframeLoader";
import { populateDsaImageIds } from "./imaging/loaders/dsaImageLoader";
import { resetFileLoader, getFileCustomImageId } from "./imaging/loaders/fileLoader";
import { getColormapsList, applyColorMap, addColorMap, fillPixelData, HSVToRGB } from "./imaging/imageColormaps";
import { applyDSAShift } from "./imaging/postProcessing/applyDSA";
import { saveAnnotations, loadAnnotations } from "./imaging/tools/io";
import { addMouseKeyHandlers, removeMouseKeyHandlers, toggleMouseToolsListeners } from "./imaging/tools/interaction";
import { updateSeriesManager, populateSeriesManager, getSeriesManager, resetSeriesManager, removeSeriesFromSeriesManager, getSeriesDataFromSeriesManager, getSopInstanceUIDFromSeriesManager, getImageTracker, populateGSPSManager, getGSPSManager, resetGSPSManager, getFileManager, resetFileManager, populateFileManager, getDataFromFileManager } from "./imaging/imageManagers";
export { VERSION, cornerstone, cornerstoneTools, parseDicom, cornerstoneFileImageLoader, segModule, cornerstoneDICOMImageLoader, checkAndClearMemory, checkMemoryAllocation, getUsedMemory, getAvailableMemory, getPerformanceMonitor, activatePerformanceMonitor, deactivatePerformanceMonitor, store, parseECG, renderECG, unrenderECG, syncECGFrame, updateECGMarker, updateECGTotalTime, getDefaultECGLayout, getImagePresets, setImagePreset, setImageCustomPreset, getNormalOrientation, getMinPixelValue, getMaxPixelValue, getPixelRepresentation, getTypedArrayFromDataType, getSortedStack, randomId, getMeanValue, getReslicedMetadata, getReslicedPixeldata, getDistanceBetweenSlices, getImageMetadata, buildHeader, getCachedPixelData, buildData, buildDataAsync, importNRRDImage, exportImageToBase64, exportImageToBase64OriginalSizes, anonymize, customizeByteArray, buildLayer, updateLayer, getActiveLayer, setActiveLayer, initializeImageLoader, initializeWebImageLoader, initializeFileImageLoader, registerNRRDImageLoader, registerResliceLoader, registerMultiFrameImageLoader, registerDsaImageLoader, updateLoadedStack, reset, readFile, readFiles, parseDataSet, clearImageParsing, clearImageCache, loadAndCacheImages, renderFileImage, renderDICOMPDF, renderWebImage, disableViewport, unloadViewport, resizeViewport, renderImage, updateImage, redrawImage, resetViewports, updateViewportData, toggleMouseToolsListeners, storeViewportData, invertImage, flipImageHorizontal, flipImageVertical, rotateImageLeft, rotateImageRight, updateSeriesManager, updateSeriesManager as updateLarvitarManager, // alias for backward compatibility
populateSeriesManager, populateSeriesManager as populateLarvitarManager, // alias for backward compatibility
getSeriesManager, getSeriesManager as getLarvitarManager, // alias for backward compatibility
resetSeriesManager, resetSeriesManager as resetLarvitarManager, // alias for backward compatibility
removeSeriesFromSeriesManager, removeSeriesFromSeriesManager as removeSeriesFromLarvitarManager, // alias for backward compatibility
getSeriesDataFromSeriesManager, getSeriesDataFromSeriesManager as getSeriesDataFromLarvitarManager, // alias for backward compatibility
getSopInstanceUIDFromSeriesManager, getSopInstanceUIDFromSeriesManager as getSopInstanceUIDFromLarvitarManager, // alias for backward compatibility
getImageTracker, getImageTracker as getLarvitarImageTracker, // alias for backward compatibility
populateGSPSManager, populateGSPSManager as populateInstanceGSPSDict, // alias for backward compatibility
getGSPSManager, getGSPSManager as getInstanceGSPSDict, // alias for backward compatibility
resetGSPSManager, resetGSPSManager as resetInstanceGSPSDict, // alias for backward compatibility
populateFileManager, getFileManager, resetFileManager, getDataFromFileManager, getDataFromFileManager as getFileImageId, // alias for backward compatibility
resliceSeries, getColormapsList, applyColorMap, addColorMap, fillPixelData, HSVToRGB, parseContours, getImageFrame, buildNrrdImage, getNrrdImageId, loadNrrdImage, getImageIdFromSlice, getSliceNumberFromImageId, getNrrdSerieDimensions, loadReslicedImage, getDicomImageId, cacheImage, cacheImages, loadAndCacheImageStack, loadAndCacheDsaImageStack, loadMultiFrameImage, buildMultiFrameImage, getMultiFrameImageId, clearMultiFrameCache, populateDsaImageIds, resetFileLoader, getFileCustomImageId, applyDSAShift, addDiameterTool, addContoursTool, addMaskEditingTool, getCurrentMaskData, addStackStateToElement, addSeedsTool, clearMeasurements, getToolState, clearToolStateByName, updateDiameterTool, addToolStateSingleSlice, clearCornerstoneElements, syncToolStack, updateStackToolState, setSegmentationConfig, csToolsCreateStack, csToolsUpdateImageIds, initializeCSTools, setToolsStyle, addDefaultTools, addTool, setToolActive, setToolDisabled, setToolEnabled, setToolPassive, exportAnnotations, DEFAULT_TOOLS, dvTools, getDefaultToolsByType, setDefaultToolsProps, registerExternalTool, saveAnnotations, loadAnnotations, addMouseKeyHandlers, removeMouseKeyHandlers, initSegmentationModule, addSegmentationMask, setActiveLabelmap, setActiveSegment, undoLastStroke, redoLastStroke, setBrushProps, hexToRgb, rgbToHex, clearSegmentationState, deleteMask, enableBrushTool, disableBrushTool, toggleContourMode, toggleVisibility, getActiveLabelmapBuffer, updateTemporalViewportData };
