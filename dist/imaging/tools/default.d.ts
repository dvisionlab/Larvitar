/** @module imaging/tools/default
 *  @desc  This file provides definitions
 *         for default tools
 */
import type { CursorOptions, ToolConfig, ToolMouseKeys, ToolSettings, ToolStyle, ToolStyle3D } from "./types";
declare const DEFAULT_TOOLS_3D: {
    [key: string]: ToolConfig;
};
declare const DEFAULT_TOOLS_MPR: {
    [key: string]: ToolConfig;
};
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
 * D/Vision Lab 3D custom tools
 */
declare const dvTools3D: {
    [key: string]: any;
};
/**
 * D/Vision Lab MPR custom tools
 */
declare const dvToolsMPR: {
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
declare const DEFAULT_STYLE_3D: ToolStyle3D;
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
/**
 * Register a custom tool
 * @param {String} toolName - The name of the tool
 * @param {Object} toolClass - The tool class
 * @param {String} toolVersion - The version of the tool, can be "MPR", "3D" (to be used with cs3D) or "" (default - cs legacy)
 * NOTE: toolName must be unique
 * NOTE: toolClass must be a valid cornerstone tool
 */
declare const registerExternalTool: (toolName: string, toolClass: any, toolVersion?: "MPR" | "3D" | "", toolCursor?: string, cursorOptions?: CursorOptions) => void;
/**
 * Register a custom tool cursor
 * @param {String} toolName - The name of the tool
 * @param {string} iconContent - The tool class
 * @param {CursorOptions} cursorOptions - tthe  cursor options
  ex.
      const iconContent = `
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
            <image href="data:image/svg+xml;base64,${measurementBase64}" width="30" height="30" style="filter: invert(100%);"/>
          </svg>
        `;
      const cursorOptions = {
        iconSize: 30,
        mousePoint: { x: 15, y: 15 },
        mousePointerGroupString: ``,
        viewBox: {
          x: 0,
          y: 0
        }
      };
 */
export declare const registerCursor: (toolName: string, iconContent: string, cursorOptions: CursorOptions) => void;
export { DEFAULT_TOOLS, DEFAULT_TOOLS_3D, DEFAULT_TOOLS_MPR, DEFAULT_STYLE, DEFAULT_STYLE_3D, DEFAULT_SETTINGS, DEFAULT_MOUSE_KEYS, dvTools, dvTools3D, dvToolsMPR, getDefaultToolsByType, setDefaultToolsProps, registerExternalTool };
