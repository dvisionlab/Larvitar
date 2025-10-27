/** @module imaging/imageTools
 *  @desc This file provides functionalities for
 *        interacting with cornerstone tools
 *        DEPRECATION WARNING: these are legacy functions
 *        that will be removed soon. Use the corresponding
 *        functions in /tools/main.js instead.
 *        For this reason, this file will not be translated to TypeScript.
 */
import { DiameterStateData, SegmentationConfig } from "./tools/types";
/**
 * Add Diameter tool
 * @function addDiameterTool
 * @param {String} elementId - The target hmtl element id or its DOM HTMLElement
 * @param {Array} diameters - The array of diameter objects.
 * @param {String} seriesId - The id of the target serie.
 */
export declare const addDiameterTool: (elementId: string, diameters: number[], seriesId: string) => void;
/**
 * Add Contour tool
 * @function addContoursTool
 * @param {Object} rawContours - The contours object (generated from a segmentation mask).
 * @param {String} maskName - The name tag that identify the mask
 */
/**
 * Add Contour tool
 * @function addContoursTool
 * @param {Object} rawContours - The contours object (generated from a segmentation mask).
 * @param {String} maskName - The name tag that identify the mask
 */
export declare const addContoursTool: (rawContours: {
    [key: string]: Uint8Array;
}, maskName: string) => void;
/**
 * Add mask editing tool
 * @function addMaskEditingTool
 * @param {Array} mask - The mask data.
 * @param {Function} callback - The tool initialization callback
 * @param {String} targetViewport - The target hmtl element id.
 */
export declare const addMaskEditingTool: (mask: string[], callback: () => void, targetViewport: string) => void;
/**
 * Modify configuration for cornerstone tools segmentation module
 * @function setSegmentationConfig
 * @param {Object} config - The custom configuration.
 * @example
 * Example of custom configuration
 * config = {
      renderOutline: true,
      renderFill: true,
      shouldRenderInactiveLabelmaps: true,
      radius: 10,
      minRadius: 1,
      maxRadius: 50,
      segmentsPerLabelmap: 65535,
      fillAlpha: 0.7,
      fillAlphaInactive: 0.1,
      outlineAlpha: 0.7,
      outlineAlphaInactive: 0.35,
      outlineWidth: 3,
      storeHistory: true
    };
 */
export declare const setSegmentationConfig: (config: Partial<SegmentationConfig>) => void;
/**
 * Get mask editing tool current data from state
 * @function getCurrentMaskData
 * @param {String} viewportId - The target hmtl element id.
 * @return {Array} labelmap3D - The mask array
 */
export declare const getCurrentMaskData: (viewportId: string) => unknown[];
/**
 * Add Stack State to a single hmtl element
 * @function addStackStateToElement
 * @param {String} seriesId - The id of the target serie.
 * @param {HTMLElement} element - The target hmtl element.
 */
export declare const addStackStateToElement: (seriesId: string, element: HTMLElement) => void;
/**
 * Add seeds tool
 * @function addSeedsTool
 * @param {Array} preLoadSeeds - The array of seeds to load as initialization.
 * @param {String} initViewport - The hmtl element id to be used for tool initialization.
 */
export declare const addSeedsTool: (preLoadSeeds: string[], initViewport: string) => void;
/**
 * Delete all measurements from tools state, for tools that have the "cleaneable" prop set to true in tools/default.js
 * @function clearMeasurements
 */
export declare const clearMeasurements: () => void;
/**
 * Get tool data for all enabled elements
 * @function getToolState
 * @param {String} toolName - The tool name.
 * @return {Object} - Tool data grouped by element id
 */
export declare const getToolState: (toolName: string) => any;
/**
 * Clear tool data for a subset of seeds
 * @function clearToolStateByName
 * @param {String} toolName - The tool name.
 * @param {Object} options - Props used to select the data to delete (at the moment only {name : "targetName"} is implemented)
 */
export declare const clearToolStateByName: (toolName: string, options: any) => void;
/**
 * Update diameter tool with new value (removing old one)
 * @function updateDiameterTool
 * @param {String | Number} diameterId - The id that identify the diameter data.
 * @param {Object} value - The object representing the new diameter data.
 * @param {String} seriesId - The target serie id.
 * @param {String} viewportId - The viewport id.
 */
export declare const updateDiameterTool: (diameterId: string, value: {
    tool: DiameterStateData;
}, seriesId: string, viewportId: string) => void;
/**
 * Add tool data for a single target slice
 * @function addToolStateSingleSlice
 * @param {HTMLElement} element - The target hmtl element.
 * @param {String} toolName - The tool name.
 * @param {Object | Array} data - The tool data to add (tool-specific)
 * @param {Number} slice - The target slice to put the data in.
 * @param {String} seriesId - The target serie id.
 */
export declare const addToolStateSingleSlice: (element: HTMLElement, toolName: string, data: Partial<DiameterStateData>, slice: number, seriesId?: string) => void;
/**
 * Clear tool state and disable all cornerstone elements
 * @function clearCornerstoneElements
 */
export declare const clearCornerstoneElements: () => void;
/**
 * Sync the cornerstone tools stack given a slice as data source
 * @function syncToolStack
 * @param {Number} srcSliceNumber - The slice to be used as data source.
 * @param {String} toolName - The name of the tool to sync.
 * @param {String} viewport - The target viewport id.
 * @param {String} seriesId - The target serie id.
 */
export declare const syncToolStack: (srcSliceNumber: number, toolName: string, viewport: string, seriesId: string) => void;
/**
 * Update slice index in cornerstone tools stack state
 * @function updateStackToolState
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Number} imageIndex - The new imageIndex value.
 */
export declare const updateStackToolState: (elementId: string | HTMLElement, imageIndex: number) => void;
