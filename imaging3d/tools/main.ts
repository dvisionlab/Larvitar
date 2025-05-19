/** @module imaging3d/tools/main
 *  @desc  This file provides functionalities
 *         for initializing tools and stacks
 */

// external libraries
import * as cornerstone from "@cornerstonejs/core";
import * as cornerstoneTools from "@cornerstonejs/tools";
import { each, extend } from "lodash";

// internal libraries
import { logger } from "../../logger";
import {
  DEFAULT_TOOLS_3D,
  DEFAULT_STYLE,
  DEFAULT_SETTINGS,
  dvTools
} from "../../imaging/tools/default";
import store, { set as setStore } from "../../imaging/imageStore";

// types
import type { ToolConfig, ToolSettings, ToolStyle } from "../../imaging/tools/types";
import type { RenderingEngine } from "@cornerstonejs/core";

/**
 * Initialize cornerstone tools with default configuration (extended with custom configuration)
 * @function initializeCSTools
 * @param {ToolSettings} settings - the settings object (see tools/default.js)
 * @param {ToolStyle} style - the style object (see tools/default.js)
 * @example larvitar.initializeCSTools({showSVGCursors:false}, {color: "0000FF"});
 */
const initializeCSTools = async function (
  settings?: ToolSettings,
  style?: ToolStyle
) {
  // TODO proper config 
  await cornerstoneTools.init();
  logger.warn("initializeCSTools is not implemented yet");

};


/**
 * Check if a tool is missing in the current element
 * @function isToolMissing
 * @param {string} toolName - The tool name.
 * @param {string} targetElementId - The target html element or its id.
 * @return {boolean} - True if the tool is missing, false otherwise.
 */
const isToolMissing = function (
  toolName: string,
  targetElementId?: string
): boolean {

  // TODO 
  logger.warn("isToolMissing is not implemented yet");

  return false;
};

/**
 * Add a cornerstone tool (grab it from original library or dvision custom tools)
 * @param {*} toolName
 * @param {*} targetElementId
 * @example larvitar.addTool("ScaleOverlay", {configuration:{minorTickLength: 10, majorTickLength: 25}}, "viewer")
 */
const addTool = function (
  toolName: string,
  customConfig: Partial<ToolConfig>
) {
  // extend defaults with user custom props
  let defaultConfig: ToolConfig | {} = DEFAULT_TOOLS_3D[toolName]
    ? DEFAULT_TOOLS_3D[toolName]
    : {};
  extend(defaultConfig, customConfig);

  const toolClassName: string | undefined =
    "class" in defaultConfig ? defaultConfig.class : undefined;

  // TODO how to pass config ? 

  if (!toolClassName) {
    throw new Error(
      `Tool ${toolName} class not found. Please check tools/default or pass a valid tool class name in the configuration object.`
    );
  }

  const toolClass = cornerstoneTools[toolClassName as keyof typeof cornerstoneTools];

  cornerstoneTools.addTool(toolClass);
  logger.debug(`Tool ${toolName} added`);

};

/**
 * @function addDefaultTools
 * @desc Adds default tools to the rendering engine (wwwl, pan, zoom, stackScroll)
 * @param elementId - the id of the element where the tools will be added
 * @param renderingEngine - the rendering engine where the tools will be added
 */
export const addDefaultTools = function (
  elementId: string,
  renderingEngine: RenderingEngine
) {

  const element = renderingEngine.getViewport(elementId).element;
  try {
    cornerstone.getEnabledElement(element);
  } catch (e) {
    logger.error("addDefaultTools: element not enabled:", elementId);
    return;
  }

  element.oncontextmenu = (e: Event) => e.preventDefault();
  const viewport = renderingEngine.getViewport(elementId);
  cornerstoneTools.utilities.stackPrefetch.enable(viewport.element);

  const toolGroupId = "default";
  const toolGroup =
    cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId);

  if (!toolGroup) {
    logger.error("addDefaultTools: tool group not created:", elementId);
    return;
  }

  toolGroup.addViewport(elementId, renderingEngine.id);

  // for each default tool
  each(DEFAULT_TOOLS_3D, tool => {
    addTool(tool.name, tool.configuration);
    toolGroup.addTool(tool.name, tool.configuration);
    logger.debug(`Tool ${tool.name} added to group:`, toolGroupId);

    // if sync tool, enable
    if (tool.sync) {
      // TODO manage synchronizers
    }

    // set default tools active 
    // TODO handle options (mouseButtonMask, etc)
    if (tool.defaultActive) {
      console.log("setToolActive", tool.name, tool.options);
      setToolActive(tool.name, tool.options, undefined, true);
      logger.debug(`Tool ${tool.name} set as default active`);
    }
  });
};

/**
 * @function addDefaultTools3D
 * @desc Adds default tools to the rendering engine (crosshairs)
 * @param elementIds - the ids of the elements where the tools will be added
 * @param renderingEngine - the rendering engine where the tools will be added
 */
export const addDefaultTools3D = function (
  elementIds: string[],
  renderingEngine: RenderingEngine
) {
  elementIds.forEach(viewportId => {
    const element = renderingEngine.getViewport(viewportId).element;
    element.oncontextmenu = e => e.preventDefault();
  });

  cornerstoneTools.addTool(cornerstoneTools.CrosshairsTool);

  const toolGroupId = "default3D";
  const toolGroup =
    cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId);
  if (toolGroup) {
    elementIds.forEach(viewportId => {
      toolGroup.addViewport(viewportId, renderingEngine.id);
    });
    toolGroup.addTool(cornerstoneTools.CrosshairsTool.toolName);
    toolGroup.setToolActive(cornerstoneTools.CrosshairsTool.toolName, {
      bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }]
    });
  } else {
    console.error("Failed to create tool group");
  }
};


/**
 * Set Tool "active" on all elements (ie, rendered and manipulable) & refresh cornerstone elements
 * @function setToolActive
 * @param {String} toolName - The tool name.
 * @param {Object} options - The custom options. @default from tools/default.js
 * @param {Array} viewports - The hmtl element id to be used for tool initialization.
 * @param {Boolean} doNotSetInStore - Flag to avoid setting in store (useful on tools initialization eg in addDefaultTools). NOTE: This is just a hack, we must rework tools/ui sync.
 */
const setToolActive = function (
  toolName: string,
  options?: Partial<ToolConfig["options"]>,
  groupId: string = "default",
  doNotSetInStore?: boolean
) {

  let defaultOpt = { ...DEFAULT_TOOLS_3D[toolName]?.options }; // deep copy obj because otherwise cornerstone tools will modify it
  extend(defaultOpt, options);

  const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(groupId);

  if (!toolGroup) {
    logger.error("setToolActive: tool group not found:", groupId);
    return;
  }

  // @ts-ignore 
  toolGroup.setToolActive(toolName, options);

  // TODO check this
  // set active tool in larvitar store
  // mouseButtonMask is now an array, thanks to cs tools "setToolActiveForElement",
  // but only if it has a rendered image in the viewport (!)
  // so we must check the type anyway for type coherence

  if (DEFAULT_TOOLS_3D[toolName]?.defaultActive === true) {
    doNotSetInStore = false;
  }
  if (!doNotSetInStore && defaultOpt.mouseButtonMask) {
    if (typeof defaultOpt.mouseButtonMask == "number") {
      defaultOpt.mouseButtonMask = [defaultOpt.mouseButtonMask];
    }
    if (defaultOpt.mouseButtonMask.includes(1)) {
      setStore(["leftActiveTool", toolName]);
    }
    if (defaultOpt.mouseButtonMask.includes(2)) {
      setStore(["rightActiveTool", toolName]);
    }
  }
};