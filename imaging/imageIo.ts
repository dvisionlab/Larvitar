/** @module imaging/imageIo
 *  @desc This file provides I/O functionalities on NRRD files and DICOM images
 */

// external libraries
import cornerstone from "cornerstone-core";
import { forEach, find } from "lodash";

// internal libraries
import {
  getMeanValue,
  getDistanceBetweenSlices,
  getTypedArrayFromDataType,
  getSortedStack,
  getMinPixelValue,
  getMaxPixelValue
} from "./imageUtils";
import store from "./imageStore";
import { parse } from "./parsers/nrrd";
import { checkMemoryAllocation } from "./monitors/memory";
import { Series, Header, Volume, TypedArray } from "./types";
import { Image } from "./types";

//global variable
declare var cv: any; //opencv-js

/*
 * This module provides the following functions to be exported:
 * buildHeader(series)
 * getCachedPixelData(imageId)
 * buildData(series)
 * importNRRDImage(bufferArray)
 * exportImageToBase64(canvasId)
 */

/**
 * Build the image header from slices' metadata
 * @function buildHeader
 * @param {Object} series - Cornerstone series object
 * @returns {Object} header: image metadata
 */
export const buildHeader = function (series: Series) {
  let header: Partial<Header> = {};

  forEach(series.imageIds, function (imageId: string) {
    header[imageId] = series.instances[imageId].metadata;
  });

  let volume: Partial<Volume> = {};

  volume.imageIds = series.imageIds;
  volume.seriesId = series.instances[series.imageIds[0]].metadata.seriesUID;
  volume.rows =
    series.instances[series.imageIds[0]].metadata.rows ||
    series.instances[series.imageIds[0]].metadata.x00280010;
  volume.cols =
    series.instances[series.imageIds[0]].metadata.cols ||
    series.instances[series.imageIds[0]].metadata.x00280011;
  volume.slope = series.instances[series.imageIds[0]].metadata.slope as number;
  volume.repr = series.instances[series.imageIds[0]].metadata.repr as string;
  volume.intercept = series.instances[series.imageIds[0]].metadata
    .intercept as number;
  volume.imagePosition = series.instances[series.imageIds[0]].metadata
    .imagePosition as [number, number];
  volume.numberOfSlices = series.imageIds.length;

  // @ts-ignore
  volume.imageOrientation = getMeanValue(
    series,
    "imageOrientation",
    true
  ) as number[];

  // @ts-ignore
  volume.pixelSpacing = getMeanValue(series, "pixelSpacing", true) as [
    number,
    number
  ];
  // volume.maxPixelValue = getMeanValue(series, "maxPixelValue", false);
  // volume.minPixelValue = getMeanValue(series, "minPixelValue", false);
  volume.sliceThickness = getDistanceBetweenSlices(series, 0, 1);

  header.volume = volume as Volume;

  return header as Header;
};

/**
 * Get cached pixel data
 * @function getCachedPixelData
 * @param {String} imageId - ImageId of the cached image
 * @returns {Promise} A promise which will resolve to a pixel data array or fail if an error occurs
 */

export const getCachedPixelData = function (imageId: string) {
  let cachedImage = find(cornerstone.imageCache.cachedImages, [
    "imageId",
    imageId
  ]);
  let promise = new Promise<number[]>((resolve, reject) => {
    if (cachedImage && cachedImage.image) {
      resolve(cachedImage.image.getPixelData());
    } else {
      cornerstone
        .loadImage(imageId)
        .then(image => resolve(image.getPixelData()))
        .catch(err => reject(err));
    }
  });
  return promise;
};

/**
 * Build the contiguous typed array from slices
 * @function buildData
 * @param {Object} series - Cornerstone series object
 * @param {Bool} useSeriesData - Flag to force using "series" data instead of cached ones
 * @returns {Array} Contiguous pixel array
 */
export const buildData = function (series: Series, useSeriesData: boolean) {
  if (checkMemoryAllocation(series.bytes)) {
    let t0 = performance.now();
    let repr = series.instances[series.imageIds[0]].metadata.repr;
    let rows =
      (series.instances[series.imageIds[0]].metadata.rows as number) ||
      (series.instances[series.imageIds[0]].metadata.x00280010 as number);
    let cols =
      (series.instances[series.imageIds[0]].metadata.cols as number) ||
      (series.instances[series.imageIds[0]].metadata.x00280011 as number);
    let len = rows * cols * series.imageIds.length;

    if (!repr) {
      throw new Error("Image representation metadata not found");
    }

    let typedArray = getTypedArrayFromDataType(repr as string);

    if (!typedArray) {
      throw new Error("Image representation not supported");
    }

    let data = new typedArray(len);
    let offsetData = 0;

    // use input data or cached data
    if (useSeriesData) {
      forEach(series.imageIds, function (imageId: string) {
        const sliceData = series.instances[imageId].pixelData;
        if (sliceData) {
          data.set(sliceData, offsetData);
          offsetData += sliceData.length;
        }
      });
      let t1 = performance.now();
      console.log(`Call to buildData took ${t1 - t0} milliseconds.`);
      return data;
    } else {
      store.addSeriesId(series.seriesUID, series.imageIds);
      let image_counter = 0;
      forEach(series.imageIds, function (imageId: string) {
        getCachedPixelData(imageId).then((sliceData: number[]) => {
          data.set(sliceData, offsetData);
          offsetData += sliceData.length;
          image_counter += 1;
          if (image_counter == series.imageIds.length) {
            let t1 = performance.now();
            console.log(`Call to buildData took ${t1 - t0} milliseconds.`);
            return data;
          }
        });
      });
    }
  } else {
    throw new Error("Data has not been builded: not enough memory");
  }
};

/**
 * Build the contiguous typed array from slices (async version)
 * @function buildDataAsync
 * @param {Object} series - Cornerstone series object
 * @param {Number} time - Time(s) to wait for garbage collector
 * @param {Function} resolve - Promise resolve function
 * @param {Function} reject - Promise reject function
 */
export const buildDataAsync = function (
  series: Series,
  time: number,
  resolve: (response: TypedArray) => void,
  reject: (response: string) => void
) {
  const memoryAllocation = checkMemoryAllocation(series.bytes);

  if (memoryAllocation) {
    let t0 = performance.now();
    let repr = series.instances[series.imageIds[0]].metadata.repr;
    let rows =
      (series.instances[series.imageIds[0]].metadata.rows as number) ||
      (series.instances[series.imageIds[0]].metadata.x00280010 as number);
    let cols =
      (series.instances[series.imageIds[0]].metadata.cols as number) ||
      (series.instances[series.imageIds[0]].metadata.x00280011 as number);
    let len = rows * cols * series.imageIds.length;

    if (!repr) {
      throw new Error("Image representation metadata not found");
    }

    let typedArray = getTypedArrayFromDataType(repr as string);

    if (!typedArray) {
      throw new Error("Image representation not supported");
    }

    let data = new typedArray(len);
    let offsetData = 0;

    series.imageIds = getSortedStack(series as Series, ["imagePosition"], true);

    let imageIds = series.imageIds.slice();
    store.addSeriesId(series.seriesUID, series.imageIds);

    function runFillPixelData(data: TypedArray) {
      let imageId = imageIds.shift();
      if (imageId) {
        getCachedPixelData(imageId).then(sliceData => {
          data.set(sliceData, offsetData);
          offsetData += sliceData.length;
          // this does the trick: delay next computation to next tick
          setTimeout(() => {
            runFillPixelData(data);
          }, 0);
        });
      } else {
        let t1 = performance.now();
        console.log(`Call to buildDataAsync took ${t1 - t0} milliseconds.`);
        resolve(data);
      }
    }
    runFillPixelData(data);
  } else if (time > 0) {
    setTimeout(function () {
      time = time - 5;
      buildDataAsync(series, time, resolve, reject);
    }, 5000);
  } else {
    reject("Data has not been builded: not enough memory");
  }
};

/**
 * Import NRRD image from bufferArray
 * @function importNRRDImage
 * @param {ArrayBuffer} bufferArray - buffer array from nrrd file
 * @returns {Array} Parsed pixel data array
 */
export const importNRRDImage = function (bufferArray: ArrayBuffer) {
  // get the data
  let volume = parse(bufferArray, { headerOnly: false });
  return volume;
};

/**
 * Export image rendered in a canvas to base64
 * @function exportImageToBase64
 * @param elementId - Id of the div element containing the canvas
 * @returns {String | null} base64 image (png full quality) or null if canvas does not exist
 */
export const exportImageToBase64 = function (
  elementId: string,
  imageType: string //"png" or "jpeg"
): string | null {
  const element: HTMLElement | null = document.getElementById(elementId);
  if (element) {
    const canvas: HTMLCanvasElement | null = element.querySelector("canvas");
    return canvas ? canvas.toDataURL("image/" + imageType, 1.0) : null;
  } else {
    console.warn("Canvas not found, invalid elementId");
    return null;
  }
};

/**
 * Export image rendered in a canvas to base64
 * @function exportImageToBase64OriginalSizes
 * @param imageId - Id of the original image element
 * @returns {String | null} base64 image (png full quality) or null if canvas does not exist
 */
export const exportImageToBase64OriginalSizes = function (imageId: string) {
  if (typeof cv !== "undefined" && cv !== null) {
    console.log("OpenCV has been successfully imported.");
    // You can use OpenCV functions here
  } else {
    console.error(
      'OpenCV has not been imported. ExportImageToBase64OriginalSizes function will not work. Please import src="https://docs.opencv.org/4.5.4/opencv.js" in your HTML'
    );
  }
  let t0 = performance.now();
  let canvas = document.createElement("canvas");
  let image: Image = find(cornerstone.imageCache.cachedImages, [
    "imageId",
    imageId
  ]).image;

  let dicomPixelData: number[] = image.getPixelData();
  let pngPixelData = new Uint8Array(image.width * image.height * 4);
  const min = getMinPixelValue(dicomPixelData);
  const max = getMaxPixelValue(dicomPixelData);

  for (let i = 0; i < dicomPixelData.length; i++) {
    // Assuming each integer represents a grayscale value
    pngPixelData[i * 4] = mapToRange(dicomPixelData[i], min, max); // Red channel
    pngPixelData[i * 4 + 1] = pngPixelData[i * 4]; // Green channel
    pngPixelData[i * 4 + 2] = pngPixelData[i * 4]; // Blue channel
    pngPixelData[i * 4 + 3] = 255; // Alpha channel (fully opaque)
  }

  let imageSrc = new cv.Mat(image.height, image.width, cv.CV_8UC4); // 3 channels: RGB
  imageSrc.data.set(pngPixelData);
  cv.imshow(canvas, imageSrc);
  const base64 = canvas.toDataURL("image/jpeg", 1.0);

  //@ts-ignore
  image = null;
  //@ts-ignore
  dicomPixelData = null;
  //@ts-ignore
  pngPixelData = null;
  //@ts-ignore
  imageSrc = null;
  //@ts-ignore
  canvas = null;

  let t1 = performance.now();
  console.log(
    `Call to exportImageToBase64OriginalSizes took ${t1 - t0} milliseconds.`
  );

  return base64;
};

// internal functions

/**
 * maps image pixel value in base64
 * @function mapToRange
 * @param value - Id of the original image element
 * @param inMin - Min greyscale value in the image
 * @param inMax - Max greyscale value in the image
 * @returns {number} image pixel value in base64
 */
export function mapToRange(
  value: number,
  inMin: number,
  inMax: number
): number {
  return ((value - inMin) / (inMax - inMin)) * 255;
}
