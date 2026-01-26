/** @module imaging/tools/main
 *  @desc  This file provides functionalities
 *         for initializing tools and stacks
 */
import type { ToolConfig, ToolSettings, ToolStyle } from "./types";
/**
 * Initialize cornerstone tools with default configuration (extended with custom configuration)
 * @function initializeCSTools
 * @param {ToolSettings} settings - the settings object (see tools/default.js)
 * @param {ToolStyle} style - the style object (see tools/default.js)
 * @example larvitar.initializeCSTools({showSVGCursors:false}, {color: "0000FF"});
 */
declare const initializeCSTools: (settings?: ToolSettings, style?: ToolStyle) => void;
/**
 * Update stack object to sync stack tools
 * @function csToolsUpdateStack
 * @param {string | HTMLElement} elementId - The target html element or its id.
 * @param {Object} stack - The stack object.
 */
export declare function csToolsUpdateStack(elementId: string | HTMLElement, stack: {
    imageIds?: string[];
    currentImageIdIndex?: number;
}): void;
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
 * @param {string | HTMLElement} elementId - The target html element or its id.
 * @param {boolean} wwwcSync - Flag to enable synchronizer for wwwcSynchronizer. @default false
 * @returns {void} - void
 */
export declare const addDefaultTools: (elementId: string | HTMLElement, wwwcSync?: boolean) => void;
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
 * @param {Boolean} resetCursor - Flag to restore native cursor. @default true
 */
declare const setToolDisabled: (toolName: string, viewports?: string[], resetCursor?: boolean) => void;
/**
 * Set Tool "enabled" on all elements (ie, rendered but not manipulable) & refresh cornerstone elements
 * @function setToolEnabled
 * @param {String} toolName - The tool name.
 * @param {Array} viewports - The hmtl element id to be used for tool initialization.
 * @param {Boolean} resetCursor - Flag to restore native cursor. @default true
 */
declare const setToolEnabled: (toolName: string, viewports?: string[], resetCursor?: boolean) => void;
/**
 * Set Tool "passive" on all elements (ie, rendered and manipulable passively) & refresh cornerstone elements
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
export { initializeCSTools, setToolsStyle, addTool, setToolActive, setToolEnabled, setToolDisabled, setToolPassive };
