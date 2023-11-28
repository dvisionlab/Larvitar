/*
 * This module provides the following functions to be exported:
 * parseECG(dataSet, tag, nSampling)
 */

/**
 * Generate an array of points representing the ECG signal
 */
function apply_DSA_Mask(
  seriesId,
  multiFrameSerie,
  tag,
) {
  const metadata_info=multiFrameSerie.metadata[tag];
  const mask_type=metadata_info["0"].x00286101;
  const frame_index_number=metadata_info["0"].x00286110;//might be an array
  const frames_array=[];
  if((typeof frame_index_number)==="number")
  {
  frames_array.push(multiFrameSerie.instances["multiFrameLoader://0?frame="+(frame_index_number-1)])
  }
else if (Array.isArray(frame_index_number))
{
  for(let i=0;i<frame_index_number.length;i++)
  {
    frames_array.push(multiFrameSerie.instances["multiFrameLoader://0?frame="+(frame_index_number[i]-1)])
  }
  //iterate through frames with that index 
}

  if(mask_type==="NONE")
  {
    return;
  }
  else if (mask_type==="AVG_SUB")
  {
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

    // Example metadata
     const maskFrameNumbers = [1, 2, 3]; // Mask Frame Numbers multiFrameSerie.metadata.x00286110
     const maskSubPixelShift = 2; // Mask Sub-pixel Shift multiFrameSerie.metadata.x00286114
     const frameRange = [0, 99]; // Applicable Frame Range multiFrameSerie.metadata.x00286102
     const contrastFrameAveraging = 5; // Contrast Frame Averaging multiFrameSerie.metadata.x00286112
     const pixelDataOffset=16508;
     const pixelDataLength=10318648;
    // Get pixel data from the multiframe dataset
    const pixelDataByteArray = multiFrameSerie.dataSet.byteArray.slice(pixelDataOffset, pixelDataOffset + pixelDataLength);
    const pixelData = Array.from(pixelDataByteArray);
     console.log(pixelData);

    // Determine frames for processing
     const startFrame = frameRange[0] || 0;
     const endFrame = frameRange[1] || pixelData.length;
     const effectiveEndFrame = endFrame - contrastFrameAveraging + 1;

    // Extract frames for processing
     const contrastFrames = pixelData.slice(startFrame, effectiveEndFrame);
     console.log(contrastFrames)
     const maskFrames = maskFrameNumbers.map(frameNumber => pixelData[frameNumber - 1]); // Adjust frame numbers to 0-based index

    // Perform frame averaging for mask
     const averagedMaskFrames = maskFrames.reduce((acc, frame) => acc.map((value, i) => value + frame[i]), new Array(pixelData[0].length).fill(0));
     averagedMaskFrames.forEach((value, i, arr) => (arr[i] /= maskFrames.length));

    // Apply sub-pixel shift
     const shiftedMaskFrames = new Array(averagedMaskFrames.length);
     for (let i = 0; i < averagedMaskFrames.length; i++) {
        shiftedMaskFrames[(i + maskSubPixelShift) % averagedMaskFrames.length] = averagedMaskFrames[i];
        }

    // Apply mask subtraction
     const resultFrames = contrastFrames.map((contrastFrame, i) => contrastFrame.map((value, j) => value - shiftedMaskFrames[j]));

    // Update with the result frames

  }
  else if(mask_type==="TID")
  {
    /*(Time Interval Differencing) 
    The mask for each frame within the Applicable Frame Range (0028,6102)
    is selected by subtracting TID Offset (0028,6120) from the respective 
    frame number. 
    If the Applicable Frame Range is not present in this Sequence Item, 
    the Applicable Frame Range is assumed to be a range where TID offset subtracted 
    from any frame number with the range results in a valid frame number within 
    the Multi-frame image.*/
  }
  else if(mask_type==="REV_TID")
  {
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
  }
  
}
