/** @module imaging/imageAnonymization
 *  @desc This file provides anonymization functionalities on DICOM images
 */

// internal libraries
import { Series } from "./types";

/*
 * This module provides the following functions to be exported:
 * anonymize(series: Series): Series
 */

/**
 * Anonymize a series by replacing all metadata with random values
 * @function anonymize
 * @param {Series} series - series to anonymize
 * @returns {Series} anonymized series
 */
export const anonymize = function (series: Series): Series {
  // anonymize series bytearray
  for (const id in series.imageIds) {
    const imageId = series.imageIds[id];
    let image = series.instances[imageId];
    if (image.dataSet) {
      for (const tag in image.dataSet.elements) {
        let element = image.dataSet.elements[tag];
        let text = "";
        const vr = element.vr;
        if (element !== undefined) {
          let str = image.dataSet.string(tag);
          if (str !== undefined) {
            text = str;
          }
        }
        if (vr) {
          const deIdentifiedValue = makeDeIdentifiedValue(text.length, vr, text);
          if (deIdentifiedValue !== undefined) {
            for (let i: number = 0; i < element.length; i++) {
              const char =
                deIdentifiedValue.length > i
                  ? deIdentifiedValue.charCodeAt(i)
                  : 32;
              image.dataSet.byteArray[element.dataOffset + i] = char;
            }
            // @ts-ignore always string
            image.metadata[tag] = deIdentifiedValue;
          }
        }
      }
      image.metadata.seriesUID = image.metadata["x0020000e"];
      image.metadata.instanceUID = image.metadata["x00080018"];
      image.metadata.studyUID = image.metadata["x0020000d"];
      image.metadata.accessionNumber = image.metadata["x00080050"];
      image.metadata.studyDescription = image.metadata["x00081030"];
      image.metadata.patientName = image.metadata["x00100010"] as string;
      image.metadata.patientBirthdate = image.metadata["x00100030"];
      image.metadata.seriesDescription = image.metadata["x0008103e"] as string;
      image.metadata.anonymized = true;
    } else {
      console.warn(`No dataset found for image ${imageId}`);
    }
  }

  // update parsed metadata
  series.anonymized = true;
  series.seriesDescription = series.instances[series.imageIds[0]].metadata[
    "x0008103e"
  ] as string;

  return series;
};

// Internal functions

/**
 * Generate a random string of a given length
 * @function makeRandomString
 * @param {number} length - length of the string to generate
 * @returns {string} random string
 */
const makeRandomString = function (length: number): string {
  let text: string = "";
  const possible: string =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i: number = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

/**
 * Pad a number with 0s to a given size
 * @function pad
 * @param {number} num - number to pad
 * @param {number} size - size of the padded number
 * @returns {string} padded number
 */
const pad = function (num: number, size: number): string {
  var s: string = num + "";
  while (s.length < size) s = "0" + s;
  return s;
};
/**
 * A simple but high quality 53-bit hash, that uses imul.
 * https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
 * @function cyrb53
 * @param {number} string - the starting string to hash
 * @param {number} seed - seed to create different hash
 * @returns {string} random string
 */

const cyrb53 = (str:string, seed:number = 0) => {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

/**
 * Maka a crypted string using SHA 256
 *
 */
export async function digestMessage(message: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const digest = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return digest;
}
/**
 * Make a de-identified value for a given length and VR
 * @function makeDeIdentifiedValue
 * @param {number} length - length of the value to generate
 * @param {string} vr - VR of the value to generate
 * @param {boolean} hash
 * @returns {string} de-identified value
 */
const makeDeIdentifiedValue = function (
  length: number,
  vr: string,
  value: string,
  hash: boolean = false
): string | undefined {
  if (vr === "LO" || vr === "SH" || vr === "PN") {
    if (hash){
      return cyrb53(value).toString(16);;
    }
    return makeRandomString(length);
  } else if (vr === "DA") {
    let oldDate = new Date(1900, 1, 1);
    if (hash){
      return oldDate.getFullYear() + pad(oldDate.getMonth(), 0) +
      pad(oldDate.getDate(), 0);
    }
    return (
      oldDate.getFullYear() +
      pad(oldDate.getMonth() + 1, 2) +
      pad(oldDate.getDate(), 2)
    );
  } else if (vr === "TM") {
    var now = new Date();
    if (hash){
      return (
        pad(now.getHours(), 0) +
        pad(now.getMinutes(),0) +
        pad(now.getSeconds(),0)
      );
    }
    return (
      pad(now.getHours(), 2) +
      pad(now.getMinutes(), 2) +
      pad(now.getSeconds(), 2)
    );
  } else {
    return undefined;
  }
};
