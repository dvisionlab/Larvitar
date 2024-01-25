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
    // case "TID":
    //   return tidMask(dsaMetadata, index);
    // case "REV_TID":
    //   return revTidMask(dsaMetadata, index);
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

// function tidMask(metadataInfo: DSA, index: number) {
//   // Check if Applicable Frame Range is present
//   const imageIds = metadataInfo.imageIds;
//   const frameNumber = imageIds.length;
//   const cachedImages = cornerstone.imageCache.cachedImages;
//   contrastFrameAveragingTid =
//     contrastFrameAveragingTid || metadataInfo.x00286112 || 1;
//   TidOffset = TidOffset || metadataInfo.x00286120 || 1;
//   frameRangeTid = frameRangeTid ||
//     metadataInfo.x00286102 || [
//       Math.abs(TidOffset) - 1,
//       frameNumber - Math.abs(TidOffset) - 1
//     ];
//   // Filter frames within the Applicable Frame Range
//   let isFrameIncluded;
//   for (let i = 0; i < frameRangeTid.length / 2; i++) {
//     isFrameIncluded =
//       imageIds.includes(frameId) &&
//       imageIds.indexOf(frameId) >= frameRangeTid[i] &&
//       imageIds.indexOf(frameId) <= frameRangeTid[i + 1];
//   }
//   if (isFrameIncluded) {
//     let image = cachedImages[imageIds.indexOf(frameId)].image;
//     let contrastFrame = image.getPixelData();
//     let maskimage = cachedImages[imageIds.indexOf(frameId) - TidOffset].image;
//     let contrastMaskFrame = maskimage.getPixelData();
//     let len_pixeldata = contrastFrame.length;
//     // Apply Time Interval Differencing
//     resultFramesTid = resultFramesTid || new Float32Array(len_pixeldata);

//     for (let i = 0; i < len_pixeldata; i++) {
//       resultFramesTid[i] = contrastFrame[i] - contrastMaskFrame[i];
//     }
//     return resultFramesTid;
//   }
// }

// function revTidMask(metadataInfo: DSA, index: number) {
//   const imageIds = metadataInfo.imageIds;
//   const frameNumber = imageIds.length;
//   const cachedImages = cornerstone.imageCache.cachedImages;
//   contrastFrameAveragingRevTid =
//     contrastFrameAveragingRevTid || metadataInfo.x00286112 || 1;
//   RevTidOffset = metadataInfo.x00286120 || 1;
//   frameRangeRevTid = frameRangeRevTid ||
//     metadataInfo.x00286102 || [
//       Math.abs(RevTidOffset) - 1,
//       frameNumber - Math.abs(RevTidOffset) - 1
//     ];

//   // Filter frames within the Applicable Frame Range
//   let isFrameIncluded;
//   for (let i = 0; i < frameRangeRevTid.length / 2; i++) {
//     isFrameIncluded =
//       imageIds.includes(frameId) &&
//       imageIds.indexOf(frameId) >= frameRangeRevTid[i] &&
//       imageIds.indexOf(frameId) <= frameRangeRevTid[i + 1];
//   }

//   if (isFrameIncluded) {
//     let image = cachedImages[imageIds.indexOf(frameId)].image;
//     let contrastFrame = image.getPixelData();
//     let maskimage =
//       cachedImages[
//         frameRangeRevTid[0] -
//           RevTidOffset -
//           imageIds.indexOf(frameId) -
//           frameRangeRevTid[0]
//       ].image;
//     let contrastMaskFrame = maskimage.getPixelData();
//     let len_pixeldata = contrastFrame.length;
//     // Apply Time Interval Differencing
//     resultFramesRevTid = resultFramesRevTid || new Float32Array(len_pixeldata);

//     for (let i = 0; i < len_pixeldata; i++) {
//       resultFramesRevTid[i] = contrastFrame[i] - contrastMaskFrame[i];
//     }
//   }
// }

//x00286100:Defines a Sequence that describes mask subtraction operations for a Multi-frame Image.
//SUBITEMS x00286101:Defined Term identifying the type of mask operation to be performed.
//& x00286110 Specifies the frame numbers of the pixel data used to generate this mask.
//Frames in a Multi-frame Image are specified by sequentially increasing number values beginning with 1.
//Required if Mask Operation x00286101 is AVG_SUB.

/*(Average Subtraction) 
     The frames specified by the Mask Frame Numbers x00286110 are averaged together, 
     shifted by the amount specified in the Mask Sub-pixel Shift x00286114, 
     then subtracted from the contrast frames in the range specified in the Applicable 
     Frame Range x00286102. 
     Contrast Frame Averaging x00286112 number of frames starting with the current 
     frame are averaged together before the subtraction. 
     If the Applicable Frame Range is not present in this Sequence Item, the Applicable 
     Frame Range is assumed to end at the last frame number of the image minus Contrast 
     Frame Averaging x00286112 plus one;
     */

/*(Time Interval Differencing) 
    The mask for each frame within the Applicable Frame Range (0028,6102)
    is selected by subtracting TID Offset (0028,6120) from the respective 
    frame number. 
    If the Applicable Frame Range is not present in this Sequence Item, 
    the Applicable Frame Range is assumed to be a range where TID offset subtracted 
    from any frame number with the range results in a valid frame number within 
    the Multi-frame image.*/

/*(Reversed Time Interval Differencing) 
    The number of the mask frame for each contrast frame within 
    the Applicable Frame Range (0028,6102) is calculated by subtracting TID Offset (0028,6120) 
    from the first frame within the Applicable Frame Range, TID Offset (0028,6120) 
    +2 from the second frame within the Applicable Frame Range, TID Offset (0028,6120)
    +4 from the third frame and so on. 
    The Applicable Frame Range (0028,6102) shall be present.
    When multiple pairs of frame numbers are specified in the Applicable Frame Range Attribute,
    the beginning frame numbers (i.e., the first frame number in each pair)
    shall be in increasing order.
    Algorithm to calculate the Mask Frame Number: see dicom site*/
