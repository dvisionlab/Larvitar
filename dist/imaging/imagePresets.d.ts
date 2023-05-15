/** @module imaging/imagePresets
 *  @desc  This file provides functionalities for
 *         image presets for ww and wc
 */
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
 * @param {String} preset_name - The image preset name
 */
export declare const setImagePreset: (viewportNames: string[], preset_name: string) => void;
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
