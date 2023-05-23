/** @module imaging/tools/main
 *  @desc  This file provides functionalities
 *         for initializing tools and stacks
 */
import { saveAnnotations, loadAnnotations, exportAnnotations } from "./io";
import { ToolConfig, ToolSettings, ToolStyle } from "./types";
/**
 * Initialize cornerstone tools with default configuration (extended with custom configuration)
 * @function initializeCSTools
 * @param {Object} settings - the settings object (see tools/default.js)
 * @param {Object} settings - the style object (see tools/default.js)
 * @example larvitar.initializeCSTools({showSVGCursors:false}, {color: "0000FF"});
 */
declare const initializeCSTools: (settings?: ToolSettings, style?: ToolStyle) => void;
/**
 * Create stack object to sync stack tools
 * @function csToolsCreateStack
 * @param {HTMLElement} element - The target hmtl element.
 * @param {Array?} imageIds - Stack image ids.
 * @param {String} currentImageId - The current image id.
 */
declare const csToolsCreateStack: (element: HTMLElement, imageIds?: string[], currentImageIndex?: number) => void;
export declare function csToolsUpdateImageIds(elementId: string, imageIds: string[], imageIdIndex: number): void;
/**
 * Update currentImageIdIndex in cs tools stack
 * @param {String} elementId - The target html element id
 * @param {String} imageId - The imageId in the form xxxxxx//:imageIndex
 */
export declare function csToolsUpdateImageIndex(elementId: string, imageId: string): void;
/**
 * Add a cornerstone tool (grab it from original library or dvision custom tools)
 * @param {*} toolName
 * @param {*} targetElementId
 * @example larvitar.addTool("ScaleOverlay", {configuration:{minorTickLength: 10, majorTickLength: 25}}, "viewer")
 */
declare const addTool: (toolName: string, customConfig: Partial<ToolConfig>, targetElementId?: string) => void;
/**
 * Add all default tools, as listed in tools/default.js
 * @function addDefaultTools
 */
export declare const addDefaultTools: (elementId: string) => void;
/**
 * Set Tool "active" on all elements (ie, rendered and manipulable) & refresh cornerstone elements
 * @function setToolActive
 * @param {String} toolName - The tool name.
 * @param {Object} options - The custom options. @default from tools/default.js
 * @param {Array} viewports - The hmtl element id to be used for tool initialization.
 * @param {Boolean} doNotSetInStore - Flag to avoid setting in store (useful on tools initialization eg in addDefaultTools). NOTE: This is just a hack, we must rework tools/ui sync.
 */
declare const setToolActive: (toolName: string, options?: Partial<ToolConfig["options"]>, viewports?: string[], doNotSetInStore?: boolean) => void;
/**
 * Set Tool "disabled" on all elements (ie, not rendered) & refresh cornerstone elements
 * @function setToolDisabled
 * @param {String} toolName - The tool name.
 * @param {Array} viewports - The hmtl element id to be used for tool initialization.
 */
declare const setToolDisabled: (toolName: string, viewports?: string[]) => void;
/**
 * Set Tool "enabled" on all elements (ie, rendered but not manipulable) & refresh cornerstone elements
 * @function setToolEnabled
 * @param {String} toolName - The tool name.
 * @param {Array} viewports - The hmtl element id to be used for tool initialization.
 */
declare const setToolEnabled: (toolName: string, viewports?: string[]) => void;
/**
 * Set Tool "enabled" on all elements (ie, rendered and manipulable passively) & refresh cornerstone elements
 * @function setToolPassive
 * @param {String} toolName - The tool name.
 * @param {Array} viewports - The hmtl element id to be used for tool initialization.
 */
declare const setToolPassive: (toolName: string, viewports?: string[]) => void;
/** @inner Internal module functions */
/**
 * Set cornerstone tools custom configuration (extend default configuration)
 * @function setToolsStyle
 * @param {Object} style - the style object (see tools/defaults.js)
 */
declare const setToolsStyle: (style?: ToolStyle) => void;
export { initializeCSTools, setToolsStyle, csToolsCreateStack, addTool, setToolActive, setToolEnabled, setToolDisabled, setToolPassive, saveAnnotations, loadAnnotations, exportAnnotations };
