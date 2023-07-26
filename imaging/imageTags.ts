// external libraries
import { map } from "lodash";
import TAG_DICT from "./dataDictionary.json";
import { convertBytes } from "dicom-character-set";
import { DataSet } from "dicom-parser";

/*
 * This module provides the following functions to be exported:
 * parseTag(dataSet, propertyName, element)
 * getDICOMTagCode(code)
 * getDICOMTag(code)
 * isStringVr(vr)
 * parseDateTag(tagValue)
 * parseDateTimeTag(tagValue)
 * parseTimeTag(tagValue)
 * parsePatientNameTag(tagValue)
 * parseAgeTag(tagValue)
 * parseDICOMFileIDTag(tagValue)
 * getTagValue(dataSet, tag)
 * formatDate(date)
 * formatDateTime(date)
 * isValidDate(d)
 */

/**
 * Convert date from dicom tag
 * @instance
 * @function formatDate
 * @param {Date} dicomDate - A date from a DICOM tag
 * @return {String} - The human readable date
 */
let formatDate = function (date: string) {
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
let formatDateTime = function (date: string) {
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
 * Check if argument is a valid Date Object
 * @instance
 * @function isValidDate
 * @param {Date} d - The date object to be checked
 * @return {Boolean} - Boolean result
 */
const isValidDate = function (d: Date) {
  return d instanceof Date && !isNaN(d.getTime());
};

/**
 * Parse a dicom date tag into human readable format
 * @instance
 * @function parseDateTag
 * @param {String} tagValue - The string to be parsed
 * @return {String} - The parsed result
 */
const parseDateTag = function (tagValue: string) {
  if (!tagValue) return "";
  const year = tagValue.substring(0, 4);
  const month = tagValue.substring(4, 6);
  const day = tagValue.substring(6, 8);
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
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
const parseDateTimeTag = function (tagValue: string) {
  if (!tagValue) return "";
  const year = tagValue.substring(0, 4);
  const month = tagValue.substring(4, 6);
  const day = tagValue.substring(6, 8);
  const hour = tagValue.substring(8, 10);
  const min = tagValue.substring(10, 12);
  const sec = tagValue.substring(12, 14);
  // const msec = tagValue.substring(15, 21);
  const date = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(min),
    parseInt(sec),
    parseInt(sec)
  );
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
const parseTimeTag = function (tagValue: string) {
  if (!tagValue) return "";
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
const parsePatientNameTag = function (tagValue: string) {
  if (!tagValue) return "";
  return tagValue.replace(/\^/gi, " ");
};

/**
 * Parse a dicom age tag into human readable format
 * @instance
 * @function parseAgeTag
 * @param {String} tagValue - The string to be parsed
 * @return {String} - The parsed result
 */
const parseAgeTag = function (tagValue: string) {
  if (!tagValue) return "";
  let regs = /(\d{3})(D|W|M|Y)/gim.exec(tagValue);
  if (regs) {
    return parseInt(regs[1]) + " " + regs[2];
  } else {
    return "";
  }
};

/**
 * Parse a dicom fileID tag into human readable format
 * @instance
 * @function parseDICOMFileIDTag
 * @param {String} tagValue - The string to be parsed
 * @return {String} - The parsed result
 */
const parseDICOMFileIDTag = function (tagValue: string) {
  // The DICOM File Service does not specify any "separator" between
  // the Components of the File ID. This is a Value Representation issue that
  // may be addressed in a specific manner by each Media Format Layer.
  // In DICOM IODs, File ID Components are generally handled as multiple
  // Values and separated by "backslashes".
  // There is no requirement that Media Format Layers use this separator.
  if (!tagValue) return "";
  // @ts-ignore //TODO this can't work!
  return tagValue.split("\\").join(path.sep);
};

/**
 * Check if argument is a string of concatenated vrs
 * @instance
 * @function isStringVr
 * @param {String} vr - The string to be checked
 * @return {Boolean} - Boolean result
 */
const isStringVr = function (vr: string) {
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
    vr === "SL" || // signed long
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
 * Get the dicom tag code from dicom image
 * @instance
 * @function getDICOMTagCode
 * @param {String} dicomTag - The original DICOM tag code
 * @return {String} - The human readable DICOM tag code
 */
function getDICOMTagCode(code: string) {
  let re = /x(\w{4})(\w{4})/;
  let result = re.exec(code);
  if (!result) {
    return code;
  }
  let newCode = "(" + result[1] + "," + result[2] + ")";
  newCode = newCode.toUpperCase();
  return newCode;
}

/**
 * Get the dicom tag from dicom tag code
 * @instance
 * @function getDICOMTag
 * @param {String} dicomTagCode - The original DICOM tag code
 * @return {String} - The human readable DICOM tag
 */
function getDICOMTag(code: string) {
  let newCode = getDICOMTagCode(code);

  if (!Object.keys(TAG_DICT).includes(newCode)) {
    console.debug(`Invalid tag key: ${newCode}`);
    return null;
  }
  // force type to keyof typeof TAG_DICT after having checked that it is a valid key
  let tag = TAG_DICT[newCode as keyof typeof TAG_DICT];
  return tag;
}

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

  return valueOut;
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
export const getTagValue = function (dataSet: DataSet, tag: string) {
  let tagObj = getDICOMTag(tag);
  // tag value rapresentation
  if (!tagObj) {
    return null;
  }
  let vr = tagObj.vr;

  // parse value according to vr map
  let vrParsingMap: {
    [key: string]: () => any;
  } = {
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
