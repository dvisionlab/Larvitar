/** @module imaging/loading
 *  @desc This file provides functionalities for
 *        initialize, configure and update WadoImageLoader
 *  @todo Document
 */

// external libraries
import cornerstone from "cornerstone-core";
import dicomParser from "dicom-parser";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import { forEach } from "lodash";

// internal libraries
import { getSortedStack } from "./image_utils";
import { loadNrrdImage } from "./loaders/nrrdLoader";
import { loadReslicedImage } from "./loaders/resliceLoader";

// global standard configuration
const globalConfig = {
  maxWebWorkers: navigator.hardwareConcurrency || 1,
  webWorkerPath: "/cornerstoneWADOImageLoaderWebWorker.js",
  startWebWorkersOnDemand: true,
  taskConfiguration: {
    decodeTask: {
      loadCodecsOnStartup: true,
      initializeCodecsOnStartup: false,
      codecsPath: "/cornerstoneWADOImageLoaderCodecs.js",
      usePDFJS: false
    }
  }
};

/*
 * This module provides the following functions to be exported:
 * initializeImageLoader(config)
 * registerNRRDImageLoader()
 * registerResliceLoader()
 * updateLoadedStack(seriesData, allSeriesStack)
 */

// =======================================
// Configure cornerstoneWADOImageLoader ==
// =======================================
export const initializeImageLoader = function(config) {
  let imageLoaderConfig = config ? config : globalConfig;
  cornerstoneWADOImageLoader.webWorkerManager.initialize(imageLoaderConfig);
  cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
  cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
};

// ===================================
// Register custom NRRD ImageLoader ==
// ===================================
export const registerNRRDImageLoader = function() {
  cornerstone.registerImageLoader("nrrdLoader", loadNrrdImage);
};

// ======================================
// Register custom Reslice ImageLoader ==
// ======================================
export const registerResliceLoader = function() {
  cornerstone.registerImageLoader("resliceLoader", loadReslicedImage);
};

// =====================================================================
// Update the allSeriesStack object using wadoImageLoader fileManager ==
// =====================================================================
export const updateLoadedStack = function(seriesData, allSeriesStack) {
  let sid = seriesData.metadata.seriesUID;
  let iid = seriesData.metadata.instanceUID;
  let seriesDescription = seriesData.metadata.seriesDescription;
  let numberOfImages = seriesData.metadata.numberOfSlices;
  // initialize series stack
  if (!allSeriesStack[sid]) {
    allSeriesStack[sid] = {
      currentImageIdIndex: 0,
      imageIds: [],
      instances: {},
      seriesDescription: seriesDescription,
      seriesUID: sid,
      numberOfImages: numberOfImages
    };
  }

  // if the parsed file is a new series insatence, keep it
  if (isNewInstance(allSeriesStack[sid].instances, iid)) {
    // generate an imageId for the file and store it
    // in allSeriesStack imageIds array, used by
    // cornerstoneWADOImageLoader to display the stack of images
    let imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(
      seriesData.file
    );

    allSeriesStack[sid].imageIds.push(imageId);
    // store needed instance tags
    allSeriesStack[sid].instances[imageId] = {
      pixelData: seriesData.pixelData,
      metadata: seriesData.metadata,
      file: seriesData.file
    };
    // order images in stack
    allSeriesStack[sid].imageIds = getSortedStack(
      allSeriesStack[sid],
      ["imagePosition"],
      true
    );
  }
};

/* Internal module functions */

// ======================================
// Check if the instance is new or not ==
// ======================================
let isNewInstance = function(instances, iid) {
  let isNewInstance = true;
  forEach(instances, function(instance) {
    if (instance.metadata.instanceUID === iid) {
      isNewInstance = false;
    }
  });
  return isNewInstance;
};
