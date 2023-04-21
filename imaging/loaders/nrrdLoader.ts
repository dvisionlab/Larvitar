/** @module loaders/nrrdLoader
 *  @desc This file provides functionalities for
 *        custom NRRD Loader
 */

// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import { each, clone, range, findKey, filter, pickBy } from "lodash";
import { v4 as uuidv4 } from "uuid";
import { ImageLoader } from "cornerstone-core";

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
import {
  Image,
  Instance,
  MetadataValue,
  Volume,
  LarvitarManager,
  ImageFrame,
  ImageTracker,
  CustomDataSet
} from "../types";

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

type NrrdInputVolume = {
  header: {
    sizes: number[];
    "space directions": number[][]; // a property with a space in the name ?? Seriously ??
    "space origin": [number, number];
    kinds: string[];
    type: string;
  };
  data: Uint16Array; // TODO-ts: other typed arrays ?
};

interface NrrdImage extends Instance {
  instanceId: string;
  frame: number;
}

type NrrdSeries = {
  currentImageIdIndex: number;
  imageIds: string[];
  instances: { [key: string]: NrrdImage };
  numberOfImages: number;
  seriesDescription: string;
  seriesUID: string;
  customLoader: string;
  nrrdHeader: NrrdHeader;
};

type NrrdHeader = {
  volume: Volume;
  intercept: number;
  slope: number;
  repr: string;
  phase: string;
  study_description: string;
  series_description: string;
  acquisition_date: string;
  [imageId: string]: string | number | Volume | NrrdInstance; // TODO-ts: fix this: we need just NrrdInstance
};

type NrrdInstance = {
  instanceUID: string;
  seriesDescription: string;
  seriesModality: string;
  patientName: string;
  bitsAllocated: number;
  pixelRepresentation: string;
};

// TODO-ts: why it's different from cornerstone type ?
// type Image = {
//   imageId: string;
//   rows: number;
//   columns: number;
//   minPixelValue: number;
//   maxPixelValue: number;
//   slope: number;
//   intercept: number;
//   windowCenter: number;
//   windowWidth: number;
//   render?: Function;
//   getPixelData?: Function;
//   getCanvas?: Function;
//   color: boolean;
//   columnPixelSpacing: number;
//   rowPixelSpacing: number;
//   invert: boolean;
//   sizeInBytes: number;
//   height: number;
//   width: number;
//   decodeTimeInMS?: number;
//   webWorkerTimeInMS?: number;
//   metadata: {[key: string]: MetadataValue};
// }

/**
 * Build the data structure for the provided image orientation
 * @instance
 * @function buildNrrdImage
 * @param {Object} volume The volume object
 * @param {String} seriesId The Id of the series
 * @param {Object} custom_header A custom header object
 * @return {Object} volume data
 */
export const buildNrrdImage = function (
  volume: NrrdInputVolume,
  seriesId: string,
  custom_header: NrrdHeader
) {
  //TODO-ts: better definition
  let t0 = performance.now();
  // standard image structure
  let image: Partial<NrrdSeries> = {};
  let manager = getLarvitarManager() as LarvitarManager;
  let imageTracker = getLarvitarImageTracker() as ImageTracker;
  image.currentImageIdIndex = 0;
  image.imageIds = [];
  image.instances = {};
  image.numberOfImages = 0;
  image.seriesDescription = "";
  image.seriesUID = seriesId;

  let header: Partial<NrrdHeader> = {};
  header.volume = {} as Volume;
  // need to extract header from nrrd file format
  // sizes, spaceDirections and spaceOrigin

  const index = volume.header.kinds[0] == "domain" ? 0 : 1;

  let spacing_x = Math.sqrt(
    volume.header["space directions"][index + 0][0] *
      volume.header["space directions"][index + 0][0] +
      volume.header["space directions"][index + 0][1] *
        volume.header["space directions"][index + 0][1] +
      volume.header["space directions"][index + 0][2] *
        volume.header["space directions"][index + 0][2]
  );
  let spacing_y = Math.sqrt(
    volume.header["space directions"][index + 1][0] *
      volume.header["space directions"][index + 1][0] +
      volume.header["space directions"][index + 1][1] *
        volume.header["space directions"][index + 1][1] +
      volume.header["space directions"][index + 1][2] *
        volume.header["space directions"][index + 1][2]
  );
  let spacing_z = Math.sqrt(
    volume.header["space directions"][index + 2][0] *
      volume.header["space directions"][index + 2][0] +
      volume.header["space directions"][index + 2][1] *
        volume.header["space directions"][index + 2][1] +
      volume.header["space directions"][index + 2][2] *
        volume.header["space directions"][index + 2][2]
  );
  header.volume.rows = volume.header.sizes[index + 1];
  header.volume.cols = volume.header.sizes[index + 0];
  header.volume.numberOfSlices = volume.header.sizes[index + 2];
  header.volume.imagePosition = volume.header["space origin"];
  header.volume.pixelSpacing = [spacing_x, spacing_y];
  header.volume.sliceThickness = spacing_z;
  header.volume.repr =
    volume.header.type[0].toUpperCase() + volume.header.type.slice(1);
  header.volume.intercept = custom_header ? custom_header.intercept : 0;
  header.volume.slope = custom_header ? custom_header.slope : 1;
  header.volume.phase = custom_header ? custom_header.phase : "";
  header.volume.study_description = custom_header
    ? custom_header.study_description
    : "";
  header.volume.series_description = custom_header
    ? custom_header.series_description
    : "";
  header.volume.acquisition_date = custom_header
    ? custom_header.acquisition_date
    : "";

  let rows = volume.header.sizes[index + 1];
  let cols = volume.header.sizes[index + 0];
  let frames = volume.header.sizes[index + 2];
  let iopArr = volume.header["space directions"][index + 0].concat(
    volume.header["space directions"][index + 1]
  );
  if (iopArr.length == 6) {
    throw new Error("Invalid Image Orientation");
  }
  let iop = iopArr as [number, number, number, number, number, number];
  let firstIpp = header.volume.imagePosition;
  let w = getNormalOrientation(iop);
  let ps = header.volume.pixelSpacing;
  let thickness = header.volume.sliceThickness;
  let intercept = header.volume.intercept;
  let slope = header.volume.slope;

  let metadata: Partial<Instance["metadata"]> = {
    x00280010: rows, // Rows
    x00280011: cols, // Columns
    x00200037: iop, // ImageOrientationPatient
    x00280030: ps, // PixelSpacing
    x00180050: [thickness][0], // SliceThickness
    x00281052: intercept ? [intercept] : [0],
    x00281053: slope ? [slope] : [1],
    x00200052: header.volume.imageIds
      ? (header[header.volume.imageIds[0]] as NrrdInstance).instanceUID
      : null,
    x0008103e: header.volume.imageIds
      ? (header[header.volume.imageIds[0]] as NrrdInstance).seriesDescription
      : null,
    x00080060: header.volume.imageIds
      ? (header[header.volume.imageIds[0]] as NrrdInstance).seriesModality
      : null,
    x00100010: header.volume.imageIds
      ? (header[header.volume.imageIds[0]] as NrrdInstance).patientName
      : null,
    x00280100: header.volume.imageIds
      ? (header[header.volume.imageIds[0]] as NrrdInstance).bitsAllocated
      : null,
    x00280103: header.volume.imageIds
      ? (header[header.volume.imageIds[0]] as NrrdInstance).pixelRepresentation
      : null,
    repr: header.volume.repr || null
  };

  // compute default ww/wl values here to use them also for resliced images
  let minMax = cornerstoneWADOImageLoader.getMinMax(volume.data);
  let maxVoi =
    minMax.max * (metadata.x00281053 as number[])[0] +
    (metadata.x00281052 as number[])[0];
  let minVoi =
    minMax.min * (metadata.x00281053 as number[])[0] +
    (metadata.x00281052 as number[])[0];
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

    if (!metadata) {
      throw new Error("Metadata not found");
    }

    // @ts-ignore: TODO this is concepptually wrong, we already know the Pixel Representation
    // (see above, line 241), this function just returns the same value again
    let r = getPixelRepresentation(metadata);
    let typedArray = getTypedArrayFromDataType(r);

    if (!typedArray) {
      throw new Error("Typed array not found");
    }

    let pixelData = new typedArray(sliceBuffer);
    // assign these values to the metadata of all images
    metadata.x00281050 = wl;
    metadata.x00281051 = ww;

    let imageId = getNrrdImageId("nrrdLoader");
    if (!imageTracker) {
      throw new Error("Image tracker not initialized");
    }
    imageTracker[imageId] = seriesId;

    // store file references
    image.imageIds!.push(imageId);
    let frameMetadata: { [key: string]: MetadataValue } = clone(metadata);
    frameMetadata.x00200032 = firstIpp.map(function (val, i) {
      return val + thickness * sliceIndex * w[i];
    });
    image.instances![imageId] = {
      instanceId: uuidv4(),
      frame: sliceIndex,
      metadata: frameMetadata,
      pixelData: pixelData
    };
  });

  let middleSlice = Math.floor(image.imageIds.length / 2);
  image.currentImageIdIndex = middleSlice;
  image.numberOfImages = image.imageIds.length;
  // specify custom loader type and attach original header
  image.customLoader = "nrrdLoader";
  header.volume.imageIds = image.imageIds;
  image.nrrdHeader = header as NrrdHeader;

  if (!manager) {
    throw new Error("Larvitar manager not initialized");
  }

  manager[seriesId] = image as NrrdSeries;

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
export const getNrrdImageId = function (customLoaderName: string) {
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
export const loadNrrdImage: ImageLoader = function (imageId: string) {
  let manager = getLarvitarManager() as LarvitarManager;
  let imageTracker = getLarvitarImageTracker() as ImageTracker;
  if (!manager || !imageTracker) {
    throw new Error("Larvitar manager or image tracker not initialized");
  }
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
  sliceNumber: number,
  orientation: string,
  seriesId: string
) {
  var prefix = "nrrdLoader://";
  var serieImageTracker;
  let imageTracker = getLarvitarImageTracker() as ImageTracker;

  if (seriesId) {
    serieImageTracker = pickBy(imageTracker, image => {
      return image[0] == seriesId;
    });
  } else {
    serieImageTracker = imageTracker;
  }

  var firstImageIdStr = findKey(serieImageTracker, entry => {
    return entry[1] == orientation;
  });

  let firstImageId = firstImageIdStr?.split("//").pop();

  if (firstImageId == undefined) {
    console.error("cannot find imageId for orientation: " + orientation);
    return "";
  }

  var imageIndex = parseInt(firstImageId) + parseInt(sliceNumber.toString());

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
export const getSliceNumberFromImageId = function (
  imageId: string,
  orientation: string
) {
  let imageTracker = getLarvitarImageTracker() as ImageTracker;
  var firstImageIdStr = findKey(imageTracker, entry => {
    return entry[1] == orientation;
  });

  if (firstImageIdStr == undefined) {
    console.error("cannot find imageId for orientation: " + orientation);
    return 0;
  }

  var imageNumber = imageId.split("//").pop() || imageId;
  let firstImageId = firstImageIdStr.split("//").pop();

  if (firstImageId == undefined) {
    console.error("cannot find imageId for orientation: " + orientation);
    return 0;
  }

  var imageIndex = parseInt(imageNumber) - parseInt(firstImageId);

  return imageIndex;
};

/**
 * Get series dimension for each view
 * @instance
 * @function getNrrdSerieDimensions
 * @return {Object} Series dimension for each view
 */
export const getNrrdSerieDimensions = function () {
  let imageTracker = getLarvitarImageTracker() as ImageTracker;
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
let createCustomImage = function (
  imageId: string,
  metadata: { [key: string]: MetadataValue },
  pixelData: Uint8ClampedArray,
  dataSet?: any
) {
  //TODO-ts check this
  let canvas = window.document.createElement("canvas");
  let lastImageIdDrawn = "";

  let imageFrame = getImageFrame(metadata, dataSet) as ImageFrame;

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

  let image: Partial<Image> = {
    imageId: imageId,
    color: cornerstoneWADOImageLoader.isColorImage(
      imageFrame.photometricInterpretation
    ),
    columnPixelSpacing: pixelSpacing
      ? (pixelSpacing as number[])[1]
      : undefined,
    columns: imageFrame.columns,
    height: imageFrame.rows,
    intercept: rescaleIntercept ? (rescaleIntercept as number[])[0] : 0,
    invert: imageFrame.photometricInterpretation === "MONOCHROME1",
    minPixelValue: imageFrame.smallestPixelValue,
    maxPixelValue: imageFrame.largestPixelValue,
    render: undefined, // set below
    rowPixelSpacing: pixelSpacing ? (pixelSpacing as number[])[0] : undefined,
    rows: imageFrame.rows,
    sizeInBytes: getSizeInBytes(),
    slope: rescaleSlope ? (rescaleSlope as number[])[0] : 1,
    width: imageFrame.columns,
    windowCenter: windowCenter ? (windowCenter as number[])[0] : undefined,
    windowWidth: windowWidth ? (windowWidth as number[])[0] : undefined,
    decodeTimeInMS: undefined,
    webWorkerTimeInMS: undefined
  };

  // add function to return pixel data
  image.getPixelData = function () {
    if (!imageFrame.pixelData) {
      console.warn('no pixel data for imageId "' + imageId);
      return [];
    }
    return Array.from(imageFrame.pixelData);
  };

  // convert color space
  if (image.color) {
    // setup the canvas context
    canvas.height = imageFrame.rows;
    canvas.width = imageFrame.columns;

    let context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to get canvas context");
    }

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

      canvas.height = image.rows || 0;
      canvas.width = image.columns || 0;
      let context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Unable to get canvas context");
      }
      context.putImageData(imageFrame.imageData!, 0, 0);
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
    } else if (
      image.maxPixelValue &&
      image.minPixelValue &&
      image.slope &&
      image.intercept
    ) {
      let maxVoi = image.maxPixelValue * image.slope + image.intercept;
      let minVoi = image.minPixelValue * image.slope + image.intercept;
      image.windowWidth = maxVoi - minVoi;
      image.windowCenter = (maxVoi + minVoi) / 2;
    } else {
      console.error(
        "Unable to calculate default window width/center for imageId: " +
          imageId
      );
    }
  }

  // Custom images does not have the "data" attribute becaouse their dataset is
  // not available. The "metadata" attribute is used by the storeImageData
  // function to store custom image pixelData and metadata.
  image.metadata = metadata;

  let promise: Promise<Image> = new Promise(function (resolve) {
    resolve(image as Image);
  });

  // Return an object containing the Promise to cornerstone so it can setup callbacks to be
  // invoked asynchronously for the success/resolve and failure/reject scenarios.
  return {
    promise
  };
};
