/** @module imaging/imageLoading
 *  @desc This file provides functionalities for
 *        initialize, configure and update DICOMImageLoader
 */

// external libraries
import dcmjs from "dcmjs";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";
import {
  cornerstoneStreamingImageVolumeLoader,
  cornerstoneStreamingDynamicImageVolumeLoader,
  volumeLoader,
  Types
} from "@cornerstonejs/core";
// @ts-ignore
import { calibratedPixelSpacingMetadataProvider } from "@cornerstonejs/core/utilities";
import { forEach } from "lodash";

// internal libraries
import store from "../imaging/imageStore";
import { imageMetadataProvider } from "./metadataProviders/imageMetadataProvider";
import {
  prefetchMetadataInformation,
  convertMultiframeImageIds
} from "./multiframe";

// global variables
const { DicomMetaDictionary } = dcmjs.data;

import { getImageTracker, getImageManager } from "../imaging/imageManagers";

import {
  ImageObject,
  Instance,
  Series,
  StagedProtocol
} from "../imaging/types";

import { getSortedStack, getSortedUIDs } from "../imaging/imageUtils";
import {
  addMetadataForImageId,
  registerAllMetadataProviders,
  registerMetadataProviders
} from "./metadataProviders/metadataProviders";
import { logger } from "../logger";
import { convertMetadata } from "./imageParsing";

const MAX_CONCURRENCY = 32;

/*
 * This module provides the following functions to be exported:
 * initializeImageLoader(maxConcurrency)
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
    cornerstoneDICOMImageLoader.init({
      maxWebWorkers: maxWebWorkers
    });
    logger.debug(
      `CornestoneDICOMImageLoader initialized with ${maxWebWorkers} WebWorkers.`
    );
  } else {
    // Default to half of the available hardware cores
    cornerstoneDICOMImageLoader.init();
    logger.debug(
      `CornestoneDICOMImageLoader initialized with default WebWorkers.`
    );
  }
  registerMetadataProviders();
  registerAllMetadataProviders();
};

export const registerStreamingImageVolume = function () {
  // Initialise Volume Rendering
  volumeLoader.registerUnknownVolumeLoader(
    cornerstoneStreamingImageVolumeLoader as unknown as Types.VolumeLoaderFn
  );
  volumeLoader.registerVolumeLoader(
    "cornerstoneStreamingImageVolume",
    cornerstoneStreamingImageVolumeLoader as unknown as Types.VolumeLoaderFn
  );
  volumeLoader.registerVolumeLoader(
    "cornerstoneStreamingDynamicImageVolume",
    cornerstoneStreamingDynamicImageVolumeLoader as unknown as Types.VolumeLoaderFn
  );
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
export const updateLoadedStack = async function (
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
    numberOfFrames &&
    (numberOfFrames as number) > 1 &&
    seriesData.metadata.isVideo === false
      ? true
      : false;
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
      imageIds3D: [], // (ordered) 3D imageIds for MPR
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
      isVideo: seriesData.metadata.isVideo as boolean,
      isVideoSupported: seriesData.metadata.isVideoSupported as boolean,
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

  // if the parsed file is a new series instance, keep it

  if (isMultiframe) {
    allSeriesStack[id].bytes += seriesData.file ? seriesData.file.size : 0;
    allSeriesStack[id].dataSet = seriesData.dataSet;
    allSeriesStack[id].metadata = seriesData.metadata;
    let imageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(
      seriesData.file
    ) as string;
    await prefetchMetadataInformation([imageId]);
    allSeriesStack[id].imageIds = convertMultiframeImageIds([imageId]);
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
      allSeriesStack[id].imageIds3D[sliceIndex] = imageId;
    } else {
      allSeriesStack[id].imageIds.push(imageId);
      allSeriesStack[id].imageIds3D.push(imageId);
    }

    if (is4D === false) {
      allSeriesStack[id].numberOfImages =
        (allSeriesStack[id].numberOfImages || 0) + 1;
    }

    allSeriesStack[id].bytes += seriesData.file ? seriesData.file.size : 0;
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
      store.addImageIds(id, allSeriesStack[id].imageIds);
    } else {
      allSeriesStack[id].instanceUIDs[iid] = imageId;
      store.addImageIds(id, allSeriesStack[id].imageIds);
    }
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
  forEach(instances, function (instance: Instance) {
    if (instance.metadata.instanceUID === iid) {
      isNewInstance = false;
    }
  });
  return isNewInstance;
};

/**
 * Remove invalid tags from metadata
 * @instance
 * @function removeInvalidTags
 * @param {Object} srcMetadata - Source metadata object
 * @returns {Object} Cleaned metadata object with only valid tags
 */
export const removeInvalidTags = (srcMetadata: { [tagId: string]: any }) => {
  // Object.create(null) make it ~9% faster
  const dstMetadata = Object.create(null);
  const tagIds = Object.keys(srcMetadata);
  let tagValue;

  tagIds.forEach(tagId => {
    tagValue = srcMetadata[tagId];
    if (tagValue !== undefined && tagValue !== null)
      dstMetadata[tagId] = tagValue;
  });

  return dstMetadata;
};

/**
 * Get pixel spacing information from the instance metadata
 * @instance
 * @function getPixelSpacingInformation
 * @param {Object} instance - DICOM instance metadata
 * @returns {Object} Pixel spacing information
 */
export default function getPixelSpacingInformation(instance: any) {
  // See http://gdcm.sourceforge.net/wiki/index.php/Imager_Pixel_Spacing
  // TODO: Add Ultrasound region spacing
  // TODO: Add manual calibration
  // TODO: Use ENUMS from dcmjs
  const projectionRadiographSOPClassUIDs = [
    "1.2.840.10008.5.1.4.1.1.1", //	CR Image Storage
    "1.2.840.10008.5.1.4.1.1.1.1", //	Digital X-Ray Image Storage – for Presentation
    "1.2.840.10008.5.1.4.1.1.1.1.1", //	Digital X-Ray Image Storage – for Processing
    "1.2.840.10008.5.1.4.1.1.1.2", //	Digital Mammography X-Ray Image Storage – for Presentation
    "1.2.840.10008.5.1.4.1.1.1.2.1", //	Digital Mammography X-Ray Image Storage – for Processing
    "1.2.840.10008.5.1.4.1.1.1.3", //	Digital Intra – oral X-Ray Image Storage – for Presentation
    "1.2.840.10008.5.1.4.1.1.1.3.1", //	Digital Intra – oral X-Ray Image Storage – for Processing
    "1.2.840.10008.5.1.4.1.1.12.1", //	X-Ray Angiographic Image Storage
    "1.2.840.10008.5.1.4.1.1.12.1.1", //	Enhanced XA Image Storage
    "1.2.840.10008.5.1.4.1.1.12.2", //	X-Ray Radiofluoroscopic Image Storage
    "1.2.840.10008.5.1.4.1.1.12.2.1", //	Enhanced XRF Image Storage
    "1.2.840.10008.5.1.4.1.1.12.3" // X-Ray Angiographic Bi-plane Image Storage	Retired
  ];

  const {
    PixelSpacing,
    ImagerPixelSpacing,
    SOPClassUID,
    PixelSpacingCalibrationType,
    PixelSpacingCalibrationDescription,
    EstimatedRadiographicMagnificationFactor,
    SequenceOfUltrasoundRegions
  } = instance;

  const isProjection = projectionRadiographSOPClassUIDs.includes(SOPClassUID);

  const TYPES = {
    NOT_APPLICABLE: "NOT_APPLICABLE",
    UNKNOWN: "UNKNOWN",
    CALIBRATED: "CALIBRATED",
    DETECTOR: "DETECTOR"
  };

  if (!isProjection) {
    return PixelSpacing;
  }

  if (isProjection && !ImagerPixelSpacing) {
    // If only Pixel Spacing is present, and this is a projection radiograph,
    // PixelSpacing should be used, but the user should be informed that
    // what it means is unknown
    return {
      PixelSpacing,
      type: TYPES.UNKNOWN,
      isProjection
    };
  } else if (
    PixelSpacing &&
    ImagerPixelSpacing &&
    PixelSpacing === ImagerPixelSpacing
  ) {
    // If Imager Pixel Spacing and Pixel Spacing are present and they have the same values,
    // then the user should be informed that the measurements are at the detector plane
    return {
      PixelSpacing,
      type: TYPES.DETECTOR,
      isProjection
    };
  } else if (
    PixelSpacing &&
    ImagerPixelSpacing &&
    PixelSpacing !== ImagerPixelSpacing
  ) {
    // If Imager Pixel Spacing and Pixel Spacing are present and they have different values,
    // then the user should be informed that these are "calibrated"
    // (in some unknown manner if Pixel Spacing Calibration Type and/or
    // Pixel Spacing Calibration Description are absent)
    return {
      PixelSpacing,
      type: TYPES.CALIBRATED,
      isProjection,
      PixelSpacingCalibrationType,
      PixelSpacingCalibrationDescription
    };
  } else if (!PixelSpacing && ImagerPixelSpacing) {
    let CorrectedImagerPixelSpacing = ImagerPixelSpacing;
    if (EstimatedRadiographicMagnificationFactor) {
      // Note that in IHE Mammo profile compliant displays, the value of Imager Pixel Spacing is required to be corrected by
      // Estimated Radiographic Magnification Factor and the user informed of that.
      // TODO: should this correction be done before all of this logic?
      CorrectedImagerPixelSpacing = ImagerPixelSpacing.map(
        (pixelSpacing: number) =>
          pixelSpacing / EstimatedRadiographicMagnificationFactor
      );
    } else {
      logger.warn(
        "EstimatedRadiographicMagnificationFactor was not present. Unable to correct ImagerPixelSpacing."
      );
    }

    return {
      PixelSpacing: CorrectedImagerPixelSpacing,
      isProjection
    };
  } else if (
    SequenceOfUltrasoundRegions &&
    typeof SequenceOfUltrasoundRegions === "object"
  ) {
    const { PhysicalDeltaX, PhysicalDeltaY } = SequenceOfUltrasoundRegions;
    const USPixelSpacing = [PhysicalDeltaX * 10, PhysicalDeltaY * 10];

    return {
      PixelSpacing: USPixelSpacing
    };
  } else if (
    SequenceOfUltrasoundRegions &&
    Array.isArray(SequenceOfUltrasoundRegions) &&
    SequenceOfUltrasoundRegions.length > 1
  ) {
    logger.warn(
      "Sequence of Ultrasound Regions > one entry. This is not yet implemented, all measurements will be shown in pixels."
    );
  }

  logger.warn(
    "Unknown combination of PixelSpacing and ImagerPixelSpacing identified. Unable to determine spacing."
  );
}

/**
 * Load and cache metadata for the given image ID
 * @instance
 * @function loadAndCacheMetadata
 * @param {string} imageId3D - The image ID for the 3D image
 * @param {Instance} instance - The DICOM instance containing metadata
 * @returns {void}
 */
export const loadAndCacheMetadata = (
  imageId3D: string,
  instance: Instance
): void => {
  const cleanedMetadata = DicomMetaDictionary.naturalizeDataset(
    removeInvalidTags(convertMetadata(instance!.dataSet!))
  );
  imageMetadataProvider.add(imageId3D, instance.metadata);
  // Add the metadata to all providers
  addMetadataForImageId(imageId3D, instance.metadata);

  const pixelSpacing = getPixelSpacingInformation(cleanedMetadata);
  if (pixelSpacing === undefined) return;
  if (
    typeof pixelSpacing === "object" &&
    "PixelSpacing" in pixelSpacing &&
    pixelSpacing.PixelSpacing !== undefined
  ) {
    calibratedPixelSpacingMetadataProvider.add(
      imageId3D,
      pixelSpacing.PixelSpacing.map((s: string) => parseFloat(s))
    );
  } else if (Array.isArray(pixelSpacing) && pixelSpacing.length === 2) {
    calibratedPixelSpacingMetadataProvider.add(imageId3D, {
      rowPixelSpacing: pixelSpacing[0],
      columnPixelSpacing: pixelSpacing[1]
    });
  }
};
