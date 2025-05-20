/** @module imaging/imageUtils
 *  @desc This file provides utility functions for
 *        manipulating image pixels and image metadata
 */

// external libraries
import {
  isEmpty,
  sortBy,
  clone,
  find,
  filter,
  has,
  max,
  map,
  forEach,
  extend,
  indexOf,
  random
} from "lodash";
import { v4 as uuidv4 } from "uuid";
import cornerstone from "cornerstone-core";

// internal libraries
import { getDicomImageId } from "./loaders/dicomLoader";
import TAG_DICT from "./dataDictionary.json";
import { getDataFromImageManager } from "./imageManagers";
import type {
  CustomDataSet,
  MetaData,
  ReslicedInstance,
  Series
} from "./types";
import { getTagValue } from "./imageTags";
import { MetaDataTypes } from "./MetaDataTypes";
import { logger } from "../common/logger";

// global module variables
// variables used to manage the reslice functionality
const resliceTable: {
  [key: string]: {
    [key: string]: [number, number, number];
  };
} = {
  sagittal: { coronal: [-2, 1, 0], axial: [-2, 0, -1] },
  coronal: { sagittal: [2, 1, -0], axial: [0, 2, -1] },
  axial: { sagittal: [1, -2, -0], coronal: [0, -2, 1] }
};

/*
 * This module provides the following functions to be exported:
 * getNormalOrientation(array[6])
 * getMinPixelValue(defaultValue, pixelData)
 * getMaxPixelValue(defaultValue, pixelData)
 * getPixelRepresentation(dataset)
 * getTypedArrayFromDataType(dataType)
 * getSortedStack(seriesData, sortPriorities, returnSuccessMethod)
 * getSortedUIDs(seriesData)
 * randomId()
 * getMeanValue(series, tag, isArray)
 * getReslicedMetadata(reslicedSeriesId, fromOrientation, toOrientation, seriesData, imageLoaderName)
 * getCmprMetadata(reslicedSeriesId, imageLoaderName, header)
 * getReslicedPixeldata(imageId, originalData, reslicedData)
 * getDistanceBetweenSlices(seriesData, sliceIndex1, sliceIndex2)
 * isElement(o)
 * getImageMetadata(uniqueUID, instanceUID)
 */

/**
 * @typedef {Object} CornerstoneSeries
 * @property {Array} imageIds Array of the instances imageIds
 * @property {Array} instances Array of instances
 * @property {Number} currentImageIndex Currently loaded image id index in the imageIds array
 */

/**
 * Return computed 3D normal from two 3D vectors
 * @instance
 * @function getNormalOrientation
 * @param {Array} el - The image_orientation dicom tag
 */
export const getNormalOrientation = function (
  el: [number, number, number, number, number, number]
) {
  let a = [el[0], el[1], el[2]];
  let b = [el[3], el[4], el[5]];

  let n = [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];

  return n;
};

/**
 * Get the min pixel value from pixelData
 * @instance
 * @function getMinPixelValue
 * @param {Array} pixelData - Pixel data array
 */
export const getMinPixelValue = function (pixelData: number[]): number {
  let min = +Infinity;
  for (let i = 0; i < pixelData.length; i++) {
    if (!min || min > pixelData[i]) {
      min = pixelData[i];
    }
  }
  return min;
};

/**
 * Get the max pixel value from pixelData
 * @instance
 * @function getMaxPixelValue
 * @param {Array} pixelData - Pixel data array
 */
export const getMaxPixelValue = function (pixelData: number[]): number {
  let max = -Infinity;
  for (let i = 0; i < pixelData.length; i++) {
    if (!max || max < pixelData[i]) {
      max = pixelData[i];
    }
  }
  return max;
};

/**
 * Create the pixel representation string (type and length) from dicom tags
 * @instance
 * @function getPixelRepresentation
 * @param {Object} dataSet - The dataset
 * @returns {String} The pixel representation in the form Sint / Uint + bytelength
 */
export const getPixelRepresentation = function (dataSet: CustomDataSet) {
  if (dataSet.repr) {
    return dataSet.repr;
  } else {
    // Bits Allocated (0028,0100) defines how much space is allocated
    // in the buffer for every sample in bits.
    let bitsAllocated = getTagValue(dataSet, "x00280100");
    // Pixel Representation (0028,0103) is either unsigned (0) or signed (1).
    // The default is unsigned.
    let pixelRepresentation = getTagValue(dataSet, "x00280103");
    let representation =
      pixelRepresentation === 1
        ? "Sint" + bitsAllocated
        : "Uint" + bitsAllocated;
    return representation;
  }
};

/**
 * Get a typed array from a representation type
 * @instance
 * @function getTypedArrayFromDataType
 * @param {Object} dataType - The data type
 * @returns {TypedArray} The typed array
 */
export const getTypedArrayFromDataType = function (dataType: string) {
  let repr = dataType.toLowerCase() as keyof typeof TYPES_TO_TYPEDARRAY;
  let typedArray = has(TYPES_TO_TYPEDARRAY, repr)
    ? TYPES_TO_TYPEDARRAY[repr]
    : null;
  if (!typedArray) {
    logger.error("invalid data type: ", dataType);
  }
  return typedArray;
};

/**
 * Sort the array of images ids of a series trying with:
 * - content time order, if the series has cardiacNumberOfImages tag > 1
 * - position order, if series has needed patient position tags
 * - instance order, if series has instance numbers tags
 * The priority of the method depends on the instanceSortPriority value
 * @instance
 * @function getSortedStack
 * @param {Object} seriesData - The dataset
 * @param {Array} sortPriorities - An array which represents the priority tasks
 * @param {Bool} returnSuccessMethod - Boolean for returning the success method
 * @return {Object} The sorted stack
 */
export const getSortedStack = function (
  seriesData: Series,
  sortPriorities: Array<"imagePosition" | "contentTime" | "instanceNumber">,
  returnSuccessMethod: boolean
) {
  let tryToSort = function (
    data: Series,
    methods: typeof sortPriorities
  ): string[] {
    if (isEmpty(methods)) {
      if (returnSuccessMethod === true) {
        return sorted!;
      } else {
        return sorted!;
      }
    }

    let sortMethod = methods.shift();
    var sorted = sortBy(data.imageIds, function (imageId: string) {
      return sortStackCallback(data, imageId, sortMethod!);
    });
    if (returnSuccessMethod === true) {
      return sorted;
    } else {
      return sorted;
    }
  };

  // sortPriorities will be shifted, so clone it before calling the tryToSort fucntion
  let clonedList = clone(sortPriorities);
  return tryToSort(seriesData, clonedList);
};

/**
 * Sort the array of instanceUIDs according to imageIds sorted using sortSeriesStack
 * @instance
 * @function getSortedUIDs
 * @param {Object} seriesData - The dataset
 * @return {Object} The sorted instanceUIDs
 */
export const getSortedUIDs = function (seriesData: Series) {
  let instanceUIDs: { [key: string]: string } = {};
  forEach(seriesData.imageIds, function (imageId: string) {
    let instanceUID = seriesData.instances[imageId].metadata.instanceUID!;
    instanceUIDs[instanceUID] = imageId;
  });
  return instanceUIDs;
};

/**
 * Generate a randomUUID in the form 'uy0x2qz9jk9co642cjfus'
 * @instance
 * @function randomId
 * @return {String} - Random uid
 */
export const randomId = function () {
  return rand() + rand();
};

/**
 * Get the mean value of a specified dicom tag in a serie
 * @instance
 * @function getMeanValue
 * @param {Object} series - The cornerstone series object
 * @param {Object} tag - The target tag key
 * @param {Bool} isArray - True if tag value is an array
 * @return {Number} - Tag mean value
 */
export const getMeanValue = function (
  series: Series,
  tag: keyof MetaData,
  isArray: boolean
) {
  let meanValue = isArray ? ([] as number[]) : (0 as number);

  forEach(series.imageIds, function (imageId: string) {
    let tagValue = series.instances[imageId].metadata[
      tag
    ] as MetaData[typeof tag];
    if (Array.isArray(tagValue)) {
      tagValue; //exclude array of metadatatypes
      meanValue = meanValue as number[];

      if (tagValue.length === 2) {
        tagValue = tagValue as [number, number];
        meanValue[0] = meanValue[0] ? meanValue[0] + tagValue[0] : tagValue[0];
        meanValue[1] = meanValue[1] ? meanValue[1] + tagValue[1] : tagValue[1];
      } else if (tagValue.length === 3) {
        tagValue = tagValue as [number, number, number];
        meanValue[0] = meanValue[0] ? meanValue[0] + tagValue[0] : tagValue[0];
        meanValue[1] = meanValue[1] ? meanValue[1] + tagValue[1] : tagValue[1];
        meanValue[2] = meanValue[2] ? meanValue[2] + tagValue[2] : tagValue[2];
      } else if (tagValue.length === 6) {
        tagValue = tagValue as [number, number, number, number, number, number];
        meanValue[0] = meanValue[0] ? meanValue[0] + tagValue[0] : tagValue[0];
        meanValue[1] = meanValue[1] ? meanValue[1] + tagValue[1] : tagValue[1];
        meanValue[2] = meanValue[2] ? meanValue[2] + tagValue[2] : tagValue[2];
        meanValue[3] = meanValue[3] ? meanValue[3] + tagValue[3] : tagValue[3];
        meanValue[4] = meanValue[4] ? meanValue[4] + tagValue[4] : tagValue[4];
        meanValue[5] = meanValue[5] ? meanValue[5] + tagValue[5] : tagValue[5];
      }
    } else {
      meanValue = meanValue as number;
      tagValue = parseFloat(tagValue as string);
      meanValue += tagValue;
    }
  });

  if (isArray) {
    meanValue = meanValue as number[];
    for (let i = 0; i < meanValue.length; i++) {
      meanValue[i] /= series.imageIds.length;
    }
  } else {
    meanValue = meanValue as number;
    meanValue /= series.imageIds.length;
  }
  return meanValue;
};

/**
 * Compute resliced metadata from a cornerstone data structure
 * @instance
 * @function getReslicedMetadata
 * @param {String} reslicedSeriesId - The id of the resliced serie
 * @param {String} fromOrientation - Source orientation (eg axial, coronal or sagittal)
 * @param {String} toOrientation - Target orientation (eg axial, coronal or sagittal)
 * @param {Object} seriesData - The original series data
 * @param {String} imageLoaderName - The registered loader name
 * @return {Object} - Cornerstone series object, filled only with metadata
 */
export const getReslicedMetadata = function (
  reslicedSeriesId: string,
  fromOrientation: "axial" | "coronal" | "sagittal",
  toOrientation: "axial" | "coronal" | "sagittal",
  seriesData: Series,
  imageLoaderName: string
) {
  // get reslice metadata and apply the reslice algorithm
  let permuteTable = resliceTable[fromOrientation][toOrientation];
  let permuteAbsTable = permuteTable.map(function (v) {
    return Math.abs(v);
  });

  // orthogonal reslice algorithm
  let reslicedImageIds: string[] = [];
  let reslicedInstances: { [key: string]: ReslicedInstance } = {};

  let sampleMetadata = seriesData.instances[seriesData.imageIds[0]].metadata;

  let fromSize = [
    sampleMetadata.x00280011!,
    sampleMetadata.x00280010!,
    seriesData.imageIds.length
  ];
  let toSize = permuteValues(permuteAbsTable, fromSize);
  let fromSpacing = spacingArray(seriesData, sampleMetadata);
  let toSpacing = permuteValues(permuteAbsTable, fromSpacing as number[]);
  let reslicedIOP = getReslicedIOP(sampleMetadata.x00200037!, permuteTable);

  for (let f = 0; f < toSize[2]; f++) {
    let reslicedImageId = getDicomImageId(imageLoaderName);
    reslicedImageIds.push(reslicedImageId);

    let instanceId = uuidv4();
    let reslicedIPP = getReslicedIPP(
      sampleMetadata.x00200032 as [number, number, number],
      sampleMetadata.x00200037!,
      reslicedIOP,
      permuteTable,
      f,
      fromSize,
      toSize,
      fromSpacing as number[]
    );
    let metadata: MetaData = extend(clone(sampleMetadata), {
      // pixel representation
      x00280100: sampleMetadata.x00280100,
      x00280103: sampleMetadata.x00280103,
      // resliced series sizes
      x00280010: toSize[1], // rows
      x00280011: toSize[0], // cols
      // resliced series spacing
      x00280030: [toSpacing[1], toSpacing[0]],
      x00180050: [toSpacing[2]],
      // remove min and max pixelvalue from metadata before calling the createCustomImage function:
      // need to recalculate the min and max pixel values on the new instance pixelData
      x00280106: undefined,
      x00280107: undefined,
      // resliced series data
      x0020000d: sampleMetadata.x0020000d,
      x0020000e: reslicedSeriesId,
      x00200011: random(10000),
      x00080018: instanceId,
      x00020003: instanceId,
      x00200013: f + 1,
      x00201041: getReslicedSliceLocation(reslicedIOP, reslicedIPP),
      x00100010: sampleMetadata.x00100010,
      x00081030: sampleMetadata.x00081030,
      x00080020: sampleMetadata.x00080020,
      x00080030: sampleMetadata.x00080030,
      x00080061: sampleMetadata.x00080061,
      x0008103e: sampleMetadata.x0008103e,
      x00080021: sampleMetadata.x00080021,
      x00080031: sampleMetadata.x00080031,
      x00080060: sampleMetadata.x00080060,
      x00280008: sampleMetadata.x00280008,
      x00101010: sampleMetadata.x00101010,
      x00020010: sampleMetadata.x00020010,
      x00200052: sampleMetadata.x00200052,
      // data needed to obtain a good rendering
      x00281050: sampleMetadata.x00281050,
      x00281051: sampleMetadata.x00281051,
      x00281052: sampleMetadata.x00281052,
      x00281053: sampleMetadata.x00281053,
      // new image orientation
      x00200037: reslicedIOP,
      // new image position
      x00200032: reslicedIPP
    });

    // set human readable metadata.
    metadata.uniqueUID = reslicedSeriesId;
    metadata.seriesUID = reslicedSeriesId;
    metadata.rows = metadata.x00280010;
    metadata.cols = metadata.x00280011;
    metadata.imageOrientation = metadata.x00200037;
    metadata.imagePosition = metadata.x00200032;
    metadata.pixelSpacing = metadata.x00280030
      ? metadata.x00280030
      : metadata.x00080060 === "US" &&
          metadata["x00186011"]![0].x0018602e != undefined &&
          metadata["x00186011"]![0].x0018602c != undefined
        ? ([
            metadata["x00186011"]![0].x0018602e * 10, //so that from cm goes to mm
            metadata["x00186011"]![0].x0018602c * 10
          ] as [number, number])
        : metadata.x00280030;
    metadata.instanceUID = metadata.x00080018;
    metadata.minPixelValue = metadata.x00280106;
    metadata.maxPixelValue = metadata.x00280107;
    metadata.sliceThickness = toSpacing[2];

    reslicedInstances[reslicedImageId] = {
      instanceId: instanceId,
      metadata: metadata,
      permuteTable: permuteTable
    };
  }

  return {
    imageIds: reslicedImageIds,
    instances: reslicedInstances,
    currentImageIdIndex: 0
  };
};

/**
 * Compute cmpr metadata from pyCmpr data (generated using Scyther {@link https://github.com/dvisionlab/Scyther})
 * @instance
 * @function getCmprMetadata
 * @param {String} reslicedSeriesId - The id of the resliced serie
 * @param {String} imageLoaderName - The registered loader name
 * @param {Object} header - The header of the resliced serie from Scyther
 * @return {Object} - Cornerstone series object, filled only with metadata
 */
export const getCmprMetadata = function (
  reslicedSeriesId: string,
  imageLoaderName: string,
  header: any // TODO-ts : type
) {
  let reslicedImageIds: string[] = [];
  let reslicedInstances: { [key: string]: ReslicedInstance } = {};

  for (let f = 0; f < header.frames_number; f++) {
    let reslicedImageId = getDicomImageId(imageLoaderName);
    reslicedImageIds.push(reslicedImageId);

    let instanceId = uuidv4();

    let metadata: MetaData = {
      // pixel representation
      x00280100: header.repr,
      // Bits Allocated
      x00280103: header.repr,
      // resliced series sizes
      x00280010: header.rows, // rows
      x00280011: header.cols, // cols
      // resliced series spacing
      x00280030: [header.spacing[1], header.spacing[0]],
      x00180050: [header.distance_btw_slices] as number[],
      // remove min and max pixelvalue from metadata before calling the createCustomImage function:
      // need to recalculate the min and max pixel values on the new instance pixelData
      x00280106: undefined,
      x00280107: undefined,
      // resliced series data
      // x0020000d: sampleMetadata.x0020000d, //Study Instance UID
      x0020000e: reslicedSeriesId,
      x00200011: random(10000),
      x00080018: instanceId,
      x00020003: instanceId,
      x00200013: f + 1,
      // x00201041: getReslicedSliceLocation(reslicedIOP, reslicedIPP), // Slice Location
      // x00100010: sampleMetadata.x00100010,
      // x00081030: sampleMetadata.x00081030,
      // x00080020: sampleMetadata.x00080020,
      // x00080030: sampleMetadata.x00080030,
      // x00080061: sampleMetadata.x00080061,
      // x0008103e: sampleMetadata.x0008103e,
      // x00080021: sampleMetadata.x00080021,
      // x00080031: sampleMetadata.x00080031,
      // x00080060: sampleMetadata.x00080060,
      // x00280008: sampleMetadata.x00280008,
      // x00101010: sampleMetadata.x00101010,
      // x00020010: sampleMetadata.x00020010,
      // x00200052: sampleMetadata.x00200052,
      // data needed to obtain a good rendering
      x00281050: [header.wwwl[1] / 2], // [wl]
      x00281051: [header.wwwl[0]], // [ww]
      x00281052: header.intercept,
      x00281053: header.slope,
      // new image orientation (IOP)
      x00200037: header.iop ? header.iop.slice(f * 6, (f + 1) * 6) : null,
      // new image position (IPP)
      x00200032: header.ipp ? header.ipp.slice(f * 3, (f + 1) * 3) : null
    };

    reslicedInstances[reslicedImageId] = {
      instanceId: instanceId,
      metadata: metadata
    };
  }

  return {
    imageIds: reslicedImageIds,
    instances: reslicedInstances
  };
};

/**
 * Get pixel data for a single resliced slice, from cornerstone data structure
 * @instance
 * @function getReslicedPixeldata
 * @param {String} imageId - The id of the resulting image
 * @param {Object} originalData - The original series data (source)
 * @param {Object} reslicedData - The resliced series data (target)
 * @return {Object} - A single resliced slice pixel array
 */
export const getReslicedPixeldata = function (
  imageId: string,
  originalData: Series,
  reslicedData: Series
) {
  // resliced metadata must be already available
  let reslicedInstance = reslicedData.instances[imageId] as ReslicedInstance;
  let reslicedMetadata = reslicedInstance.metadata;
  if (!reslicedInstance.permuteTable) {
    throw new Error("Resliced permuteTable not available");
  }
  let permuteAbsTable = reslicedInstance.permuteTable.map(function (v) {
    return Math.abs(v);
  });

  // compute resliced series pixelData, use the correct typedarray
  let rows = reslicedMetadata.x00280010 as number;
  let cols = reslicedMetadata.x00280011 as number;
  let reslicedSlice = getTypedArray(reslicedMetadata as any, rows * cols); // TODO-ts : type of reslicedMetadata?

  let frame = indexOf(reslicedData.imageIds, imageId);
  let originalInstance = originalData.instances[originalData.imageIds[0]];
  let fromCols = originalInstance.metadata.x00280011 as number;

  function getPixelValue(ijf: [number, number, number]) {
    let i = ijf[0];
    let j = ijf[1];
    let f = ijf[2];

    let cachedImage = find(cornerstone.imageCache.cachedImages, [
      "imageId",
      originalData.imageIds[f]
    ]);
    let targetPixeldata = cachedImage.image.getPixelData();
    let index = j * fromCols + i;
    return targetPixeldata[index];
  }

  // flip f values
  if (isNegativeSign(reslicedInstance.permuteTable[2])) {
    frame = reslicedData.imageIds.length - frame;
  }

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let ijf: [number, number, number] = [0, 0, 0];
      ijf[permuteAbsTable[0]] = i;
      ijf[permuteAbsTable[1]] = j;
      ijf[permuteAbsTable[2]] = frame;

      // flip j index
      let index;
      if (isNegativeSign(reslicedInstance.permuteTable[1])) {
        index = rows * cols - j * cols + i;
      } else {
        // let i_padded = Math.floor(i * originalSampleMetadata.x00180050 / originalSampleMetadata.x00280030[0]);
        index = j * cols + i;
      }

      reslicedSlice[index] = getPixelValue(ijf);
    }
  }
  return reslicedSlice;
};

/**
 * Get distance between two slices
 * @instance
 * @function getDistanceBetweenSlices
 * @param {Object} seriesData - The series data
 * @param {Number} sliceIndex1 - The first slice index
 * @param {Number} sliceIndex2 - The second slice index
 * @return {Number} - The distance value
 */
export const getDistanceBetweenSlices = function (
  seriesData: Series,
  sliceIndex1: number,
  sliceIndex2: number
) {
  if (seriesData.imageIds.length <= 1) {
    return 0;
  }

  let imageId1 = seriesData.imageIds[sliceIndex1];
  let instance1 = seriesData.instances[imageId1];
  let metadata1 = instance1.metadata;
  let imageOrientation = metadata1.x00200037;
  let imagePosition = metadata1.x00200032 as [number, number, number];

  if (imageOrientation && imagePosition) {
    let normal = getNormalOrientation(imageOrientation);
    let d1 =
      normal[0] * imagePosition[0] +
      normal[1] * imagePosition[1] +
      normal[2] * imagePosition[2];

    let imageId2 = seriesData.imageIds[sliceIndex2];
    let instance2 = seriesData.instances[imageId2];
    let metadata2 = instance2.metadata;
    let imagePosition2 = metadata2.x00200032!;

    let d2 =
      normal[0] * imagePosition2[0] +
      normal[1] * imagePosition2[1] +
      normal[2] * imagePosition2[2]!;

    return Math.abs(d1 - d2);
  }
};

/**
 * @instance
 * @function getImageMetadata
 * @param {String} uniqueUID - The unique UID of the series
 * @param {String} instanceUID - The SOPInstanceUID
 * @param {number} frameId - Optional FrameId
 * @return {Array} - List of metadata objects: tag, name and value
 */
export const getImageMetadata = function (
  uniqueUID: string,
  instanceUID: string,
  frameId?: number
) {
  const seriesData = getDataFromImageManager(uniqueUID);
  if (seriesData === undefined || seriesData === null) {
    logger.warn(`Invalid Series ID: ${uniqueUID}`);
    return [];
  }

  // manage imageID if the image is a multiframe stack
  const imageId = seriesData.isMultiframe
    ? seriesData.instanceUIDs[instanceUID] + "?frame=" + frameId
    : seriesData.instanceUIDs[instanceUID];

  if (imageId === undefined) {
    logger.warn(`Invalid InstanceUID ID: ${instanceUID}`);
    return [];
  }

  let metadata = seriesData.instances[imageId].metadata;
  // get elements from metadata where the key starts with x and is length 7
  let metadata_keys = Object.keys(metadata);
  // loop metadata using metadata_keys and return list of key value pairs
  let metadata_list = map(metadata_keys, function (key: string) {
    // force uppercase to check in TAG_DICT
    const keyName = (key.charAt(0) +
      key.slice(1).toUpperCase()) as keyof typeof TAG_DICT;

    // force type KEY to keyof typeof MetaDataTypes
    const KEY = key as keyof MetaDataTypes;
    if (Object.keys(TAG_DICT).includes(keyName)) {
      const name = TAG_DICT[keyName] ? TAG_DICT[keyName].name : "";
      const value =
        metadata[KEY] && metadata[KEY]!.constructor == Object
          ? ""
          : metadata[KEY];
      const tag = (
        "(" +
        keyName.slice(1, 5) +
        "," +
        keyName.slice(5) +
        ")"
      ).toUpperCase();

      if (
        Array.isArray(value) &&
        value.every(nestedItem => typeof nestedItem === "object")
      ) {
        // loop nested metadata
        const nestedMetadata = map(value, function (nestedItem) {
          const nestedMetadata_keys = Object.keys(nestedItem);
          // loop nested metadata using metadata_keys and return list of key value pairs
          return map(nestedMetadata_keys, function (nestedKey) {
            const nestedKeyName = (nestedKey.charAt(0) +
              nestedKey.slice(1).toUpperCase()) as keyof typeof TAG_DICT;
            const nestedName = TAG_DICT[nestedKeyName]
              ? TAG_DICT[nestedKeyName].name
              : "";
            //@ts-ignore
            const nestedValue = nestedItem[nestedKey];
            const nestedTag = (
              "(" +
              nestedKeyName.slice(1, 5) +
              "," +
              nestedKeyName.slice(5) +
              ")"
            ).toUpperCase();
            return {
              tag: nestedTag,
              name: nestedName,
              value: nestedValue
            };
          });
        });
        return {
          tag: tag,
          name: name,
          value: nestedMetadata
        };
      } else {
        return {
          tag: tag,
          name: name,
          value: value
        };
      }
    }
  });

  // remove undefined values
  metadata_list = filter(metadata_list, function (item) {
    return item !== undefined;
  });
  return metadata_list;
};

/* Internal module functions */

/**
 * Returns the sorting value of the image id in the array of image ids
 * of the series according with the chosen sorting method
 * @instance
 * @function sortStackCallback
 * @param {Object} seriesData - The original series data
 * @param {String} imageId - The id of the target image
 * @param {String} method - Orientation target
 * @return {Number} - The sorting value (float)
 */
let sortStackCallback = function (
  seriesData: Series,
  imageId: string,
  method: "instanceNumber" | "contentTime" | "imagePosition"
) {
  switch (method) {
    case "instanceNumber":
      var instanceNumber = seriesData.instances[imageId].metadata.x00200013!;
      return instanceNumber;

    case "contentTime":
      return seriesData.instances[imageId].metadata.x00080033;

    case "imagePosition":
      let p = seriesData.instances[imageId].metadata.imagePosition;

      let o = seriesData.instances[imageId].metadata.imageOrientation;

      if (o && p) {
        var v1, v2, v3: number;
        v1 = o[0] * o[0] + o[3] * o[3];
        v2 = o[1] * o[1] + o[4] * o[4];
        v3 = o[2] * o[2] + o[5] * o[5];
        var sortIndex = -1;
        if (v1 <= v2 && v2 <= v3) {
          sortIndex = 0;
        }
        if (v2 <= v1 && v2 <= v3) {
          sortIndex = 1;
        }
        if (v3 <= v1 && v3 <= v2) {
          sortIndex = 2;
        }

        if (sortIndex === -1) {
          throw new Error("Invalid sort index");
        }
        return p[sortIndex];
      }

    default:
      break;
  }
};

/**
 * Generate a random number and convert it to base 36 (0-9a-z)
 * @instance
 * @function rand
 * @return {Number} - base36 random number
 */
let rand = function () {
  return Math.random().toString(36).substr(2);
};

/**
 * Permute array values using orientation array
 * @instance
 * @function permuteValues
 * @param {Array} convertArray - The orientation array
 * @param {Array} sourceArray - The source array
 * @return {Array} - The converted array
 */
let permuteValues = function (convertArray: number[], sourceArray: number[]) {
  let outputArray = new Array(convertArray.length);
  for (let i = 0; i < convertArray.length; i++) {
    outputArray[i] = sourceArray[convertArray[i]];
  }

  return outputArray;
};

/**
 * Check negative sign, considering also 0+ and 0-
 * @instance
 * @function isNegativeSign
 * @param {Number} x - The number to check
 * @return {Boolean} - Is negative boolean response
 */
let isNegativeSign = function (x: number) {
  return 1 / x !== 1 / Math.abs(x);
};

/**
 * Get typed array from tag and size of original array
 * @instance
 * @function getTypedArray
 * @param {String} tag - The DICOM tag used for pixel representation
 * @param {Number} size - The size of the array
 * @return {Array} - The typed array
 */
let getTypedArray = function (tags: CustomDataSet, size: number) {
  let r = getPixelRepresentation(tags);
  let typedArray = getTypedArrayFromDataType(r);
  if (!typedArray) {
    throw new Error("Invalid typed array");
  }
  return new typedArray(size);
};

/**
 * Get resliced image orientation tag from permuteTable
 * @instance
 * @function getReslicedIOP
 * @param {Array} iop - The image orientation array
 * @param {Array} permuteTable - The matrix transformation
 * @return {Array} - The resliced image orientation array
 */
let getReslicedIOP = function (
  iop: [number, number, number, number, number, number],
  permuteTable: number[]
) {
  if (!iop) {
    return null;
  }

  // compute resliced iop
  let u = iop.slice(0, 3);
  let v = iop.slice(3, 6);

  // abs the w array, the sign will be eventually changed during the permutation
  let w = getNormalOrientation(iop);
  // let absW = _.map(w, function(v) { return Math.abs(v); });

  // resliced iop components
  let shuffledIop = permuteSignedArrays(permuteTable, [u, v, w]);

  // keep the firts two components of shuffledIop
  return shuffledIop[0].concat(shuffledIop[1]);
};

/**
 * Get resliced image position tag from permuteTable
 * @instance
 * @function getReslicedIPP
 * @param {Array} iop - The image position array
 * @param {Array} iop - The image orientation array
 * @param {Array} reslicedIOP - The resliced image orientation array
 * @param {Array} permuteTable - The matrix transformation
 * @param {Number} imageIndex - The index of the image
 * @param {Array} fromSize - The array of source image dimension
 * @param {Array} toSize - The array of target image dimension
 * @param {Array} fromSpacing - The spacing array
 * @return {Array} - The resliced image position array
 */
let getReslicedIPP = function (
  ipp: [number, number, number],
  iop: [number, number, number, number, number, number],
  reslicedIOP: [number, number, number, number, number, number],
  permuteTable: number[],
  imageIndex: number,
  fromSize: number[],
  toSize: number[],
  fromSpacing: number[]
) {
  // compute resliced ipp
  let reslicedIPP = [];

  // iop data types??
  let u = iop.slice(0, 3);
  let v = iop.slice(3, 6);
  let w = getNormalOrientation(iop);
  let absW = map(w, function (v: number) {
    return Math.abs(v);
  });
  let majorOriginalIndex = indexOf(absW, max(absW));

  let normalReslicedIop = getNormalOrientation(reslicedIOP);
  normalReslicedIop = map(normalReslicedIop, function (v: number) {
    return Math.abs(v);
  });

  let majorIndex = indexOf(normalReslicedIop, max(normalReslicedIop));
  let index = isNegativeSign(permuteTable[majorIndex])
    ? toSize[majorIndex] - imageIndex
    : imageIndex;

  // flip z value on original slice
  if (isNegativeSign(permuteTable[1])) {
    ipp = ipp.map(function (val, i) {
      return val + fromSize[2] * fromSpacing[2] * w[i];
    }) as [number, number, number];
  }

  let spacing: number;
  let versor: number[];
  // to sagittal
  if (majorIndex == 0) {
    // original x spacing
    spacing = fromSpacing[0];
    versor = u;
  }
  // to coronal
  else if (majorIndex == 1) {
    // from sagittal
    if (majorOriginalIndex == 0) {
      spacing = fromSpacing[0];
      versor = u;

      // overwrite index with the majorOriginalIndex position
      // index = isNegativeSign(permuteTable[majorOriginalIndex]) ? (toSize[majorOriginalIndex] - imageIndex) : imageIndex;
    }
    // from axial
    else if (majorOriginalIndex == 2) {
      spacing = fromSpacing[1];
      versor = v;

      // overwrite index with the majorOriginalIndex position
      index = isNegativeSign(permuteTable[majorOriginalIndex])
        ? toSize[majorOriginalIndex] - imageIndex
        : imageIndex;
    }
  }
  // to axial
  else if (majorIndex == 2) {
    // original y spacing
    spacing = fromSpacing[1];
    versor = v;
  }

  reslicedIPP = ipp.map(function (val, i) {
    return val + index * spacing * versor[i];
  });

  return reslicedIPP as [number, number, number];
};

/**
 * Get resliced normal orientation vector
 * @instance
 * @function getReslicedSliceLocation
 * @param {Array} reslicedIOP - The resliced image orientation array
 * @param {Array} reslicedIPP - The resliced image position array
 * @return {Array} - The slice location as normal orientation vector
 */
let getReslicedSliceLocation = function (
  reslicedIOP: [number, number, number, number, number, number],
  reslicedIPP: [number, number, number]
) {
  let normalReslicedIop = getNormalOrientation(reslicedIOP);
  normalReslicedIop = map(normalReslicedIop, function (v: number) {
    return Math.abs(v);
  });

  let majorIndex = indexOf(normalReslicedIop, max(normalReslicedIop));
  return reslicedIPP[majorIndex];
};

/**
 * Get spacing array from seriesData
 * @instance
 * @function spacingArray
 * @param {Object} seriesData - The original series data
 * @param {Object} sampleMetadata - The medatata object
 * @return {Array} - The spacing array
 */
let spacingArray = function (
  seriesData: Series,
  sampleMetadata: MetaDataTypes
) {
  // the spacingArray is as follows:
  // [0]: column pixelSpacing value (x00280030[1])
  // [1]: row pixelSpacing value (x00280030[0])
  // [2]: distance between slices, given the series imageOrientationPatient and
  //      imagePositionPatient of the first two slices

  let distanceBetweenSlices = sampleMetadata["x00180050"]
    ? sampleMetadata["x00180050"]
    : getDistanceBetweenSlices(seriesData, 0, 1);

  let spacing = sampleMetadata.x00280030!;

  return [spacing[1], spacing[0], distanceBetweenSlices as number];
};

/**
 * Permute an array
 * @instance
 * @function permuteSignedArrays
 * @param {Array} convertArray - The array used to convert source array
 * @param {Array} sourceArray - The source array
 * @return {Array} - The permuted array array
 */
let permuteSignedArrays = function (
  convertArray: number[],
  sourceArray: number[][]
) {
  let outputArray = new Array(convertArray.length);
  for (let i = 0; i < convertArray.length; i++) {
    let sourceIndex = Math.abs(convertArray[i]);
    if (isNegativeSign(convertArray[i])) {
      outputArray[i] = sourceArray[sourceIndex].map(function (v) {
        return -v;
      });
    } else {
      outputArray[i] = sourceArray[sourceIndex];
    }
  }

  return outputArray;
};

/**
 * Object used to convert data type to typed array
 * @object
 */
const TYPES_TO_TYPEDARRAY = {
  "unsigned char": Uint8Array,
  uchar: Uint8Array,
  uint8: Uint8Array,
  uint8_t: Uint8Array,

  sint8: Int8Array,
  "signed char": Int8Array,
  int8: Int8Array,
  int8_t: Int8Array,

  ushort: Uint16Array,
  "unsigned short": Uint16Array,
  "unsigned short int": Uint16Array,
  uint16: Uint16Array,
  uint16_t: Uint16Array,

  sint16: Int16Array,
  short: Int16Array,
  "short int": Int16Array,
  "signed short": Int16Array,
  "signed short int": Int16Array,
  int16: Int16Array,
  int16_t: Int16Array,

  sint32: Int32Array,
  int: Int32Array,
  "signed int": Int32Array,
  int32: Int32Array,
  int32_t: Int32Array,

  uint: Uint32Array,
  "unsigned int": Uint32Array,
  uint32: Uint32Array,
  uint32_t: Uint32Array,

  float: Float32Array,
  double: Float64Array
};

/**
 * Check if a div tag is a valid DOM HTMLElement
 * @instance
 * @function isElement
 * @param {Object} o - The div tag
 * @return {Boolean} - True if is an element otherwise returns False
 */
export const isElement = function (o: any) {
  return typeof HTMLElement === "object"
    ? o instanceof HTMLElement //DOM2
    : o &&
        typeof o === "object" &&
        o !== null &&
        o.nodeType === 1 &&
        typeof o.nodeName === "string";
};
