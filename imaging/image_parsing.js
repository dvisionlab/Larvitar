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

// -------------------------------------------------
// Reset Image Parsing
// -------------------------------------------------
export const resetImageParsing = function() {
  parsingQueueFlag = null;
  parsingQueue = [];
  totalFileSize = 0;
  allSeriesStack = {};
  clearFileSystem(filesystem ? filesystem.root : null);
};

// -------------------------------------------------
// Read dicom files and return allSeriesStack object
// -------------------------------------------------
export const readFiles = function(entries, callback) {
  allSeriesStack = {};
  dumpFiles(entries, callback);
};

/* Internal module functions */

// ---------------------------------------------------------------
// Manage the parsing process waiting for the parsed object before
// proceeding with the next parse request
// ---------------------------------------------------------------
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

// -----------------------------------------------
// Push files in queue and start parsing next file
// -----------------------------------------------
let dumpFiles = function(fileList, callback) {
  forEach(fileList, function(file) {
    if (!file.name.startsWith(".")) {
      parsingQueue.push(file);
      // enable parsing on first available path
      if (parsingQueueFlag === null) {
        parsingQueueFlag = true;
      }
    }
  });
  parseNextFile(callback);
};

// -------------------------------------------------
// Dump a single DICOM File (metaData and pixelData)
// -------------------------------------------------
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
      } else if (parseFloat(sliceThickness) > 4.0) {
        // slice thickness not valid
        callback(
          null,
          "Image acquired does not meet quality standards: DICOM tag 0018,0050 (SliceThickness) is not adequate to perform the measurements."
        );
      } else {
        let pixelDataElement = dataSet.elements.x7fe00010;
        if (pixelDataElement) {
          // done, pixeldata found
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
              repr: getPixelRepresentation(dataSet),
              length: pixelData.length
            },
            pixelData: pixelData,

            // data needed for rendering
            file: file
          };
          callback(imageObject);
        } else {
          // done, no pixeldata
          callback(null, "no pixeldata.");
        }
      }
    } catch (err) {
      console.log(err);
      callback(null, "can not read this file.");
    }
  };
  reader.readAsArrayBuffer(file);
};

// -----------------------
// Error handler function
// -----------------------
let errorHandler = function() {
  // empty and initialize queue
  parsingQueue = [];
  parsingQueueFlag = null;

  // empty the webkit filesystem
  clearFileSystem(filesystem ? filesystem.root : null);
};

// -----------------
// Clear file system
// -----------------
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
