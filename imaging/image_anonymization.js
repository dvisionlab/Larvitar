/** @module imaging/anonymization
 *  @desc This file provides anonymization functionalities on DICOM images
 * following http://dicom.nema.org/medical/dicom/current/output/html/part15.html#chapter_E
 */

// external libraries
import aes from "crypto-js/aes";
import sha256 from "crypto-js/sha256";
import Hex from "crypto-js/enc-hex";
import { forEach } from "lodash";

// global vars
const TAGS = [
  "x00080014", // Instance Creator UID
  "x00080018", // SOP Instance UID
  "x00080050", // Accession Number
  "x00080080", // Institution Name
  "x00080081", // Institution Address
  "x00080081", // Institution Address
  "x00080090", // Referring Physician's Name
  "x00080092", // Referring Physician's Address
  "x00080094", // Referring Physician's Telephone numbers
  "x00081010", // Station Name
  "x00081030", // Study Description
  "x0008103e", // Series Description
  "x00081040", // Institutional Department name
  "x00081048", // Physician(s) of Record
  "x00081050", // Performing Physicians' Name
  "x00081060", // Name of Physician(s) Reading study
  "x00081070", // Operator's Name
  "x00081080", // Admitting Diagnoses Description
  "x00081155", // Referenced SOP Instance UID
  "x00082111", // Derivation Description
  "x00100010", // Patient's Name
  "x00100020", // Patient ID
  "x00100030", // Patient's Birth Date
  "x00100032", // Patient's Birth Time
  "x00100040", // Patient's Sex
  "x00101000", // Other Patient Ids
  "x00101001", // Other Patient Names
  "x00101010", // Patient's Age
  "x00101020", // Patient's Size
  "x00101030", // Patient's Weight
  "x00101090", // Medical Record Locator
  "x00102160", // Ethnic Group
  "x00102180", // Occupation
  "x001021b0", // Additional Patient's History
  "x00104000", // Patient Comments
  "x00181000", // Device Serial Number
  "x00181030", // Protocol Name
  "x0020000d", // Study Instance UID
  "x0020000e", // Series Instance UID
  "x00200010", // Study ID
  "x00200052", // Frame of Reference UID
  "x00200200", // Synchronization Frame of Reference UID
  "x00204000", // Image Comments
  "x00400275", // Request Attributes Sequence
  "x0040a124", // UID
  "x0040a730", // Content Sequence
  "x00880140", // Storage Media File-set UID
  "x30060024", // Referenced Frame of Reference UID
  "x300600c2" // Related Frame of Reference UID
];

/*
 * This module provides the following functions to be exported:
 * anonymize(series)
 * encrypt(series, passphrase)
 */

/**
 * Anonymize DICOM series' metadata using sha256
 * @function anonymize
 * @param {Object} series - Cornerstone series object
 * @returns {Object} anonymized_series: Cornerstone anonymized series object
 */
export const anonymize = function (series) {
  forEach(series.instances, function (instance) {
    forEach(TAGS, function (tag) {
      if (tag in instance.metadata) {
        let anonymized_value = sha256(instance.metadata[tag]).toString(Hex);
        instance.metadata[tag] = anonymized_value;
      }
    });
    instance.metadata.seriesUID = instance.metadata["x0020000e"];
    instance.metadata.instanceUID = instance.metadata["x00080018"];
    instance.metadata.studyUID = instance.metadata["x0020000d"];
    instance.metadata.accessionNumber = instance.metadata["x00080050"];
    instance.metadata.studyDescription = instance.metadata["x00081030"];
    instance.metadata.patientName = instance.metadata["x00100010"];
    instance.metadata.patientBirthdate = instance.metadata["x00100030"];
    instance.metadata.seriesDescription = instance.metadata["x0008103e"];
  });

  delete series["instanceUIDs"];
  series.instanceUIDs = {};

  forEach(series.imageIds, function (imageId) {
    series.instanceUIDs[series.instances[imageId].metadata.instanceUID] =
      imageId;
  });

  series.larvitarSeriesInstanceUID = sha256(
    series.larvitarSeriesInstanceUID
  ).toString(Hex);
  series.seriesUID = sha256(series.seriesUID).toString(Hex);
  series.seriesDescription = sha256(series.seriesDescription).toString(Hex);
  series.studyUID = sha256(series.studyUID).toString(Hex);

  return series;
};

/**
 * Encrypt DICOM series' metadata using AES
 * @function encrypt
 * @param {Object} series - Cornerstone series object
 * @param {String} passphrase - AES passphrase
 * @returns {Object} anonymized_series: Cornerstone encrypted series object
 */
export const encrypt = function (series, passphrase) {
  if (!passphrase) {
    return "Error, provide a valid passphrase";
  }
  forEach(series.instances, function (instance) {
    forEach(TAGS, function (tag) {
      if (tag in instance.metadata) {
        let anonymized_value = aes
          .encrypt(instance.metadata[tag], passphrase)
          .toString();
        instance.metadata[tag] = anonymized_value;
      }
    });
    instance.metadata.seriesUID = instance.metadata["x0020000e"];
    instance.metadata.instanceUID = instance.metadata["x00080018"];
    instance.metadata.studyUID = instance.metadata["x0020000d"];
    instance.metadata.accessionNumber = instance.metadata["x00080050"];
    instance.metadata.studyDescription = instance.metadata["x00081030"];
    instance.metadata.patientName = instance.metadata["x00100010"];
    instance.metadata.patientBirthdate = instance.metadata["x00100030"];
    instance.metadata.seriesDescription = instance.metadata["x0008103e"];
  });

  delete series["instanceUIDs"];
  series.instanceUIDs = {};

  forEach(series.imageIds, function (imageId) {
    series.instanceUIDs[series.instances[imageId].metadata.instanceUID] =
      imageId;
  });

  series.larvitarSeriesInstanceUID = aes
    .encrypt(series.larvitarSeriesInstanceUID, passphrase)
    .toString();
  series.seriesUID = aes.encrypt(series.seriesUID, passphrase).toString();
  series.seriesDescription = aes
    .encrypt(series.seriesDescription, passphrase)
    .toString();
  series.studyUID = aes.encrypt(series.studyUID, passphrase).toString();

  return series;
};
