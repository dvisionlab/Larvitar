import pako from "pako";

/**
 * This is the mapping from the NRRD datatype as written in the NRRD header
 * to the JS typed array equivalent.
 */
const NRRD_TYPES_TO_TYPEDARRAY = {
  "signed char": Int8Array,
  int8: Int8Array,
  int8_t: Int8Array,
  uchar: Uint8Array,
  "unsigned char": Uint8Array,
  uint8: Uint8Array,
  uint8_t: Uint8Array,
  short: Int16Array,
  "short int": Int16Array,
  "signed short": Int16Array,
  "signed short int": Int16Array,
  int16: Int16Array,
  int16_t: Int16Array,
  ushort: Uint16Array,
  "unsigned short": Uint16Array,
  "unsigned short int": Uint16Array,
  uint16: Uint16Array,
  uint16_t: Uint16Array,
  int: Int32Array,
  "signed int": Int32Array,
  int32: Int32Array,
  int32_t: Int32Array,
  uint: Uint32Array,
  "unsigned int": Uint32Array,
  uint32: Uint32Array,
  uint32_t: Uint32Array,
  // OK for Node/V8/Chrome but not Firefox
  // longlong: BigInt64Array,
  // "long long": BigInt64Array,
  // "long long int": BigInt64Array,
  // "signed long long": BigInt64Array,
  // "signed long long int": BigInt64Array,
  // int64: BigInt64Array,
  // int64_t: BigInt64Array,
  // ulonglong: BigUint64Array,
  // "unsigned long long": BigUint64Array,
  // "unsigned long long int": BigUint64Array,
  // uint64: BigUint64Array,
  // uint64_t: BigUint64Array,
  float: Float32Array,
  double: Float64Array
};

const NRRD_TYPES_TO_VIEW_GET = {
  "signed char": "getInt8",
  int8: "getInt8",
  int8_t: "getInt8",
  uchar: "getUint8",
  "unsigned char": "getUint8",
  uint8: "getUint8",
  uint8_t: "getUint8",
  short: "getInt16",
  "short int": "getInt16",
  "signed short": "getInt16",
  "signed short int": "getInt16",
  int16: "getInt16",
  int16_t: "getInt16",
  ushort: "getUint16",
  "unsigned short": "getUint16",
  "unsigned short int": "getUint16",
  uint16: "getUint16",
  uint16_t: "getUint16",
  int: "getInt32",
  "signed int": "getInt32",
  int32: "getInt32",
  int32_t: "getInt32",
  uint: "getUint32",
  "unsigned int": "getUint32",
  uint32: "getUint32",
  uint32_t: "getUint32",
  // OK for Node/V8/Chrome but not Firefox
  // longlong: null,
  // "long long": null,
  // "long long int": null,
  // "signed long long": null,
  // "signed long long int": null,
  // int64: null,
  // int64_t: null,
  // ulonglong: null,
  // "unsigned long long": null,
  // "unsigned long long int": null,
  // uint64: null,
  // uint64_t: null,
  float: "getFloat32",
  double: "getFloat64"
};

const SPACE_TO_SPACEDIMENSIONS = {
  "right-anterior-superior": 3,
  ras: 3,
  "left-anterior-superior": 3,
  las: 3,
  "left-posterior-superior": 3,
  lps: 3,
  "right-anterior-superior-time": 4,
  rast: 4,
  "left-anterior-superior-time": 4,
  last: 4,
  "left-posterior-superior-time": 4,
  lpst: 4,
  "scanner-xyz": 3,
  "scanner-xyz-time": 4,
  "3d-right-handed": 3,
  "3d-left-handed": 3,
  "3d-right-handed-time": 4,
  "3d-left-handed-time": 4
};

// in NRRD, some "kinds" have to respect a certain size. For example, the kind
// "quaternion" has to be of size 4 (xyzw).
// When the value is 'null', then no enforcement is made.
// Note: the fields have been turned to lowercase here
const KIND_TO_SIZE = {
  domain: null,
  space: null,
  time: null,
  list: null,
  point: null,
  vector: null,
  "covariant-vector": null,
  normal: null,
  stub: 1,
  scalar: 1,
  complex: 2,
  "2-vector": 2,
  "3-color": 3,
  "rgb-color": 3,
  "hsv-color": 3,
  "xyz-color": 3,
  "4-color": 4,
  "rgba-color": 4,
  "3-vector": 3,
  "3-gradient": 3,
  "3-normal": 3,
  "4-vector": 4,
  quaternion: 4,
  "2d-symmetric-matrix": 3,
  "2d-masked-symmetric-matrix": 4,
  "2d-matrix": 4,
  "2d-masked-matrix": 4,
  "3d-symmetric-matrix": 6,
  "3d-masked-symmetric-matrix": 7,
  "3d-matrix": 9,
  "3d-masked-matrix": 10,
  "???": null
};

/**
 * Parse a buffer of a NRRD file.
 * Throws an exception if the file is not a proper NRRD file.
 * @instance
 * @function parse
 * @param {ArrayBuffer} nrrdBuffer - the NRRD file buffer
 * @param {Object} options - the option object
 * @param {boolean} options.headerOnly - Parses only the header if true, parses header and data if false (default: false)
 * @return {Object} NRRD header and data such as {header: Object, data: TypedArray }
 */
export const parse = function (nrrdBuffer, options) {
  let magicControl = "NRRD000";
  let magicTest = String.fromCharCode.apply(
    null,
    new Uint8Array(nrrdBuffer, 0, magicControl.length)
  );

  if (magicControl !== magicTest) {
    throw new Error("This file is not a NRRD file");
  }

  let { header, dataByteOffset } = parseHeader(nrrdBuffer);

  if ("headerOnly" in options && options.headerOnly) {
    return { header: header, data: null };
  }

  let data = parseData(nrrdBuffer, header, dataByteOffset);
  return { header: header, data: data };
};

/**
 * @private
 * Parses the header
 */
function parseHeader(nrrdBuffer) {
  let byteArrayHeader = [];
  let dataStartPosition = null;
  let view = new DataView(nrrdBuffer);

  for (let i = 0; i < nrrdBuffer.byteLength; i++) {
    byteArrayHeader.push(String.fromCharCode(view.getUint8(i)));

    if (
      i > 0 &&
      byteArrayHeader[i - 1] === "\n" &&
      byteArrayHeader[i] === "\n"
    ) {
      dataStartPosition = i + 1;
      break;
    }
  }

  if (dataStartPosition === null) {
    throw new Error("The NRRD header is corrupted.");
  }

  let comments = [];

  let headerLines = byteArrayHeader
    .join("")
    .trim()
    .split(/\r\n|\n/)
    .map(l => l.trim());

  let preMap = headerLines
    .slice(1)
    .filter(s => {
      // removing empty lines
      return s.length > 0;
    })
    .filter(s => {
      // removing comments
      if (s[0] === "#") {
        comments.push(s.slice(1).trim());
      }
      return s[0] !== "#";
    })
    .map(s => {
      let keyVal = s.split(":");
      return {
        key: keyVal[0].trim(),
        val: keyVal[1].trim()
      };
    });

  let nrrdHeader = {};

  preMap.forEach(field => {
    nrrdHeader[field.key] = field.val;
  });

  // parsing each fields of the header
  if (nrrdHeader["sizes"]) {
    nrrdHeader["sizes"] = nrrdHeader.sizes.split(/\s+/).map(n => parseInt(n));
  }

  if (nrrdHeader["space dimension"]) {
    nrrdHeader["space dimension"] = parseInt(nrrdHeader["space dimension"]);
  }

  if (nrrdHeader["space"]) {
    nrrdHeader["space dimension"] =
      SPACE_TO_SPACEDIMENSIONS[nrrdHeader["space"].toLowerCase()];
  }

  if (nrrdHeader["dimension"]) {
    nrrdHeader["dimension"] = parseInt(nrrdHeader["dimension"]);
  }

  if (nrrdHeader["space directions"]) {
    nrrdHeader["space directions"] = nrrdHeader["space directions"]
      .split(/\s+/)
      .map(triple => {
        if (triple.trim() === "none") {
          return null;
        }
        return triple
          .slice(1, triple.length - 1)
          .split(",")
          .map(n => parseFloat(n));
      });

    if (nrrdHeader["space directions"].length !== nrrdHeader["dimension"]) {
      throw new Error(
        '"space direction" property has to contain as many elements as dimensions. Non-spatial dimesnsions must be refered as "none". See http://teem.sourceforge.net/nrrd/format.html#spacedirections for more info.'
      );
    }
  }

  if (nrrdHeader["space units"]) {
    nrrdHeader["space units"] = nrrdHeader["space units"].split(/\s+/);
  }

  if (nrrdHeader["space origin"]) {
    nrrdHeader["space origin"] = nrrdHeader["space origin"]
      .slice(1, nrrdHeader["space origin"].length - 1)
      .split(",")
      .map(n => parseFloat(n));
  }

  if (nrrdHeader["measurement frame"]) {
    nrrdHeader["measurement frame"] = nrrdHeader["measurement frame"]
      .split(/\s+/)
      .map(triple => {
        if (triple.trim() === "none") {
          return null;
        }
        return triple
          .slice(1, triple.length - 1)
          .split(",")
          .map(n => parseFloat(n));
      });
  }

  if (nrrdHeader["kinds"]) {
    nrrdHeader["kinds"] = nrrdHeader["kinds"].split(/\s+/);

    if (nrrdHeader["kinds"].length !== nrrdHeader["sizes"].length) {
      throw new Error(
        `The "kinds" property is expected to have has many elements as the "size" property.`
      );
    }

    nrrdHeader["kinds"].forEach((k, i) => {
      let expectedLength = KIND_TO_SIZE[k.toLowerCase()];
      let foundLength = nrrdHeader["sizes"][i];
      if (expectedLength !== null && expectedLength !== foundLength) {
        throw new Error(
          `The kind "${k}" expect a size of ${expectedLength} but ${foundLength} found`
        );
      }
    });
  }

  if (nrrdHeader["min"]) {
    nrrdHeader["min"] = parseFloat(nrrdHeader["min"]);
  }

  if (nrrdHeader["max"]) {
    nrrdHeader["max"] = parseFloat(nrrdHeader["max"]);
  }

  if (nrrdHeader["old min"]) {
    nrrdHeader["old min"] = parseFloat(nrrdHeader["old min"]);
  }

  if (nrrdHeader["old max"]) {
    nrrdHeader["old max"] = parseFloat(nrrdHeader["old max"]);
  }

  if (nrrdHeader["spacings"]) {
    nrrdHeader["spacings"] = nrrdHeader["spacings"]
      .split(/\s+/)
      .map(n => parseFloat(n));
  }

  if (nrrdHeader["thicknesses"]) {
    nrrdHeader["thicknesses"] = nrrdHeader["thicknesses"]
      .split(/\s+/)
      .map(n => parseFloat(n));
  }

  if (nrrdHeader["axis mins"]) {
    nrrdHeader["axis mins"] = nrrdHeader["axis mins"]
      .split(/\s+/)
      .map(n => parseFloat(n));
  }

  if (nrrdHeader["axismins"]) {
    nrrdHeader["axismins"] = nrrdHeader["axismins"]
      .split(/\s+/)
      .map(n => parseFloat(n));
  }

  if (nrrdHeader["axis maxs"]) {
    nrrdHeader["axis maxs"] = nrrdHeader["axis maxs"]
      .split(/\s+/)
      .map(n => parseFloat(n));
  }

  if (nrrdHeader["axismaxs"]) {
    nrrdHeader["axismaxs"] = nrrdHeader["axismaxs"]
      .split(/\s+/)
      .map(n => parseFloat(n));
  }

  if (nrrdHeader["centers"]) {
    nrrdHeader["centers"] = nrrdHeader["centers"].split(/\s+/).map(mode => {
      if (mode === "cell" || mode === "node") {
        return mode;
      } else {
        return null;
      }
    });
  }

  if (nrrdHeader["labels"]) {
    nrrdHeader["labels"] = nrrdHeader["labels"].split(/\s+/);
  }

  // some additional metadata that are not part of the header will be added here
  nrrdHeader.extra = {};

  // adding the comments from lines starting with #
  nrrdHeader.extra.comments = comments;

  // having the stride can be handy.
  nrrdHeader.extra.stride = [1];
  for (let i = 1; i < nrrdHeader.sizes.length; i++) {
    nrrdHeader.extra.stride.push(
      nrrdHeader.extra.stride[i - 1] * nrrdHeader.sizes[i - 1]
    );
  }

  return {
    header: nrrdHeader,
    dataByteOffset: dataStartPosition
  };
}

/**
 * @private
 * Parses the data
 */
function parseData(nrrdBuffer, header, dataByteOffset) {
  let dataBuffer = null;
  let arrayType = NRRD_TYPES_TO_TYPEDARRAY[header.type];
  let nbElementsFromHeader = header.sizes.reduce((prev, curr) => prev * curr);
  let min = +Infinity;
  let max = -Infinity;
  let data = null;

  let isTextEncoded =
    header.encoding === "ascii" ||
    header.encoding === "txt" ||
    header.encoding === "text";

  if (header.encoding === "raw") {
    dataBuffer = new Uint8Array(nrrdBuffer).slice(dataByteOffset).buffer;
  } else if (isTextEncoded) {
    let numbers = String.fromCharCode
      .apply(null, new Uint8Array(nrrdBuffer, dataByteOffset))
      .split(/\r\n|\n|\s/)
      .map(s => s.trim())
      .filter(s => s !== "")
      .map(s => {
        let numValue = parseFloat(s);
        min = Math.min(min, numValue);
        max = Math.max(max, numValue);
        return numValue;
      });
    data = new arrayType(numbers);
  } else if (header.encoding === "gzip" || header.encoding === "gz") {
    dataBuffer = pako.inflate(new Uint8Array(nrrdBuffer).slice(dataByteOffset))
      .buffer;
  } else {
    throw new Error('Only "raw", "ascii" and "gzip" encoding are supported.');
  }

  if (isTextEncoded) {
    if (nbElementsFromHeader !== data.length) {
      throw new Error("Unconsistency in data buffer length");
    }
  } else {
    let nbElementsFromBufferAndType =
      dataBuffer.byteLength / arrayType.BYTES_PER_ELEMENT;

    if (nbElementsFromHeader !== nbElementsFromBufferAndType) {
      throw new Error("Unconsistency in data buffer length");
    }

    data = new arrayType(nbElementsFromHeader);
    let dataView = new DataView(dataBuffer);
    let viewMethod = NRRD_TYPES_TO_VIEW_GET[header.type];
    let littleEndian = header.endian === "little" ? true : false;

    for (let i = 0; i < nbElementsFromHeader; i++) {
      data[i] = dataView[viewMethod](
        i * arrayType.BYTES_PER_ELEMENT,
        littleEndian
      );
      min = Math.min(min, data[i]);
      max = Math.max(max, data[i]);
    }
  }

  header.extra.min = min;
  header.extra.max = max;
  return data;
}
