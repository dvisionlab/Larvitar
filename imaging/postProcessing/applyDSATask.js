/** @module imaging/postProcessing/applyDSA
 *  @desc This file provides digital subtraction algorithm for XA images
 */

// external libraries
import cornerstone from "cornerstone-core";
import { find } from "lodash";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
console.log(cornerstoneDICOMImageLoader);
// internal libraries

import {
  getLarvitarImageTracker,
  getLarvitarManager
} from "../loaders/commonLoader";

/*
 * This module provides the following functions to be exported:
 * applyDSA(multiframeSerie: Series, index: number): number[]
 */

let applyDSAConfig;

function initialize(config) {
  console.log("APPLY DSA TASK:", config);
  applyDSAConfig = config;
}
/**
 * Apply DSA to a multiframe serie
 * @function handler
 * @param {Series} multiframeSerie - multiframe serie to apply DSA
 * @param {number} index - index of the frame to apply DSA
 * @param {number[]} inputMaskSubPixelShift - pixel shift applied to the mask
 * @returns {number[]} - pixel data of the frame after DSA
 */
function handler(data, doneCallback) {
  const imageId = data.data.imageId;
  let parsedImageId = cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId);
  let rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
  let imageTracker = getLarvitarImageTracker();
  let seriesId = imageTracker[rootImageId];
  let manager = getLarvitarManager();

  const multiframeSerie = manager[seriesId];

  const index = data.data.index;
  const inputMaskSubPixelShift = data.data.inputMaskSubPixelShift;
  const dsaMetadata = multiframeSerie.dsa;
  const imageIds = multiframeSerie.imageIds;

  // switch on DSA MaskOperation
  switch (
    dsaMetadata.x00286101 // DSA MaskOperation
  ) {
    case "AVG_SUB":
      const resultAvg = avgSubMask(
        dsaMetadata,
        imageIds,
        index,
        inputMaskSubPixelShift
      );
      return {
        result: {
          pixelData: new Float32Array(resultAvg).buffer
        },
        transferList: [new Float32Array(resultAvg).buffer]
      };
    case "TID":
      const resultTid = tidMask(dsaMetadata, imageIds, index);
      return {
        result: {
          pixelData: new Float32Array(resultTid).buffer
        },
        transferList: [new Float32Array(resultTid).buffer]
      };
    case "REV_TID":
      const resultRevTid = revTidMask(dsaMetadata, imageIds, index);
      return {
        result: {
          pixelData: new Float32Array(resultRevTid).buffer
        },
        transferList: [new Float32Array(resultRevTid).buffer]
      };

    default:
      return [];
  }
}
/**
 * Compute the digital subtraction with avgSub mask
 * @function avgSubMask
 * @param {DSA} metadataInfo - DSA metadata
 * @param {string[]} imageIds - imageIds of the serie
 * @param {number} index - index of the frame to apply DSA
 * @returns {number[]} - pixel data of the frame after DSA
 */
function avgSubMask(metadataInfo, imageIds, index, inputMaskSubPixelShift) {
  const t0 = performance.now();
  // Mask Frame Numbers Attribute (might be an array) Required if AVGSUB
  const frameIndexNumber =
    typeof metadataInfo.x00286110 === "number"
      ? [metadataInfo.x00286110]
      : metadataInfo.x00286110;

  // get cached images from cornerstone cache
  const cachedImages = cornerstone.imageCache.cachedImages;

  // A pair of floating point numbers specifying the fractional vertical
  // [adjacent row spacing] and horizontal [adjacent column spacing] pixel
  // shift applied to the mask before subtracting it from the contrast frame.
  // The row offset results in a shift of the pixels along the column axis.
  // The column offset results in a shift of the pixels along the row axis.
  // A positive row offset is a shift toward the pixels of the lower row of the pixel plane.
  // A positive column offset is a shift toward the pixels of the left hand side column of the pixel plane.
  const maskSubPixelShift = inputMaskSubPixelShift
    ? inputMaskSubPixelShift
    : metadataInfo.x00286114 || [0.0, 0.0];

  // Specifies the number of contrast frames to average together
  // before performing the mask operation.
  // If the Attribute is missing, no averaging is performed.
  const contrastFrameAveragingAvg = metadataInfo.x00286112 || 1;

  // Each pair of numbers in this multi-valued Attribute specify a
  // beginning and ending frame number inclusive of a range where
  // this particular mask operation is valid.
  const frameRangeAvg = metadataInfo.x00286102 || [
    0,
    imageIds.length - 1 - contrastFrameAveragingAvg + 1
  ];

  let isFrameIncluded = false;
  for (let i = 0; i < frameRangeAvg.length; i += 2) {
    isFrameIncluded =
      index >= frameRangeAvg[i] && index <= frameRangeAvg[i + 1];
  }

  // source image where mask will be applied
  let srcImage = find(cachedImages, {
    imageId: imageIds[index]
  }).image;

  // get pixel data from source image
  let contrastFrame = srcImage.getPixelData();
  if (isFrameIncluded) {
    let maskFramesAvg = frameIndexNumber.map(i => {
      const imageId = imageIds[i];
      const image = find(cachedImages, { imageId: imageId }).image;
      return image.getPixelData();
    });

    const resultFramesAvg = new Array(contrastFrame.length);

    const applyAverage =
      Array.isArray(maskFramesAvg) && maskFramesAvg.length > 1 ? true : false;

    if (applyAverage) {
      const valueAveraged = new Array(contrastFrame.length);
      for (let j = 0; j < contrastFrame.length; j++) {
        let valueAverage = 0;
        for (let i = 0; i < maskFramesAvg.length; i++) {
          valueAverage = valueAverage + maskFramesAvg[i][j];
        }
        valueAveraged[j] = valueAverage / maskFramesAvg.length;
      }
      // Extract fractional vertical and horizontal pixel shifts from maskSubPixelShift
      const rowOffset = -1.0 * maskSubPixelShift[0];
      const colOffset = maskSubPixelShift[1];
      for (let j = 0; j < contrastFrame.length; j++) {
        // Apply sub-pixel shift to the averaged frame
        if (colOffset !== 0 || rowOffset !== 0) {
          let rowNumber = Math.floor(j / srcImage.columns) + 1;
          if (
            colOffset + j >= rowNumber * srcImage.columns ||
            colOffset + j < 0 ||
            rowOffset * srcImage.columns + j >= contrastFrame.length ||
            rowOffset * srcImage.columns + j < 0 ||
            rowOffset * srcImage.columns + colOffset + j >=
              contrastFrame.length ||
            rowOffset * srcImage.columns + colOffset + j < 0
          ) {
            resultFramesAvg[j] = contrastFrame[j];
          } else {
            const shiftedj = j + colOffset + rowOffset * srcImage.columns;
            resultFramesAvg[j] = contrastFrame[j] - valueAveraged[shiftedj];
          }
        } else {
          resultFramesAvg[j] = contrastFrame[j] - valueAveraged[j];
        }
      }
    } else {
      const rowOffset = -1.0 * maskSubPixelShift[0];
      const colOffset = maskSubPixelShift[1];
      for (let j = 0; j < contrastFrame.length; j++) {
        // Apply sub-pixel shift to the averaged frame
        if (colOffset !== 0 || rowOffset !== 0) {
          let rowNumber = Math.floor(j / srcImage.columns) + 1;
          if (
            colOffset + j >= rowNumber * srcImage.columns ||
            colOffset + j < 0 ||
            rowOffset * srcImage.columns + j >= contrastFrame.length ||
            rowOffset * srcImage.columns + j < 0 ||
            rowOffset * srcImage.columns + colOffset + j >=
              contrastFrame.length ||
            rowOffset * srcImage.columns + colOffset + j < 0
          ) {
            resultFramesAvg[j] = contrastFrame[j];
          } else {
            const shiftedj = j + colOffset + rowOffset * srcImage.columns;
            resultFramesAvg[j] = contrastFrame[j] - maskFramesAvg[0][shiftedj];
          }
        } else {
          resultFramesAvg[j] = contrastFrame[j] - maskFramesAvg[0][j];
        }
      }
      let t1 = performance.now();
      console.debug(`Call to DSA avgSubMask took ${t1 - t0} milliseconds.`);
    }
    // @ts-ignore
    srcImage = null;
    // @ts-ignore
    contrastFrame = null;
    // @ts-ignore
    maskFramesAvg = null;

    return resultFramesAvg;
  } else {
    // @ts-ignore
    srcImage = null;
    let t1 = performance.now();
    console.debug(`Call to DSA avgSubMask took ${t1 - t0} milliseconds.`);
    console.warn("Frame not included in the Applicable Frame Range");
    return contrastFrame;
  }
}

/**
 * Compute the digital subtraction with tid mask
 * @function tidMask
 * @param {DSA} metadataInfo - DSA metadata
 * @param {string[]} imageIds - imageIds of the serie
 * @param {number} index - index of the frame to apply DSA
 * @returns {number[]} - pixel data of the frame after DSA
 */
function tidMask(metadataInfo, imageIds, index) {
  const t0 = performance.now();

  // get cached images from cornerstone cache
  const cachedImages = cornerstone.imageCache.cachedImages;

  // TID Offset to be subtracted from the respective frame number.
  const TidOffset = metadataInfo.x00286120 || 1;

  // Applicable Frame Range
  const frameRangeTid = metadataInfo.x00286102 || [
    Math.abs(TidOffset) - 1,
    imageIds.length - Math.abs(TidOffset) - 1
  ];

  // Filter frames within the Applicable Frame Range
  let isFrameIncluded = false;
  for (let i = 0; i < frameRangeTid.length; i += 2) {
    isFrameIncluded =
      index >= frameRangeTid[i] && index <= frameRangeTid[i + 1];
  }

  // source image where mask will be applied
  let srcImage = find(cachedImages, {
    imageId: imageIds[index]
  }).image;

  // get pixel data from source image
  let contrastFrame = srcImage.getPixelData();

  if (isFrameIncluded) {
    let maskImage = find(cachedImages, {
      imageId: imageIds[index - TidOffset]
    }).image;
    let contrastMaskFrame = maskImage.getPixelData();
    // Apply Time Interval Differencing
    const resultFramesTid = new Array(contrastFrame.length);

    for (let i = 0; i < contrastFrame.length; i++) {
      resultFramesTid[i] = contrastFrame[i] - contrastMaskFrame[i];
    }

    // @ts-ignore
    srcImage = null;
    // @ts-ignore
    contrastFrame = null;
    // @ts-ignore
    maskImage = null;
    // @ts-ignore
    contrastMaskFrame = null;

    let t1 = performance.now();
    console.debug(`Call to DSA tidMask took ${t1 - t0} milliseconds.`);
    return resultFramesTid;
  } else {
    // @ts-ignore
    srcImage = null;

    let t1 = performance.now();
    console.debug(`Call to DSA tidMask took ${t1 - t0} milliseconds.`);
    return contrastFrame;
  }
}

/**
 * Compute the digital subtraction with revTid mask
 * @function revTidMask
 * @param {DSA} metadataInfo - DSA metadata
 * @param {string[]} imageIds - imageIds of the serie
 * @param {number} index - index of the frame to apply DSA
 * @returns {number[]} - pixel data of the frame after DSA
 */

function revTidMask(metadataInfo, imageIds, index) {
  const t0 = performance.now();

  // get cached images from cornerstone cache
  const cachedImages = cornerstone.imageCache.cachedImages;

  // TID Offset to be subtracted from the first frame within the Applicable Frame Range,
  // TID Offset +2 from the second frame within the Applicable Frame Range,
  // TID Offset (0028,6120)+4 from the third frame and so on.
  const RevTidOffset = metadataInfo.x00286120 || 1;

  //Applicable Frame Range, shall be present in this case
  const frameRangeRevTid = metadataInfo.x00286102 || [
    Math.abs(RevTidOffset) - 1,
    imageIds.length - Math.abs(RevTidOffset) - 1
  ];

  // Filter frames within the Applicable Frame Range
  let isFrameIncluded = false;
  for (let i = 0; i < frameRangeRevTid.length; i += 2) {
    isFrameIncluded =
      index >= frameRangeRevTid[i] && index <= frameRangeRevTid[i + 1];
  }

  // source image where mask will be applied
  let srcImage = find(cachedImages, {
    imageId: imageIds[index]
  }).image;

  // get pixel data from source image
  let contrastFrame = srcImage.getPixelData();

  if (isFrameIncluded) {
    let maskimage = find(cachedImages, {
      imageId:
        imageIds[
          frameRangeRevTid[0] - RevTidOffset - index - frameRangeRevTid[0]
        ]
    }).image;
    let contrastMaskFrame = maskimage.getPixelData();
    // Apply Time Interval Differencing
    const resultFramesRevTid = new Array(contrastFrame.length);

    for (let i = 0; i < contrastFrame.length; i++) {
      resultFramesRevTid[i] = contrastFrame[i] - contrastMaskFrame[i];
    }
    // @ts-ignore
    srcImage = null;
    // @ts-ignore
    contrastFrame = null;
    // @ts-ignore
    maskImage = null;
    // @ts-ignore
    contrastMaskFrame = null;

    let t1 = performance.now();
    console.debug(`Call to DSA revTidMask took ${t1 - t0} milliseconds.`);
    return resultFramesRevTid;
  } else {
    // @ts-ignore
    srcImage = null;

    let t1 = performance.now();
    console.debug(`Call to DSA revTidMask took ${t1 - t0} milliseconds.`);
    return contrastFrame;
  }
}

// register webworker to receive messages

export default {
  taskType: "applyDSATask",
  handler,
  initialize
};
