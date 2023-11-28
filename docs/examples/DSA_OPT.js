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

  console.log(frames_array);

  if (mask_type === "NONE") {
    return;
  } else if (mask_type === "AVG_SUB") {
    const maskSubPixelShift = metadata_info["0"].x00286114 || 0;
    const contrastFrameAveraging = metadata_info["0"].x00286112 || 1;
    const frameRange = metadata_info["0"].x00286102 || [0, frameNumber - 1 - contrastFrameAveraging + 1];

    console.log(larvitar.cornerstone.imageCache);

    const startFrame = frameRange!=undefined ? frameRange[0] : 0;;
    const effectiveEndFrame = frameRange!=undefined ? frameRange[1] : frameNumber-1;

    const contrastFrames = new Array(effectiveEndFrame - startFrame + 1).fill(0).map((_, i) => {
      const image = larvitar.cornerstone.imageCache.cachedImages[startFrame + i].image;
      return image.getPixelData();
    });

    console.log(contrastFrames);

    const maskFrames = frames_array.map(index => {
        let i=frames_array.indexOf(index);
        console.log(larvitar.cornerstone.imageCache.cachedImages)
      const image = larvitar.cornerstone.imageCache.cachedImages[i].image;
      return image.getPixelData();
    });

    console.log(maskFrames);

    const averagedMaskFrames = maskFrames.length > 1
      ? maskFrames.reduce((acc, frame) => acc.map((value, i) => value + frame[i]), new Array(maskFrames[0].length).fill(0)).map(value => value / maskFrames.length)
      : maskFrames[0];

    const shiftedMaskFrames = maskSubPixelShift !== 0
      ? averagedMaskFrames.map((value, i, arr) => arr[(i + maskSubPixelShift) % arr.length])
      : averagedMaskFrames;

    const resultFrames = contrastFrames.map(contrastFrame => contrastFrame.map((value, j) => value - shiftedMaskFrames[j]));

    console.log(resultFrames);

    const image = larvitar.cornerstone.imageCache.cachedImages[5].image;
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

    const endTime = new Date();
    const elapsedTime = endTime - startTime;

    console.log(`Function execution time: ${elapsedTime} milliseconds`);
  } else if (mask_type === "TID") {
    // Implementation for TID
  } else if (mask_type === "REV_TID") {
    // Implementation for REV_TID
  }
}