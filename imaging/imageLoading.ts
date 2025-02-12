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
import { loadSingleFrameImage } from "./loaders/singleFrameLoader";
import { loadDsaImage } from "./loaders/dsaImageLoader";
import {
  ImageObject,
  Instance,
  MetaData,
  Series,
  StagedProtocol
} from "./types";
import {
  getImageTracker,
  getImageManager,
  resetGSPSManager,
  resetImageManager,
  resetFileManager
} from "./imageManagers";
import { clearImageCache } from "./imageRendering";
import { clearCornerstoneElements } from "./imageTools";

/**
 * Global standard configuration
 * @inner
 * @var {Object} globalConfig
 * @property {Number} maxWebWorkers - number of maximum web workers
 * @property {String} webWorkerPath - path to default DICOM web worker
 * @property {} - see https://github.com/cornerstonejs/cornerstoneDICOMImageLoader/blob/master/docs/WebWorkers.md
 */
const MAX_CONCURRENCY = 32;
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
 * initializeImageLoader(maxConcurrency)
 * initializeWebImageLoader()
 * initializeFileImageLoader()
 * registerNRRDImageLoader()
 * registerResliceLoader()
 * registerMultiFrameImageLoader()
 * registerSingleFrameImageLoader()
 * registerDsaImageLoader()
 * updateLoadedStack(seriesData, allSeriesStack)
 */

/**
 * Configure DICOMImageLoader
 * @instance
 * @function initializeImageLoader
 * @param {number} maxConcurrency - Optional maximum number of web workers
 */
export const initializeImageLoader = function (maxConcurrency?: number) {
  if (maxConcurrency) {
    const maxWebWorkers = Math.max(
      Math.min(navigator.hardwareConcurrency - 1, MAX_CONCURRENCY),
      1
    );
    globalConfig.maxWebWorkers = maxWebWorkers;
  }
  cornerstoneDICOMImageLoader.external.cornerstone = cornerstone;
  cornerstoneDICOMImageLoader.external.dicomParser = dicomParser;
  cornerstoneDICOMImageLoader.webWorkerManager.initialize(globalConfig);
  console.log(
    `CornestoneDICOMImageLoader initialized with ${globalConfig.maxWebWorkers} WebWorkers.`
  );
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
 * Register custom SingleFrame ImageLoader
 * @instance
 * @function registerSingleFrameImageLoader
 */
export const registerSingleFrameImageLoader = function () {
  cornerstone.registerImageLoader("singleFrameLoader", loadSingleFrameImage);
};

/**
 * Register custom DSA ImageLoader
 * @instance
 * @function registerDsaImageLoader
 */
export const registerDsaImageLoader = function () {
  cornerstone.registerImageLoader("dsaImageLoader", loadDsaImage);
};

/**
 * Update the allSeriesStack object using DICOMImageLoader fileManager
 * @instance
 * @function updateLoadedStack
 * @param {Object} seriesData - Cornerstone series object
 * @param {Object} allSeriesStack - Dict containing all series objects
 * @param {String} customId - Optional custom id to overwrite seriesUID as default one
 * @param {number} sliceIndex - Optional custom index to overwrite slice index as default one
 */
export const updateLoadedStack = function (
  seriesData: ImageObject,
  allSeriesStack: ReturnType<typeof getImageManager>,
  customId?: string,
  sliceIndex?: number
) {
  let imageTracker = getImageTracker();
  let lid = seriesData.metadata.uniqueUID;
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
  let waveform = seriesData.metadata.waveform;
  let SOPUID = seriesData.metadata["x00080016"];
  let isPDF = SOPUID == "1.2.840.10008.5.1.4.1.1.104.1" ? true : false;
  let anonymized = seriesData.metadata.anonymized;

  let color = cornerstoneDICOMImageLoader.isColorImage(
    seriesData.metadata["x00280004"]
  ) as boolean;
  let id = customId || lid?.toString();

  if (!id) {
    throw new Error("Unique UID is not defined");
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
      uniqueUID: lid as string,
      seriesUID: sid as string,
      studyUID: ssid as string,
      numberOfImages: is4D ? (acquisitionNumberAttribute as number) : 0,
      numberOfSlices: numberOfSlices as number,
      numberOfFrames: numberOfFrames as number,
      numberOfTemporalPositions: numberOfTemporalPositions as number,
      isMultiframe: isMultiframe,
      waveform: waveform as boolean,
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
  const sortMethods: Array<"imagePosition" | "contentTime" | "instanceNumber"> =
    is4D ? [defaultMethod, "contentTime"] : [defaultMethod];

  // image is a dicom multiframe object with file and dataset attributes
  // that has been parsed by the dicomParser and is ready to be loaded
  if (isMultiframe && seriesData.file && seriesData.dataSet) {
    allSeriesStack[id].bytes += seriesData.file.size;
    allSeriesStack[id].dataSet = seriesData.dataSet;
    allSeriesStack[id].metadata = seriesData.metadata;
  }
  // image is a single frame of a multiframe object
  // that has not been parsed by the dicomParser
  // but it has been received as a single frame buffer
  else if (isMultiframe) {
    const imageId = seriesData.imageId as string;
    imageTracker[imageId] = lid as string;
    if (sliceIndex !== undefined) {
      allSeriesStack[id].imageIds[sliceIndex] = imageId;
    } else {
      allSeriesStack[id].imageIds.push(imageId);
    }

    // store needed instance tags
    allSeriesStack[id].instances[imageId] = {
      frame: sliceIndex ? sliceIndex : allSeriesStack[id].imageIds.length - 1,
      instanceId: iid,
      metadata: seriesData.metadata
    };

    // TODO FIX THIS ONLY THE FIRST
    allSeriesStack[id].instanceUIDs[iid] = imageId;

    store.addSeriesId(id, allSeriesStack[id].imageIds);
  } else if (isNewInstance(allSeriesStack[id].instances, iid!)) {
    // generate an imageId for the file and store it
    // in allSeriesStack imageIds array, used by
    // DICOMImageLoader to display the stack of images
    let imageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(
      seriesData.file
    ) as string;
    imageTracker[imageId] = lid as string;
    if (sliceIndex !== undefined) {
      allSeriesStack[id].imageIds[sliceIndex] = imageId;
    } else {
      allSeriesStack[id].imageIds.push(imageId);
    }

    if (is4D === false) {
      allSeriesStack[id].numberOfImages =
        (allSeriesStack[id].numberOfImages || 0) + 1;
    }
    if (seriesData.file) {
      allSeriesStack[id].bytes += seriesData.file.size;
    }
    // store needed instance tags
    allSeriesStack[id].instances[imageId] = {
      metadata: seriesData.metadata,
      file: seriesData.file,
      dataSet: seriesData.dataSet
    };

    if (isPDF === false) {
      if (sliceIndex === undefined) {
        // order images in stack
        allSeriesStack[id].imageIds = getSortedStack(
          allSeriesStack[id] as Series,
          sortMethods,
          true
        );
        // populate the ordered dictionary of instanceUIDs
        allSeriesStack[id].instanceUIDs = getSortedUIDs(
          allSeriesStack[id] as Series
        );
      } else {
        allSeriesStack[id].instanceUIDs[iid] = imageId;
      }
      store.addSeriesId(id, allSeriesStack[id].imageIds);
    } else {
      allSeriesStack[id].instanceUIDs[iid] = imageId;
      store.addSeriesId(id, allSeriesStack[id].imageIds);
    }
  }
};

/* Internal module functions */

/**
 * Check if the instance is new or not
 * @instance
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
  forEach(instances, function (instance: Instance) {
    if (instance.metadata.instanceUID === iid) {
      isNewInstance = false;
    }
  });
  return isNewInstance;
};

/**
 * General reset of cache, loaders, store and managers
 * @instance
 * @function reset
 * @return {void}
 */
export function reset(): void {
  //Reset file manager, Image manager, multiframe cache and gsps dict
  resetFileManager();
  resetImageManager();
  resetGSPSManager();
  //Reset cornerstone cache and enabled elements
  clearImageCache();
  clearCornerstoneElements();
  //Reset and initialize store
  store.initialize();
}
