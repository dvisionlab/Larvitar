/** @module imaging/imageLoading
 *  @desc This file provides functionalities for
 *        initialize, configure and update DICOMImageLoader
 */

// external libraries
import cornerstone from "cornerstone-core";
import dicomParser from "dicom-parser";
// import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader/dist/cornerstoneDICOMImageLoader.bundle.min.js";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import cornerstoneWebImageLoader from "cornerstone-web-image-loader";
import cornerstoneFileImageLoader from "cornerstone-file-image-loader";
import { forEach } from "lodash";

// internal libraries
import store from "./imageStore";
import { getSortedStack, getSortedUIDs } from "./imageUtils";
import { loadNrrdImage } from "./loaders/nrrdLoader";
import { loadReslicedImage } from "./loaders/resliceLoader";
import { loadMultiFrameImage } from "./loaders/multiframeLoader";
import { ImageObject, Instance, Series, StagedProtocol } from "./types";
import { getLarvitarManager } from "./loaders/commonLoader";

/**
 * Global standard configuration
 * @inner
 * @var {Object} globalConfig
 * @property {Number} maxWebWorkers - number of maximum web workers
 * @property {String} webWorkerPath - path to default DICOM web worker
 * @property {} - see https://github.com/cornerstonejs/cornerstoneDICOMImageLoader/blob/master/docs/WebWorkers.md
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
 * Configure DICOMImageLoader
 * @instance
 * @function initializeImageLoader
 * @param {Object} config - Custom config @default globalConfig
 */
export const initializeImageLoader = function (config?: typeof globalConfig) {
  let imageLoaderConfig = config ? config : globalConfig;
  cornerstoneDICOMImageLoader.external.cornerstone = cornerstone;
  cornerstoneDICOMImageLoader.external.dicomParser = dicomParser;
  cornerstoneDICOMImageLoader.webWorkerManager.initialize(imageLoaderConfig);
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
 * Update the allSeriesStack object using DICOMImageLoader fileManager
 * @instance
 * @function updateLoadedStack
 * @param {Object} seriesData - Cornerstone series object
 * @param {Object} allSeriesStack - Dict containing all series objects
 * @param {String} customId - Optional custom id to overwrite seriesUID as default one
 */
export const updateLoadedStack = function (
  seriesData: ImageObject,
  allSeriesStack: ReturnType<typeof getLarvitarManager>,
  customId?: string
) {
  let sid = seriesData.metadata.seriesUID;
  let ssid = seriesData.metadata.studyUID;
  let iid = seriesData.metadata.instanceUID as string;
  let seriesDescription = seriesData.metadata.seriesDescription;
  let numberOfSlices = seriesData.metadata["x00540081"]
    ? seriesData.metadata["x00540081"]
    : seriesData.metadata["x00201002"];
  let numberOfFrames = seriesData.metadata["x00280008"];
  let modality = seriesData.metadata["x00080060"];
  let isMultiframe =
    numberOfFrames && (numberOfFrames as number) > 1 ? true : false;
  let numberOfTemporalPositions = seriesData.metadata["x00200105"];
  let acquisitionNumberAttribute = seriesData.metadata["x00200012"];
  let is4D = seriesData.metadata.is4D;
  let SOPUID = seriesData.metadata["x00080016"];
  let isPDF = SOPUID == "1.2.840.10008.5.1.4.1.1.104.1" ? true : false;
  let anonymized = seriesData.metadata.anonymized;

  let color = cornerstoneDICOMImageLoader.isColorImage(
    seriesData.metadata["x00280004"]
  ) as boolean;
  let id = customId || sid?.toString();

  if (!id) {
    throw new Error("Series UID is not defined");
  }

  // Staged Protocol
  // https://dicom.nema.org/dicom/2013/output/chtml/part17/sect_K.5.html
  const numberOfStages = seriesData.metadata["x00082124"]; // Number of stages
  const numberOfViews = seriesData.metadata["x0008212a"]; // Number of views in stage
  const isStagedProtocol = numberOfStages ? true : false;

  // initialize series stack
  if (!allSeriesStack[id]) {
    let series: Partial<Series> = {
      currentImageIdIndex: 0,
      imageIds: [], // (ordered)
      instanceUIDs: {}, // instanceUID: imageId (ordered)
      instances: {},
      seriesDescription: seriesDescription as string,
      larvitarSeriesInstanceUID: sid as string,
      seriesUID: sid as string,
      studyUID: ssid as string,
      numberOfImages: is4D ? (acquisitionNumberAttribute as number) : 0,
      numberOfSlices: numberOfSlices as number,
      numberOfFrames: numberOfFrames as number,
      numberOfTemporalPositions: numberOfTemporalPositions as number,
      isMultiframe: isMultiframe,
      is4D: is4D as boolean,
      isPDF: isPDF as boolean,
      anonymized: anonymized as boolean,
      modality: modality as string,
      color: color,
      bytes: 0
    };
    if (isStagedProtocol) {
      const stageName = seriesData.metadata["x00082120"];
      const stageNumber = seriesData.metadata["x00082122"];
      const viewName = seriesData.metadata["x00082127"];
      const viewNumber = seriesData.metadata["x00082128"];
      const stagedProtocol: StagedProtocol = {
        numberOfStages: numberOfStages as number,
        numberOfViews: numberOfViews as number,
        stageName: stageName ? (stageName as string).trim() : undefined,
        stageNumber: stageNumber as number,
        viewName: viewName ? (viewName as string).trim() : undefined,
        viewNumber: viewNumber as number
      };
      series.stagedProtocol = stagedProtocol;
    }
    allSeriesStack[id] = series as Series;
  }

  // get instance number from metadata
  const instanceNumber = seriesData.metadata["x00200013"];
  const defaultMethod = instanceNumber ? "instanceNumber" : "imagePosition";
  const sortMethods = is4D ? [defaultMethod, "contentTime"] : [defaultMethod];

  // if the parsed file is a new series instance, keep it
  if (isNewInstance(allSeriesStack[id].instances, iid!)) {
    // generate an imageId for the file and store it
    // in allSeriesStack imageIds array, used by
    // DICOMImageLoader to display the stack of images
    let imageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(
      seriesData.file
    ) as string;

    allSeriesStack[id].imageIds.push(imageId);
    if (is4D === false) {
      allSeriesStack[id].numberOfImages =
        (allSeriesStack[id].numberOfImages || 0) + 1;
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
      allSeriesStack[id] as Series,
      is4D ? ["imagePosition", "contentTime"] : ["imagePosition"],
      true
    );

    // populate the ordered dictionary of instanceUIDs
    allSeriesStack[id].instanceUIDs = getSortedUIDs(
      allSeriesStack[id] as Series
    );
    store.addSeriesId(id, allSeriesStack[id].imageIds);
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
let isNewInstance = function (
  instances: { [key: string]: Instance },
  iid: string
) {
  let isNewInstance = true;
  forEach(instances, function (instance : Instance) {
    if (instance.metadata.instanceUID === iid) {
      isNewInstance = false;
    }
  });
  return isNewInstance;
};
