/*
 * This module provides the following functions to be exported:
 * parseECG(dataSet, tag, nSampling)
 */

/**
 * Generate an array of points representing the ECG signal
 */
export function apply_DSA_Mask(
  seriesId,
  multiFrameSerie,
  tag,
) {
  const metadata_info=multiFrameSerie[tag];
  const mask_type=metadata_info["0"].x00286101;
  const frame_index_number=metadata_info["0"].x00286110;
  const frameId=multiFrameSerie.instances["multiFrameLoader://0?frame="+(frame_index_number-1)]
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
  }
  else if(mask_type==="TID")
  {

  }
  else if(mask_type==="REV_TID")
  {

  }
  
}
