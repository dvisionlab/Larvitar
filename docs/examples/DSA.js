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
  const frameNumber=multiFrameSerie.imageIds.length
  console.log(frameNumber)
  const metadata_info=multiFrameSerie.metadata[tag];
  const mask_type=metadata_info["0"].x00286101;
  let frame_index_number=metadata_info["0"].x00286110;//might be an array
  const frames_array=[];
  if((typeof frame_index_number)==="number")
  {
  frames_array.push(multiFrameSerie.imageIds[frame_index_number])
  frame_index_number=[frame_index_number]
  }
else if (Array.isArray(frame_index_number))
{
  for(let i=0;i<frame_index_number.length;i++)
  {
    frames_array.push(multiFrameSerie.imageIds[frame_index_number[i]])
  }
  //iterate through frames with that index 
}
console.log(frames_array)
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
     const maskFrameNumbers = frame_index_number; // Mask Frame Numbers multiFrameSerie.metadata.x00286110
     console.log(frame_index_number)

     let maskSubPixelShift = 0;      // Mask Sub-pixel Shift
     if(metadata_info["0"].x00286114!=undefined)
     {
      maskSubPixelShift=metadata_info["0"].x00286114;
     }

     let contrastFrameAveraging; // Contrast Frame Averaging 
     if (metadata_info["0"].x00286112!=undefined)
     {
       contrastFrameAveraging=metadata_info["0"].x00286112;
     }
     console.log(contrastFrameAveraging);

     let frameRange; // Applicable Frame Range
     if (metadata_info["0"].x00286102!=undefined)
     {
      frameRange=metadata_info["0"].x00286102;
     }
     if(metadata_info["0"].x00286102===undefined&&contrastFrameAveraging!=undefined)
     {
      frameRange=[0,frameNumber-1-contrastFrameAveraging+1]
     }  

    // Get pixel data from the multiframe dataset
    for(let i=0;i<frameNumber;i++)
    {
    let frameimage=//knowing imageId extract image 
    let pixelData = frameimage.getPixelData();
    console.log(pixelData);

    // Determine frames for processing
    const startFrame = frameRange[0] || 0;
    const endFrame = frameRange[1] || pixelData.length;
    const effectiveEndFrame = endFrame - contrastFrameAveraging + 1;
    
    // Extract frames pixel data for processing
    const contrastFrames = Array.from(pixelData.slice(startFrame, effectiveEndFrame));
    console.log(contrastFrames)
    //create array of arrays where each member is a pixel array of a frame 
    const maskFrames = //array of pixeldata of frames in frame_index_number 
    // Perform frame averaging for mask
    const averagedMaskFrames = maskFrames.reduce((acc, frame) => acc.map((value, i) => value + frame[i]), new Array(pixelData[0].length).fill(0));
    averagedMaskFrames.forEach((value, i, arr) => (arr[i] /= maskFrames.length));
    
    // Apply sub-pixel shift
    const shiftedMaskFrames = new Array(averagedMaskFrames.length);
    for (let i = 0; i < averagedMaskFrames.length; i++) {
      shiftedMaskFrames[(i + maskSubPixelShift) % averagedMaskFrames.length] = averagedMaskFrames[i];
    }
    console.log(averagedMaskFrames)
    console.log(shiftedMaskFrames)
    console.log(contrastFrames)
    // Apply mask subtraction
    const resultFrames = contrastFrames.map((contrastFrame, i) => contrastFrame.map((value, j) => value - shiftedMaskFrames[j]));
    
    // Update with the result frames
  }
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