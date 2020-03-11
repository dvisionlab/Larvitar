/*
 This file provides functionalities for
 custom NRRD Loader
*/

// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import {
  each,
  clone,
  omit,
  range,
  includes,
  findKey,
  filter,
  pickBy
} from "lodash";
import uuid from "uuid";

// internal libraries
import {
  getNormalOrientation,
  getReslicedMetadata,
  getCmprMetadata,
  getReslicedPixeldata,
  getPixelRepresentation
} from "../image_utils";

import { getImageFrame } from "./commonLoader";
import { store } from "../image_store";

// global module variables
let customImageLoaderCounter = 0;
export var nrrdManager = {};
export var nrrdImageTracker = {};
const orientations = store.get("viewports");

/*
 * This module provides the following functions to be exported:
 * loadImageWithOrientation(header, volume, seriesId, orientation)
 * getNrrdImageId(customLoaderName)
 * removeSeriesFromNrrdManager(seriesId)
 * getSeriesData(seriesId)
 * populateNrrdManager(header, volume, seriesId, orientation)
 * loadNrrdImage(imageId)
 * getImageIdFromSlice(sliceNumber, orientation)
 * resetNrrdLoader()
 * getSerieDimensions()
 */

// ==============================================================
// Build the data structure for the provided image orientation ==
// ==============================================================
export const loadImageWithOrientation = function(
  header,
  volume,
  seriesId,
  orientation
) {
  let seriesData = populateNrrdManager(header, volume, seriesId, orientation);
  return seriesData;
};

// =========================================
// Reset the NRRD Loader global variables ==
// =========================================
export const resetNrrdLoader = function() {
  customImageLoaderCounter = 0;
  nrrdManager = {};
  nrrdImageTracker = {};
};

// ============================================
// Get the custom imageId from custom loader ==
// ============================================
export const getNrrdImageId = function(customLoaderName) {
  let imageId = customLoaderName + "://" + customImageLoaderCounter;
  customImageLoaderCounter++;
  return imageId;
};

// ================================================
// Remove a stored seriesId from the nnrdManager ==
// ================================================
export const removeSeriesFromNrrdManager = function(seriesId) {
  if (nrrdManager[seriesId]) {
    nrrdManager = omit(nrrdManager, seriesId);
  }
};

// ===================================================================
// Return the data of a specific seriesId stored in the nnrdManager ==
// ===================================================================
export const getSeriesData = function(seriesId) {
  return nrrdManager[seriesId];
};

// ===================================================
// this function can be called in order to populate ==
// the nrrd manager for a provided orientation =======
// ===================================================
export const populateNrrdManager = function(
  header,
  volume,
  seriesId,
  orientation
) {
  // orientation can be: axial, coronal, sagittal, mprAxial, mprCoronal
  if (!includes(orientations, orientation)) {
    console.error(
      "The provided orientation: " + orientation + " is not supported"
    );
    return null;
  }

  // check if nrrdManager exists for this seriesId
  if (!nrrdManager[seriesId]) {
    // console.error('no series found with id', seriesId)
    nrrdManager[seriesId] = {};
  }
  // initialize nnrdManager for provided orientation
  nrrdManager[seriesId][orientation] = {};
  nrrdManager[seriesId][orientation].currentImageIdIndex = 0;
  nrrdManager[seriesId][orientation].imageIds = [];
  nrrdManager[seriesId][orientation].instances = {};

  // build the data according to orientation
  let data;
  switch (orientation) {
    case "axial":
      data = initializeMainViewport(header, volume, seriesId);
      break;
    case "coronal":
      data = initializeReslicedViewport(seriesId, "coronal");
      break;
    case "sagittal":
      data = initializeReslicedViewport(seriesId, "sagittal");
      break;
    case "cmprSagittal":
    case "cmprAxial":
      data = initializeCmprViewport(header, volume, seriesId, orientation);
      break;
    default:
      break;
  }
  return data;
};

// =================================================
// Custom cornerstone image loader for nrrd files ==
// =================================================
export const loadNrrdImage = function(imageId) {
  let seriesId = nrrdImageTracker[imageId][0];
  let orientation = nrrdImageTracker[imageId][1];
  let instance = nrrdManager[seriesId][orientation].instances[imageId];
  return createCustomImage(imageId, instance.metadata, instance.pixelData);
};

// ========================================================
// Retrieve imageId for a slice in the given orientation ==
// ========================================================
export function getImageIdFromSlice(sliceNumber, orientation, seriesId) {
  var prefix = "nrrdLoader://";
  var serieImageTracker;

  if (seriesId) {
    serieImageTracker = pickBy(nrrdImageTracker, image => {
      return image[0] == seriesId;
    });
  } else {
    serieImageTracker = nrrdImageTracker;
  }

  var firstImageId = findKey(serieImageTracker, entry => {
    return entry[1] == orientation;
  });

  var imageIndex =
    parseInt(firstImageId.split("//").pop()) + parseInt(sliceNumber);

  var imageId = prefix.concat(imageIndex.toString());

  return imageId;
}

// ========================================================
// Retrieve imageId for a slice in the given orientation ==
// ========================================================
export function getSliceNumberFromImageId(imageId, orientation) {
  var firstImageId = findKey(nrrdImageTracker, entry => {
    return entry[1] == orientation;
  });

  var imageNumber = imageId.split("//").pop() || imageId;

  var imageIndex =
    parseInt(imageNumber) - parseInt(firstImageId.split("//").pop());

  return imageIndex;
}

// ====================================
// Get serie dimension for each view ==
// ====================================
export function getSerieDimensions() {
  var dim_axial = filter(nrrdImageTracker, img => {
    return img[1] == "axial";
  });
  var dim_coronal = filter(nrrdImageTracker, img => {
    return img[1] == "coronal";
  });
  var dim_sagittal = filter(nrrdImageTracker, img => {
    return img[1] == "sagittal";
  });

  return {
    axial: [dim_coronal.length, dim_sagittal.length, dim_axial.length],
    coronal: [dim_sagittal.length, dim_axial.length, dim_coronal.length],
    sagittal: [dim_coronal.length, dim_axial.length, dim_sagittal.length]
  };
}

/* Internal functions */

// =============================================================
// Build the cornerstone data structure into the nrrd manager ==
// from data (nrdd file) for the main viewport (axial) =========
// =============================================================
let initializeMainViewport = function(header, volume, seriesId) {
  // get metadata from original volume and header
  let rows = volume.sizes[0];
  let cols = volume.sizes[1];
  let frames = volume.sizes[2];
  let iop = volume.spaceDirections[0].concat(volume.spaceDirections[1]);
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
    x00180050: [thickness], // SliceThickness
    x00281052: intercept ? [intercept] : [0],
    x00281053: slope ? [slope] : [1],
    x00200052: header[header.volume.imageIds[0]].instanceUID,
    x0008103e: header[header.volume.imageIds[0]].seriesDescription,
    x00080060: header[header.volume.imageIds[0]].seriesModality,
    x00100010: header[header.volume.imageIds[0]].patientName,
    x00280100: header[header.volume.imageIds[0]].bitsAllocated,
    x00280103: header[header.volume.imageIds[0]].pixelRepresentation,
    repr: header.volume.repr
  };

  // compute default ww/wl values here to use them also for resliced images
  let minMax = cornerstoneWADOImageLoader.getMinMax(volume.data);
  let maxVoi = minMax.max * metadata.x00281053[0] + metadata.x00281052[0];
  let minVoi = minMax.min * metadata.x00281053[0] + metadata.x00281052[0];
  let ww = maxVoi - minVoi;
  let wl = (maxVoi + minVoi) / 2;

  // extract the pixelData of each frame, store the data into the nrrdManager
  each(range(frames), function(sliceIndex) {
    let sliceSize = rows * cols;
    let sliceBuffer = volume.data.subarray(
      sliceSize * sliceIndex,
      sliceSize * (sliceIndex + 1)
    );
    let r = getPixelRepresentation(metadata);
    let pixelData;
    switch (r) {
      case "Uint8":
        pixelData = new Uint8Array(sliceBuffer);
        break;
      case "Sint8":
        pixelData = new Int8Array(sliceBuffer);
        break;
      case "Uint16":
        pixelData = new Uint16Array(sliceBuffer);
        break;
      case "Sint16":
        pixelData = new Int16Array(sliceBuffer);
        break;
      case "Uint32":
        pixelData = new Uint32Array(sliceBuffer);
        break;
      case "Sint32":
        pixelData = new Int32Array(sliceBuffer);
        break;
    }
    // assign these values to the metadata of all images
    metadata.x00281050 = [wl];
    metadata.x00281051 = [ww];

    let imageId = getNrrdImageId("nrrdLoader");
    nrrdImageTracker[imageId] = [seriesId, "axial"];

    // store file references
    nrrdManager[seriesId]["axial"].imageIds.push(imageId);
    nrrdManager[seriesId]["axial"].instances[imageId] = {
      instanceId: uuid.v4(),
      frame: sliceIndex
    };

    let frameMetadata = clone(metadata);

    frameMetadata.x00200032 = firstIpp.map(function(val, i) {
      return val + thickness * sliceIndex * w[i];
    });
    nrrdManager[seriesId]["axial"].instances[imageId].metadata = frameMetadata;
    nrrdManager[seriesId]["axial"].instances[imageId].pixelData = pixelData;
  });
  let imageIds = nrrdManager[seriesId]["axial"].imageIds;
  let middleSlice = Math.floor(imageIds.length / 2);
  nrrdManager[seriesId]["axial"].currentImageIdIndex = middleSlice;

  return nrrdManager[seriesId]["axial"];
};

// ===================================================================
// Build the cornerstone data structure into the nrrd manager ========
// from data (computed by vtk algorithm) for a resliced viewport =====
// (cmpr-orientation) using the native one (axial) as starting data ==
// ===================================================================
let initializeCmprViewport = function(header, volume, seriesId, orientation) {
  const someIsNotZero = volume.some(item => item !== 0);
  if (!someIsNotZero) {
    console.warn("serie is empty", orientation);
  }

  // build the nrrdManager instance for this orientation
  nrrdManager[seriesId][orientation] = {};
  let reslicedSeriesId = seriesId + "_" + orientation;

  // get the resliced metadata from native one TODO set proper metadata for cmpr
  let reslicedData = getCmprMetadata(reslicedSeriesId, "nrrdLoader", header);

  nrrdManager[seriesId][orientation].imageIds = reslicedData.imageIds;
  nrrdManager[seriesId][orientation].instances = reslicedData.instances;

  // populate nrrdManager with the pixelData information
  each(nrrdManager[seriesId][orientation].imageIds, function(imageId, slice_n) {
    let i = header.rows;
    let j = header.cols;

    // Render some fake data for dev
    let data = volume.slice(slice_n * i * j, (slice_n + 1) * i * j);

    nrrdManager[seriesId][orientation].instances[imageId].pixelData = data;

    // track image data
    nrrdImageTracker[imageId] = [seriesId, orientation];
  });

  // set currentImageIdIndex to the middle slice
  let imageIds = nrrdManager[seriesId][orientation].imageIds;
  let middleSlice = Math.floor(imageIds.length / 2);
  nrrdManager[seriesId][orientation].currentImageIdIndex = middleSlice;
  return nrrdManager[seriesId][orientation];
};

// ==============================================================
// Build the cornerstone data structure into the nrrd manager ===
// from data (nrdd file) for a resliced viewport (orientation) ==
// using the native one (axial) as starting data ================
// ==============================================================
function initializeReslicedViewport(seriesId, orientation) {
  let seriesData = nrrdManager[seriesId]["axial"];
  if (!seriesData) {
    console.error("Main viewport data is missing!");
    return null;
  }
  // build the nrrdManager instance for this orientation
  nrrdManager[seriesId][orientation] = {};
  let reslicedSeriesId = seriesId + "_" + orientation;

  // get the resliced metadata from native one
  let reslicedData = getReslicedMetadata(
    reslicedSeriesId,
    "axial",
    orientation,
    seriesData,
    "nrrdLoader"
  );

  nrrdManager[seriesId][orientation].imageIds = reslicedData.imageIds;
  nrrdManager[seriesId][orientation].instances = reslicedData.instances;

  // populate nrrdManager with the pixelData information
  each(nrrdManager[seriesId][orientation].imageIds, function(imageId) {
    let data = getReslicedPixeldata(
      imageId,
      seriesData,
      nrrdManager[seriesId][orientation]
    );

    nrrdManager[seriesId][orientation].instances[imageId].pixelData = data;

    // track image data // TODO CHECK THIS
    nrrdImageTracker[imageId] = [seriesId, orientation];
  });

  // set currentImageIdIndex to the middle slice
  let imageIds = nrrdManager[seriesId][orientation].imageIds;
  let middleSlice = Math.floor(imageIds.length / 2);
  nrrdManager[seriesId][orientation].currentImageIdIndex = middleSlice;
  return nrrdManager[seriesId][orientation];
}

// ================================================================
// create the custom image object for conrnestone from nrrd file ==
// ================================================================
let createCustomImage = function(imageId, metadata, pixelData, dataSet) {
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
    intercept: rescaleIntercept ? rescaleIntercept : 0,
    invert: imageFrame.photometricInterpretation === "MONOCHROME1",
    minPixelValue: imageFrame.smallestPixelValue,
    maxPixelValue: imageFrame.largestPixelValue,
    render: undefined, // set below
    rowPixelSpacing: pixelSpacing ? pixelSpacing[0] : undefined,
    rows: imageFrame.rows,
    sizeInBytes: getSizeInBytes(),
    slope: rescaleSlope ? rescaleSlope : 1,
    width: imageFrame.columns,
    windowCenter: windowCenter ? windowCenter[0] : undefined,
    windowWidth: windowWidth ? windowWidth[0] : undefined,
    decodeTimeInMS: undefined,
    webWorkerTimeInMS: undefined
  };

  // add function to return pixel data
  image.getPixelData = function() {
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
    image.getCanvas = function() {
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
    console.log("render grayscaleimage");
    image.render = cornerstone.renderGrayscaleImage;
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

  let promise = new Promise(function(resolve) {
    resolve(image);
  });

  // Return an object containing the Promise to cornerstone so it can setup callbacks to be
  // invoked asynchronously for the success/resolve and failure/reject scenarios.
  return {
    promise
  };
};
