/** @module imaging/imagePresets
 *  @desc  This file provides functionalities for
 *         image presets for ww and wc
 */
/**
 * Object used to list image presets
 * @object
 */
declare const IMAGE_PRESETS: {
    name: string;
    ww: number;
    wl: number;
}[];
/**
 * Get Image presets object
 * @instance
 * @function getImagePresets
 */
export declare const getImagePresets: () => {
    name: string;
    ww: number;
    wl: number;
}[];
/**
 * Set Image presets
 * @instance
 * @function setImagePreset
 * @param {Array} viewportNames - List of viewports where to apply preset
 * @param {String} preset - The image preset name or the preset object
 */
export declare const setImagePreset: (viewportNames: string[], preset: string | (typeof IMAGE_PRESETS)[0]) => void;
/**
 * Set Image presets
 * @instance
 * @function setImageCustomPreset
 * @param {Array} viewportNames - List of viewports where to apply preset
 * @param {Object} customValues - {wl: value, ww: value}
 */
export declare const setImageCustomPreset: (viewportNames: string[], customValues: {
    wl: number;
    ww: number;
}) => void;
export {};
