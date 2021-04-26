/** @module imaging/loading
 *  @desc This file provides functionalities for
 *        initialize, configure and update WadoImageLoader
 */

// external libraries
import cornerstone from "cornerstone-core";
import dicomParser from "dicom-parser";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import cornerstoneWebImageLoader from "cornerstone-web-image-loader";
import cornerstoneFileImageLoader from "cornerstone-file-image-loader";
import { forEach } from "lodash";

// internal libraries
import { getSortedStack } from "./image_utils";
import { loadNrrdImage } from "./loaders/nrrdLoader";
import { loadReslicedImage } from "./loaders/resliceLoader";
import { loadMultiFrameImage } from "./loaders/multiframeLoader";

/**
 * Global standard configuration
 * @inner
 * @var {Object} globalConfig
 * @property {Number} maxWebWorkers - number of maximum web workers
 * @property {String} webWorkerPath - path to default WADO web worker
 * @property {} - see https://github.com/cornerstonejs/cornerstoneWADOImageLoader/blob/master/docs/WebWorkers.md
 */
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
 * initializeWebImageLoader()
 * initializeFileImageLoader()
 * registerNRRDImageLoader()
 * registerResliceLoader()
 * updateLoadedStack(seriesData, allSeriesStack)
 */

/**
 * Configure cornerstoneWADOImageLoader
 * @instance
 * @function initializeImageLoader
 * @param {Object} config - Custom config @default globalConfig
 */
export const initializeImageLoader = function (config) {
  let imageLoaderConfig = config ? config : globalConfig;
  cornerstoneWADOImageLoader.webWorkerManager.initialize(imageLoaderConfig);
  cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
  cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
};

/**
 * Configure cornerstoneWebImageLoader
 * @instance
 * @function initializeWebImageLoader
 */
export const initializeWebImageLoader = function () {
  cornerstoneWebImageLoader.external.cornerstone = cornerstone;
  cornerstoneWebImageLoader.configure({
    beforeSend: function () {
      // add xhr as function arg
      // Add custom headers here (e.g. auth tokens)
      // xhr.setRequestHeader('x-auth-token', 'my auth token');
    }
  });
};

/**
 * Configure cornerstoneFileImageLoader
 * @instance
 * @function initializeFileImageLoader
 */
export const initializeFileImageLoader = function () {
  cornerstoneFileImageLoader.external.cornerstone = cornerstone;
};

/**
 * Register custom NRRD ImageLoader
 * @instance
 * @function registerNRRDImageLoader
 */
export const registerNRRDImageLoader = function () {
  cornerstone.registerImageLoader("nrrdLoader", loadNrrdImage);
};

/**
 * Register custom Reslice ImageLoader
 * @instance
 * @function registerResliceLoader
 */
export const registerResliceLoader = function () {
  cornerstone.registerImageLoader("resliceLoader", loadReslicedImage);
};

/**
 * Register custom MultiFrame ImageLoader
 * @instance
 * @function registerMultiFrameImageLoader
 */
export const registerMultiFrameImageLoader = function () {
  cornerstone.registerImageLoader("multiFrameLoader", loadMultiFrameImage);
};

/**
 * Update the allSeriesStack object using wadoImageLoader fileManager
 * @instance
 * @function updateLoadedStack
 * @param {Object} seriesData - Cornerstone series object
 * @param {String} allSeriesStack - Dict containing all series objects
 */
export const updateLoadedStack = function (seriesData, allSeriesStack) {
  let sid = seriesData.metadata.seriesUID;
  let iid = seriesData.metadata.instanceUID;
  let seriesDescription = seriesData.metadata.seriesDescription;
  let numberOfFrames = seriesData.metadata["x00280008"];
  let isMultiframe = numberOfFrames > 1 ? true : false;
  // initialize series stack
  if (!allSeriesStack[sid]) {
    allSeriesStack[sid] = {
      currentImageIdIndex: 0,
      imageIds: [],
      instances: {},
      seriesDescription: seriesDescription,
      seriesUID: sid,
      numberOfImages: 0,
      numberOfFrames: numberOfFrames,
      isMultiframe: isMultiframe
    };
  }

  // if the parsed file is a new series instance, keep it
  if (isNewInstance(allSeriesStack[sid].instances, iid)) {
    // generate an imageId for the file and store it
    // in allSeriesStack imageIds array, used by
    // cornerstoneWADOImageLoader to display the stack of images
    let imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(
      seriesData.file
    );

    allSeriesStack[sid].imageIds.push(imageId);
    allSeriesStack[sid].numberOfImages += 1;
    // store needed instance tags
    allSeriesStack[sid].instances[imageId] = {
      metadata: seriesData.metadata,
      file: seriesData.file,
      dataSet: seriesData.dataSet
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

/**
 * Check if the instance is new or not
 * @inner
 * @function isNewInstance
 * @param {Object} instances - instances already loaded
 * @param {String} iid - instance uid to check
 * @return {Bool} True if is new instance, false if already present
 */
let isNewInstance = function (instances, iid) {
  let isNewInstance = true;
  forEach(instances, function (instance) {
    if (instance.metadata.instanceUID === iid) {
      isNewInstance = false;
    }
  });
  return isNewInstance;
};
