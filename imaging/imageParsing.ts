/** @module imaging/imageParsing
 *  @desc  This file provides functionalities for parsing DICOM image files
 */

// external libraries
import { DataSet, Element, parseDicom } from "dicom-parser";
import { forEach, each, has, pick } from "lodash";
import { v4 as uuidv4 } from "uuid";

// internal libraries
import { getPixelRepresentation, randomId } from "./imageUtils";
import { parseTag } from "./imageTags";
import { updateLoadedStack } from "./imageLoading";
import { checkMemoryAllocation } from "./monitors/memory";
import { ImageObject, Instance, MetaData, NrrdSeries, Series } from "./types";
import { getLarvitarManager } from "./loaders/commonLoader";
import type { MetaDataTypes } from "./MetaDataTypes";

// global module variables
var t0: number; // t0 variable for timing debugging purpose

/*
 * This module provides the following functions to be exported:
 * readFiles(fileList)
 * readFile(file)
 * parseDataSet(dataSet, metadata, customFilter)
 * clearImageParsing(seriesStack)
 */

/**
 * Reset series stack object and its internal data
 * @instance
 * @function clearImageParsing
 * @param {Object} seriesStack - Parsed series stack object
 */
export const clearImageParsing = function (
  seriesStack: ReturnType<typeof getLarvitarManager> | null
) {
  each(seriesStack, function (stack: Series | NrrdSeries) {
    each(stack.instances, function (instance: Instance) {
      if (instance.dataSet) {
        // @ts-ignore
        instance.dataSet.byteArray = null;
      }
      instance.dataSet = null;
      instance.file = null;
      // @ts-ignore
      instance.metadata = null;
    });
  });
  seriesStack = null;
};

/**
 * Read dicom files and return allSeriesStack object
 * @instance
 * @function readFiles
 * @param {Array} entries - List of file objects
 * @returns {Promise} - Return a promise which will resolve to a image object list or fail if an error occurs
 */
export const readFiles = function (entries: File[]) {
  return parseFiles(entries);
};

/**
 * Read a single dicom file and return parsed object
 * @instance
 * @function readFile
 * @param {File} entry - File object
 * @returns {Promise} - Return a promise which will resolve to a image object or fail if an error occurs
 */
export const readFile = function (entry: File) {
  return parseFile(entry);
};

/* Internal module functions */

//This type is used to instantiate metadata and nested objects in imageParsing in order to allow dynamic setting
//of MetaDataTypes objects' properties.
//In other words, metadata : ExtendedMetaDataTypes is useful and substitutes metadata : MetaDataTypes when metadata values
//aren't called explicitly using metadata['xGGGGEEEEE']
//and are instead called using TAG as a variable (i.e. metadata[TAG]).
//It is important to highlight that even if we set metadata[TAG]=tagValue; whose type (of tagValue) is the correct one (returned by ParseTag).
//if we then extract x=metadata[TAG]; we obtain tagValue : unknown and a casting with : MetaDataType[typeof TAG] is necessary.

type ExtendedMetaDataTypes = MetaDataTypes & {
  [key: string]: unknown;
};

/**
 * Parse metadata from dicom parser dataSet object
 * @instance
 * @function parseDataSet
 * @param {Object} dataSet - dicom parser dataSet object
 * @param {Object} metadata - Initialized metadata object
 * @param {Array} customFilter - Optional filter: {tags:[], frameId: 0}
 */
// This function iterates through dataSet recursively and store tag values into metadata object

export const parseDataSet = function (
  dataSet: DataSet,
  metadata: ExtendedMetaDataTypes,
  customFilter?: { tags: string[]; frameId: number }
) {
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
      let element = elements[propertyName]; //metadata
      const TAG = propertyName as keyof ExtendedMetaDataTypes;
      // Here we check for Sequence items and iterate over them if present. items will not be set in the
      // element object for elements that don't have SQ VR type.  Note that implicit little endian
      // sequences will are currently not parsed.
      if (element.items) {
        let nestedArray: MetaDataTypes[] = [];

        function getNestedObject(item: Element) {
          let nestedObject: ExtendedMetaDataTypes = {};
          for (let nestedPropertyName in item.dataSet!.elements) {
            let TAG_tagValue = nestedPropertyName as keyof MetaDataTypes;
            let tagValue = parseTag<MetaDataTypes[typeof TAG_tagValue]>(
              item.dataSet!,
              nestedPropertyName,
              item.dataSet!.elements[nestedPropertyName]
            );
            let TAG_nested = nestedPropertyName as keyof ExtendedMetaDataTypes;
            nestedObject[TAG_nested] = tagValue;
          }
          nestedArray.push(nestedObject);
        }

        if (customFilter && has(customFilter, "frameId")) {
          let item = element.items[customFilter.frameId];
          if (item && Object.keys(item).length !== 0) {
            getNestedObject(item);
          }
        } else {
          // iterates over nested elements (nested metadata)
          element.items.forEach(function (item) {
            getNestedObject(item);
          });
        }
        metadata[TAG] = nestedArray;
      } else {
        let TAG_tagValue = propertyName as keyof MetaDataTypes;
        let tagValue = parseTag<MetaDataTypes[typeof TAG_tagValue]>(
          dataSet,
          propertyName,
          element
        );
        let TAG = propertyName as keyof ExtendedMetaDataTypes;
        // identify duplicated tags (keep the first occurency and store the others in another tag eg x00280010_uuid)
        if (metadata[TAG] !== undefined) {
          console.debug(
            `Identified duplicated tag "${propertyName}", values are:`,
            metadata[TAG],
            tagValue
          );
          let TAG_uuidv4 = (propertyName +
            "_" +
            uuidv4()) as keyof ExtendedMetaDataTypes;
          metadata[TAG_uuidv4] = tagValue;
        } else {
          metadata[TAG] = tagValue;
        }
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
 * @param {Array} parsingQueue - Array of queued files to be parsed
 * @param {Object} allSeriesStack - Series stack object to be populated
 * @param {string} uuid - Series uuid to be used if series instance uuid is missing
 * @param {Function} resolve - Promise resolve function
 * @param {Function} reject - Promise reject function
 */
let parseNextFile = function (
  parsingQueue: File[],
  allSeriesStack: ReturnType<typeof getLarvitarManager>,
  uuid: string,
  resolve: Function,
  reject: Function
) {
  // initialize t0 on first file of the queue
  if (
    Object.keys(allSeriesStack).length === 0 &&
    allSeriesStack.constructor === Object
  ) {
    t0 = performance.now();
  }

  if (parsingQueue.length === 0) {
    let t1 = performance.now();
    console.log(`Call to readFiles took ${t1 - t0} milliseconds.`);
    resolve(allSeriesStack);
    return;
  }

  // remove and return first item from queue
  let file = parsingQueue.shift() as File | undefined | null;

  if (!file) {
    console.warn("File is undefined or null");
    return;
  }

  // Check if there is enough memory to parse the file
  if (checkMemoryAllocation(file.size) === false) {
    // do not parse the file and stop parsing
    clearImageParsing(allSeriesStack);
    let t1 = performance.now();
    console.log(`Call to readFiles took ${t1 - t0} milliseconds.`);
    file = null;
    reject("Available memory is not enough");
    return;
  } else {
    // parse the file and wait for results
    parseFile(file)
      .then((seriesData: ImageObject | null) => {
        // use generated series uid if not found in dicom file
        seriesData!.metadata.seriesUID = seriesData!.metadata.seriesUID || uuid;
        // add file to cornerstoneDICOMImageLoader file manager
        updateLoadedStack(seriesData!, allSeriesStack);
        // proceed with the next file to parse
        parseNextFile(parsingQueue, allSeriesStack, uuid, resolve, reject);
        seriesData = null;
        file = null;
      })
      .catch(err => {
        console.error(err);
        parseNextFile(parsingQueue, allSeriesStack, uuid, resolve, reject);
        file = null;
      });
  }
};

/**
 * Push files in queue and start parsing next file
 * @inner
 * @function parseFiles
 * @param {Array} fileList - Array of file objects
 * @returns {Promise} - Return a promise which will resolve to a image object list or fail if an error occurs
 */
const parseFiles = function (fileList: File[]) {
  let allSeriesStack: ReturnType<typeof getLarvitarManager> = {};
  let parsingQueue: File[] = [];

  forEach(fileList, function (file: File) {
    if (!file.name.startsWith(".") && !file.name.startsWith("DICOMDIR")) {
      parsingQueue.push(file);
    }
  });
  return new Promise((resolve, reject) => {
    const uuid = uuidv4();
    parseNextFile(parsingQueue, allSeriesStack, uuid, resolve, reject);
  });
};

/**
 * Parse a single DICOM File (metaData and pixelData)
 * @inner
 * @function parseFile
 * @param {File} file - File object to be parsed
 * @returns {Promise} - Return a promise which will resolve to a image object or fail if an error occurs
 */
const parseFile = function (file: File) {
  const parsePromise = new Promise<ImageObject>((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = function () {
      let arrayBuffer = reader.result;
      // Here we have the file data as an ArrayBuffer.
      // dicomParser requires as input a Uint8Array so we create that here.

      if (!arrayBuffer || typeof arrayBuffer === "string") {
        reject("Error reading file");
        return;
      }

      let byteArray: Uint8Array | null = new Uint8Array(arrayBuffer);
      let dataSet;

      // this try-catch is used to handle non-DICOM files: log error but continue parsing the other files
      try {
        dataSet = parseDicom(byteArray);
        byteArray = null;
        let metadata: MetaData = {};
        parseDataSet(dataSet, metadata);

        let temporalPositionIdentifier = metadata["x00200100"]; // Temporal order of a dynamic or functional set of Images.
        let numberOfTemporalPositions = metadata["x00200105"]; // Total number of temporal positions prescribed.
        const is4D =
          temporalPositionIdentifier !== undefined &&
          (numberOfTemporalPositions as number) > 1
            ? true
            : false;

        let modality = metadata["x00080060"] as string;
        let singleFrameModalities = [
          "CR",
          "DX",
          "MG",
          "PX",
          "RF",
          "XA",
          "US",
          "IVUS",
          "OCT"
        ];
        // US XA RF IVUS OCT DX CR PX MG
        // Overwrite SOPInstanceUID to manage single stack images (US, XA).
        // Usually different SeriesInstanceUID means different series and that value
        // is used into the application to group different instances into the same series,
        // but if a DICOM file contains a multiframe series, then the SeriesInstanceUID
        // can be shared by other files of the same study.
        // In these cases, the SOPInstanceUID (unique) is used as SeriesInstanceUID.
        let uniqueId = singleFrameModalities.includes(modality)
          ? metadata["x00080018"]
          : metadata["x0020000e"];
        let seriesInstanceUID = metadata["x0020000e"];
        let pixelSpacing = metadata.x00280030
          ? metadata.x00280030
          : metadata.x00080060 === "US" &&
            metadata["x00186011"] != undefined &&
            metadata["x00186011"][0].x0018602e != undefined &&
            metadata["x00186011"][0].x0018602c != undefined
          ? ([
              metadata["x00186011"][0].x0018602e * 10, //so that from cm goes to mm
              metadata["x00186011"][0].x0018602c * 10
            ] as [number, number])
          : metadata.x00181164
          ? metadata.x00181164
          : [1, 1];
        let imageOrientation = metadata["x00200037"];
        let imagePosition = metadata["x00200032"];
        let sliceThickness = metadata["x00180050"];
        let numberOfFrames = metadata["x00280008"];
        let isMultiframe = (numberOfFrames as number) > 1 ? true : false;
        let waveform = metadata["x50003000"] ? true : false;
        // check dicom tag image type x00080008 if contains the word BIPLANE A or BIPLANE B
        // if true, then it is a biplane image
        let biplane = metadata["x00080008"]
          ? metadata["x00080008"].includes("BIPLANE")
          : false;

        if (dataSet.warnings.length > 0) {
          // warnings
          reject(dataSet.warnings);
        } else {
          let pixelDataElement = dataSet.elements.x7fe00010;
          let SOPUID = metadata["x00080016"];
          if (SOPUID == "1.2.840.10008.5.1.4.1.1.104.1") {
            let pdfObject: Partial<ImageObject> = {
              // data needed for rendering
              file: file,
              dataSet: dataSet
            };
            pdfObject.metadata = metadata;
            pdfObject.metadata.larvitarSeriesInstanceUID = uniqueId;
            pdfObject.metadata.seriesUID = seriesInstanceUID;
            pdfObject.instanceUID =
              metadata["x00080018"]?.toString() || randomId();
            pdfObject.metadata.studyUID = metadata["x0020000d"];
            pdfObject.metadata.accessionNumber = metadata["x00080050"];
            pdfObject.metadata.studyDescription = metadata["x00081030"];
            pdfObject.metadata.patientName = metadata["x00100010"] as string;
            pdfObject.metadata.patientBirthdate = metadata["x00100030"];
            pdfObject.metadata.seriesDate = metadata["x00080021"];
            pdfObject.metadata.seriesModality = metadata["x00080060"]
              ?.toString()
              .toLowerCase();
            pdfObject.metadata.mimeType = metadata["x00420012"];
            pdfObject.metadata.is4D = false;
            pdfObject.metadata.numberOfFrames = 0;
            pdfObject.metadata.numberOfSlices = 0;
            pdfObject.metadata.numberOfTemporalPositions = 0;
            resolve(pdfObject as ImageObject);
          } else {
            let instanceUID = metadata["x00080018"] || randomId();
            let imageObject: Partial<ImageObject> = {
              // data needed for rendering
              file: file,
              dataSet: dataSet
            };
            imageObject.metadata = metadata as MetaData;
            imageObject.metadata.anonymized = false;
            imageObject.metadata.larvitarSeriesInstanceUID = uniqueId;
            imageObject.metadata.sopClassUID = metadata["x00080016"];
            imageObject.metadata.seriesUID = seriesInstanceUID;
            imageObject.metadata.instanceUID = instanceUID;
            imageObject.metadata.studyUID = metadata["x0020000d"];
            imageObject.metadata.accessionNumber = metadata["x00080050"];
            imageObject.metadata.studyDescription = metadata["x00081030"];
            imageObject.metadata.patientName = metadata["x00100010"] as string;
            imageObject.metadata.patientBirthdate = metadata["x00100030"];
            imageObject.metadata.seriesDescription = metadata[
              "x0008103e"
            ] as string;
            imageObject.metadata.seriesDate = metadata["x00080021"];
            imageObject.metadata.seriesModality = metadata["x00080060"]
              ?.toString()
              .toLowerCase();
            imageObject.metadata.intercept = metadata["x00281052"];
            imageObject.metadata.slope = metadata["x00281053"];
            imageObject.metadata.pixelSpacing = pixelSpacing as [
              number,
              number
            ];
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
              if (metadata["x00186060"]) {
                imageObject.metadata.rWaveTimeVector = metadata["x00186060"];
              }
            }
            imageObject.metadata.isMultiframe = isMultiframe;
            if (is4D) {
              imageObject.metadata.temporalPositionIdentifier =
                metadata["x00200100"];
              imageObject.metadata.numberOfTemporalPositions =
                metadata["x00200105"];
              imageObject.metadata.contentTime = metadata["x00080033"];
            }
            if (biplane) {
              // check if dicom tag image type x00080008 contains the word
              // BIPLANE A or BIPLANE B
              // if true, the tag is set to BIPLANE A or BIPLANE B
              let tag =
                metadata["x00080008"] &&
                metadata["x00080008"].includes("BIPLANE A")
                  ? "BIPLANE A"
                  : "BIPLANE B";
              const referencedSOPInstanceUID = metadata["x00081155"];
              const positionerPrimaryAngle = metadata["x00181510"]
                ? metadata["x00181510"]
                : 0;
              const positionerSecondaryAngle = metadata["x00181511"]
                ? metadata["x00181511"]
                : 0;
              imageObject.metadata.biplane = {};
              imageObject.metadata.biplane.tag = tag;
              imageObject.metadata.biplane.referencedSOPInstanceUID =
                referencedSOPInstanceUID;
              imageObject.metadata.biplane.positionerPrimaryAngle =
                (positionerPrimaryAngle as number) >= 0 ? "LAO" : "RAO";
              imageObject.metadata.biplane.positionerSecondaryAngle =
                (positionerSecondaryAngle as number) >= 0 ? "CRA" : "CAU";
            }
            imageObject.metadata.is4D = is4D;
            imageObject.metadata.waveform = waveform;
            imageObject.metadata.windowCenter = metadata["x00281050"];
            imageObject.metadata.windowWidth = metadata["x00281051"];
            imageObject.metadata.minPixelValue = metadata["x00280106"];
            imageObject.metadata.maxPixelValue = metadata["x00280107"];
            // check if pixelDataElement is found, if not sets pixelDataLength=0
            // means that it is a metadata-only object
            imageObject.metadata.pixelDataLength = pixelDataElement
              ? pixelDataElement.length
              : 0;
            imageObject.metadata.repr = getPixelRepresentation(dataSet);
            resolve(imageObject as ImageObject);
          }
        }
      } catch (err) {
        reject(
          `Larvitar: can not read file "${file.name}" \nParsing error: ${err}`
        );
      }
    };
    reader.readAsArrayBuffer(file);
  });
  return parsePromise;
};
