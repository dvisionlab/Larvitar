// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import dicomParser from "dicom-parser";
import {
  difference,
  each,
  has,
  isObject,
  map,
  mapObject,
  keys,
  range,
  omit
} from "lodash";

// internal libraries
import { getImageFrame } from "./commonLoader";
import { clearImageCache } from "../image_rendering";
import { larvitar_store } from "../image_store";

// global module variables
let customImageLoaderCounter = 0;
export var multiFrameManager = {};
export var multiFrameImageTracker = {};
// Local cache used to store multiframe datasets to avoid reading and parsing
// the whole file to show a single frame.
let multiframeDatasetCache = {};

// TODO FOLLOW DUMP DATASET FOR DICOM TAGS

const getMultiFrameImageObject = function (id, frameIndex, metadata, cb) {
  let dataSet = multiframeDatasetCache[id];
  let pixelDataElement = dataSet.elements.x7fe00010;

  console.log("pixelDataElement");
  console.log(pixelDataElement);

  // Extract metadata of the whole multiframe object
  metadata = dumpDataSet(dataSet, null, frameIndex); // TODO

  console.log(metadata);

  // Extract pixeldata of the required frame
  var pixeldata;
  try {
    if (pixelDataElement.encapsulatedPixelData) {
      pixeldata = cornerstoneWADOImageLoader.wadouri.getEncapsulatedImageFrame(
        dataSet,
        frameIndex
      );
    } else {
      pixeldata = cornerstoneWADOImageLoader.wadouri.getUncompressedImageFrame(
        dataSet,
        frameIndex
      );
    }
  } catch (error) {}

  var imageFrame = getImageFrame(metadata);
  var transferSyntax = dataSet.string("x00020010");
  var decodePromise = cornerstoneWADOImageLoader.decodeImageFrame(
    imageFrame,
    transferSyntax,
    pixeldata,
    canvas
  );
  decodePromise.then(function (imageFrame) {
    setPixelDataType(imageFrame);
    console.log("imageFrame");
    console.log(imageFrame);
    cb(imageFrame);
  });
};

export const loadMultiFrameImage = function (imageId) {
  let seriesId = multiFrameImageTracker[imageId];
  let instance = multiFrameManager[seriesId].instances[imageId];
  let parsedImageId = cornerstoneWADOImageLoader.wadouri.parseImageId(imageId);
  let rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;

  console.log(instance);

  if (multiframeDatasetCache[rootImageId]) {
    var firstFrameId = multiFrameManager[seriesId].imageIds[0];
    var firstInstance = multiFrameManager[seriesId].instances[firstFrameId];
    console.log(firstFrameId);
    console.log(firstInstance);

    getMultiFrameImageObject(
      rootImageId,
      parsedImageId.frame,
      firstInstance.metadata,
      function (imageFrame) {
        return createCustomImage(
          imageId,
          metadata,
          imageFrame.pixelData,
          dataSet
        );
      }
    );
    // use it and store frame data
  } else {
    // parse root and store frame data
    multiframeDatasetCache[rootImageId] = multiFrameManager[seriesId].dataSet;
    getMultiFrameImageObject(
      rootImageId,
      parsedImageId.frame,
      null,
      function (imageFrame) {
        return createCustomImage(
          imageId,
          metadata,
          imageFrame.pixelData,
          dataSet
        );
      }
    );
  }
};

export const buildMultiFrameImage = function (seriesId, serie) {
  larvitar_store.set("manager", "multiFrameManager");

  let numberOfFrames =
    serie.instances[serie.imageIds[0]].metadata.numberOfFrames;

  each(serie.imageIds, function (instanceId) {
    let file = serie.instances[instanceId].file;
    let dataSet = serie.instances[instanceId].dataSet;
    let imageId = getMultiFrameImageId("multiFrameLoader");

    // check if multiFrameManager exists for this seriesId
    if (!multiFrameManager[seriesId]) {
      multiFrameManager[seriesId] = {};
      multiFrameManager[seriesId].imageIds = [];
      multiFrameManager[seriesId].instances = {};
    }

    each(range(numberOfFrames), function (frameNumber) {
      let frameImageId = imageId + "?frame=" + frameNumber;
      multiFrameImageTracker[frameImageId] = seriesId;
      // store file references
      multiFrameManager[seriesId].isMultiframe = true;
      multiFrameManager[seriesId].imageIds.push(frameImageId);
      multiFrameManager[seriesId].instances[frameImageId] = {
        instanceId: instanceId,
        file: file,
        frame: frameNumber
      };
      multiFrameManager[seriesId].file = file;
      multiFrameManager[seriesId].dataSet = dataSet;
    });
  });
};

/**
 * Get the custom imageId from custom loader
 * @instance
 * @function getMultiFrameImageId
 * @param {String} customLoaderName The custom loader name
 * @return {String} the custom image id
 */
export const getMultiFrameImageId = function (customLoaderName) {
  let imageId = customLoaderName + "://" + customImageLoaderCounter;
  customImageLoaderCounter++;
  return imageId;
};

/**
 * Reset the MultiFrame Loader global variables
 * @instance
 * @function resetMultiFrameLoader
 * @param {String} elementId The html id
 */
export const resetMultiFrameLoader = function (elementId) {
  customImageLoaderCounter = 0;
  multiFrameManager = {};
  multiFrameImageTracker = {};
  let element = document.getElementById(elementId);
  if (element) {
    cornerstone.disable(element);
  }
  clearImageCache();
};

export const getSeriesDataFromMultiFrameLoaderLoader = function () {};

/* Internal module functions */

/**
 * Create the custom image object for cornerstone from custom image
 * @instance
 * @function createCustomImage
 * @param {String} imageId The Id of the image
 * @param {Object} metadata the metadata object
 * @param {Object} pixelData pixel data object
 * @param {Object} dataSet dataset object
 * @returns {Object} custom image object
 */
let createCustomImage = function (imageId, metadata, pixelData, dataSet) {
  let canvas = window.document.createElement("canvas");
  let lastImageIdDrawn = "";

  let imageFrame = getImageFrame(metadata, dataSet);

  // This function uses the pixelData received as argument without manipulating
  // them: if the image is compressed, the decompress function should be called
  // before creating the custom image object (like the multiframe case).
  imageFrame.pixelData = pixelData;

  let pixelSpacing = metadata.x00280030;
  let rescaleIntercept = metadata.x00281052;
  let rescaleSlope = metadata.x00281053;
  let windowCenter = metadata.x00281050;
  let windowWidth = metadata.x00281051;

  function getSizeInBytes() {
    let bytesPerPixel = Math.round(imageFrame.bitsAllocated / 8);
    return (
      imageFrame.rows *
      imageFrame.columns *
      bytesPerPixel *
      imageFrame.samplesPerPixel
    );
  }

  let image = {
    imageId: imageId,
    color: cornerstoneWADOImageLoader.isColorImage(
      imageFrame.photometricInterpretation
    ),
    columnPixelSpacing: pixelSpacing ? pixelSpacing[1] : undefined,
    columns: imageFrame.columns,
    height: imageFrame.rows,
    intercept: rescaleIntercept ? rescaleIntercept : 0,
    invert: imageFrame.photometricInterpretation === "MONOCHROME1",
    minPixelValue: imageFrame.smallestPixelValue,
    maxPixelValue: imageFrame.largestPixelValue,
    render: undefined, // set below
    rowPixelSpacing: pixelSpacing ? pixelSpacing[0] : undefined,
    rows: imageFrame.rows,
    sizeInBytes: getSizeInBytes(),
    slope: rescaleSlope ? rescaleSlope : 1,
    width: imageFrame.columns,
    windowCenter: windowCenter ? windowCenter : undefined,
    windowWidth: windowWidth ? windowWidth : undefined,
    decodeTimeInMS: undefined,
    webWorkerTimeInMS: undefined
  };

  // add function to return pixel data
  image.getPixelData = function () {
    return imageFrame.pixelData;
  };

  // convert color space
  if (image.color) {
    // setup the canvas context
    canvas.height = imageFrame.rows;
    canvas.width = imageFrame.columns;

    let context = canvas.getContext("2d");
    let imageData = context.createImageData(
      imageFrame.columns,
      imageFrame.rows
    );
    cornerstoneWADOImageLoader.convertColorSpace(imageFrame, imageData);

    imageFrame.imageData = imageData;
    imageFrame.pixelData = imageData.data;
  }

  // Setup the renderer
  if (image.color) {
    image.render = cornerstone.renderColorImage;
    image.getCanvas = function () {
      if (lastImageIdDrawn === imageId) {
        return canvas;
      }

      canvas.height = image.rows;
      canvas.width = image.columns;
      let context = canvas.getContext("2d");
      context.putImageData(imageFrame.imageData, 0, 0);
      lastImageIdDrawn = imageId;
      return canvas;
    };
  } else {
    image.render = cornerstone.renderGrayscaleImage;
  }

  // calculate min/max if not supplied
  if (image.minPixelValue === undefined || image.maxPixelValue === undefined) {
    let minMax = cornerstoneWADOImageLoader.getMinMax(pixelData);
    image.minPixelValue = minMax.min;
    image.maxPixelValue = minMax.max;
  }

  // set the ww/wc to cover the dynamic range of the image if no values are supplied
  if (image.windowCenter === undefined || image.windowWidth === undefined) {
    if (image.color) {
      image.windowWidth = 255;
      image.windowCenter = 128;
    } else {
      let maxVoi = image.maxPixelValue * image.slope + image.intercept;
      let minVoi = image.minPixelValue * image.slope + image.intercept;
      image.windowWidth = maxVoi - minVoi;
      image.windowCenter = (maxVoi + minVoi) / 2;
    }
  }

  // Custom images does not have the "data" attribute becaouse their dataset is
  // not available. The "metadata" attribute is used by the storeImageData
  // function to store custom image pixelData and metadata.
  image.metadata = metadata;

  let promise = new Promise(function (resolve) {
    resolve(image);
  });

  // Return an object containing the Promise to cornerstone so it can setup callbacks to be
  // invoked asynchronously for the success/resolve and failure/reject scenarios.
  return {
    promise
  };
};

// This is an override of the cornerstoneWADOImageLoader setPixelDataType function
const setPixelDataType = function (imageFrame) {
  if (imageFrame.bitsAllocated === 16) {
    if (imageFrame.pixelRepresentation === 0) {
      imageFrame.pixelData = new Uint16Array(imageFrame.pixelData);
    } else {
      imageFrame.pixelData = new Int16Array(imageFrame.pixelData);
    }
  } else {
    imageFrame.pixelData = new Uint8Array(imageFrame.pixelData);
  }
};

var extractMultiframeTagValue = function (metadata, tag, frameNumber) {
  if (!metadata) {
    return null;
  }

  var tagValue;

  switch (tag) {
    // image position patient
    case "x00200032":
      var perFrameSequence = metadata.x52009230;
      if (
        perFrameSequence &&
        perFrameSequence[frameNumber] &&
        perFrameSequence[frameNumber].x00209113 &&
        perFrameSequence[frameNumber].x00209113[0]
      ) {
        var planePositionSequenceItem =
          perFrameSequence[frameNumber].x00209113[0];
        tagValue = planePositionSequenceItem[tag];
      }
      break;
    // image orientation patient
    case "x00200037":
      var sharedSequence = metadata.x52009229;
      if (
        sharedSequence &&
        sharedSequence[0] &&
        sharedSequence[0].x00209116 &&
        sharedSequence[0].x00209116[0]
      ) {
        var planeOrientationSequenceItem = sharedSequence[0].x00209116[0];
        tagValue = planeOrientationSequenceItem[tag];
      }
      break;
    // slice thickness
    case "x00180050":
    // pixel spacing
    case "x00280030":
      var sharedSequence = metadata.x52009229;
      if (
        sharedSequence &&
        sharedSequence[0] &&
        sharedSequence[0].x00289110 &&
        sharedSequence[0].x00289110[0]
      ) {
        var pixelMeasuresSqeuenceItem = sharedSequence[0].x00289110[0];
        tagValue = pixelMeasuresSqeuenceItem[tag];
      }
      break;
    // window width and level
    case "x00281050":
    case "x00281051":
      var sharedSequence = metadata.x52009229;
      if (
        sharedSequence &&
        sharedSequence[0] &&
        sharedSequence[0].x00289132 &&
        sharedSequence[0].x00289132[0]
      ) {
        var frameVOILUTSequenceItem = sharedSequence[0].x00289132[0];
        tagValue = frameVOILUTSequenceItem[tag];
      }
      break;
    case "x00281052":
    case "x00281053":
      var sharedSequence = metadata.x52009229;
      if (
        sharedSequence &&
        sharedSequence[0] &&
        sharedSequence[0].x00289145 &&
        sharedSequence[0].x00289145[0]
      ) {
        var pixelValueTransformationSequenceItem =
          sharedSequence[0].x00289145[0];
        tagValue = pixelValueTransformationSequenceItem[tag];
      }
      break;
  }

  return tagValue;
};

// Extract parsed DICOM tags from a dataSet
// VR info http://dicom.nema.org/dicom/2013/output/chtml/part05/sect_6.2.html
const dumpDataSet = function (dataSet, attrs, frameNumber) {
  // if !dataSet.elements return empty obj
  if (!dataSet.elements) {
    return {};
  }

  var options = {
    omitPrivateAttibutes: false,
    maxElementLength: 128
  };
  var instance = dicomParser.explicitDataSetToJS(dataSet, options, getDICOMTag);

  // filter by required attrs
  if (attrs) {
    // always parse the numberOfFrames attribute, this is needed to correctly
    // extract multiframe tags
    attrs.push("x00280008");
    var omitAttrs = difference(keys(dataSet.elements), attrs);
    instance = omit(instance, omitAttrs);
  }

  // convert all tag values into more usable formats
  var parsedInstance = mapObject(instance, function (value, key) {
    return parseTag(dataSet, key, value);
  });

  // manage multiframe tags needed to implement the viewer functionalities
  if (frameNumber !== undefined) {
    if (!attrs || has(parsedInstance, "x00200032")) {
      parsedInstance.x00200032 = extractMultiframeTagValue(
        parsedInstance,
        "x00200032",
        frameNumber
      );
    }

    if (!attrs || has(parsedInstance, "x00200037")) {
      parsedInstance.x00200037 = extractMultiframeTagValue(
        parsedInstance,
        "x00200037"
      );
    }

    if (!attrs || has(parsedInstance, "x00180050")) {
      parsedInstance.x00180050 = extractMultiframeTagValue(
        parsedInstance,
        "x00180050"
      );
    }

    if (!attrs || has(parsedInstance, "x00280030")) {
      parsedInstance.x00280030 = extractMultiframeTagValue(
        parsedInstance,
        "x00280030"
      );
    }

    if (!attrs || has(parsedInstance, "x00281050")) {
      parsedInstance.x00281050 = extractMultiframeTagValue(
        parsedInstance,
        "x00281050"
      );
    }

    if (!attrs || has(parsedInstance, "x00281051")) {
      parsedInstance.x00281051 = extractMultiframeTagValue(
        parsedInstance,
        "x00281051"
      );
    }

    if (!attrs || has(parsedInstance, "x00281052")) {
      parsedInstance.x00281052 = extractMultiframeTagValue(
        parsedInstance,
        "x00281052"
      );
    }

    if (!attrs || has(parsedInstance, "x00281053")) {
      parsedInstance.x00281053 = extractMultiframeTagValue(
        parsedInstance,
        "x00281053"
      );
    }
  }

  return parsedInstance;
};

// TODO
var parseTag = function (dataSet, attr, element, subItems) {
  // do not parse undefined elements
  if (element === undefined) {
    return element;
  }

  var tagData = dataSet.elements[attr] || {};
  var vr = tagData.vr;
  if (!vr) {
    // use dicom dict to get VR
    var tag = getDICOMTag(attr);
    if (tag && tag.vr) {
      vr = tag.vr;
    } else {
      return element;
    }
  }

  // do not parse elements already converted into objects
  // (see the dicomParser.explicitDataSetToJS function call)
  if (isObject(element) && has(element, "dataOffset")) {
    if (isStringVr(vr) && element.length === 0) {
      // show an empty string instead of the detail object for undefined string tags
      return "";
    } else {
      return "length=" + element.length + "; offset=" + element.dataOffset;
    }
  }

  var value;
  var subItems = subItems || {};

  if (isStringVr(vr)) {
    // We ask the dataset to give us the element's data in string form.
    // Most elements are strings but some aren't so we do a quick check
    // to make sure it actually has all ascii characters so we know it is
    // reasonable to display it.
    var str = element.toString();
    if (str === undefined) {
      return element;
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
    }
    // A string of characters of the format YYYYMMDD; where YYYY shall contain year,
    // MM shall contain the month, and DD shall contain the day,
    // interpreted as a date of the Gregorian calendar system.
    else if (vr === "DA") {
      value = parseDateTag(value, false);
    }
    // A concatenated date-time character string in the format:
    // YYYYMMDDHHMMSS.FFFFFF&ZZXX
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

    // PatientName tag value is: "LastName^FirstName^MiddleName".
    // Spaces inside each name component are permitted. If you don't know
    // any of the three components, just leave it empty.
    // Actually you may even append a name prefix (^professor) and
    // a name suffix (^senior) so you have a maximum of 5 components.
    else if (vr == "PN") {
      value = parsePatientNameTag(value);
    }

    // A string of characters with one of the following formats
    // -- nnnD, nnnW, nnnM, nnnY; where nnn shall contain the number of days for D,
    // weeks for W, months for M, or years for Y.
    else if (vr == "AS") {
      value = parseAgeTag(value);
    }

    // A string of characters with leading or trailing spaces (20H) being non-significant.
    else if (vr === "CS") {
      if (attr === "x00041500") {
        value = parseDICOMFileIDTag(value);
      } else {
        value = value.split("\\").join(", ");
      }
    }
  } else if (vr === "US") {
    value = dataSet.uint16(attr);
  } else if (vr === "SS") {
    value = dataSet.int16(attr);
  } else if (vr === "UL") {
    value = dataSet.uint32(attr);
  } else if (vr === "SL") {
    value = dataSet.int32(attr);
  } else if (vr == "FD") {
    value = dataSet.double(attr);
  } else if (vr == "FL") {
    value = dataSet.float(attr);
  } else if (
    vr === "OB" ||
    vr === "OW" ||
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
        dataSet.uint16(attr);
    } else if (element.length === 4) {
      value =
        "binary data of length " +
        element.length +
        " as uint32: " +
        dataSet.uint32(attr);
    } else {
      value = "binary data of length " + element.length + " and VR " + vr;
    }
  } else if (vr === "AT") {
    var group = dataSet.uint16(attr, 0);
    if (group) {
      var groupHexStr = ("0000" + group.toString(16)).substr(-4);
      var elm = dataSet.uint16(attr, 1);
      var elmHexStr = ("0000" + elm.toString(16)).substr(-4);
      value = "x" + groupHexStr + elmHexStr;
    } else {
      value = "";
    }
  } else if (vr === "SQ") {
    // parse the nested tags
    var subTags = map(element, function (obj) {
      return mapObject(obj, function (v, k) {
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

var isStringVr = function (vr) {
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

var parseDateTag = function (tagValue) {
  if (!tagValue) return;
  return tagValue;
  // if (moment(tagValue, ["YYYYMMDD"]).isValid() === true) {
  //   return moment(tagValue, ["YYYYMMDD"]).toISOString();
  // } else {
  //   return tagValue;
  // }
};

var parseDateTimeTag = function (tagValue) {
  if (!tagValue) return;
  return tagValue;
  // if (moment(tagValue, ["YYYYMMDDHHmmss.SSSSSS"]).isValid() === true) {
  //   return moment(tagValue, ["YYYYMMDDHHmmss"]).toISOString();
  // } else {
  //   return tagValue;
  // }
};

var parseTimeTag = function (tagValue) {
  if (!tagValue) return;
  return tagValue;
  // if (moment(tagValue, ["HHmmss.SSSSSS"]).isValid() === true) {
  //   // need to keep also the millisecond part to sort the time series correctly
  //   return moment(tagValue, ["HHmmss.SSSSSS"])
  //     .format("HH:mm:ss.SSSSSS")
  //     .toString();
  // } else {
  //   return tagValue;
  // }
};

var parsePatientNameTag = function (tagValue) {
  if (!tagValue) return;

  return tagValue.replace(/\^/gi, " ");
};

// parse age value: 000Y = 0 years
var parseAgeTag = function (tagValue) {
  if (!tagValue) return;

  var regs = /(\d{3})(D|W|M|Y)/gim.exec(tagValue);
  if (regs) {
    return parseInt(regs[1]) + " " + regs[2];
  }
};

var parseDICOMFileIDTag = function (tagValue) {
  // The DICOM File Service does not specify any "separator" between
  // the Components of the File ID. This is a Value Representation issue that
  // may be addressed in a specific manner by each Media Format Layer.
  // In DICOM IODs, File ID Components are generally handled as multiple
  // Values and separated by "backslashes".
  // There is no requirement that Media Format Layers use this separator.
  if (!tagValue) return;

  return tagValue.split("\\").join(path.sep);
};

var getDICOMTagCode = function (code) {
  var re = /x(\w{4})(\w{4})/;
  var result = re.exec(code);

  if (!result) {
    return code;
  }

  var newCode = "(" + result[1] + "," + result[2] + ")";
  newCode = newCode.toUpperCase();

  return newCode;
};

var getDICOMTag = function (code) {
  var newCode = getDICOMTagCode(code);
  var tag = TAG_DICT[newCode];

  return tag;
};
