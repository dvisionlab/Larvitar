import cornerstone, { Image } from "cornerstone-core";
import { DSA, Series } from "../types";
import { find } from "lodash";

export function applyDSA(multiframeSerie: Series, index: number) {
  const dsaMetadata = multiframeSerie.dsa as DSA;
  const imageIds = multiframeSerie.imageIds;
  switch (
    dsaMetadata.x00286101 // DSA MaskOperation
  ) {
    case "AVG_SUB":
      return avgSubMask(dsaMetadata, imageIds, index);
    case "TID":
      return tidMask(dsaMetadata, imageIds, index);
    case "REV_TID":
      return revTidMask(dsaMetadata, imageIds, index);
  }
}

function avgSubMask(metadataInfo: DSA, imageIds: string[], index: number) {
  const t0 = performance.now();
  // Mask Frame Numbers Attribute (might be an array) Required if AVGSUB
  const frameIndexNumber: number[] =
    typeof metadataInfo.x00286110 === "number"
      ? [metadataInfo.x00286110!]
      : metadataInfo.x00286110!;

  // get cached images from cornerstone cache
  const cachedImages = cornerstone.imageCache.cachedImages;

  // A pair of floating point numbers specifying the fractional vertical
  // [adjacent row spacing] and horizontal [adjacent column spacing] pixel
  // shift applied to the mask before subtracting it from the contrast frame.
  const maskSubPixelShift = metadataInfo.x00286114 || 0;

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
  const srcImage: Image = find(cachedImages, {
    imageId: imageIds[index]
  }).image;

  if (isFrameIncluded) {
    // get pixel data from source image
    const contrastFrame: number[] = srcImage.getPixelData();

    const maskFramesAvg = frameIndexNumber.map((i: number) => {
      const imageId: string = imageIds[i];
      const image: Image = find(cachedImages, { imageId: imageId }).image;
      return image.getPixelData();
    });

    const resultFramesAvg: number[] = new Array(contrastFrame.length);

    const applyAverage: boolean =
      Array.isArray(maskFramesAvg) && maskFramesAvg.length > 1 ? true : false;

    if (applyAverage) {
      for (let j: number = 0; j < contrastFrame.length; j++) {
        let valueAverage: number = 0;
        for (let i: number = 0; i < maskFramesAvg.length; i++) {
          valueAverage = valueAverage + maskFramesAvg[i][j];
        }
        resultFramesAvg[j] =
          contrastFrame[j] -
          valueAverage / maskFramesAvg.length +
          maskSubPixelShift;
      }
    } else {
      for (let j: number = 0; j < contrastFrame.length; j++) {
        resultFramesAvg[j] =
          contrastFrame[j] - maskFramesAvg[0][j] + maskSubPixelShift;
      }
      let t1 = performance.now();
      console.log(`Call to DSA avgSubMask took ${t1 - t0} milliseconds.`);

      // TODO SET TO NULL SOME VARIABLES TO FREE MEMORY
      // SM

      return resultFramesAvg;
    }
  }
}

function tidMask(metadataInfo: DSA, imageIds: string[], index: number) {
  // Check if Applicable Frame Range is present

  const cachedImages = cornerstone.imageCache.cachedImages;
  //TID Offset to be subtracted from the respective frame number.
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
  const srcImage: Image = find(cachedImages, {
    imageId: imageIds[index]
  }).image;
  if (isFrameIncluded) {
    // get pixel data from source image
    const contrastFrame: number[] = srcImage.getPixelData();
    let maskImage: Image = find(cachedImages, {
      imageId: imageIds[index - TidOffset]
    }).image;
    let contrastMaskFrame: number[] = maskImage.getPixelData();
    // Apply Time Interval Differencing
    const resultFramesTid: number[] = new Array(contrastFrame.length);

    for (let i = 0; i < contrastFrame.length; i++) {
      resultFramesTid[i] = contrastFrame[i] - contrastMaskFrame[i];
    }
    return resultFramesTid;
  }
}

function revTidMask(metadataInfo: DSA, imageIds: string[], index: number) {
  const cachedImages = cornerstone.imageCache.cachedImages;

  //TID Offset to be subtracted from the first frame within the Applicable Frame Range,
  //TID Offset +2 from the second frame within the Applicable Frame Range,
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

  const srcImage: Image = find(cachedImages, {
    imageId: imageIds[index]
  }).image;
  if (isFrameIncluded) {
    // get pixel data from source image
    const contrastFrame: number[] = srcImage.getPixelData();
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
  }
}
