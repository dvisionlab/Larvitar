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

let averagedMaskFramesAvg;
let resultFramesAvg;
let maskFramesAvg;
let contrastFrameAveragingAvg;
let maskSubPixelShift;
let frameRangeAvg;

let resultFramesTid;
let TidOffset
let contrastFrameAveragingTid;
let frameRangeTid;


let resultFramesRevTid;
let RevTidOffset
let contrastFrameAveragingRevTid;
let frameRangeRevTid;

let maxPixel 
let minPixel 
let windowWidth


function apply_DSA_Mask( multiFrameSerie, frameId) {
  const frameNumber = multiFrameSerie.imageIds.length;
  const imageIds = multiFrameSerie.imageIds;
  const metadata_info = multiFrameSerie.metadata["x00286100"];
  const metadataInfo = metadata_info[0];
  const mask_type = metadata_info[0].x00286101; // Mask Operation Attribute
  let frame_index_number = metadata_info[0].x00286110; // Mask Frame Numbers Attribute (might be an array)

  if (typeof frame_index_number === "number") {
    frame_index_number = [frame_index_number];
}

  // Check mask type
  if (mask_type === "NONE") {
    return;
  } else if (mask_type === "AVG_SUB") {
    
    const imageCache = larvitar.cornerstone.imageCache;
    const cachedImages = imageCache.cachedImages;
     maskSubPixelShift =  maskSubPixelShift||metadataInfo.x00286114 || 0;
    contrastFrameAveragingAvg = contrastFrameAveragingAvg||metadataInfo.x00286112 || 1;
     frameRangeAvg = frameRangeAvg||metadataInfo.x00286102 || [
      0,
      frameNumber - 1 - contrastFrameAveragingAvg + 1
    ];

    let isFrameIncluded 
      for(let i=0;i<frameRangeAvg.length/2;i++)
      {
        isFrameIncluded =imageIds.includes(frameId) &&
        imageIds.indexOf(frameId) >= frameRangeAvg[i] &&
        imageIds.indexOf(frameId) <= frameRangeAvg[i+1];
      }
    if (isFrameIncluded) {
      const t = performance.now();
      let image =cachedImages[imageIds.indexOf(frameId)].image;
      let contrastFrame = image.getPixelData();
      let len_pixeldata = contrastFrame.length;
      const t0 = performance.now();
      console.log("t0", t0 - t);
      maskFramesAvg =
        maskFramesAvg ||
        frame_index_number.map(index =>
          cachedImages[index].image.getPixelData()
        );
      const t1 = performance.now();
      console.log("t1", t1 - t0);
      
      resultFramesAvg = resultFramesAvg || new Float32Array(len_pixeldata);
      let average = false;
      const t2 = performance.now();
      console.log("t2", t2 - t1);
      if (Array.isArray(maskFramesAvg) && maskFramesAvg.length > 1) {
        average = true;
      }
      let shiftValue = (maskSubPixelShift !== 0) ? maskSubPixelShift : 0;
if(average)
{
  averagedMaskFramesAvg =
      averagedMaskFramesAvg || new Float32Array(len_pixeldata);
  for (j = 0; j < len_pixeldata; j++) {
    let value = contrastFrame[j];
      let value_average;
      for (i = 0; i <maskFramesAvg.length; i++) {
        value_average = value_average + maskFramesAvg[i][j];
      }
      averagedMaskFramesAvg[j] = value_average / maskframeslength;
      resultFramesAvg[j] = value - averagedMaskFramesAvg[j] + shiftValue;
  }

}
else{
 
  for (let j = 0; j < len_pixeldata; j++) {
    resultFramesAvg[j] = contrastFrame[j] - maskFramesAvg[0][j] + shiftValue;
}
    }
      const t3 = performance.now();
      maxPixel = maxPixel||getMax(resultFramesAvg);
      minPixel = minPixel||getMin(resultFramesAvg);
      windowWidth= windowWidth||(maxPixel-minPixel)/2

      console.log("t3", t3 - t2);

      const modifiedImage = {
        imageId: imageIds.indexOf(frameId), // Keep the same imageId
        minPixelValue: minPixel,
        maxPixelValue: maxPixel,
        slope: image.slope,
        intercept: image.intercept,
        windowCenter: 0,
        windowWidth: windowWidth,
        getPixelData: () => resultFramesAvg,
        rows: image.rows,
        columns: image.columns,
        height: image.height,
        width: image.width,
        color: image.color,
        columnPixelSpacing: image.columnPixelSpacing,
        rowPixelSpacing: image.rowPixelSpacing
      };

      const element = document.getElementById("imageResult");
      larvitar.cornerstone.enable(element);
      larvitar.cornerstone.displayImage(element, modifiedImage);
      // larvitar.addDefaultTools();
      // larvitar.setToolActive("Wwwc");
      const t4 = performance.now();
      console.log("t4", t4 - t3);
    } else {
      return;
    }
  } else if (mask_type === "TID") {
    // Check if Applicable Frame Range is present
     contrastFrameAveragingTid = contrastFrameAveragingTid||metadataInfo.x00286112 || 1;
     TidOffset=TidOffset||metadataInfo.x00286120||1
      frameRangeTid = frameRangeTid||metadataInfo.x00286102 || [ Math.abs(tidOffset)-1,frameNumber-Math.abs(tidOffset)-1];
    // Filter frames within the Applicable Frame Range
    for(let i=0;i<frameRangeTid.length/2;i++)
    {
      isFrameIncluded =imageIds.includes(frameId) &&
      imageIds.indexOf(frameId) >= frameRangeTid[i] &&
      imageIds.indexOf(frameId) <= frameRangeTid[i+1];
    }
    if (isFrameIncluded) {
      let image = cachedImages[imageIds.indexOf(frameId)].image;
      let contrastFrame = image.getPixelData();
      let maskimage = cachedImages[imageIds.indexOf(frameId-tidOffset)].image;
      let contrastMaskFrame = maskimage.getPixelData();
      let len_pixeldata = contrastFrame.length;
    // Apply Time Interval Differencing
     resultFramesTid =resultFramesTid || new Float32Array(len_pixeldata); 

    for(let i=0;i<len_pixeldata;i++)
    {
      resultFramesTid[i]=contrastFrame[i]-contrastMaskFrame[i]
    }
    maxPixel = maxPixel||getMax(resultFramesTid);
      minPixel = minPixel||getMin(resultFramesTid);
      windowWidth= windowWidth||(maxPixel-minPixel)/2
          const modifiedImage = {
      imageId: imageIds.indexOf(frameId), // Keep the same imageId
      minPixelValue: minPixel,
      maxPixelValue:maxPixel,
      slope: image.slope,
      intercept: image.intercept,
      windowCenter: 0,
      windowWidth: windowWidth,
      getPixelData: () => resultFramesTid,
      rows: image.rows,
      columns: image.columns,
      height: image.height,
      width: image.width,
      color: image.color,
      columnPixelSpacing: image.columnPixelSpacing,
      rowPixelSpacing: image.rowPixelSpacing
    };

    const element = document.getElementById("viewer");
    // larvitar.cornerstone.enable(element);
    larvitar.cornerstone.displayImage(element, modifiedImage);
  }
  } else if (mask_type === "REV_TID") {
    contrastFrameAveragingRevTid = contrastFrameAveragingRevTid||metadataInfo.x00286112 || 1;
     const RevTidOffset=metadataInfo.x00286120||1
      frameRangeRevTid = frameRangeRevTid||metadataInfo.x00286102 || [ Math.abs(RevTidOffset)-1,frameNumber-Math.abs(RevTidOffset)-1];
    
      // Filter frames within the Applicable Frame Range
      let isFrameIncluded 
      for(let i=0;i<frameRangeRevTid.length/2;i++)
      {
        isFrameIncluded =imageIds.includes(frameId) &&
        imageIds.indexOf(frameId) >= frameRangeRevTid[i] &&
        imageIds.indexOf(frameId) <= frameRangeRevTid[i+1];
      }
      
    if (isFrameIncluded) {
      let image = cachedImages[imageIds.indexOf(frameId)].image;
      let contrastFrame = image.getPixelData();
      let maskimage = cachedImages[imageIds.indexOf((frameRangeRevTid[0]-RevTidOffset)-(frameId-frameRangeRevTid[0]))].image;
      let contrastMaskFrame = maskimage.getPixelData();
      let len_pixeldata = contrastFrame.length;
    // Apply Time Interval Differencing
     resultFramesRevTid =resultFramesRevTid || new Float32Array(len_pixeldata); 

    for(let i=0;i<len_pixeldata;i++)
    {
      resultFramesRevTid[i]=contrastFrame[i]-contrastMaskFrame[i]
    }
    maxPixel = maxPixel||getMax( resultFramesRevTid);
      minPixel = minPixel||getMin( resultFramesRevTid);
      windowWidth= windowWidth||(maxPixel-minPixel)/2
    const modifiedImage = {
      imageId: imageIds.indexOf(frameId), // Keep the same imageId
      minPixelValue: minPixel,
      maxPixelValue:maxPixel,
      slope: image.slope,
      intercept: image.intercept,
      windowCenter: 0,
      windowWidth:  windowWidth,
      getPixelData: () => resultFramesRevTid,
      rows: image.rows,
      columns: image.columns,
      height: image.height,
      width: image.width,
      color: image.color,
      columnPixelSpacing: image.columnPixelSpacing,
      rowPixelSpacing: image.rowPixelSpacing
    };

    const element = document.getElementById("viewer");
    // larvitar.cornerstone.enable(element);
    larvitar.cornerstone.displayImage(element, modifiedImage);
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
