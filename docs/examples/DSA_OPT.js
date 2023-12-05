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
  //moltiplicazione sottrazione numerica (no divisioni)
  return min;
}

//profiling codice 
//deno fmt nomefile
function apply_DSA_Mask(seriesId, multiFrameSerie, tag) {
  const startTime = new Date();
  const frameNumber = multiFrameSerie.imageIds.length;
  const imageIds = multiFrameSerie.imageIds;
  console.log(frameNumber);

  const metadata_info = multiFrameSerie.metadata[tag];
  const mask_type = metadata_info["0"].x00286101;
  let frame_index_number = metadata_info["0"].x00286110;

  const frames_array = Array.isArray(frame_index_number)
    ? frame_index_number.map(index => imageIds[index])
    : [imageIds[frame_index_number]];
    const endTime = new Date();
    console.log(endTime-startTime);
  console.log(frames_array);

  if (mask_type === "NONE") {
    return;
  } else if (mask_type === "AVG_SUB") {
    const maskSubPixelShift = metadata_info["0"].x00286114 || 0;
    const contrastFrameAveraging = metadata_info["0"].x00286112 || 1;
    const frameRange = metadata_info["0"].x00286102 || [0, frameNumber - 1 - contrastFrameAveraging + 1];

    console.log(larvitar.cornerstone.imageCache);

    const startFrame = frameRange!=undefined ? frameRange[0] : 0;
    const effectiveEndFrame = frameRange!=undefined ? frameRange[1] : frameNumber-1;

    const contrastFrames = new Array(effectiveEndFrame - startFrame + 1).fill(0).map((_, i) => {
      const image = larvitar.cornerstone.imageCache.cachedImages[startFrame + i].image;
      return image.getPixelData();
    });

    console.log(contrastFrames);

    const endTime2 = new Date();
    console.log(endTime2-startTime);

    const maskFrames = frames_array.map(index => {
        let i=frames_array.indexOf(index);
        console.log(larvitar.cornerstone.imageCache.cachedImages)
      const image = larvitar.cornerstone.imageCache.cachedImages[i].image;
      return image.getPixelData();
    });

    console.log(maskFrames);

    const endTime3 = new Date();
    console.log(endTime3-startTime);

    const averagedMaskFrames = maskFrames.length > 1
      ? maskFrames.reduce((acc, frame) => acc.map((value, i) => value + frame[i]), new Array(maskFrames[0].length).fill(0)).map(value => value / maskFrames.length)
      : maskFrames[0];

      const endTime4 = new Date();
      console.log(endTime4-startTime);

    const shiftedMaskFrames = maskSubPixelShift !== 0
      ? averagedMaskFrames.map((value, i, arr) => arr[(i + maskSubPixelShift) % arr.length])
      : averagedMaskFrames;

      const endTime5 = new Date();
      console.log(endTime5-startTime);
    console.log(shiftedMaskFrames)
    const resultFrames = contrastFrames.map(contrastFrame => contrastFrame.map((value, j) => value - shiftedMaskFrames[j]));
    const resultFrames_alternative = contrastFrames.map(contrastFrame => contrastFrame.map((value, j) => value - contrastFrames[2][j] ));
    console.log(resultFrames);

    const endTime6 = new Date();
    console.log(endTime6-startTime);

    const image = larvitar.cornerstone.imageCache.cachedImages[5].image;
    console.log(image.data)
    const myCanvas = document.getElementById("myCanvas");
    myCanvas.width = image.width;
    myCanvas.height = image.height;

    const ctx = myCanvas.getContext("2d");
    const rgbaData = new Uint8ClampedArray(image.width * image.height * 4);

    for (let i = 0; i < resultFrames[5].length; i++) {
      rgbaData[i * 4] = rgbaData[i * 4 + 1] = rgbaData[i * 4 + 2] = resultFrames[5][i];
      rgbaData[i * 4 + 3] = 255;
    }

    const img = new ImageData(rgbaData, image.width, image.height);
    ctx.putImageData(img, 0, 0);
    //createImagesForFrames(resultFrames[5],imageIds[5],image)
    //createNewDicom(image.getPixelData(),image);
    console.log(image.minPixelValue)
    let maxPixel=getMax(resultFrames[5]);
    let minPixel=getMin(resultFrames[5]);

    const modifiedImage = {
      imageId: image.imageId, // Keep the same imageId
      minPixelValue: minPixel,
      maxPixelValue: maxPixel,
      slope: image.slope,
      intercept:image.intercept,
      windowCenter: 0,
      windowWidth:maxPixel/2,
      getPixelData: function() {
          return resultFrames[5];
      },
      rows: image.rows,
      columns: image.columns,
      height: image.height,
      width: image.width,
      color:image.color,
      columnPixelSpacing: image.columnPixelSpacing,
      rowPixelSpacing: image.rowPixelSpacing,
  };

// Now, display the modified image using cornerstone
const element = document.getElementById('imageResult'); // Replace 'yourElementId' with the ID of the element where you want to display the image
larvitar.cornerstone.enable(element);
larvitar.cornerstone.displayImage(element, modifiedImage);
larvitar.addDefaultTools();
      larvitar.setToolActive("Wwwc");
    const endTime = new Date();
    const elapsedTime = endTime - startTime;

    console.log(`Function execution time: ${elapsedTime} milliseconds`);
  } else if (mask_type === "TID") {
    // Implementation for TID
  } else if (mask_type === "REV_TID") {
    // Implementation for REV_TID
  }
}

//<script src="path/to/dicomParser.js"></script>
function createNewDicom(modifiedPixelData,image) {

  // Create a new DICOM instance
  const newDicom = dicomParser.createDicomInstance();

  // Set DICOM metadata and attributes (modify as needed)
  tagsToCopy
  tagsToCopy.forEach(tag => {
    const element = image.data.dataSet.elements[tag];
    if (element !== undefined) {
        newDicom.setUint16(element.tag, element.data);
    }
});
  // Set pixel data attributes
  newDicom.setPixelData(modifiedPixelData);

  // Save the new DICOM file
  const newDicomArrayBuffer = newDicom.write();

  // Assuming you want to save it locally
  saveAs(new Blob([newDicomArrayBuffer], { type: 'application/dicom' }), 'modified-dicom-file.dcm');
};


function createImagesForFrames(pixelData,frameId,image) {
  // Get the cornerstone element
  const element = document.getElementById('myCanvas'); // Replace with your actual element ID

  larvitar.cornerstone.enable(element);
  // Loop through each frame pixel data
    // Create a new image object
    const imagenew = {
      imageId: frameId, // Provide a unique image ID
      minPixelValue: Math.min(pixelData),
      maxPixelValue: Math.max(pixelData),
      slope: image.slope,
      intercept: image.intercept,
      windowCenter: image.windowCenter,
      windowWidth: image.windowWidth,
      render: larvitar.cornerstone.renderGrayscaleImage,
      getPixelData: () => pixelData, // Set the pixel data for this frame
      rows: image.rows, // Set the number of rows
      columns: image.columns, // Set the number of columns
      height: image.height, // Set the height
      width: image.width, // Set the width
      color: false, // This is a grayscale image
      columnPixelSpacing: image.columnPixelSpacing,
      rowPixelSpacing: image.rowPixelSpacing,
      invert: false,
    };

    // Add the image to the cornerstone element
    larvitar.cornerstone.displayImage(element, imagenew);
}

