// external libraries
import cornerstone from "cornerstone-core";
import dicomParser from "dicom-parser";
import { forEach } from "lodash";

// internal libraries
import { getSortedStack } from "./image_utils.js";
import { loadNrrdImage } from "./nrrdLoader.js";

// global standard configuration
const globalConfig = {
  maxWebWorkers: navigator.hardwareConcurrency || 1,
  webWorkerPath: "/cornerstoneWADOImageLoaderWebWorker.js",
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
 * updateLoadedStack(seriesData, allSeriesStack)
 */

// ------------------------------------
// configure cornerstoneWADOImageLoader
// ------------------------------------
export const initializeImageLoader = function(config) {
  let imageLoaderConfig = config ? config : globalConfig;
  window.cornerstoneWADOImageLoader.webWorkerManager.initialize(
    imageLoaderConfig
  );
  window.cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
  window.cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
};

// --------------------------------
// register custom NRRD ImageLoader
// --------------------------------
export const registerNRRDImageLoader = function() {
  cornerstone.registerImageLoader("nrrdLoader", loadNrrdImage);
};

// ------------------------------------------------------------------
// update the allSeriesStack object using wadoImageLoader fileManager
// ------------------------------------------------------------------
export const updateLoadedStack = function(seriesData, allSeriesStack) {
  let sid = seriesData.metadata.seriesUID;
  let iid = seriesData.metadata.instanceUID;
  // initialize series stack
  if (!allSeriesStack[sid]) {
    allSeriesStack[sid] = {
      currentImageIdIndex: 0,
      imageIds: [],
      instances: {}
    };
  }

  // if the parsed file is a new series insatence, keep it
  if (isNewInstance(allSeriesStack[sid].instances, iid)) {
    // generate an imageId for the file and store it
    // in allSeriesStack imageIds array, used by
    // cornerstoneWADOImageLoader to display the stack of images
    let imageId = window.cornerstoneWADOImageLoader.wadouri.fileManager.add(
      seriesData.file
    );
    allSeriesStack[sid].imageIds.push(imageId);
    // store needed instance tags
    allSeriesStack[sid].instances[imageId] = {
      pixelData: seriesData.pixelData,
      metadata: seriesData.metadata
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

// -----------------------------------
// check if the instance is new or not
// -----------------------------------
let isNewInstance = function(instances, iid) {
  let isNewInstance = true;
  forEach(instances, function(instance) {
    if (instance.metadata.instanceUID === iid) {
      isNewInstance = false;
    }
  });
  return isNewInstance;
};
