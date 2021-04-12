/** @module imaging/parsing
 *  @desc  This file provides functionalities for parsing DICOM image files
 */

// external libraries
import { parseDicom } from "dicom-parser";
import { forEach, has, pick } from "lodash";

// internal libraries
import {
  getMinPixelValue,
  getMaxPixelValue,
  getPixelTypedArray,
  getPixelRepresentation,
  randomId,
  parseTag
} from "./image_utils.js";
import { updateLoadedStack } from "./image_loading.js";

// global module variables
var parsingQueueFlag = null;
var parsingQueue = [];
var totalFileSize = 0;
var softQuota;
var filesystem;
var allSeriesStack = {};

/*
 * This module provides the following functions to be exported:
 * resetImageParsing()
 * readFiles(entries, callback)
 * dumpDataSet(dataSet, metadata, customFilter)
 *
 */

/**
 * Reset Image Parsing (clear the parser before loading other data)
 * @instance
 * @function resetImageParsing
 */
export const resetImageParsing = function () {
  parsingQueueFlag = null;
  parsingQueue = [];
  totalFileSize = 0;
  allSeriesStack = {};
  clearFileSystem(filesystem ? filesystem.root : null);
};

/**
 * Read dicom files and return allSeriesStack object
 * @instance
 * @function readFiles
 * @param {Array} entries - List of file paths
 * @param {Function} callback - Will receive (imageObject, errorString) as args
 */
export const readFiles = function (entries, callback) {
  allSeriesStack = {};
  dumpFiles(entries, callback);
};

/* Internal module functions */

/**
 * Dump metadata from dicom parser dataSet object
 * @instance
 * @function dumpDataSet
 * @param {Object} dataSet - dicom parser dataSet object
 * @param {Array} metadata - Initialized metadata object
 * @param {Array} customFilter - Optional filter: {tags:[], frameId: 0}
 */
// This function iterates through dataSet recursively and adds new HTML strings
// to the output array passed into it
export const dumpDataSet = function (dataSet, metadata, customFilter) {
  // customFilter= {tags:[], frameId:xxx}
  // the dataSet.elements object contains properties for each element parsed.  The name of the property
  // is based on the elements tag and looks like 'xGGGGEEEE' where GGGG is the group number and EEEE is the
  // element number both with lowercase hexadecimal letters.  For example, the Series Description DICOM element 0008,103E would
  // be named 'x0008103e'.  Here we iterate over each property (element) so we can build a string describing its
  // contents to add to the output array
  try {
    let elements =
      customFilter && has(customFilter, "tags")
        ? pick(dataSet.elements, customFilter.tags)
        : dataSet.elements;
    for (let propertyName in elements) {
      let element = elements[propertyName];
      // Here we check for Sequence items and iterate over them if present.  items will not be set in the
      // element object for elements that don't have SQ VR type.  Note that implicit little endian
      // sequences will are currently not parsed.
      if (element.items) {
        // each item contains its own data set so we iterate over the items
        // and recursively call this function
        if (customFilter && has(customFilter, "frameId")) {
          let item = element.items[customFilter.frameId];
          dumpDataSet(item.dataSet, metadata);
        } else {
          element.items.forEach(function (item) {
            dumpDataSet(item.dataSet, metadata);
          });
        }
      } else {
        let tagValue = parseTag(dataSet, propertyName, element);
        metadata[propertyName] = tagValue;
      }
    }
  } catch (err) {
    console.log(err);
  }
};

/**
 * Manage the parsing process waiting for the parsed object before proceeding with the next parse request
 * @inner
 * @function parseNextFile
 * @param {Function} callback - Passed through
 */
let parseNextFile = function (callback) {
  let t0 = performance.now();
  if (!parsingQueueFlag || parsingQueue.length === 0) {
    if (parsingQueue.length === 0) {
      let t1 = performance.now();
      console.log(`Call to readFiles took ${t1 - t0} milliseconds.`);
      callback(allSeriesStack);
    }
    return;
  }

  parsingQueueFlag = false;

  // remove and return first item from queue
  let file = parsingQueue.shift();

  if (totalFileSize + file.size > softQuota) {
    // do not parse the file and stop parsing

    // empty and initialize queue
    parsingQueue = [];
    parsingQueueFlag = null;
    // empty the webkit filesystem
    clearFileSystem(filesystem ? filesystem.root : null);
  } else {
    // parse the file and wait for results
    dumpFile(file, function (seriesData, err) {
      if (parsingQueueFlag === null) {
        console.log("parsingQueueFlag is null");
        // parsing process has been stopped, but there could be a
        // dumpFile callback still working: prevent actions
        return;
      }
      if (err) {
        console.warn(err);
        parsingQueueFlag = true;
        parseNextFile(callback);
      } else {
        // update the total parsed file size
        totalFileSize += file.size;
        // add file to cornerstoneWADOImageLoader file manager
        updateLoadedStack(seriesData, allSeriesStack);
        // proceed with the next file to parse
        parsingQueueFlag = true;
        parseNextFile(callback);
      }
    });
  }
};

/**
 * Push files in queue and start parsing next file
 * @inner
 * @function dumpFiles
 * @param {Array} fileList - Array of file objects
 * @param {Function} callback - Passed through
 */
let dumpFiles = function (fileList, callback) {
  forEach(fileList, function (file) {
    if (!file.name.startsWith(".") && !file.name.startsWith("DICOMDIR")) {
      parsingQueue.push(file);
      // enable parsing on first available path
      if (parsingQueueFlag === null) {
        parsingQueueFlag = true;
      }
    }
  });
  parseNextFile(callback);
};

/**
 * Dump a single DICOM File (metaData and pixelData)
 * @inner
 * @function dumpFile
 * @param {File} file - File object to be dumped
 * @param {Function} callback - called with (imageObject, errorString)
 */
let dumpFile = function (file, callback) {
  let reader = new FileReader();
  reader.onload = function () {
    let arrayBuffer = reader.result;
    // Here we have the file data as an ArrayBuffer.
    // dicomParser requires as input a Uint8Array so we create that here.
    let byteArray = new Uint8Array(arrayBuffer);

    let dataSet;
    try {
      dataSet = parseDicom(byteArray);
      let metadata = {};
      dumpDataSet(dataSet, metadata);

      let numberOfFrames = metadata["x00280008"];
      let isMultiframe = numberOfFrames > 1 ? true : false;
      // Overwrite SOPInstanceUID to manage multiframes.
      // Usually different SeriesInstanceUID means different series and that value
      // is used into the application to group different instances into the same series,
      // but if a DICOM file contains a multiframe series, then the SeriesInstanceUID
      // can be shared by other files of the same study.
      // In multiframe cases, the SOPInstanceUID (unique) is used as SeriesInstanceUID.
      let seriesInstanceUID = isMultiframe
        ? metadata["x00080018"]
        : metadata["x0020000e"];
      let pixelSpacing = metadata["x00280030"];
      let imageOrientation = metadata["x00200037"];
      let imagePosition = metadata["x00200032"];
      let sliceThickness = metadata["x00180050"];

      if (dataSet.warnings.length > 0) {
        // warnings
        callback(null, dataSet.warnings);
      } else {
        let pixelDataElement = dataSet.elements.x7fe00010;

        if (pixelDataElement) {
          // done, pixelData found
          let pixelData = getPixelTypedArray(dataSet, pixelDataElement);
          let instanceUID = metadata["x00080018"] || randomId();

          let imageObject = {
            pixelData: pixelData,
            // data needed for rendering
            file: file,
            dataSet: dataSet
          };
          imageObject.metadata = metadata;
          imageObject.metadata.seriesUID = seriesInstanceUID;
          imageObject.metadata.instanceUID = instanceUID;
          imageObject.metadata.studyUID = metadata["x00200010"];
          imageObject.metadata.accessionNumber = metadata["x00080050"];
          imageObject.metadata.studyDescription = metadata["x00081030"];
          imageObject.metadata.patientName = metadata["x00100010"];
          imageObject.metadata.patientBirthdate = metadata["x00100030"];
          imageObject.metadata.seriesDescription = metadata["x0008103e"];
          imageObject.metadata.seriesDate = metadata["x00080021"];
          imageObject.metadata.seriesModality = metadata[
            "x00080060"
          ].toLowerCase();
          imageObject.metadata.intercept = metadata["x00281052"];
          imageObject.metadata.slope = metadata["x00281053"];
          imageObject.metadata.pixelSpacing = pixelSpacing;
          imageObject.metadata.sliceThickness = sliceThickness;
          imageObject.metadata.imageOrientation = imageOrientation;
          imageObject.metadata.imagePosition = imagePosition;
          imageObject.metadata.rows = metadata["x00280010"];
          imageObject.metadata.cols = metadata["x00280011"];
          imageObject.metadata.numberOfSlices = metadata["x00540081"]
            ? metadata["x00540081"] // number of slices
            : metadata["x00201002"]; // number of instances
          imageObject.metadata.numberOfFrames = numberOfFrames;
          if (isMultiframe) {
            imageObject.metadata.frameTime = metadata["x00181063"];
            imageObject.metadata.frameDelay = metadata["x00181066"];
          }
          imageObject.metadata.windowCenter = metadata["x00281050"];
          imageObject.metadata.windowWidth = metadata["x00281051"];
          imageObject.metadata.minPixelValue = getMinPixelValue(
            metadata["x00280106"],
            pixelData
          );
          imageObject.metadata.maxPixelValue = getMaxPixelValue(
            metadata["x00280107"],
            pixelData
          );
          imageObject.metadata.length = pixelData.length;
          imageObject.metadata.repr = getPixelRepresentation(dataSet);
          callback(imageObject);
        } else {
          // done, no pixelData
          callback(null, "no pixelData.");
        }
      }
    } catch (err) {
      console.log(err);
      callback(null, "can not read this file.");
    }
  };
  reader.readAsArrayBuffer(file);
};

/**
 * Error handler function: reset parsing queue and clear file system if needed
 * @inner
 * @function errorHandler
 */
let errorHandler = function () {
  // empty and initialize queue
  parsingQueue = [];
  parsingQueueFlag = null;
  // empty the webkit filesystem
  clearFileSystem(filesystem ? filesystem.root : null);
};

/**
 * Clear file system
 * @inner
 * @function clearFileSystem
 */
let clearFileSystem = function (dirEntry) {
  if (!dirEntry) {
    return;
  }
  let dirReader = dirEntry.createReader();
  dirReader.readEntries(function (results) {
    for (let i = 0; i < results.length; i++) {
      if (results[i].isDirectory) {
        results[i].removeRecursively(function () {});
      } else {
        results[i].remove(function () {});
      }
    }
  }, errorHandler);
};
