/** @module imaging/tools/default
 *  @desc  This file provides definitions
 *         for default tools
 */
import { ToolConfig, ToolMouseKeys, ToolSettings, ToolStyle } from "./types";
/**
 * These tools are added with `addDefaultTools()`
 */
declare const DEFAULT_TOOLS: {
    [key: string]: ToolConfig;
};
/**
 * D/Vision Lab custom tools
 */
declare const dvTools: {
    [key: string]: any;
};
/**
 * Tools default style
 * Available font families :
 * Work Sans, Roboto, OpenSans, HelveticaNeue-Light,
 * Helvetica Neue Light, Helvetica Neue, Helvetica,
 * Arial, Lucida Grande, sans-serif;
 */
declare const DEFAULT_STYLE: ToolStyle;
/**
 * Tools default settings
 */
declare const DEFAULT_SETTINGS: ToolSettings;
/**
 * Shortcut and mouse bindings defaults
 */
declare const DEFAULT_MOUSE_KEYS: ToolMouseKeys;
/**
 * Get available tools by type (useful to populate menus)
 * @param {String} type
 */
declare const getDefaultToolsByType: (type: NonNullable<ToolConfig["type"]>) => ToolConfig[];
/**
 * Override default tools props
 * @param {Array} newProps - An array of objects as in the DEFAULT_TOOLS list, but with a subset of props
 * NOTE: prop "name" is mandatory
 */
declare const setDefaultToolsProps: (newProps: Partial<ToolConfig>[]) => void;
export { DEFAULT_TOOLS, DEFAULT_STYLE, DEFAULT_SETTINGS, DEFAULT_MOUSE_KEYS, dvTools, getDefaultToolsByType, setDefaultToolsProps };
