import { Image, TypedArray, KernelConfig } from "../types";
/**
 * Apply convolution filter to DICOM image
 * @param {Object} loadedImage - The DICOM image object
 * @param {string} filterName - Name of the filter to apply
 * @param {number} multiplier - Optional multiplier for kernel values (default: 1)
 * @returns {TypedArray} - Convolved pixel data
 */
export declare function applyConvolutionFilter(loadedImage: Image, filterName: string, generateImage?: boolean, multiplier?: number): Partial<Image> | TypedArray;
/**
 * Create the filtered image
 * @param {string} name - Name for the new kernel
 * @param {Object} config - Kernel configuration (modality, label, size, kernel)
 * @returns {Partial<Image>} - Convolved pixel data
 */
export declare function createFilteredImage(loadedImage: Image, filteredPixelArray: number[]): Partial<Image>;
/**
 * Add custom kernel to the global object
 * @param {string} name - Name for the new kernel
 * @param {Object} config - Kernel configuration (modality, label, size, kernel)
 */
export declare function addCustomKernel(name: string, config: KernelConfig): void;
/**
 * Get kernels
 * @returns {Object} - CONVOLUTION_KERNELS object
 */
export declare function getKernels(): {
    [x: string]: KernelConfig;
};
