/** @module imaging/postProcessing/applyDSA
 *  @desc This file provides digital subtraction algorithm for XA images
 */

// external libraries
import { find } from "lodash";
import cornerstone, { Image } from "cornerstone-core";

// internal libraries
import { logger } from "../../logger";
import { DSA, Series } from "../types";
import { renderImage, redrawImage } from "../imageRendering";
import store from "../imageStore";

/*
 * This module provides the following functions to be exported:
 * applyDSA(multiframeSerie: Series, index: number): number[]
 * applyDSAShift(elementId: string, multiFrameSerie: Series, frameId: number, inputMaskSubPixelShift: number[]): void
 */

/**
 * Apply DSA to a multiframe serie
 * @function applyDSA
 * @param {Series} multiframeSerie - multiframe serie to apply DSA
 * @param {number} index - index of the frame to apply DSA
 * @param {number[]} inputMaskSubPixelShift - pixel shift applied to the mask
 * @returns {number[]} - pixel data of the frame after DSA
 */
export function applyDSA(
  multiframeSerie: Series,
  index: number,
  inputMaskSubPixelShift?: number[]
): number[] {
  const dsaMetadata = multiframeSerie.dsa as DSA;
  const imageIds: string[] = multiframeSerie.imageIds;

  // switch on DSA MaskOperation
  switch (
    dsaMetadata.x00286101 // DSA MaskOperation
  ) {
    case "AVG_SUB":
      return avgSubMask(dsaMetadata, imageIds, index, inputMaskSubPixelShift);
    case "TID":
      return tidMask(dsaMetadata, imageIds, index);
    case "REV_TID":
      return revTidMask(dsaMetadata, imageIds, index);
    default:
      return [];
  }
}

/**
 * Apply DSA with Pixel Shift and update the image
 * @function applyDSAShift
 * @param {string} elementId - elementId of the viewer
 * @param {Series} multiFrameSerie - multiframe serie to apply DSA
 * @param {number} frameId - index of the frame to apply DSA
 * @param {number[]} inputMaskSubPixelShift - pixel shift applied to the mask
 * @returns {void}
 */
export const applyDSAShift = function (
  elementId: string,
  multiFrameSerie: Series,
  frameId: number,
  inputMaskSubPixelShift: number[]
): void {
  if (multiFrameSerie.dsa === undefined) {
    logger.error("DSA imageIds not already loaded");
    return;
  }
  const t0 = performance.now();
  // set in store the mask subpixel shift
  store.setDSAPixelShift(elementId, inputMaskSubPixelShift);

  // uncache image from cornestone cache
  const imageId = multiFrameSerie.dsa.imageIds[frameId];
  try {
    cornerstone.imageCache.removeImageLoadObject(imageId);
  } catch (error) {
    logger.error(`Error removing image from cache: ${error}`);
  }
  // update image
  renderImage(multiFrameSerie, elementId, {
    cached: true,
    imageIndex: frameId
  });
  redrawImage(elementId);

  const t1 = performance.now();
  logger.debug(`Call to DSA applyDSAShift took ${t1 - t0} milliseconds.`);
};

/**
 * Compute the digital subtraction with avgSub mask
 * @function avgSubMask
 * @param {DSA} metadataInfo - DSA metadata
 * @param {string[]} imageIds - imageIds of the serie
 * @param {number} index - index of the frame to apply DSA
 * @returns {number[]} - pixel data of the frame after DSA
 */
function avgSubMask(
  metadataInfo: DSA,
  imageIds: string[],
  index: number,
  inputMaskSubPixelShift?: number[]
): number[] {
  const t0 = performance.now();
  // Mask Frame Numbers Attribute (might be an array) Required if AVGSUB
  const frameIndexNumber: number[] =
    typeof metadataInfo.x00286110 === "number"
      ? [metadataInfo.x00286110! - 1]
      : metadataInfo.x00286110!.map(num => num - 1);

  // get cached images from cornerstone cache
  const cachedImages = cornerstone.imageCache.cachedImages;

  // A pair of floating point numbers specifying the fractional vertical
  // [adjacent row spacing] and horizontal [adjacent column spacing] pixel
  // shift applied to the mask before subtracting it from the contrast frame.
  // The row offset results in a shift of the pixels along the column axis.
  // The column offset results in a shift of the pixels along the row axis.
  // A positive row offset is a shift toward the pixels of the lower row of the pixel plane.
  // A positive column offset is a shift toward the pixels of the left hand side column of the pixel plane.
  const maskSubPixelShift: number[] = inputMaskSubPixelShift
    ? inputMaskSubPixelShift
    : metadataInfo.x00286114 || [0.0, 0.0];

  // Specifies the number of contrast frames to average together
  // before performing the mask operation.
  // If the Attribute is missing, no averaging is performed.
  const contrastFrameAveragingAvg: number = metadataInfo.x00286112 || 1;

  // Each pair of numbers in this multi-valued Attribute specify a
  // beginning and ending frame number inclusive of a range where
  // this particular mask operation is valid.
  const frameRangeAvg: number[] = metadataInfo.x00286102 || [
    0,
    imageIds.length - 1 - contrastFrameAveragingAvg + 1
  ];

  let isFrameIncluded: boolean = false;
  for (let i: number = 0; i < frameRangeAvg.length; i += 2) {
    isFrameIncluded =
      index >= frameRangeAvg[i] && index <= frameRangeAvg[i + 1];
  }

  // source image where mask will be applied
  let srcImage: Image = find(cachedImages, {
    imageId: imageIds[index]
  }).image;

  // get pixel data from source image
  let contrastFrame: number[] = srcImage.getPixelData();
  if (isFrameIncluded) {
    let maskFramesAvg = frameIndexNumber.map((i: number) => {
      const imageId: string = imageIds[i];
      const image: Image = find(cachedImages, { imageId: imageId }).image;
      return image.getPixelData();
    });

    const resultFramesAvg: number[] = new Array(contrastFrame.length);

    const applyAverage: boolean =
      Array.isArray(maskFramesAvg) && maskFramesAvg.length > 1 ? true : false;

    if (applyAverage) {
      const valueAveraged: number[] = new Array(contrastFrame.length);
      for (let j: number = 0; j < contrastFrame.length; j++) {
        let valueAverage: number = 0;
        for (let i: number = 0; i < maskFramesAvg.length; i++) {
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
      logger.debug(`Call to DSA avgSubMask took ${t1 - t0} milliseconds.`);
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
    logger.debug(`Call to DSA avgSubMask took ${t1 - t0} milliseconds.`);
    logger.warn("Frame not included in the Applicable Frame Range");
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
function tidMask(
  metadataInfo: DSA,
  imageIds: string[],
  index: number
): number[] {
  const t0 = performance.now();

  // get cached images from cornerstone cache
  const cachedImages = cornerstone.imageCache.cachedImages;

  // TID Offset to be subtracted from the respective frame number.
  const TidOffset: number = metadataInfo.x00286120 || 1;

  // Applicable Frame Range
  const frameRangeTid: number[] = metadataInfo.x00286102 || [
    Math.abs(TidOffset) - 1,
    imageIds.length - Math.abs(TidOffset) - 1
  ];

  // Filter frames within the Applicable Frame Range
  let isFrameIncluded: boolean = false;
  for (let i: number = 0; i < frameRangeTid.length; i += 2) {
    isFrameIncluded =
      index >= frameRangeTid[i] && index <= frameRangeTid[i + 1];
  }

  // source image where mask will be applied
  let srcImage: Image = find(cachedImages, {
    imageId: imageIds[index]
  }).image;

  // get pixel data from source image
  let contrastFrame: number[] = srcImage.getPixelData();

  if (isFrameIncluded) {
    let maskImage: Image = find(cachedImages, {
      imageId: imageIds[index - TidOffset]
    }).image;
    let contrastMaskFrame: number[] = maskImage.getPixelData();
    // Apply Time Interval Differencing
    const resultFramesTid: number[] = new Array(contrastFrame.length);

    for (let i: number = 0; i < contrastFrame.length; i++) {
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
    logger.debug(`Call to DSA tidMask took ${t1 - t0} milliseconds.`);
    return resultFramesTid;
  } else {
    // @ts-ignore
    srcImage = null;

    let t1 = performance.now();
    logger.debug(`Call to DSA tidMask took ${t1 - t0} milliseconds.`);
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

function revTidMask(
  metadataInfo: DSA,
  imageIds: string[],
  index: number
): number[] {
  const t0 = performance.now();

  // get cached images from cornerstone cache
  const cachedImages = cornerstone.imageCache.cachedImages;

  // TID Offset to be subtracted from the first frame within the Applicable Frame Range,
  // TID Offset +2 from the second frame within the Applicable Frame Range,
  // TID Offset (0028,6120)+4 from the third frame and so on.
  const RevTidOffset: number = metadataInfo.x00286120 || 1;

  //Applicable Frame Range, shall be present in this case
  const frameRangeRevTid: number[] = metadataInfo.x00286102 || [
    Math.abs(RevTidOffset) - 1,
    imageIds.length - Math.abs(RevTidOffset) - 1
  ];

  // Filter frames within the Applicable Frame Range
  let isFrameIncluded: boolean = false;
  for (let i: number = 0; i < frameRangeRevTid.length; i += 2) {
    isFrameIncluded =
      index >= frameRangeRevTid[i] && index <= frameRangeRevTid[i + 1];
  }

  // source image where mask will be applied
  let srcImage: Image = find(cachedImages, {
    imageId: imageIds[index]
  }).image;

  // get pixel data from source image
  let contrastFrame: number[] = srcImage.getPixelData();

  if (isFrameIncluded) {
    let maskimage: Image = find(cachedImages, {
      imageId:
        imageIds[
          frameRangeRevTid[0] - RevTidOffset - index - frameRangeRevTid[0]
        ]
    }).image;
    let contrastMaskFrame: number[] = maskimage.getPixelData();
    // Apply Time Interval Differencing
    const resultFramesRevTid: number[] = new Array(contrastFrame.length);

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
    logger.debug(`Call to DSA revTidMask took ${t1 - t0} milliseconds.`);
    return resultFramesRevTid;
  } else {
    // @ts-ignore
    srcImage = null;

    let t1 = performance.now();
    logger.debug(`Call to DSA revTidMask took ${t1 - t0} milliseconds.`);
    return contrastFrame;
  }
}
