/** @module imaging/tools/segmentation
 *  @desc  This file provides functionalities
 *         for handling masks and luts
 */
import { BrushProperties, MaskProperties, SegmentationConfig } from "./types.d";
import type { TypedArray } from "../types";
export declare function rgbToHex(c: number[]): string;
export declare function hexToRgb(hex: string): number[];
/**
 * Force cs tools refresh on all enabled images
 */
export declare function forceRender(): void;
/**
 * Set color for label
 * @param {Number} labelId
 * @param {String} color in hex format
 */
export declare function setLabelColor(labelId: string, color: string): void;
/**
 * Get color from label
 * @param {Number} labelId
 * @returns {String} Color in hex format
 */
export declare function getLabelColor(labelId: string): string;
/**
 * A function to group all settings to load before masks
 * @param {Object} customConfig - Object containing override values for segmentation module config
 */
export declare function initSegmentationModule(customConfig: SegmentationConfig): void;
/**
 * Add segmentation mask to segmentation module
 * @param {Object} props - The mask properties (labelId, color and opacity)
 * @param {TypedArray} - The mask data array
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 * @returns {Promise} - Return a promise which will resolve when segmentation mask is added
 */
export declare function addSegmentationMask(props: MaskProperties, data: TypedArray, elementId: string | HTMLElement): Promise<void>;
/**
 * Set a new mask slice into the labelmap buffer
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 * @param {Number} sliceIndex - the index of the new mask slice
 * @param {ArrayBuffer} pixelData - the pixelData array
 */
export declare function loadMaskSlice(elementId: string | HTMLElement, sliceIndex: number, pixelData: TypedArray): void;
/**
 * Activate a specific labelmap through its labelId
 * @param {Number} labelId - The labelmap id to activate
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 */
export declare function setActiveLabelmap(labelId: number, elementId: string | HTMLElement): void;
/**
 * Get active labelmap for target element
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 * @returns {Object} The active labelmap object that contains the buffer
 */
export declare function getActiveLabelmapBuffer(elementId: string | HTMLElement): any;
/**
 * Activate a specific segment through its index
 * @param {Number} segmentIndex - The segment index to activate
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 */
export declare function setActiveSegment(segmentIndex: number, elementId: string | HTMLElement): void;
/**
 * Change opacity for active label
 * @param {Number} opacity - The desired opacity value
 */
export declare function setActiveLabelOpacity(opacity: number): void;
/**
 * Change opacity for inactive labels
 * @param {Number} opacity - The desired opacity value
 */
export declare function setInactiveLabelOpacity(opacity: number): void;
/**
 * Toggle mask visibility
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 * @param {Number} labelId - The id of the mask label
 */
export declare function toggleVisibility(elementId: string | HTMLElement, labelId: number): void;
/**
 * Toggle between 'contours mode' and 'filled mode'
 * @param {Bool} toggle - Contour mode enabled if true
 */
export declare function toggleContourMode(toggle: boolean): void;
/**
 * Set mask appearance props
 * @param {Object} maskProps - The mask appearance props (labelId, visualization [0=filled, 1=contour, 2=hidden], opacity (if mode=0), between 0 and 1)
 */
export declare function setMaskProps(props: MaskProperties): void;
/**
 * Clear state for segmentation module
 */
export declare function clearSegmentationState(): void;
/**
 * Enable brushing
 * NOTE: if options contains `thresholds`, ThresholdsBrush is activated, otherwise BrushTool is activated.
 * Anyway, the activated tool name is returned
 * @param {Object} options - An object containing configuration values (eg radius, thresholds, etc...)
 */
export declare function enableBrushTool(viewports: string[], options: BrushProperties): "ThresholdsBrush" | "Brush";
/**
 * Disable brushing
 * This function disables both brush tools, if found active on `viewports`
 * @param {String} toolToActivate - The name of the tool to activate after removing the brush @optional
 */
export declare function disableBrushTool(viewports: string[], toolToActivate?: string): void;
/**
 * Change the brush props
 * @param {Object} props - The new brush props {radius: number[px], thresholds: array[min,max]}
 */
export declare function setBrushProps(props: BrushProperties): void;
/**
 * Undo last brush operation (stroke)
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 */
export declare function undoLastStroke(elementId: string | HTMLElement): void;
/**
 * Redo last brush operation (stroke)
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 */
export declare function redoLastStroke(elementId: string | HTMLElement): void;
/**
 * Delete mask from state
 * @param {Number} labelId - The labelmap id to delete
 */
export declare function deleteMask(labelId: number): void;
