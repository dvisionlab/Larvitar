/** @module imaging3d/tools/main
 *  @desc  This file provides functionalities
 *         for initializing tools and stacks
 */
import * as cornerstone from "@cornerstonejs/core";
import * as cornerstoneTools from "@cornerstonejs/tools";
import type { ToolConfig, ToolSettings, ToolStyle3D } from "../../imaging/tools/types";
import type { RenderingEngine } from "@cornerstonejs/core";
/**
 * Initialize cornerstone tools with default configuration (extended with custom configuration)
 * @function initializeCSTools
 * @param {ToolSettings} settings - the settings object (see tools/default.js)
 * @param {ToolStyle} style - the style object (see tools/default.js)
 * @example larvitar.initializeCSTools({showSVGCursors:false}, {color: "0000FF"});
 */
export declare const initializeCSTools: (settings?: ToolSettings, style?: ToolStyle3D) => Promise<void>;
/**
 * Set cornerstone tools custom configuration (extend default configuration)
 * @function setToolsStyle
 * @param {Object} style - the style object (see tools/defaults.js)
 */
export declare const setToolsStyle: (style?: ToolStyle3D) => void;
/**
 * Add a cornerstone 3D tool (grab it from original library or dvision custom 3D or MPR tools)
 * @param {String} toolName
 * @param {Partial<ToolConfig>} customConfig
 * @param {String} type The type of tool to add (3D or MPR)
 * @param {String} groupId The cornerstone3D Tool GroupID
 * @example larvitar.addTool("ScaleOverlay", {configuration:{minorTickLength: 10, majorTickLength: 25}}, "viewer")
 */
export declare const addTool: (toolName: string, customConfig: Partial<ToolConfig>, groupId?: string, type?: string) => void;
/**
 * @function addDefaultTools
 * @desc Adds default tools to the rendering engine (wwwl, pan, zoom, stackScroll)
 * @param {String[]} elementIds - the ids of the elements where the tools will be added
 * @param {RenderingEngine} renderingEngine - the rendering engine where the tools will be added
 * @param {String} type The type of tool to add (3D or MPR)
 * @param {String} groupId The cornerstone3D Tool GroupID
 */
export declare const addDefaultTools: (elementIds: string[], renderingEngine: RenderingEngine, type?: string, toolGroupId?: string) => void;
/**
 * Set Tool "active" on all elements (ie, rendered and manipulable)
 * @param toolName - The tool name.
 * @param options - The tool options (mouseButtonMask, etc). If not provided, the default options will be used.
 * @param groupId - The tool group id. @default "default"
 * @param doNotSetInStore - Flag to not set the active tool in the store. @default false
 */
export declare const setToolActive: (toolName: string, options?: Partial<ToolConfig["options"]>, groupId?: string, doNotSetInStore?: boolean) => void;
export declare const setToolPassive: (toolName: string, groupId?: string, resetCursor?: boolean) => void;
export declare const setToolEnabled: (toolName: string, groupId?: string, resetCursor?: boolean) => void;
export declare const setToolDisabled: (toolName: string, groupId?: string, resetCursor?: boolean) => void;
/**
 * @function syncViewportsVOI
 * @desc  Synchronizes the contrast of two (volume) viewports
 * @param id - unique id for the synchronizer @default "default"
 * @param targetViewportId - the id of the target viewport where the camera will be synced
 * @param sourceViewportId - the id of the source viewport from where the camera position will be taken
 */
export declare const syncViewportsVOI: (id: string | undefined, syncedViewportIds: string[]) => void;
/**
 * @function syncViewports
 * @desc  Synchronizes the camera position and contrast of two (volume) viewports
 * @param id - unique id for the synchronizer @default "default"
 * @param targetViewportId - the id of the target viewport where the camera will be synced
 * @param sourceViewportId - the id of the source viewport from where the camera position will be taken
 * @param otherViewportIds - the ids of other viewports to sync VOI with
 */
export declare const syncViewports: (id: string | undefined, targetViewportId: string, sourceViewportId: string, otherViewportIds: string[]) => void;
/**
 * @function syncViewportsSlabAndCamera
 * @desc  Synchronizes the camera position and/or the slab of two (volume) viewports
 * @param id - unique id for the synchronizer @default "default"
 * @param syncTypes - the types of synchronization to perform (camera, slab)
 * @param viewportIds - the ids of the viewport to synchronize
 */
export declare const syncViewportsSlabAndCamera: (id?: string, syncTypes?: string[], ...viewportIds: string[]) => void;
/**
 * Create a tool group and add the specified viewports and tools to it.
 * @function createToolGroup
 * @param groupId - The id of the tool group to create. @default "default"
 * @param viewports
 * @param tools
 * @param type - MPR or 3D
 * @returns toolGroup - The created tool group.
 */
export declare const createToolGroup: (groupId?: string, viewports?: string[], tools?: any[], type?: string) => cornerstoneTools.Types.IToolGroup | undefined;
/**
 * Destroys a tool group and the tools added to it.
 * @function destroyToolGroup
 * @param groupId - The id of the tool group to destroy. @default "default"
 * @returns void
 */
export declare const destroyToolGroup: (groupId?: string) => void;
/**
 * Set slab thickness and mode for a given viewport
 * @function setSlab
 * @param slabThickness - The thickness of the slab [in mm].
 * @param slabMode - The blend mode to use for the slab.
 * @param viewportId - The id of the viewport where the slab will be set.
 */
export declare const setSlab: (slabThickness: number, slabMode: cornerstone.Enums.BlendModes, viewportId: string) => void;
/**
 * Set the window width and level for a given viewport
 * @param ww - window width
 * @param wl - window level
 * @param viewportId - The id of the viewport where the window width and level will be set.
 */
export declare const setWWWL: (ww: number, wl: number, viewportId: string) => void;
