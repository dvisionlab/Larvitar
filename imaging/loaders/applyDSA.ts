import cornerstone from "cornerstone-core";
import { DSA } from "../types";
let averagedMaskFramesAvg: number[];
let resultFramesAvg: number[];
let maskFramesAvg: number[][];
let contrastFrameAveragingAvg: number;
let maskSubPixelShift: number;
let frameRangeAvg: number[];

let resultFramesTid: number[];
let TidOffset: number;
let contrastFrameAveragingTid: number;
let frameRangeTid: number[];

let resultFramesRevTid: number[];
let RevTidOffset: number;
let contrastFrameAveragingRevTid: number;
let frameRangeRevTid: number[];

export function applyDSA(metadataInfo: DSA, imageId: string, maskType: string) {
  if (maskType === "AVG_SUB") {
    const newPixelArray = avgSubMask(metadataInfo, imageId)!;
    return newPixelArray;
  } else if (maskType === "TID") {
    const newPixelArray = tidMask(metadataInfo, imageId)!;
    return newPixelArray;
  } else if (maskType === "REV_TID") {
    const newPixelArray = revTidMask(metadataInfo, imageId)!;
    return newPixelArray;
  }
}

function avgSubMask(metadataInfo: DSA, frameId: string) {
  let frameIndexNumber: number[] = []; // Mask Frame Numbers Attribute (might be an array)
  let frameIndex = metadataInfo.x00286110;
  let imageIds = metadataInfo.imageIds;
  if (typeof frameIndex === "number") {
    frameIndexNumber = [frameIndex];
  }
  const cachedImages = cornerstone.imageCache.cachedImages;
  const frameNumber = imageIds.length;
  maskSubPixelShift = maskSubPixelShift || metadataInfo.x00286114 || 0;
  contrastFrameAveragingAvg =
    contrastFrameAveragingAvg || metadataInfo.x00286112 || 1;
  frameRangeAvg = frameRangeAvg ||
    metadataInfo.x00286102 || [
      0,
      frameNumber - 1 - contrastFrameAveragingAvg + 1,
    ];

  let isFrameIncluded;
  for (let i = 0; i < frameRangeAvg.length / 2; i++) {
    isFrameIncluded =
      imageIds.includes(frameId) &&
      imageIds.indexOf(frameId) >= frameRangeAvg[i] &&
      imageIds.indexOf(frameId) <= frameRangeAvg[i + 1];
  }
  if (isFrameIncluded) {
    const t = performance.now();
    let image = cachedImages[imageIds.indexOf(frameId)].image;
    let contrastFrame = image.getPixelData();
    let len_pixeldata = contrastFrame.length;

    maskFramesAvg =
      maskFramesAvg ||
      frameIndexNumber.map((index: number) =>
        cachedImages[index].image.getPixelData()
      );

    resultFramesAvg = resultFramesAvg || new Float32Array(len_pixeldata);
    let average = false;

    if (Array.isArray(maskFramesAvg) && maskFramesAvg.length > 1) {
      average = true;
    }
    let shiftValue = maskSubPixelShift !== 0 ? maskSubPixelShift : 0;
    if (average) {
      averagedMaskFramesAvg =
        averagedMaskFramesAvg || new Float32Array(len_pixeldata);
      for (let j = 0; j < len_pixeldata; j++) {
        let value = contrastFrame[j];
        let valueAverage = 0;
        for (let i = 0; i < maskFramesAvg.length; i++) {
          valueAverage = valueAverage + maskFramesAvg[i][j];
        }
        averagedMaskFramesAvg[j] = valueAverage / maskFramesAvg.length;
        resultFramesAvg[j] = value - averagedMaskFramesAvg[j] + shiftValue;
      }
    } else {
      for (let j = 0; j < len_pixeldata; j++) {
        resultFramesAvg[j] =
          contrastFrame[j] - maskFramesAvg[0][j] + shiftValue;
      }
    }
    return resultFramesAvg;
  } else {
    return;
  }
}
function tidMask(metadataInfo: DSA, frameId: string) {
  // Check if Applicable Frame Range is present
  const imageIds = metadataInfo.imageIds;
  const frameNumber = imageIds.length;
  const cachedImages = cornerstone.imageCache.cachedImages;
  contrastFrameAveragingTid =
    contrastFrameAveragingTid || metadataInfo.x00286112 || 1;
  TidOffset = TidOffset || metadataInfo.x00286120 || 1;
  frameRangeTid = frameRangeTid ||
    metadataInfo.x00286102 || [
      Math.abs(TidOffset) - 1,
      frameNumber - Math.abs(TidOffset) - 1,
    ];
  // Filter frames within the Applicable Frame Range
  let isFrameIncluded;
  for (let i = 0; i < frameRangeTid.length / 2; i++) {
    isFrameIncluded =
      imageIds.includes(frameId) &&
      imageIds.indexOf(frameId) >= frameRangeTid[i] &&
      imageIds.indexOf(frameId) <= frameRangeTid[i + 1];
  }
  if (isFrameIncluded) {
    let image = cachedImages[imageIds.indexOf(frameId)].image;
    let contrastFrame = image.getPixelData();
    let maskimage = cachedImages[imageIds.indexOf(frameId) - TidOffset].image;
    let contrastMaskFrame = maskimage.getPixelData();
    let len_pixeldata = contrastFrame.length;
    // Apply Time Interval Differencing
    resultFramesTid = resultFramesTid || new Float32Array(len_pixeldata);

    for (let i = 0; i < len_pixeldata; i++) {
      resultFramesTid[i] = contrastFrame[i] - contrastMaskFrame[i];
    }
    return resultFramesTid;
  }
}

function revTidMask(metadataInfo: DSA, frameId: string) {
  const imageIds = metadataInfo.imageIds;
  const frameNumber = imageIds.length;
  const cachedImages = cornerstone.imageCache.cachedImages;
  contrastFrameAveragingRevTid =
    contrastFrameAveragingRevTid || metadataInfo.x00286112 || 1;
  RevTidOffset = metadataInfo.x00286120 || 1;
  frameRangeRevTid = frameRangeRevTid ||
    metadataInfo.x00286102 || [
      Math.abs(RevTidOffset) - 1,
      frameNumber - Math.abs(RevTidOffset) - 1,
    ];

  // Filter frames within the Applicable Frame Range
  let isFrameIncluded;
  for (let i = 0; i < frameRangeRevTid.length / 2; i++) {
    isFrameIncluded =
      imageIds.includes(frameId) &&
      imageIds.indexOf(frameId) >= frameRangeRevTid[i] &&
      imageIds.indexOf(frameId) <= frameRangeRevTid[i + 1];
  }

  if (isFrameIncluded) {
    let image = cachedImages[imageIds.indexOf(frameId)].image;
    let contrastFrame = image.getPixelData();
    let maskimage =
      cachedImages[
        frameRangeRevTid[0] -
          RevTidOffset -
          imageIds.indexOf(frameId) -
          frameRangeRevTid[0]
      ].image;
    let contrastMaskFrame = maskimage.getPixelData();
    let len_pixeldata = contrastFrame.length;
    // Apply Time Interval Differencing
    resultFramesRevTid = resultFramesRevTid || new Float32Array(len_pixeldata);

    for (let i = 0; i < len_pixeldata; i++) {
      resultFramesRevTid[i] = contrastFrame[i] - contrastMaskFrame[i];
    }
  }
}

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
