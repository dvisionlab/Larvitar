import { Image, TypedArray, KernelConfig } from "../types";
/**
 * Add custom kernel to the global object
 * @function addCustomKernel
 * @param {string} name - Name for the new kernel
 * @param {KernelConfig} config - Kernel configuration (modality, label, size, kernel)
 * @returns {void}
 */
export declare const addCustomKernel: (name: string, config: KernelConfig) => void;
/**
 * Get kernels
 * @function getKernels
 * @returns {ConvolutionKernels} - CONVOLUTION_KERNELS object
 */
export declare const getKernels: () => {
    [x: string]: KernelConfig;
};
/**
 * Apply convolution filter to DICOM image
 * @function applyConvolutionFilter
 * @param {Image} loadedImage - The DICOM image object
 * @param {string} filterName - Name of the filter to apply
 * @param {number} multiplier - Optional multiplier for kernel values (default: 1)
 * @returns {TypedArray} - Convolved pixel data
 */
export declare const applyConvolutionFilter: (loadedImage: Image, filterName: string, generateImage?: boolean) => Partial<Image> | TypedArray;
/**
 * Create the filtered image
 * @function createFilteredImage
 * @param {Image} loadedImage - the source image
 * @param {number[]} filteredPixelArray - filtered pixel data
 * @returns {Partial<Image>} - Convolved pixel data
 */
export declare const createFilteredImage: (loadedImage: Image, filteredPixelArray: number[], filterName?: string) => Partial<Image>;
/**
 * Applies a Gaussian blur filter to a cornerstone image.
 * @function applyGaussianBlur
 * @param {Image} loadedImage - The cornerstone image object.
 * @param {number} kernelSize - The size of the kernel.
 * @param {number} strength - The sigma value for the Gaussian function.
 * @returns {Partial<Image>} - The new, blurred cornerstone image object.
 */
export declare const applyGaussianBlur: (loadedImage: Image, kernelSize: number, strength: number) => Partial<Image>;
/**
 * Applies a sharpening filter to a cornerstone image.
 * @function applySharpening
 * @param {Image} loadedImage - The cornerstone image object.
 * @param {number} kernelSize - The size of the kernel.
 * @param {number} strength - The strength of the sharpening effect.
 * @returns {Partial<Image>} - The new, sharpened cornerstone image object.
 */
export declare const applySharpening: (loadedImage: Image, kernelSize: number, strength: number) => Partial<Image>;
