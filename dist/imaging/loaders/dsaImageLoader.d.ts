/** @module loaders/multiframeLoader
 *  @desc This file is a custom DICOM loader for multiframe images
 */
import { ImageLoader } from "cornerstone-core";
/**
 * Custom DSA Image Loader Function
 * @export
 * @function loadDsaImage
 * @param {String} imageId - ImageId tag
 * @returns {Function} Custom Image Creation Function
 */
export declare const loadDsaImage: ImageLoader;
/**
 * r
 * @export
 * @function populateDsaImageIds
 * @param {String} seriesId - SeriesId tag
 * @param {Object} serie - parsed serie object
 */
export declare const populateDsaImageIds: (larvitarSeriesInstanceUID: string) => void;
