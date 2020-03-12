/** @module imaging/utils
 *  @desc This file provides utility functions for
 *        manipulating image pixels and image metadata
 *  @todo Document
 */

// external libraries
import {
  isEmpty,
  sortBy,
  clone,
  max,
  map,
  forEach,
  extend,
  indexOf,
  random
} from "lodash";
import uuid from "uuid";

// internal libraries
import { getCustomImageId, getSerieDimensions } from "./loaders/commonLoader";

const TAG_DICT = require("./dataDictionary.json");

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
 * getPixelTypedArray(dataset, pixelDataElement)
 * getSortedStack(seriesData, sortPriorities, returnSuccessMethod)
 * getTagValue(dataSet, tag)
 * randomId()
 * getMeanValue(series, tag, isArray)
 * getReslicedMetadata(reslicedSeriesId, fromOrientation, toOrientation, seriesData, imageLoaderName)
 * getReslicedPixeldata(imageId, originalData, reslicedData)
 * parseImageId(imageId)
 * getDistanceBetweenSlices(seriesData, sliceIndex1, sliceIndex2)
 * remapVoxel([i,j,k], fromOrientation, toOrientation)
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
export const getNormalOrientation = function(el) {
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
export const getMinPixelValue = function(value, pixelData) {
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
export const getMaxPixelValue = function(value, pixelData) {
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
export const getPixelRepresentation = function(dataSet) {
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
 * Create and return a typed array from the pixel data
 * @instance
 * @function getPixelTypedArray
 * @param {Object} dataSet - The cornerstone serie object
 * @param {Object} pixelDataElement - The dataset metadata (dataSet.elements.x7fe00010)
 * @returns {TypedArray} The pixel array as proper typed array
 */
export const getPixelTypedArray = function(dataSet, pixelDataElement) {
  let pixels;
  let buffer = dataSet.byteArray.buffer;
  let offset = pixelDataElement.dataOffset;
  let length = pixelDataElement.length;

  let r = getPixelRepresentation(dataSet);

  switch (r) {
    case "Uint8":
      pixels = new Uint8Array(buffer, offset, length);
      break;
    case "Sint8":
      pixels = new Int8Array(buffer, offset, length);
      break;
    case "Uint16":
      pixels = new Uint16Array(buffer, offset, length / 2);
      break;
    case "Sint16":
      pixels = new Int16Array(buffer, offset, length / 2);
      break;
    case "Uint32":
      pixels = new Uint32Array(buffer, offset, length / 4);
      break;
    case "Sint32":
      pixels = new Int32Array(buffer, offset, length / 4);
      break;
    default:
      pixels = new Uint8Array(buffer, offset, length);
      break;
  }
  return pixels;
};

/**
 * Sort the array of images ids of a series trying with:
 * - content time order, if the series has cardiacNumberOfImages tag > 1
 * - position order, if series has needed patient position tags
 * - instance order, if series has instance numbers tags
 * The priority of the method depends on the instanceSortPriority value
 * @instance
 * @function getPixelTypedArray
 * @param {Object} seriesData - The dataset
 * @param {Array} sortPriorities - TODO
 * @param {Bool} returnSuccessMethod - TODO ask @SZ
 * @return {Object} The sorted stack
 */
export const getSortedStack = function(
  seriesData,
  sortPriorities,
  returnSuccessMethod
) {
  let tryToSort = function(data, methods) {
    if (isEmpty(methods)) {
      if (returnSuccessMethod === true) {
        return sorted;
      } else {
        return sorted;
      }
    }

    let sortMethod = methods.shift();
    try {
      var sorted = sortBy(data.imageIds, function(imageId) {
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
 * Extract tag value according to its value rapresentation, see
 * {@link http://dicom.nema.org/dicom/2013/output/chtml/part05/sect_6.2.html}
 * @instance
 * @function getTagValue
 * @param {Object} dataSet - the dataset
 * @param {String} tag - the desired tag key
 * @return {Number | Array | String} - the desired tag value
 */
export const getTagValue = function(dataSet, tag) {
  // tag value rapresentation
  let vr = getDICOMTag(tag).vr;

  // parse value according to vr map
  let vrParsingMap = {
    // Date
    // string of characters of the format YYYYMMDD; where YYYY shall contain year,
    // MM shall contain the month, and DD shall contain the day,
    // interpreted as a date of the Gregorian calendar system.
    DA: function() {
      let dateString = dataSet.string(tag);
      return dateString ? formatDate(dateString) : "";
    },
    // Decimal String
    // A string of characters representing either a fixed point number
    // or a floating point number.
    DS: function() {
      let array = dataSet.string(tag)
        ? dataSet
            .string(tag)
            .split("\\")
            .map(Number)
        : null;
      if (!array) {
        return null;
      }
      return array.length === 1 ? array[0] : array;
    },
    // Date Time
    // A concatenated date-time character string in the format:
    // YYYYMMDDHHMMSS.FFFFFF&ZZXX
    DT: function() {
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
    PN: function() {
      let pn = dataSet.string(tag) ? dataSet.string(tag).split("^") : null;
      if (!pn) {
        return null;
      }

      let pns = [pn[3], pn[0], pn[1], pn[2], pn[4]];
      return pns.join(" ").trim();
    },
    // Signed Short
    // Signed binary integer 16 bits long in 2's complement form
    SS: function() {
      return dataSet.uint16(tag);
    },
    // Unique Identifier
    // A character string containing a UID that is used to uniquely
    // identify a wide letiety of items. The UID is a series of numeric
    // components separated by the period "." character.
    UI: function() {
      return dataSet.string(tag);
    },
    // Unsigned Short
    // Unsigned binary integer 16 bits long.
    US: function() {
      return dataSet.uint16(tag);
    },
    "US|SS": function() {
      return dataSet.uint16(tag);
    }
  };
  return vrParsingMap[vr] ? vrParsingMap[vr]() : dataSet.string(tag);
};

/**
 * Generate a randomUUID in the form 'uy0x2qz9jk9co642cjfus'
 * @instance
 * @function randomId
 * @return {String} - Random uid
 */
export const randomId = function() {
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
export const getMeanValue = function(series, tag, isArray) {
  let meanValue = isArray ? [] : 0;

  forEach(series.imageIds, function(imageId) {
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
export const getReslicedMetadata = function(
  reslicedSeriesId,
  fromOrientation,
  toOrientation,
  seriesData,
  imageLoaderName
) {
  // get reslice metadata and apply the reslice algorithm
  let permuteTable = resliceTable[fromOrientation][toOrientation];
  let permuteAbsTable = permuteTable.map(function(v) {
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
    let reslicedImageId = getCustomImageId(imageLoaderName);
    reslicedImageIds.push(reslicedImageId);

    let instanceId = uuid.v4();
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
      x00200032: reslicedIPP
    });

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
export const getCmprMetadata = function(
  reslicedSeriesId,
  imageLoaderName,
  header
) {
  let reslicedImageIds = [];
  let reslicedInstances = {};

  for (let f = 0; f < header.frames_number; f++) {
    let reslicedImageId = getCustomImageId(imageLoaderName);
    reslicedImageIds.push(reslicedImageId);

    let instanceId = uuid.v4();

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
      // need to recalculate the min and max pixel values on the new instance pixeldata
      x00280106: undefined,
      x00280107: undefined,
      // resliced series data
      // x0020000d: sampleMetadata.x0020000d, //Study Instance UID
      x0020000e: reslicedSeriesId,
      x00200011: random(10000),
      x00080018: instanceId,
      x00020003: instanceId,
      x00200013: f + 1,
      // TODO
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
export const getReslicedPixeldata = function(
  imageId,
  originalData,
  reslicedData
) {
  // resliced metadata must be already available
  let reslicedInstance = reslicedData.instances[imageId];
  let reslicedMetadata = reslicedInstance.metadata;
  let permuteAbsTable = reslicedInstance.permuteTable.map(function(v) {
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

    let targetInstance = originalData.instances[originalData.imageIds[f]];
    if (!targetInstance) {
      console.log("ERROR");
      // TODO interpolate missing pixels when using an oversample reslice strategy
      // let f_padded = Math.floor(f / originalSampleMetadata.x00180050 * originalSampleMetadata.x00280030[0]);
      // targetInstance = originalSeries.instances[originalSeries.imageIds[f_padded]];
      return;
    }

    let targetPixeldata = targetInstance.pixelData;
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
        // TODO if oversample reslice strategy resample i or j
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
export const getDistanceBetweenSlices = function(
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
 * Parse an imageId string to int
 * @instance
 * @function parseImageId
 * @param {String} imageId - Theimage id to convert
 * @return {Number} - The number contained in the imageId
 */
export function parseImageId(imageId) {
  let sliceNumber = imageId.split("//").pop();
  return parseInt(sliceNumber);
}

/**
 * Remap a voxel cooordinates in a target orientation
 * @instance
 * @function remapVoxel
 * @param {Array} ijk - Voxel coordinates to convert
 * @param {fromOrientation} orientationName - Orientation source
 * @param {toOrientation} orientationName - Orientation target
 * @return {Array} - Voxel coordinates in target orientation
 */
export function remapVoxel([i, j, k], fromOrientation, toOrientation) {
  if (fromOrientation == toOrientation) {
    return [i, j, k];
  }

  let permuteTable = resliceTable[toOrientation][fromOrientation];
  let permuteAbsTable = permuteTable.map(function(v) {
    return Math.abs(v);
  });

  // if permuteTable value is negative, count slices from the end
  var dims = getSerieDimensions();

  let i_ = isNegativeSign(permuteTable[0]) ? dims[fromOrientation][0] - i : i;
  let j_ = isNegativeSign(permuteTable[1]) ? dims[fromOrientation][1] - j : j;
  let k_ = isNegativeSign(permuteTable[2]) ? dims[fromOrientation][2] - k : k;

  let ijk = [0, 0, 0];
  ijk[permuteAbsTable[0]] = i_;
  ijk[permuteAbsTable[1]] = j_;
  ijk[permuteAbsTable[2]] = k_;

  return ijk;
}

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
let sortStackCallback = function(seriesData, imageId, method) {
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

      p = map(p, function(value) {
        return parseFloat(value);
      });

      var o = seriesData.instances[imageId].metadata.imageOrientation;
      o = map(o, function(value) {
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
let getDICOMTagCode = function(code) {
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
let getDICOMTag = function(code) {
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
let formatDate = function(date) {
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
let formatDateTime = function(date) {
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
let rand = function() {
  return Math.random()
    .toString(36)
    .substr(2);
};

/**
 * Permute array values using orientation array
 * @instance
 * @function permuteValues
 * @param {Array} convertArray - The orientation array
 * @param {Array} sourceArray - The source array
 * @return {Array} - The converted array
 */
let permuteValues = function(convertArray, sourceArray) {
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
let isNegativeSign = function(x) {
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
let getTypedArray = function(tags, size) {
  let r = getPixelRepresentation(tags);

  let array;
  switch (r) {
    case "Uint8":
      array = new Uint8Array(size);
      break;
    case "Sint8":
      array = new Int8Array(size);
      break;
    case "Uint16":
      array = new Uint16Array(size);
      break;
    case "Sint16":
      array = new Int16Array(size);
      break;
    case "Uint32":
      array = new Uint32Array(size);
      break;
    case "Sint32":
      array = new Int32Array(size);
      break;
  }

  return array;
};

/**
 * Get resliced image orientation tag from permuteTable
 * @instance
 * @function getReslicedIOP
 * @param {Array} iop - The image orientation array
 * @param {Array} permuteTable - The matrix transformation
 * @return {Array} - The resliced image orientation array
 */
let getReslicedIOP = function(iop, permuteTable) {
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
let getReslicedIPP = function(
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
  // TODO test synch and rl
  let reslicedIPP = [];

  // iop data
  let u = iop.slice(0, 3);
  let v = iop.slice(3, 6);
  let w = getNormalOrientation(iop);
  let absW = map(w, function(v) {
    return Math.abs(v);
  });
  let majorOriginalIndex = indexOf(absW, max(absW));

  let normalReslicedIop = getNormalOrientation(reslicedIOP);
  normalReslicedIop = map(normalReslicedIop, function(v) {
    return Math.abs(v);
  });

  let majorIndex = indexOf(normalReslicedIop, max(normalReslicedIop));
  let index = isNegativeSign(permuteTable[majorIndex])
    ? toSize[majorIndex] - imageIndex
    : imageIndex;

  // flip z value on original slice
  if (isNegativeSign(permuteTable[1])) {
    ipp = ipp.map(function(val, i) {
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

  reslicedIPP = ipp.map(function(val, i) {
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
let getReslicedSliceLocation = function(reslicedIOP, reslicedIPP) {
  let normalReslicedIop = getNormalOrientation(reslicedIOP);
  normalReslicedIop = map(normalReslicedIop, function(v) {
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
let spacingArray = function(seriesData, sampleMetadata) {
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
 * Permute a signed array using original array
 * @instance
 * @function permuteSignedArrays
 * @param {Array} convertArray - The original array
 * @param {Array} sourceArray - The array to convert
 * @return {Array} - The converted array
 */
let permuteSignedArrays = function(convertArray, sourceArray) {
  let outputArray = new Array(convertArray.length);
  for (let i = 0; i < convertArray.length; i++) {
    let sourceIndex = Math.abs(convertArray[i]);
    if (isNegativeSign(convertArray[i])) {
      outputArray[i] = sourceArray[sourceIndex].map(function(v) {
        return -v;
      });
    } else {
      outputArray[i] = sourceArray[sourceIndex];
    }
  }

  return outputArray;
};
