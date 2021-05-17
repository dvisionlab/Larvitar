/** @module imaging/utils
 *  @desc This file provides utility functions for
 *        manipulating image pixels and image metadata
 */

// external libraries
import {
  isEmpty,
  sortBy,
  clone,
  find,
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
import { convertBytes } from "dicom-character-set";

// internal libraries
import { getDicomImageId } from "./loaders/dicomLoader";
import TAG_DICT from "./dataDictionary.json";

// global module variables
// variables used to manage the reslice functionality
const resliceTable = {
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
 * getPixelTypedArray(dataset, pixelDataElement)
 * getSortedStack(seriesData, sortPriorities, returnSuccessMethod)
 * randomId()
 * getMeanValue(series, tag, isArray)
 * getReslicedMetadata(reslicedSeriesId, fromOrientation, toOrientation, seriesData, imageLoaderName)
 * getCmprMetadata(reslicedSeriesId, imageLoaderName, header)
 * getReslicedPixeldata(imageId, originalData, reslicedData)
 * getDistanceBetweenSlices(seriesData, sliceIndex1, sliceIndex2)
 * parseTag(dataSet, propertyName, element)
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
export const getNormalOrientation = function (el) {
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
 * If a value is provided, returns it, otherwise get the min pixel value from pixelData
 * @instance
 * @function getMinPixelValue
 * @param {Number} value - The min value
 * @param {Array} pixelData - Pixel data array
 */
export const getMinPixelValue = function (value, pixelData) {
  if (value !== undefined) {
    return value;
  }
  let min;
  for (let i = 0; i < pixelData.length; i++) {
    if (!min || min > pixelData[i]) {
      min = pixelData[i];
    }
  }
  return min;
};

/**
 * If a value is provided, returns it, otherwise get the max pixel value from pixelData
 * @instance
 * @function getMaxPixelValue
 * @param {Number} value - The max value
 * @param {Array} pixelData - Pixel data array
 */
export const getMaxPixelValue = function (value, pixelData) {
  if (value !== undefined) {
    return value;
  }

  let max;
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
export const getPixelRepresentation = function (dataSet) {
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
export const getTypedArrayFromDataType = function (dataType) {
  let repr = dataType.toLowerCase();
  let typedArray = has(TYPES_TO_TYPEDARRAY, repr)
    ? TYPES_TO_TYPEDARRAY[repr]
    : null;
  if (!typedArray) {
    console.error("invalida data type: ", dataType);
  }
  return typedArray;
};

/**
 * Create and return a typed array from the pixel data
 * @instance
 * @function getPixelTypedArray
 * @param {Object} dataSet - The cornerstone serie object
 * @param {Object} pixelDataElement - The dataset metadata (dataSet.elements.x7fe00010)
 * @returns {TypedArray} The pixel array as proper typed array
 */
export const getPixelTypedArray = function (dataSet, pixelDataElement) {
  let buffer = dataSet.byteArray.buffer;
  let offset = pixelDataElement.dataOffset;
  let r = getPixelRepresentation(dataSet);
  let typedArray = getTypedArrayFromDataType(r);
  switch (typedArray) {
    case Uint16Array:
      length = pixelDataElement.length / 2;
      break;
    case Int16Array:
      length = pixelDataElement.length / 2;
      break;
    case Uint32Array:
      length = pixelDataElement.length / 4;
      break;
    case Int32Array:
      length = pixelDataElement.length / 4;
      break;
    default:
      length = pixelDataElement.length;
      break;
  }
  return new typedArray(buffer, offset, length);
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
 * @param {Array} sortPriorities - TODO
 * @param {Bool} returnSuccessMethod - TODO ask @SZ
 * @return {Object} The sorted stack
 */
export const getSortedStack = function (
  seriesData,
  sortPriorities,
  returnSuccessMethod
) {
  let tryToSort = function (data, methods) {
    if (isEmpty(methods)) {
      if (returnSuccessMethod === true) {
        return sorted;
      } else {
        return sorted;
      }
    }

    let sortMethod = methods.shift();
    try {
      var sorted = sortBy(data.imageIds, function (imageId) {
        return sortStackCallback(data, imageId, sortMethod);
      });
      if (returnSuccessMethod === true) {
        return sorted;
      } else {
        return sorted;
      }
    } catch (ex) {
      return tryToSort(data, methods);
    }
  };

  // sortPriorities will be shifted, so clone it before calling the tryToSort fucntion
  let clonedList = clone(sortPriorities);
  return tryToSort(seriesData, clonedList);
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
export const getMeanValue = function (series, tag, isArray) {
  let meanValue = isArray ? [] : 0;

  forEach(series.imageIds, function (imageId) {
    const tagValue = series.instances[imageId].metadata[tag];
    if (tagValue.length === 2) {
      meanValue[0] = meanValue[0] ? meanValue[0] + tagValue[0] : tagValue[0];
      meanValue[1] = meanValue[1] ? meanValue[1] + tagValue[1] : tagValue[1];
    } else if (tagValue.length === 3) {
      meanValue[0] = meanValue[0] ? meanValue[0] + tagValue[0] : tagValue[0];
      meanValue[1] = meanValue[1] ? meanValue[1] + tagValue[1] : tagValue[1];
      meanValue[2] = meanValue[2] ? meanValue[2] + tagValue[2] : tagValue[2];
    } else if (tagValue.length === 6) {
      meanValue[0] = meanValue[0] ? meanValue[0] + tagValue[0] : tagValue[0];
      meanValue[1] = meanValue[1] ? meanValue[1] + tagValue[1] : tagValue[1];
      meanValue[2] = meanValue[2] ? meanValue[2] + tagValue[2] : tagValue[2];
      meanValue[3] = meanValue[3] ? meanValue[3] + tagValue[3] : tagValue[3];
      meanValue[4] = meanValue[4] ? meanValue[4] + tagValue[4] : tagValue[4];
      meanValue[5] = meanValue[5] ? meanValue[5] + tagValue[5] : tagValue[5];
    } else {
      meanValue += tagValue;
    }
  });

  if (isArray) {
    for (let i = 0; i < meanValue.length; i++) {
      meanValue[i] /= series.imageIds.length;
    }
  } else {
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
  reslicedSeriesId,
  fromOrientation,
  toOrientation,
  seriesData,
  imageLoaderName
) {
  // get reslice metadata and apply the reslice algorithm
  let permuteTable = resliceTable[fromOrientation][toOrientation];
  let permuteAbsTable = permuteTable.map(function (v) {
    return Math.abs(v);
  });

  // orthogonal reslice algorithm
  let reslicedImageIds = [];
  let reslicedInstances = {};

  let sampleMetadata = seriesData.instances[seriesData.imageIds[0]].metadata;

  let fromSize = [
    sampleMetadata.x00280011,
    sampleMetadata.x00280010,
    seriesData.imageIds.length
  ];
  let toSize = permuteValues(permuteAbsTable, fromSize);
  let fromSpacing = spacingArray(seriesData, sampleMetadata);
  let toSpacing = permuteValues(permuteAbsTable, fromSpacing);
  let reslicedIOP = getReslicedIOP(sampleMetadata.x00200037, permuteTable);

  for (let f = 0; f < toSize[2]; f++) {
    let reslicedImageId = getDicomImageId(imageLoaderName);
    reslicedImageIds.push(reslicedImageId);

    let instanceId = uuidv4();
    let reslicedIPP = getReslicedIPP(
      sampleMetadata.x00200032,
      sampleMetadata.x00200037,
      reslicedIOP,
      permuteTable,
      f,
      fromSize,
      toSize,
      fromSpacing
    );
    let metadata = extend(clone(sampleMetadata), {
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
      x00200032: reslicedIPP,
      x00280106: sampleMetadata.x00280106,
      x00280107: sampleMetadata.x00280107
    });

    // set human readable metadata
    metadata.seriesUID = reslicedSeriesId;
    metadata.rows = metadata.x00280010;
    metadata.cols = metadata.x00280011;
    metadata.imageOrientation = metadata.x00200037;
    metadata.imagePosition = metadata.x00200032;
    metadata.pixelSpacing = metadata.x00280030;
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
  reslicedSeriesId,
  imageLoaderName,
  header
) {
  let reslicedImageIds = [];
  let reslicedInstances = {};

  for (let f = 0; f < header.frames_number; f++) {
    let reslicedImageId = getDicomImageId(imageLoaderName);
    reslicedImageIds.push(reslicedImageId);

    let instanceId = uuidv4();

    let metadata = {
      // pixel representation
      x00280100: header.repr,
      // Bits Allocated
      x00280103: header.repr,
      // resliced series sizes
      x00280010: header.rows, // rows
      x00280011: header.cols, // cols
      // resliced series spacing
      x00280030: [header.spacing[1], header.spacing[0]],
      x00180050: [header.distance_btw_slices],
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
      x00281052: [header.intercept],
      x00281053: [header.slope],
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
  imageId,
  originalData,
  reslicedData
) {
  // resliced metadata must be already available
  let reslicedInstance = reslicedData.instances[imageId];
  let reslicedMetadata = reslicedInstance.metadata;
  let permuteAbsTable = reslicedInstance.permuteTable.map(function (v) {
    return Math.abs(v);
  });

  // compute resliced series pixelData, use the correct typedarray
  let rows = reslicedMetadata.x00280010;
  let cols = reslicedMetadata.x00280011;
  let reslicedSlice = getTypedArray(reslicedMetadata, rows * cols);

  let frame = indexOf(reslicedData.imageIds, imageId);
  let originalInstance = originalData.instances[originalData.imageIds[0]];
  let fromCols = originalInstance.metadata.x00280011;

  function getPixelValue(ijf) {
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
      let ijf = [0, 0, 0];
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
  seriesData,
  sliceIndex1,
  sliceIndex2
) {
  if (seriesData.imageIds.length <= 1) {
    return 0;
  }

  let imageId1 = seriesData.imageIds[sliceIndex1];
  let instance1 = seriesData.instances[imageId1];
  let metadata1 = instance1.metadata;
  let imageOrientation = metadata1.imageOrientation
    ? metadata1.imageOrientation
    : metadata1.x00200037;
  let imagePosition = metadata1.imagePosition
    ? metadata1.imagePosition
    : metadata1.x00200032;

  if (imageOrientation && imagePosition) {
    let normal = getNormalOrientation(imageOrientation);
    let d1 =
      normal[0] * imagePosition[0] +
      normal[1] * imagePosition[1] +
      normal[2] * imagePosition[2];

    let imageId2 = seriesData.imageIds[sliceIndex2];
    let instance2 = seriesData.instances[imageId2];
    let metadata2 = instance2.metadata;
    let imagePosition2 = metadata2.imagePosition
      ? metadata2.imagePosition
      : metadata2.x00200032;

    let d2 =
      normal[0] * imagePosition2[0] +
      normal[1] * imagePosition2[1] +
      normal[2] * imagePosition2[2];

    return Math.abs(d1 - d2);
  }
};

/**
 * Parse a DICOM Tag according to its type
 * @instance
 * @function parseTag
 * @param {Object} dataSet - The parsed dataset object from dicom parser
 * @param {String} propertyName - The tag name
 * @param {Object} element - The parsed dataset element
 * @return {String} - The DICOM Tag value
 */
export const parseTag = function (dataSet, propertyName, element) {
  // GET VR
  var tagData = dataSet.elements[propertyName] || {};
  var vr = tagData.vr;
  if (!vr) {
    // use dicom dict to get VR
    var tag = getDICOMTag(propertyName);
    if (tag && tag.vr) {
      vr = tag.vr;
    } else {
      return element;
    }
  }

  var value;

  if (isStringVr(vr)) {
    // We ask the dataset to give us the element's data in string form.
    // Most elements are strings but some aren't so we do a quick check
    // to make sure it actually has all ascii characters so we know it is
    // reasonable to display it.
    var str = dataSet.string(propertyName);
    if (str === undefined) {
      return undefined;
    } else {
      // the string will be undefined if the element is present but has no data
      // (i.e. attribute is of type 2 or 3) so we only display the string if it has
      // data. Note that the length of the element will be 0 to indicate "no data"
      // so we don't put anything here for the value in that case.
      value = str;
    }

    // A string of characters representing an Integer in base-10 (decimal),
    // shall contain only the characters 0 - 9, with an optional leading "+" or "-".
    // It may be padded with leading and/or trailing spaces. Embedded spaces
    // are not allowed. The integer, n, represented shall be in the range:
    // -231 <= n <= (231 - 1).
    if (vr === "IS") {
      value = parseInt(value);
    }
    // A string of characters representing either a fixed point number
    // or a floating point number. A fixed point number shall contain only
    // the characters 0-9 with an optional leading "+" or "-" and an optional "."
    // to mark the decimal point. A floating point number shall be conveyed
    // as defined in ANSI X3.9, with an "E" or "e" to indicate the start
    // of the exponent. Decimal Strings may be padded with leading or trailing spaces.
    // Embedded spaces are not allowed.
    else if (vr === "DS") {
      value = value.split("\\").map(Number);
      if (propertyName == "x00281050" || propertyName == "x00281051") {
        value = value.length > 0 ? value[0] : value;
      } else {
        value = value.length == 1 ? value[0] : value;
      }
    }
    // A string of characters of the format YYYYMMDD; where YYYY shall contain year,
    // MM shall contain the month, and DD shall contain the day,
    // interpreted as a date of the Gregorian calendar system.
    else if (vr === "DA") {
      value = parseDateTag(value, false);
    }
    // A concatenated date-time character string in the format:
    // YYYYMMDDHHMMSS.FFFFFF
    else if (vr === "DT") {
      value = parseDateTimeTag(value);
    }
    // A string of characters of the format HHMMSS.FFFFFF; where HH contains hours
    // (range "00" - "23"), MM contains minutes (range "00" - "59"),
    // SS contains seconds (range "00" - "60"), and FFFFFF contains a fractional
    // part of a second as small as 1 millionth of a second (range "000000" - "999999").
    else if (vr === "TM") {
      value = parseTimeTag(value);
    }
    // Specific Character Set (0008,0005) identifies the Character Set that expands or
    // replaces the Basic Graphic Set (ISO 646) for values of Data Elements that have
    // Value Representation of SH, LO, ST, PN, LT, UC or UT.
    // If the Attribute Specific Character Set (0008,0005) is not present or has only
    // a single value, Code Extension techniques are not used. Defined Terms for the
    // Attribute Specific Character Set (0008,0005), when single valued, are derived
    // from the International Registration Number as per ISO 2375
    // (e.g., ISO_IR 100 for Latin alphabet No. 1).
    // See https://github.com/radialogica/dicom-character-set
    else if (
      vr == "PN" ||
      vr == "SH" ||
      vr == "LO" ||
      vr == "ST" ||
      vr == "LT" ||
      vr == "UC" ||
      vr == "UT"
    ) {
      // get character set
      let characterSet = dataSet.string("x00080005");
      if (characterSet) {
        let data = dataSet.elements[propertyName];
        let arr = new Uint8Array(
          dataSet.byteArray.buffer,
          data.dataOffset,
          data.length
        );
        value = convertBytes(characterSet, arr, {
          vr: vr
        });
        arr = null;
      }
      if (vr == "PN") {
        // PatientName tag value is: "LastName^FirstName^MiddleName".
        // Spaces inside each name component are permitted. If you don't know
        // any of the three components, just leave it empty.
        // Actually you may even append a name prefix (^professor) and
        // a name suffix (^senior) so you have a maximum of 5 components.
        value = parsePatientNameTag(value);
      }
      value = value.replace(/\0/g, ""); // remove null char (\u0000)
    }
    // A string of characters with one of the following formats
    // -- nnnD, nnnW, nnnM, nnnY; where nnn shall contain the number of days for D,
    // weeks for W, months for M, or years for Y.
    else if (vr == "AS") {
      value = parseAgeTag(value);
    }

    // A string of characters with leading or trailing spaces (20H) being non-significant.
    else if (vr === "CS") {
      if (propertyName === "x00041500") {
        value = parseDICOMFileIDTag(value);
      } else {
        value = value.split("\\").join(", ");
      }
    }
  } else if (vr === "US") {
    value = dataSet.uint16(propertyName);
  } else if (vr === "SS") {
    value = dataSet.int16(propertyName);
  } else if (vr === "US|SS") {
    value = dataSet.int16(propertyName);
  } else if (vr === "UL") {
    value = dataSet.uint32(propertyName);
  } else if (vr === "SL") {
    value = dataSet.int32(propertyName);
  } else if (vr == "FD") {
    value = dataSet.double(propertyName);
  } else if (vr == "FL") {
    value = dataSet.float(propertyName);
  } else if (
    vr === "OB" ||
    vr === "OW" ||
    vr === "OW|OB" ||
    vr === "US|OW" ||
    vr === "UN" ||
    vr === "OF" ||
    vr === "UT"
  ) {
    // If it is some other length and we have no string
    if (element.length === 2) {
      value =
        "binary data of length " +
        element.length +
        " as uint16: " +
        dataSet.uint16(propertyName);
    } else if (element.length === 4) {
      value =
        "binary data of length " +
        element.length +
        " as uint32: " +
        dataSet.uint32(propertyName);
    } else {
      value = "binary data of length " + element.length + " and VR " + vr;
    }
  } else if (vr === "AT") {
    var group = dataSet.uint16(propertyName, 0);
    if (group) {
      var groupHexStr = ("0000" + group.toString(16)).substr(-4);
      var elm = dataSet.uint16(propertyName, 1);
      var elmHexStr = ("0000" + elm.toString(16)).substr(-4);
      value = "x" + groupHexStr + elmHexStr;
    } else {
      value = "";
    }
  } else if (vr === "SQ") {
    // parse the nested tags
    var subTags = map(element, function (obj) {
      return map(obj, function (v, k) {
        return parseTag(dataSet, k, v);
      });
    });

    value = subTags;
  } else {
    // If it is some other length and we have no string
    value = "no display code for VR " + vr;
  }
  return value;
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
let sortStackCallback = function (seriesData, imageId, method) {
  switch (method) {
    case "instanceNumber":
      var instanceNumber = seriesData.instances[imageId].metadata.x00200013;
      instanceNumber = parseInt(instanceNumber);
      return instanceNumber;

    case "contentTime":
      var cardiacNumberOfImages =
        seriesData.instances[imageId].metadata.x00181090;
      var contentTime = seriesData.instances[imageId].metadata.x00080033;
      if (cardiacNumberOfImages && cardiacNumberOfImages > 1 && contentTime) {
        return contentTime;
      } else {
        throw "Not a time series: cardiacNumberOfImages tag not available or <= 1.";
      }

    case "imagePosition":
      var p = seriesData.instances[imageId].metadata.imagePosition;

      p = map(p, function (value) {
        return parseFloat(value);
      });

      var o = seriesData.instances[imageId].metadata.imageOrientation;
      o = map(o, function (value) {
        return parseFloat(value);
      });

      var v1, v2, v3;
      v1 = o[0] * o[0] + o[3] * o[3];
      v2 = o[1] * o[1] + o[4] * o[4];
      v3 = o[2] * o[2] + o[5] * o[5];

      var sortIndex;
      if (v1 <= v2 && v2 <= v3) {
        sortIndex = 0;
      }
      if (v2 <= v1 && v2 <= v3) {
        sortIndex = 1;
      }
      if (v3 <= v1 && v3 <= v2) {
        sortIndex = 2;
      }
      return p[sortIndex];
    default:
      break;
  }
};

/**
 * Get the dicom tag code from dicom image
 * @instance
 * @function getDICOMTagCode
 * @param {String} dicomTag - The original DICOM tag code
 * @return {String} - The human readable DICOM tag code
 */
let getDICOMTagCode = function (code) {
  let re = /x(\w{4})(\w{4})/;
  let result = re.exec(code);
  if (!result) {
    return code;
  }
  let newCode = "(" + result[1] + "," + result[2] + ")";
  newCode = newCode.toUpperCase();
  return newCode;
};

/**
 * Get the dicom tag from dicom tag code
 * @instance
 * @function getDICOMTag
 * @param {String} dicomTagCode - The original DICOM tag code
 * @return {String} - The human readable DICOM tag
 */
let getDICOMTag = function (code) {
  let newCode = getDICOMTagCode(code);
  let tag = TAG_DICT[newCode];
  return tag;
};

/**
 * Convert date from dicom tag
 * @instance
 * @function formatDate
 * @param {Date} dicomDate - A date from a DICOM tag
 * @return {String} - The human readable date
 */
let formatDate = function (date) {
  let yyyy = date.slice(0, 4);
  let mm = date.slice(4, 6);
  let dd = date.slice(6, 8);
  return (
    yyyy + "-" + (mm[1] ? mm : "0" + mm[0]) + "-" + (dd[1] ? dd : "0" + dd[0])
  );
};

/**
 * Convert datetime from dicom tag
 * @instance
 * @function formatDateTime
 * @param {Date} dicomDateTime - A dateTime from a DICOM tag
 * @return {String} - The human readable dateTime
 */
let formatDateTime = function (date) {
  let yyyy = date.slice(0, 4);
  let mm = date.slice(4, 6);
  let dd = date.slice(6, 8);
  let hh = date.slice(8, 10);
  let m = date.slice(10, 12);
  let ss = date.slice(12, 14);

  return (
    yyyy +
    "-" +
    (mm[1] ? mm : "0" + mm[0]) +
    "-" +
    (dd[1] ? dd : "0" + dd[0]) +
    "/" +
    hh +
    ":" +
    m +
    ":" +
    ss
  );
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
let permuteValues = function (convertArray, sourceArray) {
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
let isNegativeSign = function (x) {
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
let getTypedArray = function (tags, size) {
  let r = getPixelRepresentation(tags);
  let typedArray = getTypedArrayFromDataType(r);
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
let getReslicedIOP = function (iop, permuteTable) {
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
  ipp,
  iop,
  reslicedIOP,
  permuteTable,
  imageIndex,
  fromSize,
  toSize,
  fromSpacing
) {
  // compute resliced ipp
  let reslicedIPP = [];

  // iop data
  let u = iop.slice(0, 3);
  let v = iop.slice(3, 6);
  let w = getNormalOrientation(iop);
  let absW = map(w, function (v) {
    return Math.abs(v);
  });
  let majorOriginalIndex = indexOf(absW, max(absW));

  let normalReslicedIop = getNormalOrientation(reslicedIOP);
  normalReslicedIop = map(normalReslicedIop, function (v) {
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
    });
  }

  let spacing, versor;
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

  return reslicedIPP;
};

/**
 * Get resliced normal orientation vector
 * @instance
 * @function getReslicedSliceLocation
 * @param {Array} reslicedIOP - The resliced image orientation array
 * @param {Array} reslicedIPP - The resliced image position array
 * @return {Array} - The slice location as normal orientation vector
 */
let getReslicedSliceLocation = function (reslicedIOP, reslicedIPP) {
  let normalReslicedIop = getNormalOrientation(reslicedIOP);
  normalReslicedIop = map(normalReslicedIop, function (v) {
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
let spacingArray = function (seriesData, sampleMetadata) {
  // the spacingArray is as follows:
  // [0]: column pixelSpacing value (x00280030[1])
  // [1]: row pixelSpacing value (x00280030[0])
  // [2]: distance between slices, given the series imageOrientationPatient and
  //      imagePositionPatient of the first two slices

  let distanceBetweenSlices = sampleMetadata.x00180050
    ? sampleMetadata.x00180050
    : getDistanceBetweenSlices(seriesData, 0, 1);

  return [
    sampleMetadata.x00280030[1],
    sampleMetadata.x00280030[0],
    distanceBetweenSlices
  ];
};

/**
 * Permute an array
 * @instance
 * @function permuteSignedArrays
 * @param {Array} convertArray - The array used to convert source array
 * @param {Array} sourceArray - The source array
 * @return {Array} - The permuted array array
 */
let permuteSignedArrays = function (convertArray, sourceArray) {
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
 * Check if argument is a valid Date Object
 * @instance
 * @function isValidDate
 * @param {Date} d - The date object to be checked
 * @return {Boolean} - Boolean result
 */
const isValidDate = function (d) {
  return d instanceof Date && !isNaN(d);
};

/**
 * Check if argument is a string of concatenated vrs
 * @instance
 * @function isStringVr
 * @param {String} vr - The string to be checked
 * @return {Boolean} - Boolean result
 */
const isStringVr = function (vr) {
  // vr can be a string of concatenated vrs
  vr = vr || "";
  vr = vr.split("|")[0];

  if (
    vr === "AT" ||
    vr === "FL" ||
    vr === "FD" ||
    vr === "OB" ||
    vr === "OF" ||
    vr === "OW" ||
    vr === "SI" ||
    vr === "SQ" ||
    vr === "SS" ||
    vr === "UL" ||
    vr === "US"
  ) {
    return false;
  }
  return true;
};

/**
 * Parse a dicom date tag into human readable format
 * @instance
 * @function parseDateTag
 * @param {String} tagValue - The string to be parsed
 * @return {String} - The parsed result
 */
const parseDateTag = function (tagValue) {
  if (!tagValue) return;
  let year = tagValue.substring(0, 4);
  let month = tagValue.substring(4, 6);
  let day = tagValue.substring(6, 8);
  let date = new Date(year, month - 1, day);
  if (isValidDate(date) === true) {
    return date.toISOString();
  } else {
    return tagValue;
  }
};

/**
 * Parse a dicom datetime tag into human readable format
 * @instance
 * @function parseDateTimeTag
 * @param {String} tagValue - The string to be parsed
 * @return {String} - The parsed result
 */
const parseDateTimeTag = function (tagValue) {
  if (!tagValue) return;
  let year = tagValue.substring(0, 4);
  let month = tagValue.substring(4, 6);
  let day = tagValue.substring(6, 8);
  let hour = tagValue.substring(8, 10);
  let min = tagValue.substring(10, 12);
  let sec = tagValue.substring(12, 14);
  let msec = tagValue.substring(15, 21);
  let date = new Date(year, month - 1, day, hour, min, sec, msec);
  if (isValidDate(date) === true) {
    return date.toISOString();
  } else {
    return tagValue;
  }
};

/**
 * Parse a dicom time tag into human readable format
 * @instance
 * @function parseTimeTag
 * @param {String} tagValue - The string to be parsed
 * @return {String} - The parsed result
 */
const parseTimeTag = function (tagValue) {
  if (!tagValue) return;
  let hour = tagValue.substring(0, 2);
  let min = tagValue.substring(2, 4);
  let sec = tagValue.substring(4, 6);
  let msec = tagValue.substring(7, 13) ? tagValue.substring(7, 13) : "0";
  let result = hour + ":" + min + ":" + sec + "." + msec;
  return result;
};

/**
 * Parse a dicom patient tag into human readable format
 * @instance
 * @function parsePatientNameTag
 * @param {String} tagValue - The string to be parsed
 * @return {String} - The parsed result
 */
const parsePatientNameTag = function (tagValue) {
  if (!tagValue) return;
  return tagValue.replace(/\^/gi, " ");
};

/**
 * Parse a dicom age tag into human readable format
 * @instance
 * @function parseAgeTag
 * @param {String} tagValue - The string to be parsed
 * @return {String} - The parsed result
 */
const parseAgeTag = function (tagValue) {
  if (!tagValue) return;
  let regs = /(\d{3})(D|W|M|Y)/gim.exec(tagValue);
  if (regs) {
    return parseInt(regs[1]) + " " + regs[2];
  }
};

/**
 * Parse a dicom fileID tag into human readable format
 * @instance
 * @function parseDICOMFileIDTag
 * @param {String} tagValue - The string to be parsed
 * @return {String} - The parsed result
 */
const parseDICOMFileIDTag = function (tagValue) {
  // The DICOM File Service does not specify any "separator" between
  // the Components of the File ID. This is a Value Representation issue that
  // may be addressed in a specific manner by each Media Format Layer.
  // In DICOM IODs, File ID Components are generally handled as multiple
  // Values and separated by "backslashes".
  // There is no requirement that Media Format Layers use this separator.
  if (!tagValue) return;
  return tagValue.split("\\").join(path.sep);
};

/**
 * Extract tag value according to its value rapresentation, see
 * {@link http://dicom.nema.org/dicom/2013/output/chtml/part05/sect_6.2.html}
 * @instance
 * @function getTagValue
 * @param {Object} dataSet - the dataset
 * @param {String} tag - the desired tag key
 * @return {Number | Array | String} - the desired tag value
 */
const getTagValue = function (dataSet, tag) {
  // tag value rapresentation
  if (!getDICOMTag(tag)) {
    return null;
  }
  let vr = getDICOMTag(tag).vr;

  // parse value according to vr map
  let vrParsingMap = {
    // Date
    // string of characters of the format YYYYMMDD; where YYYY shall contain year,
    // MM shall contain the month, and DD shall contain the day,
    // interpreted as a date of the Gregorian calendar system.
    DA: function () {
      let dateString = dataSet.string(tag);
      return dateString ? formatDate(dateString) : "";
    },
    // Decimal String
    // A string of characters representing either a fixed point number
    // or a floating point number.
    DS: function () {
      let array = dataSet.string(tag)
        ? dataSet.string(tag).split("\\").map(Number)
        : null;
      if (!array) {
        return null;
      }
      return array.length === 1 ? array[0] : array;
    },
    // Date Time
    // A concatenated date-time character string in the format:
    // YYYYMMDDHHMMSS.FFFFFF&ZZXX
    DT: function () {
      let dateString = dataSet.string(tag);
      return formatDateTime(dateString);
    },
    // Person Name
    // A character string encoded using a 5 component convention.
    // The character code 5CH (the BACKSLASH "\" in ISO-IR 6) shall
    // not be present, as it is used as the delimiter between values
    // in multiple valued data elements. The string may be padded
    // with trailing spaces. For human use, the five components
    // in their order of occurrence are: family name complex,
    // given name complex, middle name, name prefix, name suffix.
    PN: function () {
      let pn = dataSet.string(tag) ? dataSet.string(tag).split("^") : null;
      if (!pn) {
        return null;
      }

      let pns = [pn[3], pn[0], pn[1], pn[2], pn[4]];
      return pns.join(" ").trim();
    },
    // Signed Short
    // Signed binary integer 16 bits long in 2's complement form
    SS: function () {
      return dataSet.uint16(tag);
    },
    // Unique Identifier
    // A character string containing a UID that is used to uniquely
    // identify a wide letiety of items. The UID is a series of numeric
    // components separated by the period "." character.
    UI: function () {
      return dataSet.string(tag);
    },
    // Unsigned Short
    // Unsigned binary integer 16 bits long.
    US: function () {
      return dataSet.uint16(tag);
    },
    "US|SS": function () {
      return dataSet.uint16(tag);
    }
  };
  return vrParsingMap[vr] ? vrParsingMap[vr]() : dataSet.string(tag);
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
