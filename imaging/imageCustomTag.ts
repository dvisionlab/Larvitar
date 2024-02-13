/** @module imaging/imageCustomTags
 *  @desc This file provides customization functionalities on DICOM images' Byte Array
 */

//PROCEDURE
// Check padding bytes in certain VRs and add byte = 32 ASCII (=" ") if tag value is odd.
// Ex if name is "TEST1" it is transformed in "TEST1 " so that its length is even (5->6)
// Find the minimum offset in custom tags = start shifting point
// Evaluate the shifts in each section of the byte array:
// Ex.I change elements corresponding to offset=10 and 20
// If element with offset 10 has new length of 3 instead of 5, elements from 10 to 20 have shift=3-5=-2
// If element with offset 20 has now length of 10 instead of 5, elements from 20 and the next have shift= -2+5=+3 and so on
// Update each element's length and offset subsequently in DataSet and MetaData objects

// internal libraries

import { ByteArray } from "dicom-parser";
import { Instance, MetaData, Series } from "./types";
import { DataSet } from "dicom-parser";
import { Element } from "dicom-parser";
import { Image } from "cornerstone-core";
//import { Buffer } from "node:buffer";

/**
 * provides sorted original tags and sorted new customtags
 * @function sortAndBuildByteArray
 * @param {DataSet} dataSet - dataset original image
 * @param {MetaData} customTags - customized tags
 * @returns {Series} customized series
 */
export const sortTags = function (
  dataSet: DataSet,
  customTags: MetaData
): {
  sortedTags: {
    [x: string]: Element;
  }[];
  sortedCustomTags: {
    tag: string;
    value: string;
    offset: number;
    index: number;
  }[];
  shiftTotal: number;
} {
  //all tags sorted by their offset from min to max (may be unuseful if they are already sorted) TODO check with Simone
  const sortedTags = Object.values(dataSet.elements)
    .sort((a, b) => a.dataOffset - b.dataOffset)
    .map(element => ({ [element.tag]: element }));

  let shiftTotal = 0;
  //custom tags sorted by their offset from min to max (may be unuseful if they are already sorted) TODO check with Simone
  const sortedCustomTags = Object.entries(customTags)
    .map(([tag]) => {
      if (
        //image.dataSet!.elements[tag].vr === "PN" &&
        // @ts-ignore always string
        customTags[tag] === undefined ||
        // @ts-ignore always string
        customTags[tag] === null ||
        // @ts-ignore always string
        customTags[tag] === ""
      ) {
        // @ts-ignore always string
        customTags[tag] = " ";
      }
      if (
        //image.dataSet!.elements[tag].vr === "PN" &&
        // @ts-ignore always string
        customTags[tag].length % 2 !=
        0
      ) {
        // @ts-ignore always string
        customTags[tag] = customTags[tag] + " ";
      }
      shiftTotal +=
        // @ts-ignore always string
        customTags[tag].length - dataSet!.elements[tag].length;
      return {
        tag,
        // @ts-ignore always string
        value: customTags[tag],
        offset: dataSet!.elements[tag].dataOffset,
        index: sortedTags.findIndex(obj => {
          for (let prop in obj) {
            if (obj[prop].tag === tag) {
              return true; // Found the object with the correct tag
            }
          }
        })
      };
    })
    .sort((a, b) => a.offset - b.offset);
  return {
    sortedTags,
    sortedCustomTags,
    shiftTotal
  };
};

/**
 * Pre-processes the Byte Array (padding bytes for certain VR are
 * required if correspopnding value is odd)
 * @function preProcessByteArray
 * @param {DataSet} dataSet - customized tags
 * @returns {Series} customized series
 */
export const preProcessByteArray = function (image: Instance) {
  if (image.dataSet) {
    for (const key in image.dataSet.elements) {
      if (Object.hasOwnProperty.call(image.dataSet.elements, key)) {
        const element = image.dataSet.elements[key];
        // Do something with the element
        if (
          element.dataOffset + element.length !=
          image.dataSet.byteArray.length
        ) {
          if (
            image.dataSet.byteArray[element.dataOffset + element.length - 1] ===
              0 &&
            (element.vr === "DS" ||
              element.vr === "CS" ||
              element.vr === "IS" ||
              element.vr === "SH" ||
              element.vr === "LO" ||
              element.vr === "ST" ||
              element.vr === "PN")
          ) {
            if (
              // @ts-ignore always string
              (typeof image.metadata[key] === "string" &&
                // @ts-ignore always string
                image.metadata[key].length % 2 != 0) ||
              // @ts-ignore always string
              (typeof image.metadata[key] === "number" &&
                // @ts-ignore always string
                Math.abs(image.metadata[key]).toString().length % 2 != 0) || // @ts-ignore always string
              (Array.isArray(image.metadata[key]) && // Check if image.metadata[tag] is an array
                // @ts-ignore always string
                image.metadata[key].some(num => {
                  // Check if at least one of the numbers in the array has odd length
                  return (
                    typeof num === "number" && // Check if the element is a number
                    Math.abs(num).toString().length % 2 !== 0
                  ); // Check if the absolute value of the number has odd length
                }))
            ) {
              image.dataSet.byteArray[
                element.dataOffset + element.length - 1
              ] = 32;
            }
          } else if (element.vr === "SQ") {
            if (element.items && element.items.length) {
              for (let i = 0; i < element.items.length; i++) {
                for (const key in element.items[i].dataSet!.elements) {
                  let subElement = element.items[i].dataSet!.elements[key]; //nested tags, check how they work
                  //dont do a priori but check if metadata is odd or even before
                  if (
                    // @ts-ignore always string
                    (typeof image.metadata[key] === "string" &&
                      // @ts-ignore always string
                      image.metadata[key].length % 2 != 0) ||
                    // @ts-ignore always string
                    (typeof image.metadata[key] === "number" &&
                      // @ts-ignore always string
                      Math.abs(image.metadata[key]).toString().length % 2 !=
                        0) || // @ts-ignore always string
                    (Array.isArray(image.metadata[key]) && // Check if image.metadata[tag] is an array
                      // @ts-ignore always string
                      image.metadata[key].some(num => {
                        // Check if at least one of the numbers in the array has odd length
                        return (
                          typeof num === "number" && // Check if the element is a number
                          Math.abs(num).toString().length % 2 !== 0
                        ); // Check if the absolute value of the number has odd length
                      }))
                  ) {
                    image.dataSet.byteArray[
                      subElement.dataOffset + subElement.length - 1
                    ] = 32;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
/**
 * called when metadata are modified with custom values
 * @function customizeByteArray
 * @param {Series} series - series to customize
 * @param {MetaData} customTags - customized tags
 * @returns {Series} customized series
 */
export const customizeByteArray = function (
  series: Series,
  customTags: MetaData //only string values
): Series {
  for (const id in series.imageIds) {
    const imageId = series.imageIds[id];
    let image = series.instances[imageId];
    if (image.dataSet) {
      //sort custom tags from lowest offset to highest one

      let shift = 0;

      const { sortedTags, sortedCustomTags, shiftTotal } = sortTags(
        image.dataSet,
        customTags
      );
      console.log(image);
      preProcessByteArray(image);

      // Running in Node.js environment or running in browser environment
      let newByteArray: ByteArray =
        typeof Buffer !== "undefined"
          ? Buffer.alloc(image.dataSet.byteArray.length + shiftTotal)
          : new Uint8Array(image.dataSet.byteArray.length + shiftTotal);

      for (let i = 0; i < sortedCustomTags.length; i++) {
        let element = image.dataSet.elements[sortedCustomTags[i].tag];

        const vr: string = element.vr!;

        if (vr) {
          //shift byteArray elements given shifts for every customtag value changed
          if (sortedCustomTags[i].value !== undefined) {
            const startCustomTag = element.dataOffset + shift;
            element.dataOffset = startCustomTag;
            if (sortedCustomTags[i].value.length != element.length) {
              shift = shift + sortedCustomTags[i].value.length - element.length;
            }
            const endCustomTag =
              i === sortedCustomTags.length - 1
                ? newByteArray.length
                : sortedCustomTags[i + 1].offset + shift;

            if (i === 0) {
              for (let j: number = 0; j < startCustomTag; j++) {
                newByteArray[j] = image.dataSet.byteArray[j];
              }
            }
            for (let j: number = startCustomTag; j < endCustomTag; j++) {
              if (j < startCustomTag + sortedCustomTags[i].value.length) {
                if (j == startCustomTag) {
                  if (sortedCustomTags[i].value.length - element.length != 0) {
                    newByteArray[j - 2] = sortedCustomTags[i].value.length;
                  } else {
                    newByteArray[j - 2] = newByteArray[j - 2];
                  }
                }
                const char =
                  sortedCustomTags[i].value.length > j - startCustomTag
                    ? sortedCustomTags[i].value.charCodeAt(j - startCustomTag)
                    : 32;
                newByteArray[j] = char;
              } else {
                newByteArray[j] = image.dataSet.byteArray[j - shift];
              }
            }
          }

          // @ts-ignore always string
          image.metadata[sortedCustomTags[i].tag] = sortedCustomTags[i].value;
          element.length = sortedCustomTags[i].value.length;

          //change dataset infos about offset accordingly
          let start = sortedCustomTags[i].index + 1;
          let end =
            i === sortedCustomTags.length - 1
              ? sortedTags.length
              : sortedCustomTags[i + 1].index;
          for (let k: number = start; k < end; k++) {
            image.dataSet.elements[Object.keys(sortedTags[k])[0]].dataOffset +=
              shift;
          }
        }
      }
      image.dataSet.byteArray = newByteArray as ByteArray;
      //update image metadata if changed
      image.metadata.seriesUID = image.metadata["x0020000e"];
      image.metadata.instanceUID = image.metadata["x00080018"];
      image.metadata.studyUID = image.metadata["x0020000d"];
      image.metadata.accessionNumber = image.metadata["x00080050"];
      image.metadata.studyDescription = image.metadata["x00081030"];
      image.metadata.patientName = image.metadata["x00100010"] as string;
      image.metadata.patientBirthdate = image.metadata["x00100030"];
      image.metadata.seriesDescription = image.metadata["x0008103e"] as string;
    } else {
      console.warn(`No dataset found for image ${imageId}`);
    }
  }

  // update parsed metadata
  series.seriesDescription = series.instances[series.imageIds[0]].metadata[
    "x0008103e"
  ] as string;

  return series;
};
