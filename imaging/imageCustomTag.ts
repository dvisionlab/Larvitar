// internal libraries

import { ByteArray } from "dicom-parser";
import { MetaData, Series } from "./types";

/**
 * called when metadata are modified with custom values
 * @function customizeByteArray
 * @param {Series} series - series to customize
 * @param {MetaData} customTags - customized tags
 * @returns {Series} anonymized series
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
      let shiftTotal = 0;
      let shift = 0;
      //all tags sorted by their offset from min to max
      const sortedTags = Object.values(image.dataSet.elements)
        .sort((a, b) => a.dataOffset - b.dataOffset)
        .map(element => ({ [element.tag]: element }));
      //custom tags sorted by their offset from min to max
      const sortedCustomTags = Object.entries(customTags)
        .map(([tag, shift]) => {
          shiftTotal += shift - image.dataSet!.elements[tag].length;
          return {
            tag,
            // @ts-ignore always string
            value: customTags[tag],
            offset: image.dataSet!.elements[tag].dataOffset,
            index: sortedTags.findIndex(obj => obj.tag.tag === tag)
          };
        })
        .sort((a, b) => a.offset - b.offset);

      for (let i = 0; i < sortedCustomTags.length; i++) {
        let tag = sortedCustomTags[i].tag;

        let element = image.dataSet.elements[tag];
        let newByteArray: ByteArray = new Uint8Array(
          image.dataSet.byteArray.length + shiftTotal
        );
        const vr = element.vr;
        if (vr) {
          //shift byteArray elements given shifts for every customtag value changed
          if (sortedCustomTags[i].value !== undefined) {
            if (sortedCustomTags[i].value.length != element.length) {
              shift = shift + sortedCustomTags[i].value.length - element.length;
            }

            const startCustomTag = element.dataOffset + shift;
            const endCustomTag =
              i === sortedCustomTags.length - 1
                ? newByteArray.length
                : sortedCustomTags[i + 1].offset + shift;

            for (let j: number = startCustomTag; j < endCustomTag; j++) {
              if (
                j <
                element.dataOffset + shift + sortedCustomTags[i].value.length
              ) {
                const char =
                  sortedCustomTags[i].value.length > j
                    ? sortedCustomTags[i].value.charCodeAt(j)
                    : 32;
                newByteArray[j] = char;
              } else {
                newByteArray[j] = image.dataSet.byteArray[j - shift];
              }
            }
            image.dataSet.byteArray = newByteArray as ByteArray;
          }
          // @ts-ignore always string
          image.metadata[tag] = newText;
          element.dataOffset += shift;
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

//FIND THE MINIMUM OFFSET IN CUSTOMTAGS SO THAT WE KNOW WHERE TO START SHIFTING
//EVALUATE THE SHIFTS IN EACH SECTION OF THE BYTE ARRAY:
//WE HAVE CHANGED ELEMENTS WITH OFFSET 10 AND 20
//EX. IF ELEMENT WITH OFFSET 10 HAS NEW LENGTH OF 3 INSTEAD OF 5 SHIFT ALL ELEMENTS FROM 10 TO TO 20 BACK OF 2
//IF ELEMENT WITH OFFSET 20 HAS NOW LENGTH OF 10 INSTEAD OF 5 NOW SHIFT ELEMENTS AFTER THIS OF INDEX -2+5=+3 AND SO ON
//UPDATE EACH ELEMENTS LENGTH AND OFFSET SUBSEQUENTLY
