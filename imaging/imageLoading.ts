/** @module imaging/imageLoading
 *  @desc This file provides functionalities for
 *        initialize, configure and update WadoImageLoader
 */

// external libraries
import cornerstone, { ImageLoader } from "cornerstone-core";
import dicomParser from "dicom-parser";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import cornerstoneWebImageLoader from "cornerstone-web-image-loader";
import cornerstoneFileImageLoader from "cornerstone-file-image-loader";
import { forEach } from "lodash";

// internal libraries
import { larvitar_store } from "./imageStore";
import { getSortedStack, getSortedUIDs } from "./imageUtils";
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

const MAX_CONCURRENCY = 6;
const globalConfig = {
  maxWebWorkers: Math.max(
    Math.min(navigator.hardwareConcurrency - 1, MAX_CONCURRENCY),
    1
  ),
  startWebWorkersOnDemand: true,
  taskConfiguration: {
    decodeTask: {
      loadCodecsOnStartup: true,
      initializeCodecsOnStartup: false,
      strict: true
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
export const initializeImageLoader = function (config: Object) { //TODO-ts better definition
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
 * @param {Object} allSeriesStack - Dict containing all series objects
 * @param {String} customId - Optional custom id to overwrite seriesUID as default one
 */
export const updateLoadedStack = function (
  seriesData,
  allSeriesStack,
  customId
) {
  let sid = seriesData.metadata.seriesUID;
  let ssid = seriesData.metadata.studyUID;
  let iid = seriesData.metadata.instanceUID;
  let seriesDescription = seriesData.metadata.seriesDescription;
  let numberOfSlices = seriesData.metadata["x00540081"]
    ? seriesData.metadata["x00540081"]
    : seriesData.metadata["x00201002"];
  let numberOfFrames = seriesData.metadata["x00280008"];
  let modality = seriesData.metadata["x00080060"];
  let isMultiframe = numberOfFrames > 1 ? true : false;
  let numberOfTemporalPositions = seriesData.metadata["x00200105"];
  let acquisitionNumberAttribute = seriesData.metadata["x00200012"];
  let is4D = seriesData.metadata.is4D;
  let SOPUID = seriesData.metadata["x00080016"];
  let isPDF = SOPUID == "1.2.840.10008.5.1.4.1.1.104.1" ? true : false;
  let anonymized = seriesData.metadata.anonymized;

  let color = cornerstoneWADOImageLoader.isColorImage(
    seriesData.metadata["x00280004"]
  );
  let id = customId || sid;
  // initialize series stack
  if (!allSeriesStack[id]) {
    allSeriesStack[id] = {
      currentImageIdIndex: 0,
      imageIds: [], // (ordered)
      instanceUIDs: {}, // instanceUID: imageId (ordered)
      instances: {},
      seriesDescription: seriesDescription,
      larvitarSeriesInstanceUID: sid,
      seriesUID: sid,
      studyUID: ssid,
      numberOfImages: is4D ? acquisitionNumberAttribute : 0,
      numberOfSlices: numberOfSlices,
      numberOfFrames: numberOfFrames,
      numberOfTemporalPositions: numberOfTemporalPositions,
      isMultiframe: isMultiframe,
      is4D: is4D,
      isPDF: isPDF,
      anonymized: anonymized,
      modality: modality,
      color: color,
      bytes: 0
    };
  }

  const sortMethods = is4D
    ? ["imagePosition", "contentTime"]
    : ["imagePosition"];

  // if the parsed file is a new series instance, keep it
  if (isNewInstance(allSeriesStack[id].instances, iid)) {
    // generate an imageId for the file and store it
    // in allSeriesStack imageIds array, used by
    // cornerstoneWADOImageLoader to display the stack of images
    let imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(
      seriesData.file
    );

    allSeriesStack[id].imageIds.push(imageId);
    if (is4D === false) {
      allSeriesStack[id].numberOfImages += 1;
    }
    allSeriesStack[id].bytes += seriesData.file.size;
    // store needed instance tags
    allSeriesStack[id].instances[imageId] = {
      metadata: seriesData.metadata,
      file: seriesData.file,
      dataSet: seriesData.dataSet
    };
    // order images in stack
    allSeriesStack[id].imageIds = getSortedStack(
      allSeriesStack[id],
      sortMethods,
      true
    );
    // populate the ordered dictionary of instanceUIDs
    allSeriesStack[id].instanceUIDs = getSortedUIDs(allSeriesStack[id]);
    larvitar_store.addSeriesIds(id, allSeriesStack[id].imageIds);
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
