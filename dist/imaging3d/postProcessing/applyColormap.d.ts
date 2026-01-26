import { Colormap, VOI } from "../../imaging/types";
import * as _cornerstone from "@cornerstonejs/core";
interface ColormapRegistry {
    [name: string]: Colormap;
}
/**
 * Add custom colormap to the global registry
 * @function addCustomColormap
 * @param {string} name - Name for the new colormap
 * @param {ColormapConfig} config - Colormap configuration
 * @returns {void}
 */
export declare const addCustomColormap: (colormap: Colormap) => void;
/**
 * Get all registered colormaps
 * @function getColormaps
 * @returns {ColormapRegistry} - Copy of COLORMAP_REGISTRY object
 */
export declare const getColormaps: () => ColormapRegistry;
/**
 * Apply colormap (LUT and Opacity) to a viewport
 * @function applyColormap
 * @param {any} viewport - Cornerstone3D viewport
 * @param {Colormap} colormap - The colormap to apply
 * @param {VOI | null} voi - Optional VOI settings for remapping
 * @returns {void}
 */
export declare const applyColormap: (viewport: _cornerstone.VolumeViewport, colormap: Colormap, forceSnapToPreset?: boolean) => void;
/**
 * Apply colormap by name (LUT and Opacity) to a viewport
 * @function applyColormapByName
 * @param {any} viewport - Cornerstone3D viewport
 * @param {string} colormapName - Name of the colormap to apply
 * @param {VOI | null} voi - Optional VOI settings for remapping
 * @returns {void}
 */
export declare const applyColormapByName: (viewport: _cornerstone.VolumeViewport, colormapName: string, forceSnapToPreset?: boolean) => void;
/**
 * Get VOI from viewport
 * @function getVOIFromViewport
 * @param {any} viewport - Cornerstone3D viewport
 * @returns {VOI} - Current VOI settings
 */
export declare const getVOIFromViewport: (viewport: _cornerstone.VolumeViewport) => VOI;
/**s
 * Reset the colormap to default and clear the store
 * @function resetColormapToDefault
 * @param {_cornerstone.VolumeViewport} viewport - Cornerstone3D viewport
 * @returns {void}
 */
export declare const resetColormapToDefault: (viewport: _cornerstone.VolumeViewport) => void;
export {};
