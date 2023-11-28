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

     let frameRange; // Applicable Frame Range
     if (metadata_info["0"].x00286102!=undefined)
     {
      frameRange=metadata_info["0"].x00286102;
     }
     if(metadata_info["0"].x00286102===undefined&&contrastFrameAveraging!=undefined)
     {
      frameRange=[0,frameNumber-1-contrastFrameAveraging+1]
     }  
     console.log(larvitar.cornerstone.imageCache)
     
     const startFrame = frameRange!=undefined ? frameRange[0] : 0;
     const effectiveEndFrame = frameRange!=undefined ? frameRange[1] : frameNumber-1;//-1 is set because this is used as index to extract imageId from imageIDs array 
     
     // Perform frame averaging for mask
     let image;//blabla
     let pixelData=[];
    //array of arrays where each value contains a pixelData (for all frames until effectiveEndFrame )
     let contrastFrames=[];
     let lengtharrays;
     
     for(let i=0;i<=effectiveEndFrame;i++)
    {
      image=larvitar.cornerstone.imageCache.cachedImages[i].image;//extract image 
      pixelData=image.getPixelData();
      lengtharrays=pixelData.length;
      contrastFrames.push(pixelData)
    }
    console.log(contrastFrames)
     let maskFrames=[];//array of arrays where each value contains a pixelData (for the frames indexes cited in frame_idex_number array)to be extracted from contrast data 
     for(let i=0;i<=(frame_index_number.length-1);i++)
    {
      image=larvitar.cornerstone.imageCache.cachedImages[frame_index_number[i]].image;//extract image 
      pixelData=image.getPixelData();
      maskFrames.push(pixelData)
    }
    console.log(maskFrames)
     let averagedMaskFrames=new Array(lengtharrays);
     if(maskFrames.length>1)
     {
      averagedMaskFrames = maskFrames.reduce((acc, frame) => acc.map((value, i) => value + frame[i]), new Array(lengtharrays).fill(0));
      averagedMaskFrames.forEach((value, i, arr) => (arr[i] /= maskFrames.length));
     }
     else if(maskFrames.length===1){
      
      averagedMaskFrames=maskFrames
      console.log(averagedMaskFrames)
     }
     // Apply sub-pixel shift
     let shiftedMaskFrames = new Array(averagedMaskFrames.length);
     if(maskSubPixelShift!=0)
     {
            for (let i = 0; i < averagedMaskFrames.length; i++) {
                shiftedMaskFrames[(i + maskSubPixelShift) % averagedMaskFrames.length] = averagedMaskFrames[i];
            }
    }
    else 
      {
                shiftedMaskFrames=averagedMaskFrames;
      }
    console.log(shiftedMaskFrames.length)
    console.log(Array.isArray(shiftedMaskFrames[0]))
    console.log(contrastFrames.length)
    const resultFrames = contrastFrames.map(contrastFrame => contrastFrame.map((value, j) => value - shiftedMaskFrames[0][j]));
    console.log(resultFrames)
    image=larvitar.cornerstone.imageCache.cachedImages[5].image;
    const myCanvas = document.getElementById("myCanvas");
    myCanvas.width = image.width;
    myCanvas.height = image.height;

    const ctx = myCanvas.getContext("2d");

    // Create a new Uint8ClampedArray with RGBA values
    const rgbaData = new Uint8ClampedArray(image.width * image.height * 4);

    // Assuming dicomPixelData represents grayscale values, set the same value for R, G, and B channels
    for (let i = 0; i <resultFrames[5].length; i++) {
      rgbaData[i * 4] = resultFrames[5][i];     // Red channel
      rgbaData[i * 4 + 1] = resultFrames[5][i]; // Green channel
      rgbaData[i * 4 + 2] = resultFrames[5][i]; // Blue channel
      rgbaData[i * 4 + 3] = 255;               // Alpha channel (fully opaque)
    }

    // Create ImageData
    const img = new ImageData(rgbaData, image.width, image.height);

    // Put ImageData on the canvas
    ctx.putImageData(img, 0, 0);
    //larvitar.cornerstone.displayImage(element, image);
    const endTime = new Date();
    const elapsedTime = endTime - startTime;

    console.log(`Function execution time: ${elapsedTime} milliseconds`);

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

