/** @module loaders/nrrdLoader
 *  @desc This file provides functionalities for
 *        custom NRRD Loader
 */

// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import { each, clone, range, findKey, filter, pickBy } from "lodash";
import { v4 as uuidv4 } from "uuid";

// internal libraries
import {
  getNormalOrientation,
  getPixelRepresentation,
  getTypedArrayFromDataType
} from "../imageUtils";

import {
  getImageFrame,
  getLarvitarImageTracker,
  getLarvitarManager
} from "./commonLoader";

// global module variables
let customImageLoaderCounter = 0;

/*
 * This module provides the following functions to be exported:
 * buildNrrdImage(volume, seriesId, custom_header)
 * getNrrdImageId(customLoaderName)
 * loadNrrdImage(imageId)
 * getImageIdFromSlice(sliceNumber, orientation)
 * getSliceNumberFromImageId(imageId, orientation)
 * getNrrdSerieDimensions()
 */

/**
 * Build the data structure for the provided image orientation
 * @instance
 * @function buildNrrdImage
 * @param {Object} volume The volume object
 * @param {String} seriesId The Id of the series
 * @param {Object} custom_header A custom header object
 * @return {Object} volume data
 */
export const buildNrrdImage = function (volume, seriesId, custom_header) {
  let t0 = performance.now();
  // standard image structure
  let image = {};
  let manager = getLarvitarManager();
  let imageTracker = getLarvitarImageTracker();
  image.currentImageIdIndex = 0;
  image.imageIds = [];
  image.instances = {};
  image.numberOfImages = 0;
  image.seriesDescription = "";
  image.seriesUID = seriesId;

  let header = {};
  header["volume"] = {};
  // need to extract header from nrrd file format
  // sizes, spaceDirections and spaceOrigin

  let spacing_x = Math.sqrt(
    volume.header["space directions"][0][0] *
      volume.header["space directions"][0][0] +
      volume.header["space directions"][0][1] *
        volume.header["space directions"][0][1] +
      volume.header["space directions"][0][2] *
        volume.header["space directions"][0][2]
  );
  let spacing_y = Math.sqrt(
    volume.header["space directions"][1][0] *
      volume.header["space directions"][1][0] +
      volume.header["space directions"][1][1] *
        volume.header["space directions"][1][1] +
      volume.header["space directions"][1][2] *
        volume.header["space directions"][1][2]
  );
  let spacing_z = Math.sqrt(
    volume.header["space directions"][2][0] *
      volume.header["space directions"][2][0] +
      volume.header["space directions"][2][1] *
        volume.header["space directions"][2][1] +
      volume.header["space directions"][2][2] *
        volume.header["space directions"][2][2]
  );
  header.volume.rows = volume.header.sizes[1];
  header.volume.cols = volume.header.sizes[0];
  header.volume.numberOfSlices = volume.header.sizes[2];
  header.volume.imagePosition = volume.header["space origin"];
  header.volume.pixelSpacing = [spacing_x, spacing_y];
  header.volume.sliceThickness = spacing_z;
  header.volume.repr =
    volume.header.type[0].toUpperCase() + volume.header.type.slice(1);
  header.volume.intercept = custom_header ? custom_header.intercept : null;
  header.volume.slope = custom_header ? custom_header.slope : null;
  header.volume.phase = custom_header ? custom_header.phase : null;
  header.volume.study_description = custom_header
    ? custom_header.study_description
    : "";
  header.volume.series_description = custom_header
    ? custom_header.series_description
    : "";
  header.volume.acquisition_date = custom_header
    ? custom_header.acquisition_date
    : "";

  let rows = volume.header.sizes[1];
  let cols = volume.header.sizes[0];
  let frames = volume.header.sizes[2];
  let iop = volume.header["space directions"][0].concat(
    volume.header["space directions"][1]
  );
  let firstIpp = header.volume.imagePosition;
  let w = getNormalOrientation(iop);
  let ps = header.volume.pixelSpacing;
  let thickness = header.volume.sliceThickness;
  let intercept = header.volume.intercept;
  let slope = header.volume.slope;

  let metadata = {
    x00280010: rows, // Rows
    x00280011: cols, // Columns
    x00200037: iop, // ImageOrientationPatient
    x00280030: ps, // PixelSpacing
    x00180050: [thickness][0], // SliceThickness
    x00281052: intercept ? [intercept] : [0],
    x00281053: slope ? [slope] : [1],
    x00200052: header.volume.imageIds
      ? header[header.volume.imageIds[0]].instanceUID
      : null,
    x0008103e: header.volume.imageIds
      ? header[header.volume.imageIds[0]].seriesDescription
      : null,
    x00080060: header.volume.imageIds
      ? header[header.volume.imageIds[0]].seriesModality
      : null,
    x00100010: header.volume.imageIds
      ? header[header.volume.imageIds[0]].patientName
      : null,
    x00280100: header.volume.imageIds
      ? header[header.volume.imageIds[0]].bitsAllocated
      : null,
    x00280103: header.volume.imageIds
      ? header[header.volume.imageIds[0]].pixelRepresentation
      : null,
    repr: header.volume.repr || null
  };

  // compute default ww/wl values here to use them also for resliced images
  let minMax = cornerstoneWADOImageLoader.getMinMax(volume.data);
  let maxVoi = minMax.max * metadata.x00281053[0] + metadata.x00281052[0];
  let minVoi = minMax.min * metadata.x00281053[0] + metadata.x00281052[0];
  let ww = maxVoi - minVoi;
  let wl = (maxVoi + minVoi) / 2;

  metadata.x00280106 = minMax.min;
  metadata.x00280107 = minMax.max;

  // extract the pixelData of each frame, store the data into the image object
  each(range(frames), function (sliceIndex) {
    let sliceSize = rows * cols;
    let sliceBuffer = volume.data.subarray(
      sliceSize * sliceIndex,
      sliceSize * (sliceIndex + 1)
    );
    let r = getPixelRepresentation(metadata);
    let typedArray = getTypedArrayFromDataType(r);
    let pixelData = new typedArray(sliceBuffer);
    // assign these values to the metadata of all images
    metadata.x00281050 = wl;
    metadata.x00281051 = ww;

    let imageId = getNrrdImageId("nrrdLoader");
    imageTracker[imageId] = seriesId;

    // store file references
    image.imageIds.push(imageId);
    image.instances[imageId] = {
      instanceId: uuidv4(),
      frame: sliceIndex
    };
    let frameMetadata = clone(metadata);

    frameMetadata.x00200032 = firstIpp.map(function (val, i) {
      return val + thickness * sliceIndex * w[i];
    });
    image.instances[imageId].metadata = frameMetadata;
    image.instances[imageId].pixelData = pixelData;
  });

  let middleSlice = Math.floor(image.imageIds.length / 2);
  image.currentImageIdIndex = middleSlice;
  image.numberOfImages = image.imageIds.length;
  // specify custom loader type and attach original header
  image.customLoader = "nrrdLoader";
  header.volume.imageIds = image.imageIds;
  image.nrrdHeader = header;

  manager[seriesId] = image;

  let t1 = performance.now();
  console.log(`Call to buildNrrdImage took ${t1 - t0} milliseconds.`);
  return image;
};

/**
 * Get the custom imageId from custom loader
 * @instance
 * @function getNrrdImageId
 * @param {String} customLoaderName The custom loader name
 * @return {String} the custom image id
 */
export const getNrrdImageId = function (customLoaderName) {
  let imageId = customLoaderName + "://" + customImageLoaderCounter;
  customImageLoaderCounter++;
  return imageId;
};

/**
 * Custom cornerstone image loader for nrrd files
 * @instance
 * @function loadNrrdImage
 * @param {String} imageId The image id
 * @return {Object} custom image object
 */
export const loadNrrdImage = function (imageId) {
  let manager = getLarvitarManager();
  let imageTracker = getLarvitarImageTracker();
  let seriesId = imageTracker[imageId];
  let instance = manager[seriesId].instances[imageId];
  return createCustomImage(imageId, instance.metadata, instance.pixelData);
};

/**
 * Retrieve imageId for a slice in the given orientation
 * @instance
 * @function getImageIdFromSlice
 * @param {Integer} sliceNumber The image slice number
 * @param {String} orientation The orientation tag
 * @param {String} seriesId The series id
 * @return {String} image id
 */
export const getImageIdFromSlice = function (
  sliceNumber,
  orientation,
  seriesId
) {
  var prefix = "nrrdLoader://";
  var serieImageTracker;
  let imageTracker = getLarvitarImageTracker();

  if (seriesId) {
    serieImageTracker = pickBy(imageTracker, image => {
      return image[0] == seriesId;
    });
  } else {
    serieImageTracker = imageTracker;
  }

  var firstImageId = findKey(serieImageTracker, entry => {
    return entry[1] == orientation;
  });

  var imageIndex =
    parseInt(firstImageId.split("//").pop()) + parseInt(sliceNumber);

  var imageId = prefix.concat(imageIndex.toString());

  return imageId;
};

/**
 * Retrieve slice number for a the given orientation
 * @instance
 * @function getSliceNumberFromImageId
 * @param {String} imageId The image slice id
 * @param {String} orientation The orientation tag
 * @param {String} seriesId The series id
 * @return {Integer} The image slice number
 */
export const getSliceNumberFromImageId = function (imageId, orientation) {
  let imageTracker = getLarvitarImageTracker();
  var firstImageId = findKey(imageTracker, entry => {
    return entry[1] == orientation;
  });

  var imageNumber = imageId.split("//").pop() || imageId;

  var imageIndex =
    parseInt(imageNumber) - parseInt(firstImageId.split("//").pop());

  return imageIndex;
};

/**
 * Get series dimension for each view
 * @instance
 * @function getNrrdSerieDimensions
 * @return {Object} Series dimension for each view
 */
export const getNrrdSerieDimensions = function () {
  let imageTracker = getLarvitarImageTracker();
  var dim_axial = filter(imageTracker, img => {
    return img[1] == "axial";
  });
  var dim_coronal = filter(imageTracker, img => {
    return img[1] == "coronal";
  });
  var dim_sagittal = filter(imageTracker, img => {
    return img[1] == "sagittal";
  });

  return {
    axial: [dim_coronal.length, dim_sagittal.length, dim_axial.length],
    coronal: [dim_sagittal.length, dim_axial.length, dim_coronal.length],
    sagittal: [dim_coronal.length, dim_axial.length, dim_sagittal.length]
  };
};

/* Internal functions */

/**
 * Create the custom image object for conrnestone from nrrd file
 * @instance
 * @function createCustomImage
 * @param {String} imageId The series id
 * @param {Object} metadata The metadata object
 * @param {Object} pixelData The pixelData object
 * @param {Object} dataSet The dataset
 * @return {String} The image id
 */
let createCustomImage = function (imageId, metadata, pixelData, dataSet) {
  let canvas = window.document.createElement("canvas");
  let lastImageIdDrawn = "";

  let imageFrame = getImageFrame(metadata, dataSet);

  // This function uses the pixelData received as argument without manipulating
  // them: if the image is compressed, the decompress function should be called
  // before creating the custom image object (like the multiframe case).
  imageFrame.pixelData = pixelData;

  let pixelSpacing = metadata.x00280030;
  let rescaleIntercept = metadata.x00281052;
  let rescaleSlope = metadata.x00281053;
  let windowCenter = metadata.x00281050;
  let windowWidth = metadata.x00281051;

  function getSizeInBytes() {
    let bytesPerPixel = Math.round(imageFrame.bitsAllocated / 8);
    return (
      imageFrame.rows *
      imageFrame.columns *
      bytesPerPixel *
      imageFrame.samplesPerPixel
    );
  }

  let image = {
    imageId: imageId,
    color: cornerstoneWADOImageLoader.isColorImage(
      imageFrame.photometricInterpretation
    ),
    columnPixelSpacing: pixelSpacing ? pixelSpacing[1] : undefined,
    columns: imageFrame.columns,
    height: imageFrame.rows,
    intercept: rescaleIntercept ? rescaleIntercept[0] : 0,
    invert: imageFrame.photometricInterpretation === "MONOCHROME1",
    minPixelValue: imageFrame.smallestPixelValue,
    maxPixelValue: imageFrame.largestPixelValue,
    render: undefined, // set below
    rowPixelSpacing: pixelSpacing ? pixelSpacing[0] : undefined,
    rows: imageFrame.rows,
    sizeInBytes: getSizeInBytes(),
    slope: rescaleSlope ? rescaleSlope[0] : 1,
    width: imageFrame.columns,
    windowCenter: windowCenter ? windowCenter[0] : undefined,
    windowWidth: windowWidth ? windowWidth[0] : undefined,
    decodeTimeInMS: undefined,
    webWorkerTimeInMS: undefined
  };

  // add function to return pixel data
  image.getPixelData = function () {
    return imageFrame.pixelData;
  };

  // convert color space
  if (image.color) {
    // setup the canvas context
    canvas.height = imageFrame.rows;
    canvas.width = imageFrame.columns;

    let context = canvas.getContext("2d");
    let imageData = context.createImageData(
      imageFrame.columns,
      imageFrame.rows
    );
    cornerstoneWADOImageLoader.convertColorSpace(imageFrame, imageData);

    imageFrame.imageData = imageData;
    imageFrame.pixelData = imageData.data;
  }

  // Setup the renderer
  if (image.color) {
    image.render = cornerstone.renderColorImage;
    image.getCanvas = function () {
      if (lastImageIdDrawn === imageId) {
        return canvas;
      }

      canvas.height = image.rows;
      canvas.width = image.columns;
      let context = canvas.getContext("2d");
      context.putImageData(imageFrame.imageData, 0, 0);
      lastImageIdDrawn = imageId;
      return canvas;
    };
  } else {
    image.render = undefined; // will be set at need in cornerstone render pipeline, see drawImageSync.js (line 44)
  }

  // calculate min/max if not supplied
  if (image.minPixelValue === undefined || image.maxPixelValue === undefined) {
    let minMax = cornerstoneWADOImageLoader.getMinMax(pixelData);
    image.minPixelValue = minMax.min;
    image.maxPixelValue = minMax.max;
  }

  // set the ww/wc to cover the dynamic range of the image if no values are supplied
  if (image.windowCenter === undefined || image.windowWidth === undefined) {
    if (image.color) {
      image.windowWidth = 255;
      image.windowCenter = 128;
    } else {
      let maxVoi = image.maxPixelValue * image.slope + image.intercept;
      let minVoi = image.minPixelValue * image.slope + image.intercept;
      image.windowWidth = maxVoi - minVoi;
      image.windowCenter = (maxVoi + minVoi) / 2;
    }
  }

  // Custom images does not have the "data" attribute becaouse their dataset is
  // not available. The "metadata" attribute is used by the storeImageData
  // function to store custom image pixelData and metadata.
  image.metadata = metadata;

  let promise = new Promise(function (resolve) {
    resolve(image);
  });

  // Return an object containing the Promise to cornerstone so it can setup callbacks to be
  // invoked asynchronously for the success/resolve and failure/reject scenarios.
  return {
    promise
  };
};
