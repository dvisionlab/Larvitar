/** @module imaging/imageCustomTags
 *  @desc This file provides customization functionalities on DICOM images' Byte Array
 */

//PROCEDURE

// 1) sortTags: Sort tag elements and custom tags basing on crescent offsets
//    Find the minimum offset in custom tags which is the start shifting point + add padding to custom tags
// 2) preProcessByteArray: check padding bytes in certain VRs and add byte = 32 ASCII (=" ") if tag value is odd.
//    Ex if name is "TEST1" it is transformed in "TEST1 " so that its length is even (5->6)
// 3) customizeByteArray: Evaluate the shifts in each section of the byte array:
//    Ex.I change elements corresponding to offset=10 and 20
//    If element with offset 10 has new length of 3 instead of 5, elements from 10 to 20 have shift=3-5=-2
//    If element with offset 20 has now length of 10 instead of 5, elements from 20 and the next have shift= -2+5=+3 and so on
// 4) changeOffsets: Update each element's length and offset subsequently in DataSet and MetaData objects

// external libraries
import { ByteArray, DataSet, Element } from "dicom-parser";

// internal libraries
import { logger } from "../logger";
import { MetaData, Series, tags, customTags, sortedTags } from "./types";

/*
 * This module provides the following functions to be exported:customizeByteArray
 * (series: Series, customTags: MetaData ): Series
 */

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
  let imageIds =
    series.isMultiframe === true ? ["multiframeId"] : series.imageIds;
  for (const id in imageIds) {
    const imageId = series.imageIds[id];
    let dataSet =
      series.isMultiframe === true
        ? series.dataSet
        : series.instances[imageId].dataSet;
    let metadata =
      series.isMultiframe === true
        ? series.metadata
        : series.instances[imageId].metadata;
    if (dataSet && metadata) {
      //sort custom tags from lowest offset to highest one

      let shift = 0;
      // filter custom tags not present in dataset
      let customTagToBeChanged: any = {};
      for (const [key, value] of Object.entries(customTags)) {
        if (dataSet.elements[key]) {
          let customTag = value;
          customTagToBeChanged[key] = customTag;
        }
      }

      const { sortedTags, sortedCustomTags, shiftTotal } = sortTags(
        dataSet,
        customTagToBeChanged
      );
      preProcessByteArray(dataSet, metadata);

      // Running in Node.js environment or running in browser environment
      let newByteArray: ByteArray =
        typeof Buffer !== "undefined"
          ? Buffer.alloc(dataSet.byteArray.length + shiftTotal)
          : new Uint8Array(dataSet.byteArray.length + shiftTotal);

      for (let i = 0; i < sortedCustomTags.length; i++) {
        let element = dataSet.elements[sortedCustomTags[i].tag];

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
                newByteArray[j] = dataSet.byteArray[j];
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
                newByteArray[j] = dataSet.byteArray[j - shift];
              }
            }
          }
          //change image metadata and element's length values
          // @ts-ignore always string
          metadata[sortedCustomTags[i].tag] = sortedCustomTags[i].value;
          element.length = sortedCustomTags[i].value.length;

          //change dataset infos about offset accordingly
          let start = sortedCustomTags[i].index + 1;
          let end =
            i === sortedCustomTags.length - 1
              ? sortedTags.length
              : sortedCustomTags[i + 1].index;
          changeOffsets(dataSet, start, end, sortedTags, shift);
        }
      }
      dataSet.byteArray = newByteArray as ByteArray;
      //update image metadata if changed
      metadata.seriesUID = metadata["x0020000e"];
      metadata.instanceUID = metadata["x00080018"];
      metadata.studyUID = metadata["x0020000d"];
      metadata.accessionNumber = metadata["x00080050"];
      metadata.studyDescription = metadata["x00081030"];
      metadata.patientName = metadata["x00100010"] as string;
      metadata.patientBirthdate = metadata["x00100030"];
      metadata.seriesDescription = metadata["x0008103e"] as string;
    } else {
      logger.warn(`No dataset found for image ${imageId}`);
    }
  }

  // update parsed metadata
  series.seriesDescription =
    series.isMultiframe === true
      ? (series.metadata!["x0008103e"] as string)
      : (series.instances[series.imageIds[0]].metadata["x0008103e"] as string);

  return series;
};

// Internal functions

/**
 * provides sorted original tags and sorted new customtags
 * @function sortTags
 * @param {DataSet} dataSet - dataset original image
 * @param {MetaData} customTags - customized tags
 * @returns {sortedTags} -sorted tags
 */
function sortTags(dataSet: DataSet, customTags: MetaData): sortedTags {
  const sortedTags: tags = Object.values(dataSet.elements)
    .sort((a, b) => a.dataOffset - b.dataOffset)
    .map(element => ({ [element.tag]: element }));

  let shiftTotal = 0;
  const sortedCustomTags: customTags = Object.entries(customTags)
    .map(([tag]) => {
      // @ts-ignore always string
      let customTag = customTags[tag];
      if (customTag === undefined || customTag === null || customTag === "") {
        customTag = " ";
      }
      customTag = customTag.length % 2 != 0 ? customTag + " " : customTag;
      shiftTotal += customTag.length - dataSet!.elements[tag].length;
      return {
        tag,
        value: customTag,
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
}

/**
 * Pre-processes the tag
 * @function preProcessTag
 * @param {string | number | number[]} metadata
 *  @param {DataSet} dataSet
 *  @param {Element} element
 * @returns {void}
 */
function preProcessTag(
  metadata: string | number | number[],
  dataSet: DataSet,
  element: Element
) {
  if (
    (typeof metadata === "string" && metadata.length % 2 != 0) ||
    (typeof metadata === "number" &&
      Math.abs(metadata).toString().length % 2 != 0) ||
    (Array.isArray(metadata) && // Check if image.metadata[tag] is an array
      metadata.some(num => {
        // Check if at least one of the numbers in the array has odd length
        return (
          typeof num === "number" && // Check if the element is a number
          Math.abs(num).toString().length % 2 !== 0
        ); // Check if the absolute value of the number has odd length
      }))
  ) {
    dataSet!.byteArray[element.dataOffset + element.length - 1] = 32;
  }
}

/**
 * Pre-processes the Byte Array (padding bytes for certain VR are
 * required if corresponding value is odd)
 * @function preProcessByteArray
 * @param {DataSet} dataSet - customized tags
 * @param {MetaData} metadata - customized tags
 * @returns {void}
 */
function preProcessByteArray(dataSet: DataSet, metadata: MetaData) {
  const vrsToBeProcessed = ["DS", "CS", "IS", "SH", "LO", "ST", "PN"];

  if (dataSet) {
    for (const key in dataSet.elements) {
      if (Object.hasOwnProperty.call(dataSet.elements, key)) {
        const element = dataSet.elements[key];

        // Do something with the element
        if (element.dataOffset + element.length != dataSet.byteArray.length) {
          if (
            dataSet.byteArray[element.dataOffset + element.length - 1] === 0 &&
            vrsToBeProcessed.includes(element.vr!)
          ) {
            // @ts-ignore always string
            preProcessTag(metadata[key], dataSet, element);
          } else if (element.vr === "SQ") {
            if (element.items && element.items.length) {
              for (let i = 0; i < element.items.length; i++) {
                for (const subKey in element.items[i].dataSet!.elements) {
                  let subElement = element.items[i].dataSet!.elements[subKey]; //nested tags, check how they work
                  if (
                    dataSet.byteArray[
                    subElement.dataOffset + subElement.length - 1
                    ] === 0 &&
                    vrsToBeProcessed.includes(subElement.vr!)
                  ) {
                    preProcessTag(
                      // @ts-ignore always string
                      metadata[element.tag][i][subKey], //subMetaData
                      dataSet,
                      subElement
                    );
                  }
                }
              }
            }
          }
        }
      }
    }
  } else {
    logger.warn("DataSet is undefined");
  }
}

/**
 * changes all tags offsets accordingly
 * @function changeOffsets
 * @param {DataSet} dataSet - image dataset
 * @param {number} start -  start tag index to be modified
 * @param {number} end- end tag index to be modified
 * @param {tags}  sortedTags
 * @param {number}  shift - customized tags
 * @returns {void}
 */
function changeOffsets(
  dataSet: DataSet,
  start: number,
  end: number,
  sortedTags: tags,
  shift: number
) {
  for (let k: number = start; k < end; k++) {
    dataSet!.elements[Object.keys(sortedTags[k])[0]].dataOffset += shift;
    if (dataSet!.elements[Object.keys(sortedTags[k])[0]].vr === "SQ") {
      for (
        let i = 0;
        i < dataSet!.elements[Object.keys(sortedTags[k])[0]].items!.length;
        i++
      ) {
        for (const key in dataSet!.elements[Object.keys(sortedTags[k])[0]]
          .items![i].dataSet!.elements) {
          dataSet!.elements[Object.keys(sortedTags[k])[0]].items![
            i
          ].dataSet!.elements[key].dataOffset += shift;
        }
      }
    }
  }
}
