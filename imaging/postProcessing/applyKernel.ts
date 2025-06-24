import { getMinMaxPixelValue } from "../imageUtils";
import { Image, TypedArray, KernelConfig } from "../types";
const CONVOLUTION_KERNELS: { [key: string]: KernelConfig } = {
  sharpen5Low: {
    modality: "sharpen",
    label: "Sharpen 5x5 Low",
    size: 7,
    kernel: [
      [0, 0, -1, -1, -1, 0, 0],
      [0, -1, -3, -3, -3, -1, 0],
      [-1, -3, 0, 7, 0, -3, -1],
      [-1, -3, 7, 24, 7, -3, -1],
      [-1, -3, 0, 7, 0, -3, -1],
      [0, -1, -3, -3, -3, -1, 0],
      [0, 0, -1, -1, -1, 0, 0]
    ]
  },
  sharpen5Med: {
    modality: "sharpen",
    label: "Sharpen 5x5 Medium",
    size: 5,
    kernel: [
      [-1, -1, -1, -1, -1],
      [-1, 2, 2, 2, -1],
      [-1, 2, 8, 2, -1],
      [-1, 2, 2, 2, -1],
      [-1, -1, -1, -1, -1]
    ]
  },
  sharpen5High: {
    modality: "sharpen",
    label: "Sharpen 5x5 High",
    size: 5,
    kernel: [
      [-1, -1, -1, -1, -1],
      [-1, 2, 2, 2, -1],
      [-1, 2, 16, 2, -1],
      [-1, 2, 2, 2, -1],
      [-1, -1, -1, -1, -1]
    ]
  },
  sharpen7Low: {
    modality: "sharpen",
    label: "Sharpen 7x7 Low",
    size: 7,
    kernel: [
      [-1, -1, -1, -1, -1, -1, -1],
      [-1, 1, 2, 3, 2, 1, -1],
      [-1, 2, 4, 5, 4, 2, -1],
      [-1, 3, 5, 24, 5, 3, -1],
      [-1, 2, 4, 5, 4, 2, -1],
      [-1, 1, 2, 3, 2, 1, -1],
      [-1, -1, -1, -1, -1, -1, -1]
    ]
  },
  sharpen7Med: {
    modality: "sharpen",
    label: "Sharpen 7x7 Medium",
    size: 7,
    kernel: [
      [-1, -1, -1, -1, -1, -1, -1],
      [-1, 1, 1, 2, 1, 1, -1],
      [-1, 1, 3, 4, 3, 1, -1],
      [-1, 2, 4, 32, 4, 2, -1],
      [-1, 1, 3, 4, 3, 1, -1],
      [-1, 1, 1, 2, 1, 1, -1],
      [-1, -1, -1, -1, -1, -1, -1]
    ]
  },
  sharpen7High: {
    modality: "sharpen",
    label: "Sharpen 7x7 High",
    size: 7,
    kernel: [
      [-2, -2, -2, -2, -2, -2, -2],
      [-2, 2, 2, 2, 2, 2, -2],
      [-2, 2, 4, 5, 4, 2, -2],
      [-2, 2, 5, 48, 5, 2, -2],
      [-2, 2, 4, 5, 4, 2, -2],
      [-2, 2, 2, 2, 2, 2, -2],
      [-2, -2, -2, -2, -2, -2, -2]
    ]
  },
  gaussianBlur: {
    modality: "blur",
    label: "Gaussian Blur 3x3",
    size: 3,
    kernel: [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1]
    ]
  },
  edgeDetect: {
    modality: "edge",
    label: "Edge Detection 3x3",
    size: 3,
    kernel: [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1]
    ]
  }
};

/**
 * Determine the appropriate TypedArray constructor based on input data
 * @param {TypedArray} pixelData - Original pixel data
 * @returns {Function} - TypedArray constructor
 */
function getTypedArrayConstructor(pixelData: TypedArray) {
  if (pixelData instanceof Int8Array) return Int8Array;
  if (pixelData instanceof Uint8Array) return Uint8Array;
  if (pixelData instanceof Int16Array) return Int16Array;
  if (pixelData instanceof Uint16Array) return Uint16Array;
  if (pixelData instanceof Int32Array) return Int32Array;
  if (pixelData instanceof Uint32Array) return Uint32Array;
  if (pixelData instanceof Float32Array) return Float32Array;
  if (pixelData instanceof Float64Array) return Float64Array;

  return Int16Array;
}

/**
 * Core convolution algorithm
 * @param {Object} imageFrame - Image frame data containing width, height, and pixelData
 * @param {Array} kernel - 2D array representing the convolution kernel
 * @param {number} multiplier - Multiplier for kernel values
 * @returns {TypedArray} - Convolved pixel data
 */
function convolve(
  imageFrame: {
    width: number;
    height: number;
    pixelData: TypedArray;
  },
  kernel: number[][],
  multiplier = 1
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
        convolvedPixel += getPixel(x + j, y + i) * kernel[i][j] * multiplier;
      }
    }

    return convolvedPixel;
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
}

/**
 * Apply convolution filter to DICOM image
 * @param {Object} loadedImage - The DICOM image object
 * @param {string} filterName - Name of the filter to apply
 * @param {number} multiplier - Optional multiplier for kernel values (default: 1)
 * @returns {TypedArray} - Convolved pixel data
 */
export function applyConvolutionFilter(
  loadedImage: Image,
  filterName: string,
  generateImage: boolean = false,
  multiplier: number = 1
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
  const filteredPixelArray = convolve(imageFrame, kernel, multiplier);
  const filteredImage = createFilteredImage(
    loadedImage,
    filteredPixelArray as unknown as number[]
  );
  return generateImage ? filteredImage : filteredPixelArray;
}

/**
 * Create the filtered image
 * @param {string} name - Name for the new kernel
 * @param {Object} config - Kernel configuration (modality, label, size, kernel)
 * @returns {Partial<Image>} - Convolved pixel data
 */
export function createFilteredImage(
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
    windowWidth: maxPixelValue - minPixelValue || loadedImage.windowWidth,
    windowCenter:
      (maxPixelValue + minPixelValue) / 2 || loadedImage.windowCenter,
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
}

/**
 * Add custom kernel to the global object
 * @param {string} name - Name for the new kernel
 * @param {Object} config - Kernel configuration (modality, label, size, kernel)
 */
export function addCustomKernel(name: string, config: KernelConfig): void {
  if (!config.kernel || !Array.isArray(config.kernel)) {
    throw new Error("Kernel must be a 2D array");
  }

  CONVOLUTION_KERNELS[name] = {
    modality: config.modality || "custom",
    label: config.label,
    size: config.size,
    kernel: config.kernel
  };
}

/**
 * Get kernels
 * @returns {Object} - CONVOLUTION_KERNELS object
 */
export function getKernels() {
  return { ...CONVOLUTION_KERNELS };
}
