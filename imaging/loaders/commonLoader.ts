/** @module loaders/commonLoader
 *  @desc This file provides functionalities for
 *        custom DICOMImageLoaders
 */

// external libraries
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import { DataSet } from "dicom-parser";
import { each } from "lodash";
import store, { set as setStore } from "../imageStore";
import { updateLoadedStack } from "../imageLoading";
import type {
  ImageObject,
  ImageTracker,
  LarvitarManager,
  MetaData,
  Series,
  StoreViewport
} from "../types";

// internal libraries
import { buildMultiFrameImage, clearMultiFrameCache } from "./multiframeLoader";
import { storeViewportData, getSeriesData } from "../imageRendering";
// global variables
var larvitarManager: LarvitarManager = null;
var imageTracker: ImageTracker = null;

/*
 * This module provides the following functions to be exported:
 * updateLarvitarManager(imageObject)
 * populateLarvitarManager(seriesId, seriesData)
 * getLarvitarManager()
 * getLarvitarImageTracker()
 * resetLarvitarManager()
 * removeSeriesFromLarvitarManager(seriesId)
 * getSeriesDataFromLarvitarManager(seriesId)
 * getImageFrame(metadata, dataSet)
 * getSopInstanceUIDFromLarvitarManager(larvitarSeriesInstanceUID, imageId)
 */

/**
 * Update and initialize larvitar manager in order to parse and load a single dicom object
 * @instance
 * @function updateLarvitarManager
 * @param {Object} imageObject The single dicom object
 * @param {String} customId - Optional custom id to overwrite seriesUID as default one
 * @param {number} sliceIndex - Optional custom index to overwrite slice index as default one
 */
export const updateLarvitarManager = function (
  imageObject: ImageObject,
  customId?: string,
  sliceIndex?: number
) {
  if (larvitarManager === null) {
    larvitarManager = {};
  }

  let data = { ...imageObject };

  if (data.metadata?.isMultiframe) {
    let seriesId = customId || imageObject.metadata.seriesUID;
    let loadedStack: ReturnType<typeof getLarvitarManager> = {};
    updateLoadedStack(data, loadedStack, customId, sliceIndex);
    buildMultiFrameImage(
      seriesId as string,
      loadedStack[seriesId as string] as Series
    );
  } 
  else {
    updateLoadedStack(data, larvitarManager, customId, sliceIndex);
  }
  return larvitarManager;
};

/**
 * This function can be called in order to populate the Larvitar manager
 * @instance
 * @function populateLarvitarManager
 * @param {String} larvitarSeriesInstanceUID The Id of the manager stack
 * @param {Object} seriesData The series data
 * @returns {manager} the Larvitar manager
 */
export const populateLarvitarManager = function (
  larvitarSeriesInstanceUID: string,
  seriesData: Series
) {
  if (larvitarManager === null) {
    larvitarManager = {};
  }
  let data = { ...seriesData };
  if (data.isMultiframe) {
    buildMultiFrameImage(larvitarSeriesInstanceUID, data);
  } else {
    larvitarManager[larvitarSeriesInstanceUID] = data;
  }
  return larvitarManager;
};

/**
 * Return the common data loader manager
 * @instance
 * @function getLarvitarManager
 * @returns {Object} the loader manager
 */
export const getLarvitarManager = function () {
  if (larvitarManager == null) {
    larvitarManager = {};
  }
  return larvitarManager;
};

/**
 * Return the common image tracker
 * @instance
 * @function getLarvitarImageTracker
 * @returns {Object} the image tracker
 */
export const getLarvitarImageTracker = function () {
  if (imageTracker == null) {
    imageTracker = {};
  }
  return imageTracker;
};

/**
 * Reset the Larvitar Manager store
 * @instance
 * @function resetLarvitarManager
 */
export const resetLarvitarManager = function () {
  each(larvitarManager, function (stack) {
    if ((stack as Series).isMultiframe) {
      if ((stack as Series).dataSet) {
        //@ts-ignore for memory leak
        (stack as Series).dataSet!.byteArray = null;
      }
      (stack as Series).dataSet = null;
      (stack as Series).elements = null;
      clearMultiFrameCache(stack.seriesUID);
    }
    each(stack.instances, function (instance) {
      if (instance.dataSet) {
        //@ts-ignore for memory leak
        instance.dataSet.byteArray = null;
      }
      instance.dataSet = null;
      instance.file = null;
      //@ts-ignore for memory leak
      instance.metadata = null;
    });
  });
  larvitarManager = null;
  imageTracker = null;
};

/**
 * Remove a stored seriesId from the larvitar Manager
 * @instance
 * @function removeSeriesFromLarvitarManager
 * @param {String} seriesId The Id of the series
 */
export const removeSeriesFromLarvitarManager = function (seriesId: string) {
  if (larvitarManager && larvitarManager[seriesId]) {
    if ((larvitarManager[seriesId] as Series).isMultiframe) {
      //@ts-ignore for memory leak
      (larvitarManager[seriesId] as Series).dataSet.byteArray = null;
      (larvitarManager[seriesId] as Series).dataSet = null;
      (larvitarManager[seriesId] as Series).elements = null;
      clearMultiFrameCache(seriesId);
    }
    each(larvitarManager[seriesId].instances, function (instance) {
      if (instance.dataSet) {
        //@ts-ignore for memory leak
        instance.dataSet.byteArray = null;
      }
      instance.dataSet = null;
      instance.file = null;
      //@ts-ignore for memory leak
      instance.metadata = null;
    });
    //@ts-ignore for memory leak
    larvitarManager[seriesId] = null;
    delete larvitarManager[seriesId];
  }
};

/**
 * Return the data of a specific seriesId stored in the DICOM Manager
 * @instance
 * @function getSeriesDataFromLarvitarManager
 * @param {String} seriesId The Id of the series
 * @return {Object} larvitar manager data
 */
export const getSeriesDataFromLarvitarManager = function (seriesId: string) {
  return larvitarManager ? larvitarManager[seriesId] : null;
};

/**
 * Compute and return image frame
 * @instance
 * @function getImageFrame
 * @param {Object} metadata metadata object
 * @param {Object} dataSet dicom dataset
 * @returns {Object} specific image frame
 */
export const getImageFrame = function (metadata: MetaData, dataSet: DataSet) {
  let imagePixelModule;

  if (dataSet) {
    imagePixelModule =
      cornerstoneDICOMImageLoader.wadouri.metaData.getImagePixelModule(dataSet);
  } else {
    imagePixelModule = {
      samplesPerPixel: metadata.x00280002,
      photometricInterpretation: metadata.x00280004,
      planarConfiguration: metadata.x00280006,
      rows: metadata.x00280010,
      columns: metadata.x00280011,
      bitsAllocated: metadata.x00280100,
      pixelRepresentation: metadata.x00280103,
      smallestPixelValue: metadata.x00280106,
      largestPixelValue: metadata.x00280107,
      redPaletteColorLookupTableDescriptor: metadata.x00281101,
      greenPaletteColorLookupTableDescriptor: metadata.x00281102,
      bluePaletteColorLookupTableDescriptor: metadata.x00281103,
      redPaletteColorLookupTableData: metadata.x00281201,
      greenPaletteColorLookupTableData: metadata.x00281202,
      bluePaletteColorLookupTableData: metadata.x00281203
    };
  }

  return {
    samplesPerPixel: imagePixelModule.samplesPerPixel,
    photometricInterpretation: imagePixelModule.photometricInterpretation,
    planarConfiguration: imagePixelModule.planarConfiguration,
    rows: imagePixelModule.rows,
    columns: imagePixelModule.columns,
    bitsAllocated: imagePixelModule.bitsAllocated,
    pixelRepresentation: imagePixelModule.pixelRepresentation, // 0 = unsigned,
    smallestPixelValue: imagePixelModule.smallestPixelValue,
    largestPixelValue: imagePixelModule.largestPixelValue,
    redPaletteColorLookupTableDescriptor:
      imagePixelModule.redPaletteColorLookupTableDescriptor,
    greenPaletteColorLookupTableDescriptor:
      imagePixelModule.greenPaletteColorLookupTableDescriptor,
    bluePaletteColorLookupTableDescriptor:
      imagePixelModule.bluePaletteColorLookupTableDescriptor,
    redPaletteColorLookupTableData:
      imagePixelModule.redPaletteColorLookupTableData,
    greenPaletteColorLookupTableData:
      imagePixelModule.greenPaletteColorLookupTableData,
    bluePaletteColorLookupTableData:
      imagePixelModule.bluePaletteColorLookupTableData,
    pixelData: undefined, // populated later after decoding,
    ImageData: undefined
  };
};


export const getSopInstanceUIDFromLarvitarManager = function (
  larvitarSeriesInstanceUID: string,
  imageId: string
) {
  if (larvitarManager === null) {
    return null;
  }
  let series = larvitarManager[larvitarSeriesInstanceUID];
  return Object.keys(series.instanceUIDs).find(
    key => series.instanceUIDs[key] === imageId
  );
};
const getTemporalSeriesData = function( series: Series,) {
  type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
  };
  type SeriesData = StoreViewport;
  const data: RecursivePartial<SeriesData> = {};
  if (series.is4D) {
    data.isMultiframe = false;
    data.isTimeserie = true;
    // check with real indices
    data.numberOfSlices = series.numberOfImages;
    data.numberOfTemporalPositions = series.numberOfTemporalPositions;
    data.imageIndex = 0;
    data.timeIndex = 0;
    data.imageId = series.imageIds[data.imageIndex];
    data.timestamp = series.instances[data.imageId].metadata[
      "x00080033"
    ] as number;
    data.timestamps = [];
    data.timeIds = [];
    each(series.imageIds, function (imageId: string) {
      (data.timestamps as any[]).push(
        series.instances[imageId].metadata.contentTime
      );
      (data.timeIds as any[]).push(
        series.instances[imageId].metadata.temporalPositionIdentifier! - 1 // timeId from 0 to N
      );
    });
  }
  return data as SeriesData;
};
/**
 * Return the SOP Instance UID of a specific imageId stored in the Larvitar Manager
 * @instance
 * @function updateViewportDataInLarvitarManager
 * @param {Series} seriesStack The Id of the series
 * @param {String} elementId The Id of the image
 */
export const updateViewportDataInLarvitarManager = function(
  seriesStack: Series,
  elementId: string,
) {
    let series = { ...seriesStack };

    const data = getTemporalSeriesData(series);
    if (series.is4D) {
      setStore([
        "numberOfTemporalPositions",
        elementId,
        data.numberOfTemporalPositions as number
      ]);
      setStore(["minTimeId", elementId, 0]);
      // preserve actual timeId
      /*
      let timeId = data.timeIndex || 0;
      timeId = store.get([elementId, 'timeId']); 
      console.log('timeId ');
      console.log(timeId);
      setStore(["timeId", elementId, timeId || 0]);
      */
      if (data.numberOfSlices && data.numberOfTemporalPositions) {
        setStore(["maxTimeId", elementId, data.numberOfTemporalPositions - 1]);
        let maxSliceId = data.numberOfSlices * data.numberOfTemporalPositions - 1;
        setStore(["maxSliceId", elementId, maxSliceId]);
      }
      setStore(["timestamps", elementId, data.timestamps || []]);
      setStore(["timeIds", elementId, data.timeIds || []]);
      // let data = getSeriesData(series, defaultProps);
   } else {
    setStore(["minTimeId", elementId, 0]);
    setStore(["timeId", elementId, 0]);
    setStore(["maxTimeId", elementId, 0]);
    setStore(["timestamp", elementId, 0]);
    setStore(["timestamps", elementId, []]);
    setStore(["timeIds", elementId, []]);
  }
}