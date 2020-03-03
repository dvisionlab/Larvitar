/*
 This file provides functionalities for
 parsing DICOM image files
*/

// external libraries
import { parseDicom } from "dicom-parser";
import { forEach, size } from "lodash";

// internal libraries
import {
  getMinPixelValue,
  getMaxPixelValue,
  getPixelTypedArray,
  getPixelRepresentation,
  getTagValue,
  randomId
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
 * readFiles(entries, callback)
 * resetImageParsing()
 */

// ======================
// Reset Image Parsing ==
// ======================
export const resetImageParsing = function() {
  parsingQueueFlag = null;
  parsingQueue = [];
  totalFileSize = 0;
  allSeriesStack = {};
  clearFileSystem(filesystem ? filesystem.root : null);
};

// ====================================================
// Read dicom files and return allSeriesStack object ==
// ====================================================
export const readFiles = function(entries, callback) {
  allSeriesStack = {};
  dumpFiles(entries, callback);
};

/* Internal module functions */

// =======================================================
// Manage the parsing process waiting for the parsed =====
// object before proceeding with the next parse request ==
// =======================================================
let parseNextFile = function(callback) {
  if (!parsingQueueFlag || parsingQueue.length === 0) {
    if (parsingQueue.length === 0) {
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
    dumpFile(file, function(seriesData, err) {
      if (parsingQueueFlag === null) {
        console.log("parsingQueueFlag is null");
        // parsing process has been stopped, but there could be a
        // dumpFile callback still working: prevent actions
        return;
      }

      if (err) {
        callback(null, err);
        // parsingQueueFlag = true;
        // parseNextFile(callback);
      } else {
        // update the total parsed file size
        totalFileSize += file.size;
        // add file to cornerstoneWADOImageLoader file manager
        updateLoadedStack(seriesData, allSeriesStack);
        // console.log('updateLoadedStack')

        // proceed with the next file to parse
        parsingQueueFlag = true;
        parseNextFile(callback);
      }
    });
  }
};

// ==================================================
// Push files in queue and start parsing next file ==
// ==================================================
let dumpFiles = function(fileList, callback) {
  forEach(fileList, function(file) {
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

// ====================================================
// Dump a single DICOM File (metaData and pixelData) ==
// ====================================================
let dumpFile = function(file, callback) {
  let reader = new FileReader();
  reader.onload = function() {
    let arrayBuffer = reader.result;
    // Here we have the file data as an ArrayBuffer.
    // dicomParser requires as input a Uint8Array so we create that here.
    let byteArray = new Uint8Array(arrayBuffer);

    let dataSet;
    try {
      dataSet = parseDicom(byteArray);
      let seriesInstanceUID = getTagValue(dataSet, "x0020000e");
      let pixelSpacing = getTagValue(dataSet, "x00280030");
      let imageOrientation = getTagValue(dataSet, "x00200037");
      let imagePosition = getTagValue(dataSet, "x00200032");
      let sliceThickness = getTagValue(dataSet, "x00180050");

      if (dataSet.warnings.length > 0) {
        // warnings
        callback(null, dataSet.warnings);
      } else if (!seriesInstanceUID) {
        // series uid not specified
        callback(
          null,
          "Image acquired does not meet quality standards: DICOM tag 0020,000e (SeriesInstanceUID) not found."
        );
      } else if (!pixelSpacing || size(pixelSpacing) !== 2) {
        // pixel spacing not valid
        callback(
          null,
          "Image acquired does not meet quality standards: DICOM tag 0028,0030 (PixelSpacing) not valid."
        );
      } else if (!imageOrientation || size(imageOrientation) !== 6) {
        // image orientation not valid
        callback(
          null,
          "Image acquired does not meet quality standards: DICOM tag 0020,0037 (ImageOrientation) not valid."
        );
      } else if (!imagePosition || size(imagePosition) !== 3) {
        // image position not valid
        callback(
          null,
          "Image acquired does not meet quality standards: DICOM tag 0020,0032 (ImagePosition) not valid."
        );
      } else if (!sliceThickness) {
        // slice thickness not valid
        callback(
          null,
          "Image acquired does not meet quality standards: DICOM tag 0018,0050 (SliceThickness) not found."
        );
      } else {
        let pixelDataElement = dataSet.elements.x7fe00010;
        if (pixelDataElement) {
          // done, pixelData found
          let pixelData = getPixelTypedArray(dataSet, pixelDataElement);
          let instanceUID = getTagValue(dataSet, "x00080018") || randomId();
          let imageObject = {
            // metadata
            metadata: {
              // series identifiers //TODO
              seriesUID: seriesInstanceUID, // series uid
              instanceUID: instanceUID, // instance uid

              // study UUID and Accession Number
              studyUID: getTagValue(dataSet, "x00200010"), // study uuid
              accessionNumber: getTagValue(dataSet, "x00080050"), // accession Number
              studyDescription: getTagValue(dataSet, "x00081030"), // study description

              // data displayed in imaging overlay page
              patientName: getTagValue(dataSet, "x00100010"), // patient name
              patientBirthdate: getTagValue(dataSet, "x00100030"), // patient birthdate
              seriesDescription: getTagValue(dataSet, "x0008103e"), // series desc
              seriesDate: getTagValue(dataSet, "x00080021"), // series date
              seriesModality: getTagValue(dataSet, "x00080060").toLowerCase(), // series modality

              // data needed for displaing
              intercept: getTagValue(dataSet, "x00281052"),
              slope: getTagValue(dataSet, "x00281053"),

              // data needed for reslicing
              pixelSpacing: pixelSpacing,
              sliceThickness: sliceThickness,
              imageOrientation: imageOrientation,
              imagePosition: imagePosition,
              rows: getTagValue(dataSet, "x00280010"),
              cols: getTagValue(dataSet, "x00280011"),
              numberOfSlices: getTagValue(dataSet, "x00540081"),
              windowCenter: getTagValue(dataSet, "x00281050"),
              windowWidth: getTagValue(dataSet, "x00281051"),
              minPixelValue: getMinPixelValue(
                getTagValue(dataSet, "x00280106"),
                pixelData
              ),
              maxPixelValue: getMaxPixelValue(
                getTagValue(dataSet, "x00280107"),
                pixelData
              ),
              length: pixelData.length,

              x00020000: getTagValue(dataSet, "x00020000"),
              x00020001: getTagValue(dataSet, "x00020001"),
              x00020002: getTagValue(dataSet, "x00020002"),
              x00020003: getTagValue(dataSet, "x00020003"),
              x00020010: getTagValue(dataSet, "x00020010"),
              x00020012: getTagValue(dataSet, "x00020012"),
              x00020013: getTagValue(dataSet, "x00020013"),
              x00020016: getTagValue(dataSet, "x00020016"),
              x00080005: getTagValue(dataSet, "x00080005"),
              x00080008: getTagValue(dataSet, "x00080008"),
              x00080012: getTagValue(dataSet, "x00080012"),
              x00080013: getTagValue(dataSet, "x00080013"),
              x00080016: getTagValue(dataSet, "x00080016"),
              x00080018: getTagValue(dataSet, "x00080018") || randomId(),
              x00080020: getTagValue(dataSet, "x00080020"),
              x00080021: getTagValue(dataSet, "x00080021"),
              x00080022: getTagValue(dataSet, "x00080022"),
              x00080023: getTagValue(dataSet, "x00080023"),
              // x0008002A: getTagValue(dataSet, "x0008002A"),
              x00080030: getTagValue(dataSet, "x00080030"),
              x00080031: getTagValue(dataSet, "x00080031"),
              x00080032: getTagValue(dataSet, "x00080032"),
              x00080033: getTagValue(dataSet, "x00080033"),
              x00080050: getTagValue(dataSet, "x00080050"),
              x00080060: getTagValue(dataSet, "x00080060").toLowerCase(),
              x00080070: getTagValue(dataSet, "x00080070"),
              x00080080: getTagValue(dataSet, "x00080080"),
              x00080090: getTagValue(dataSet, "x00080090"),
              x00081010: getTagValue(dataSet, "x00081010"),
              x00081030: getTagValue(dataSet, "x00081030"),
              x0008103E: getTagValue(dataSet, "x0008103E"),
              x00081060: getTagValue(dataSet, "x00081060"),
              x00081070: getTagValue(dataSet, "x00081070"),
              x00081090: getTagValue(dataSet, "x00081090"),
              x00082111: getTagValue(dataSet, "x00082111"),
              x00100010: getTagValue(dataSet, "x00100010"),
              x00100020: getTagValue(dataSet, "x00100020"),
              x00100030: getTagValue(dataSet, "x00100030"),
              x00101010: getTagValue(dataSet, "x00101010"),
              x00101030: getTagValue(dataSet, "x00101030"),
              x00180020: getTagValue(dataSet, "x00180020"),
              x00180021: getTagValue(dataSet, "x00180021"),
              x00180022: getTagValue(dataSet, "x00180022"),
              x00180023: getTagValue(dataSet, "x00180023"),
              x00180025: getTagValue(dataSet, "x00180025"),
              x00180050: getTagValue(dataSet, "x00180050"),
              x00180080: getTagValue(dataSet, "x00180080"),
              x00180081: getTagValue(dataSet, "x00180081"),
              x00180082: getTagValue(dataSet, "x00180082"),
              x00180083: getTagValue(dataSet, "x00180083"),
              x00180084: getTagValue(dataSet, "x00180084"),
              x00180085: getTagValue(dataSet, "x00180085"),
              x00180086: getTagValue(dataSet, "x00180086"),
              x00180087: getTagValue(dataSet, "x00180087"),
              x00180088: getTagValue(dataSet, "x00180088"),
              x00180091: getTagValue(dataSet, "x00180091"),
              x00180093: getTagValue(dataSet, "x00180093"),
              x00180094: getTagValue(dataSet, "x00180094"),
              x00180095: getTagValue(dataSet, "x00180095"),
              x00181000: getTagValue(dataSet, "x00181000"),
              x00181020: getTagValue(dataSet, "x00181020"),
              x00181088: getTagValue(dataSet, "x00181088"),
              x00181090: getTagValue(dataSet, "x00181094"),
              x00181100: getTagValue(dataSet, "x00181100"),
              x00181250: getTagValue(dataSet, "x00181250"),
              x00181310: getTagValue(dataSet, "x00181310"),
              x00181312: getTagValue(dataSet, "x00181312"),
              x00181314: getTagValue(dataSet, "x00181314"),
              x00181315: getTagValue(dataSet, "x00181315"),
              x00181316: getTagValue(dataSet, "x00181316"),
              x00185100: getTagValue(dataSet, "x00185100"),
              x0020000D: getTagValue(dataSet, "x0020000D"),
              x0020000E: getTagValue(dataSet, "x0020000E"),
              x00200010: getTagValue(dataSet, "x00200010"),
              x00200011: getTagValue(dataSet, "x00200011"),
              x00200012: getTagValue(dataSet, "x00200012"),
              x00200013: getTagValue(dataSet, "x00200013"),
              x00200032: getTagValue(dataSet, "x00200032"),
              x00200037: getTagValue(dataSet, "x00200037"),
              x00201002: getTagValue(dataSet, "x00201002"),
              x00201041: getTagValue(dataSet, "x00201041"),
              x00280002: getTagValue(dataSet, "x00280002"),
              x00280004: getTagValue(dataSet, "x00280004"),
              x00280010: getTagValue(dataSet, "x00280010"),
              x00280011: getTagValue(dataSet, "x00280011"),
              x00280030: getTagValue(dataSet, "x00280030"),
              x00280100: getTagValue(dataSet, "x00280100"),
              x00280101: getTagValue(dataSet, "x00280101"),
              x00280102: getTagValue(dataSet, "x00280102"),
              x00280103: getTagValue(dataSet, "x00280103"),
              x00280106: getMinPixelValue(
                getTagValue(dataSet, "x00280106"),
                pixelData
              ),
              x00280107: getMaxPixelValue(
                getTagValue(dataSet, "x00280107"),
                pixelData
              ),
              x00280120: getTagValue(dataSet, "x00280120"),
              x00281050: getTagValue(dataSet, "x00281050"),
              x00281051: getTagValue(dataSet, "x00281051"),
              x00281052: getTagValue(dataSet, "x00281052"),
              x00281053: getTagValue(dataSet, "x00281053"),
              x00080061: getTagValue(dataSet, "x00080061"),
              x00280008: getTagValue(dataSet, "x00280008"),
              x00200052: getTagValue(dataSet, "x00200052"),
              x00280006: getTagValue(dataSet, "x00280006"),
              x00281101: getTagValue(dataSet, "x00281101"),
              x00281102: getTagValue(dataSet, "x00281102"),
              x00281103: getTagValue(dataSet, "x00281103"),
              x00281201: getTagValue(dataSet, "x00281201"),
              x00281202: getTagValue(dataSet, "x00281202"),
              x00281203: getTagValue(dataSet, "x00281203"),
              x00540081: getTagValue(dataSet, "x00540081"),
              repr: getPixelRepresentation(dataSet)
            },
            pixelData: pixelData,

            // data needed for rendering
            file: file
          };
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

// =========================
// Error handler function ==
// =========================
let errorHandler = function() {
  // empty and initialize queue
  parsingQueue = [];
  parsingQueueFlag = null;

  // empty the webkit filesystem
  clearFileSystem(filesystem ? filesystem.root : null);
};

// ====================
// Clear file system ==
// ====================
let clearFileSystem = function(dirEntry) {
  if (!dirEntry) {
    return;
  }
  let dirReader = dirEntry.createReader();
  dirReader.readEntries(function(results) {
    for (let i = 0; i < results.length; i++) {
      if (results[i].isDirectory) {
        results[i].removeRecursively(function() {});
      } else {
        results[i].remove(function() {});
      }
    }
  }, errorHandler);
};
