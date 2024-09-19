/** @module imaging3d/multiframe
 *  @desc  This file provides functionalities for
 *        handling multiframe images in the 3D viewer.
 */

// external libraries
import { metaData } from "@cornerstonejs/core";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";

/**
 * @instance
 * @function prefetchMetadataInformation
 * @desc Prefetches metadata information for a list of imageIds
 * @param imageIdsToPrefetch - list of imageIds to prefetch metadata information
 * @returns Promise<void>
 */
export const prefetchMetadataInformation =
  async function prefetchMetadataInformation(imageIdsToPrefetch: string[]) {
    for (let i = 0; i < imageIdsToPrefetch.length; i++) {
      await cornerstoneDICOMImageLoader.wadouri.loadImage(imageIdsToPrefetch[i])
        .promise;
    }
  };

/**
 * @instance
 * @function convertMultiframeImageIds
 * @desc Converts multiframe imageIds to single frame imageIds
 * @param imageIds - list of imageIds to convert
 * @returns string[] - new list of imageids where each imageid represents a frame
 */
export const convertMultiframeImageIds = function (
  imageIds: string[]
): string[] {
  const newImageIds: string[] = [];
  imageIds.forEach(imageId => {
    const { imageIdFrameless } = getFrameInformation(imageId);
    const instanceMetaData = metaData.get("multiframeModule", imageId);
    if (
      instanceMetaData &&
      instanceMetaData.NumberOfFrames &&
      instanceMetaData.NumberOfFrames > 1
    ) {
      const NumberOfFrames = instanceMetaData.NumberOfFrames;
      for (let i = 0; i < NumberOfFrames; i++) {
        const newImageId: string = imageIdFrameless + (i + 1);
        newImageIds.push(newImageId);
      }
    } else {
      newImageIds.push(imageId);
    }
  });
  return newImageIds;
};

// internal methods

/**
 * @function getFrameInformation
 * @desc Gets frame information from imageId
 * @param imageId - imageId to get frame information from
 * @returns object - object containing frameIndex and imageIdFrameless
 */
function getFrameInformation(imageId: string) {
  if (imageId.includes("wadors:")) {
    const frameIndex = imageId.indexOf("/frames/");
    const imageIdFrameless =
      frameIndex > 0 ? imageId.slice(0, frameIndex + 8) : imageId;
    return {
      frameIndex,
      imageIdFrameless
    };
  } else {
    const frameIndex = imageId.indexOf("&frame=");
    let imageIdFrameless =
      frameIndex > 0 ? imageId.slice(0, frameIndex + 7) : imageId;
    if (!imageIdFrameless.includes("&frame=")) {
      imageIdFrameless = imageIdFrameless + "&frame=";
    }
    return {
      frameIndex,
      imageIdFrameless
    };
  }
}
