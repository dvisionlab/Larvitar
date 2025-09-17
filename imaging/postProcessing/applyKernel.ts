import { getMinMaxPixelValue } from "../imageUtils";
import {
  Image,
  TypedArray,
  KernelConfig,
  FilterImageFrame,
  ConvolutionKernels
} from "../types";
const CONVOLUTION_KERNELS: ConvolutionKernels = {
  /* gaussianBlur: {
    label: "Gaussian Blur 3x3",
    size: 3,
    kernel: [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1]
    ]
  },
  edgeDetect: {
    label: "Edge Detection 3x3",
    size: 3,
    kernel: [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1]
    ]
  }*/
};

/**
 * Determine the appropriate TypedArray constructor based on input data
 * @function getTypedArrayConstructor
 * @param {TypedArray} pixelData - Original pixel data
 * @returns {Function} - TypedArray constructor
 */
const getTypedArrayConstructor = function (pixelData: TypedArray) {
  if (pixelData instanceof Int8Array) return Int8Array;
  if (pixelData instanceof Uint8Array) return Uint8Array;
  if (pixelData instanceof Int16Array) return Int16Array;
  if (pixelData instanceof Uint16Array) return Uint16Array;
  if (pixelData instanceof Int32Array) return Int32Array;
  if (pixelData instanceof Uint32Array) return Uint32Array;
  if (pixelData instanceof Float32Array) return Float32Array;
  if (pixelData instanceof Float64Array) return Float64Array;

  return Int16Array;
};

/**
 * Core convolution algorithm
 * @function convolve
 * @param {FilterImageFrame} imageFrame - Image frame data containing width, height, and pixelData
 * @param {Array} kernel - 2D array representing the convolution kernel
 * @returns {TypedArray} - Convolved pixel data
 */
const convolve = function (
  imageFrame: FilterImageFrame,
  kernel: number[][]
): TypedArray {
  const typedArrayConstructor = getTypedArrayConstructor(imageFrame.pixelData);
  const pixelData = imageFrame.pixelData;

  const origin = Math.floor(kernel.length / 2);

  const getPixel = (x: number, y: number) => {
    x -= origin;
    y -= origin;

    x = Math.max(0, Math.min(x, imageFrame.width - 1));
    y = Math.max(0, Math.min(y, imageFrame.height - 1));

    return pixelData[x + y * imageFrame.width];
  };

  const getConvolvedPixel = (x: number, y: number) => {
    let convolvedPixel = 0;

    for (let i = 0; i < kernel.length; i++) {
      for (let j = 0; j < kernel[i].length; j++) {
        convolvedPixel += getPixel(x + j, y + i) * kernel[i][j];
      }
    }

    return convolvedPixel < 0 ? 0 : convolvedPixel;
  };

  const convolvedPixelData = new typedArrayConstructor(pixelData.length);

  for (let y = 0; y < imageFrame.height; y++) {
    for (let x = 0; x < imageFrame.width; x++) {
      let pixel = getConvolvedPixel(x, y);

      pixel = Math.max(Math.min(pixel, 32767), -32768);

      convolvedPixelData[x + y * imageFrame.width] = pixel;
    }
  }

  return convolvedPixelData;
};

/**
 * Add custom kernel to the global object
 * @function addCustomKernel
 * @param {string} name - Name for the new kernel
 * @param {KernelConfig} config - Kernel configuration (modality, label, size, kernel)
 * @returns {void}
 */
export const addCustomKernel = function (
  name: string,
  config: KernelConfig
): void {
  if (!config.kernel || !Array.isArray(config.kernel)) {
    throw new Error("Kernel must be a 2D array");
  }

  CONVOLUTION_KERNELS[name] = {
    label: config.label,
    size: config.size,
    kernel: config.kernel
  };
};

/**
 * Get kernels
 * @function getKernels
 * @returns {ConvolutionKernels} - CONVOLUTION_KERNELS object
 */
export const getKernels = function () {
  return { ...CONVOLUTION_KERNELS };
};

/**
 * Apply convolution filter to DICOM image
 * @function applyConvolutionFilter
 * @param {Image} loadedImage - The DICOM image object
 * @param {string} filterName - Name of the filter to apply
 * @param {number} multiplier - Optional multiplier for kernel values (default: 1)
 * @returns {TypedArray} - Convolved pixel data
 */
export const applyConvolutionFilter = function (
  loadedImage: Image,
  filterName: string,
  generateImage: boolean = false
): Partial<Image> | TypedArray {
  if (!CONVOLUTION_KERNELS[filterName]) {
    throw new Error(`Filter '${filterName}' not found`);
  }

  const pixelData = loadedImage.getPixelData() as unknown as TypedArray;
  const imageFrame = {
    width: loadedImage.width,
    height: loadedImage.height,
    pixelData: pixelData
  };

  const kernel = CONVOLUTION_KERNELS[filterName].kernel;
  const filteredPixelArray = convolve(imageFrame, kernel);
  const filteredImage = createFilteredImage(
    loadedImage,
    filteredPixelArray as unknown as number[]
  );
  return generateImage ? filteredImage : filteredPixelArray;
};

/**
 * Create the filtered image
 * @function createFilteredImage
 * @param {Image} loadedImage - the source image
 * @param {number[]} filteredPixelArray - filtered pixel data
 * @returns {Partial<Image>} - Convolved pixel data
 */
export const createFilteredImage = function (
  loadedImage: Image,
  filteredPixelArray: number[]
): Partial<Image> {
  const { minPixelValue, maxPixelValue } =
    getMinMaxPixelValue(filteredPixelArray);

  const filteredImage: Partial<Image> = {
    color: false,
    columns: loadedImage.columns,
    rows: loadedImage.rows,
    width: loadedImage.width,
    height: loadedImage.height,
    imageId: new Date().toISOString(),
    maxPixelValue,
    minPixelValue,
    windowWidth: loadedImage.windowWidth,
    windowCenter: loadedImage.windowCenter,
    sizeInBytes: loadedImage.sizeInBytes,
    render: loadedImage.render,
    slope: loadedImage.slope,
    intercept: loadedImage.intercept,
    invert: loadedImage.invert,
    getPixelData: function () {
      return filteredPixelArray;
    }
  };
  return filteredImage;
};

/**
 * Generates a Gaussian kernel for blurring.
 * @function generateGaussianKernel
 * @param {number} size - The size of the kernel (must be an odd number).
 * @param {number} sigma - The standard deviation (strength) of the Gaussian distribution.
 * @returns {number[][]} - The generated 2D kernel.
 */
const generateGaussianKernel = function (
  size: number,
  sigma: number
): number[][] {
  if (size % 2 === 0 || size < 3) {
    throw new Error("Kernel size must be an odd number >= 3");
  }

  const kernel: number[][] = Array(size)
    .fill(0)
    .map(() => Array(size).fill(0));
  let sum = 0;
  const half = Math.floor(size / 2);
  const sigma2 = 2 * sigma * sigma;

  for (let y = -half; y <= half; y++) {
    for (let x = -half; x <= half; x++) {
      const exponent = -(x * x + y * y) / sigma2;
      const value = Math.exp(exponent);
      kernel[y + half][x + half] = value;
      sum += value;
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      kernel[y][x] /= sum;
    }
  }

  return kernel;
};

/**
 * Generates a sharpening kernel.
 * @function generateSharpenKernel
 * @param {number} size - The size of the kernel (must be an odd number).
 * @param {number} strength - The strength of the sharpening effect.
 * @returns {number[][]} - The generated 2D kernel.
 */
const generateSharpenKernel = function (
  size: number,
  strength: number
): number[][] {
  if (size % 2 === 0 || size < 3) {
    throw new Error("Kernel size must be an odd number >= 3");
  }

  const kernel: number[][] = Array(size)
    .fill(0)
    .map(() => Array(size).fill(-strength));
  const center = Math.floor(size / 2);

  kernel[center][center] = 1 + strength * (size * size - 1);

  return kernel;
};

/**
 * Applies a Gaussian blur filter to a cornerstone image.
 * @function applyGaussianBlur
 * @param {Image} loadedImage - The cornerstone image object.
 * @param {number} kernelSize - The size of the kernel.
 * @param {number} strength - The sigma value for the Gaussian function.
 * @returns {Partial<Image>} - The new, blurred cornerstone image object.
 */
export const applyGaussianBlur = function (
  loadedImage: Image,
  kernelSize: number,
  strength: number
): Partial<Image> {
  const pixelData = loadedImage.getPixelData() as unknown as TypedArray;
  const imageFrame = {
    width: loadedImage.width,
    height: loadedImage.height,
    pixelData: pixelData
  };

  const kernel = generateGaussianKernel(kernelSize, strength);
  const filteredPixelArray = convolve(
    imageFrame,
    kernel
  ) as unknown as number[];
  return createFilteredImage(loadedImage, filteredPixelArray);
};

/**
 * Applies a sharpening filter to a cornerstone image.
 * @function applySharpening
 * @param {Image} loadedImage - The cornerstone image object.
 * @param {number} kernelSize - The size of the kernel.
 * @param {number} strength - The strength of the sharpening effect.
 * @returns {Partial<Image>} - The new, sharpened cornerstone image object.
 */
export const applySharpening = function (
  loadedImage: Image,
  kernelSize: number,
  strength: number
): Partial<Image> {
  const pixelData = loadedImage.getPixelData() as unknown as TypedArray;
  const imageFrame = {
    width: loadedImage.width,
    height: loadedImage.height,
    pixelData: pixelData
  };

  const kernel = generateSharpenKernel(kernelSize, strength);
  const filteredPixelArray = convolve(
    imageFrame,
    kernel
  ) as unknown as number[];
  return createFilteredImage(loadedImage, filteredPixelArray);
};
