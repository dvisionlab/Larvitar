/*
 * This module provides the following functions to be exported:
 * parseECG(dataSet, tag, nSampling)
 */
function getMax(arr) {
  let len = arr.length;
  let max = -Infinity;

  while (len--) {
      max = arr[len] > max ? arr[len] : max;
  }
  return max;
}
function getMin(arr) {
  let len = arr.length;
  let min = +Infinity;

  while (len--) {
      min = arr[len] < min ? arr[len] : min;
  }
  return min;
}
/**
 * Generate an array of points representing the ECG signal
 */
function apply_DSA_Mask(
  seriesId,
  multiFrameSerie,
  tag,frameId
) {
  const startTime = new Date();
  const frameNumber=multiFrameSerie.imageIds.length
  const imageIds=multiFrameSerie.imageIds;
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

     const metadataInfo = metadata_info["0"];
const imageCache = larvitar.cornerstone.imageCache;
const cachedImages = imageCache.cachedImages;
const maskSubPixelShift = metadata_info["0"].x00286114 || 0;
    const contrastFrameAveraging = metadata_info["0"].x00286112 || 1;
    const frameRange = metadata_info["0"].x00286102 || [0, frameNumber - 1 - contrastFrameAveraging + 1];
    const startFrame = frameRange!=undefined ? frameRange[0] : 0;;
    const effectiveEndFrame = frameRange!=undefined ? frameRange[1] : frameNumber-1;
const isFrameIncluded = imageIds.includes(frameId) && imageIds.indexOf(frameId) >= startFrame && imageIds.indexOf(frameId) <= effectiveEndFrame;

if (isFrameIncluded) {
  const contrastFrames = [cachedImages[imageIds.indexOf(frameId)].image.getPixelData()];
  const maskframe=cachedImages[frame_index_number[0]].image.getPixelData()
  const resultFrames_alternative = contrastFrames.map(contrastFrame => contrastFrame.map((value, j) => value - maskframe[j] ));
  const endTime3 = new Date();
  const elapsedTime3 = endTime3 - startTime;
  console.log(`Function execution time: ${elapsedTime3} milliseconds`);

  const maskFrames = frame_index_number.map(index => cachedImages[index].image.getPixelData());

  let averagedMaskFrames = maskFrames.length > 1
    ? maskFrames.reduce((acc, frame) => acc.map((value, i) => value + frame[i]), new Float32Array(maskFrames[0].length))
    : maskFrames[0];

  averagedMaskFrames = averagedMaskFrames.map(value => value / maskFrames.length);

  let shiftedMaskFrames = maskSubPixelShift !== 0
    ? new Float32Array(averagedMaskFrames.length).map((_, i) => averagedMaskFrames[(i - maskSubPixelShift + averagedMaskFrames.length) % averagedMaskFrames.length])
    : averagedMaskFrames;

  const resultFrames = contrastFrames.map(contrastFrame => contrastFrame.map((value, j) => value - shiftedMaskFrames[j]));
  const endTime = new Date();
  const elapsedTime = endTime - startTime;
  console.log(`Function execution time: ${elapsedTime} milliseconds`);

  let maxPixel=getMax(resultFrames[0]);
  let minPixel=getMin(resultFrames[0]);
  const modifiedImage = {
    imageId: imageIds.indexOf(frameId), // Keep the same imageId
    minPixelValue:minPixel,
    maxPixelValue: maxPixel,
    slope: cachedImages[imageIds.indexOf(frameId)].image.slope,
    intercept: cachedImages[imageIds.indexOf(frameId)].image.intercept,
    windowCenter: 0,
    windowWidth: maxPixel / 2,
    getPixelData: () => resultFrames[0],
    rows: cachedImages[imageIds.indexOf(frameId)].image.rows,
    columns: cachedImages[imageIds.indexOf(frameId)].image.columns,
    height: cachedImages[imageIds.indexOf(frameId)].image.height,
    width: cachedImages[imageIds.indexOf(frameId)].image.width,
    color: cachedImages[imageIds.indexOf(frameId)].image.color,
    columnPixelSpacing: cachedImages[imageIds.indexOf(frameId)].image.columnPixelSpacing,
    rowPixelSpacing: cachedImages[imageIds.indexOf(frameId)].image.rowPixelSpacing,
  };

  const element = document.getElementById('imageResult');
  larvitar.cornerstone.enable(element);
  larvitar.cornerstone.displayImage(element, modifiedImage);
  larvitar.addDefaultTools();
  larvitar.setToolActive("Wwwc");

  const endTime2 = new Date();
  const elapsedTime2 = endTime2 - startTime;

  console.log(`Function execution time: ${elapsedTime2} milliseconds`);
}

     else
     {
      return; 
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
     // Check if Applicable Frame Range is present
     let contrastFrameAveraging; // Contrast Frame Averaging 
     if (metadata_info["0"].x00286112!=undefined)
     {
       contrastFrameAveraging=metadata_info["0"].x00286112;
     }
     let frameRange; // Applicable Frame Range
     if (metadata_info["0"].x00286102!=undefined)
     {
      frameRange=metadata_info["0"].x00286102;
     }
     if(metadata_info["0"].x00286102===undefined&&contrastFrameAveraging!=undefined)
     {
      frameRange=[0,frameNumber-1-contrastFrameAveraging+1]
     }  
      // Filter frames within the Applicable Frame Range
      contrastFrames = contrastFrames.filter((frame, index) => {
          const frameNumber = index + 1; // Assuming frames are 1-indexed
          return frameNumber >= frameRange[0] && frameNumber <= frameRange[1];
      });
  

  // Apply Time Interval Differencing
  const resultFrames = contrastFrames.map((frame, index) => {
      const tidAdjustedFrameIndex = index - tidOffset;
      if (tidAdjustedFrameIndex >= 0 && tidAdjustedFrameIndex < contrastFrames.length) {
          // Perform pixel-wise subtraction
          return resultFrames=contrastFrames[index].map((pixel, index) => pixel - contrastFrames[tidAdjustedFrameIndex][index]);
      } else {
          // Handle frames outside the valid range
          return null; // You may want to define your own handling logic
      }
  });

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
    let contrastFrameAveraging; // Contrast Frame Averaging 
    if (metadata_info["0"].x00286112!=undefined)
    {
      contrastFrameAveraging=metadata_info["0"].x00286112;
    }
    let frameRange; // Applicable Frame Range
     if (metadata_info["0"].x00286102!=undefined)
     {
      frameRange=metadata_info["0"].x00286102;
     }
     if(metadata_info["0"].x00286102===undefined&&contrastFrameAveraging!=undefined)
     {
      frameRange=[0,frameNumber-1-contrastFrameAveraging+1]
     }  
    // Calculate mask frame number for each contrast frame within the Applicable Frame Range
    const resultFrames = frameRange.map((startFrame) => {
        const maskFrameNumber = startFrame - tidOffset;
        if (maskFrameNumber >= 1 && maskFrameNumber <= contrastFrames.length) {
            // Perform pixel-wise subtraction
            return resultFrame = contrastFrames[startFrame - 1].map((pixel, index) => pixel - contrastFrames[maskFrameNumber - 1][index]);
        } else {
            // Handle frames outside the valid range
            return null; // You may want to define your own handling logic
        }
    });


  }
  
}
function buildCanvas(width, height, pixelData) {
  var imgData = context.createImageData(width, height);
  for (var i = 0; i < imgData.data.length; i += 4) {
      var x = (i / 4) % 40;
      imgData.data[i] = pixelData[x];
      imgData.data[i + 1] = pixelData[x + 1];
      imgData.data[i + 2] = pixelData[x + 2];
      imgData.data[i + 3] = 255;
  }
  console.log(pixelData);
  context.putImageData(imgData, 0, 0);
}

