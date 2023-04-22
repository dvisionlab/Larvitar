// external libraries
import {
  isEmpty,
  sortBy,
  clone,
  find,
  filter,
  keys,
  has,
  max,
  map,
  forEach,
  extend,
  indexOf,
  random
} from "lodash";
import TAG_DICT from "./dataDictionary.json";
import { convertBytes } from "dicom-character-set";

import {
  getDICOMTag,
  isStringVr,
  parseDateTag,
  parseDateTimeTag,
  parseTimeTag,
  parsePatientNameTag,
  parseAgeTag,
  parseDICOMFileIDTag
} from "./imageUtils";
import { DataSet } from "dicom-parser";

/**
 * Parse a DICOM Tag according to its type
 * @instance
 * @function parseTag
 * @param {Object} dataSet - The parsed dataset object from dicom parser
 * @param {String} propertyName - The tag name
 * @param {Object} element - The parsed dataset element
 * @return {String} - The DICOM Tag value
 */
export const parseTag = function (
  dataSet: DataSet,
  propertyName: string,
  element: { [key: string]: any } // TODO-ts better type
) {
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

  var valueIn;
  var valueOut;

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
      valueIn = str;
      valueOut = str;
    }

    // A string of characters representing an Integer in base-10 (decimal),
    // shall contain only the characters 0 - 9, with an optional leading "+" or "-".
    // It may be padded with leading and/or trailing spaces. Embedded spaces
    // are not allowed. The integer, n, represented shall be in the range:
    // -231 <= n <= (231 - 1).
    if (vr === "IS") {
      valueOut = parseInt(valueIn);
    }
    // A string of characters representing either a fixed point number
    // or a floating point number. A fixed point number shall contain only
    // the characters 0-9 with an optional leading "+" or "-" and an optional "."
    // to mark the decimal point. A floating point number shall be conveyed
    // as defined in ANSI X3.9, with an "E" or "e" to indicate the start
    // of the exponent. Decimal Strings may be padded with leading or trailing spaces.
    // Embedded spaces are not allowed.
    else if (vr === "DS") {
      valueIn = valueIn.split("\\").map(Number);
      if (propertyName == "x00281050" || propertyName == "x00281051") {
        valueOut = valueIn.length > 0 ? valueIn[0] : valueIn;
      } else {
        valueOut = valueIn.length == 1 ? valueIn[0] : valueIn;
      }
    }
    // A string of characters of the format YYYYMMDD; where YYYY shall contain year,
    // MM shall contain the month, and DD shall contain the day,
    // interpreted as a date of the Gregorian calendar system.
    else if (vr === "DA") {
      valueOut = parseDateTag(valueIn);
    }
    // A concatenated date-time character string in the format:
    // YYYYMMDDHHMMSS.FFFFFF
    else if (vr === "DT") {
      valueOut = parseDateTimeTag(valueIn);
    }
    // A string of characters of the format HHMMSS.FFFFFF; where HH contains hours
    // (range "00" - "23"), MM contains minutes (range "00" - "59"),
    // SS contains seconds (range "00" - "60"), and FFFFFF contains a fractional
    // part of a second as small as 1 millionth of a second (range "000000" - "999999").
    else if (vr === "TM") {
      valueOut = parseTimeTag(valueIn);
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
        let arr: Uint8Array | null = new Uint8Array(
          dataSet.byteArray.buffer,
          data.dataOffset,
          data.length
        );
        valueOut = convertBytes(characterSet, arr, {
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
        valueOut = parsePatientNameTag(valueIn);
      }
      valueOut = valueOut.replace(/\0/g, ""); // remove null char (\u0000)
    }
    // A string of characters with one of the following formats
    // -- nnnD, nnnW, nnnM, nnnY; where nnn shall contain the number of days for D,
    // weeks for W, months for M, or years for Y.
    else if (vr == "AS") {
      valueOut = parseAgeTag(valueIn);
    }

    // A string of characters with leading or trailing spaces (20H) being non-significant.
    else if (vr === "CS") {
      if (propertyName === "x00041500") {
        valueOut = parseDICOMFileIDTag(valueIn);
      } else {
        valueOut = valueIn.split("\\").join(", ");
      }
    }
  } else if (vr === "US") {
    valueOut = dataSet.uint16(propertyName);
  } else if (vr === "SS") {
    valueOut = dataSet.int16(propertyName);
  } else if (vr === "US|SS") {
    valueOut = dataSet.int16(propertyName);
  } else if (vr === "UL") {
    valueOut = dataSet.uint32(propertyName);
  } else if (vr === "SL") {
    valueOut = dataSet.int32(propertyName);
  } else if (vr == "FD") {
    valueOut = dataSet.double(propertyName);
  } else if (vr == "FL") {
    valueOut = dataSet.float(propertyName);
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
      valueOut =
        "binary data of length " +
        element.length +
        " as uint16: " +
        dataSet.uint16(propertyName);
    } else if (element.length === 4) {
      valueOut =
        "binary data of length " +
        element.length +
        " as uint32: " +
        dataSet.uint32(propertyName);
    } else {
      valueOut = "binary data of length " + element.length + " and VR " + vr;
    }
  } else if (vr === "AT") {
    var group = dataSet.uint16(propertyName, 0);
    if (group) {
      var groupHexStr = ("0000" + group.toString(16)).substr(-4);
      var elm = dataSet.uint16(propertyName, 1);
      var elmHexStr = ("0000" + elm.toString(16)).substr(-4);
      valueOut = "x" + groupHexStr + elmHexStr;
    } else {
      valueOut = "";
    }
  } else if (vr === "SQ") {
    // parse the nested tags
    var subTags: any = map(element, function (obj) {
      return map(obj, function (v, k) {
        return parseTag(dataSet, k, v);
      });
    });

    valueOut = subTags;
  } else {
    // If it is some other length and we have no string
    valueOut = "no display code for VR " + vr;
  }

  valueOut !== undefined
    ? console.log(propertyName, vr, valueOut)
    : console.warn(propertyName, vr, valueOut);

  return valueOut;
};
