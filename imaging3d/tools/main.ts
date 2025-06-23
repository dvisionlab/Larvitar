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
  DEFAULT_STYLE_3D,
  DEFAULT_TOOLS_3D,
  DEFAULT_TOOLS_MPR,
  //DEFAULT_STYLE,
  //DEFAULT_SETTINGS,
  dvTools,
  dvTools3D,
  dvToolsMPR
} from "../../imaging/tools/default";
import store, { set as setStore } from "../../imaging/imageStore";

// types
import type {
  ToolConfig,
  ToolSettings,
  ToolStyle,
  ToolStyle3D
} from "../../imaging/tools/types";
import type { RenderingEngine } from "@cornerstonejs/core";
import { viewport } from "@cornerstonejs/tools/dist/esm/utilities";
import { ViewportInput } from "@cornerstonejs/core/dist/esm/types";
import { utilities } from "@cornerstonejs/core";

/**
 * Initialize cornerstone tools with default configuration (extended with custom configuration)
 * @function initializeCSTools
 * @param {ToolSettings} settings - the settings object (see tools/default.js)
 * @param {ToolStyle} style - the style object (see tools/default.js)
 * @example larvitar.initializeCSTools({showSVGCursors:false}, {color: "0000FF"});
 */
export const initializeCSTools = async function (
  settings?: ToolSettings,
  style?: ToolStyle3D
) {
  setToolsStyle(style);
  await cornerstoneTools.init();
  logger.warn("initializeCSTools is not fully implemented yet");
};

/**
 * Set cornerstone tools custom configuration (extend default configuration)
 * @function setToolsStyle
 * @param {Object} style - the style object (see tools/defaults.js)
 */
export const setToolsStyle = function (style?: ToolStyle3D) {
  cornerstoneTools.annotation.config.style.setDefaultToolStyles(
    utilities.deepMerge(DEFAULT_STYLE_3D, style)
  );
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
 * Add a cornerstone 3D tool (grab it from original library or dvision custom 3D or MPR tools)
 * @param {String} toolName
 * @param {Partial<ToolConfig>} customConfig
 * @param {String} type The type of tool to add (3D or MPR)
 * @param {String} groupId The cornerstone3D Tool GroupID
 * @example larvitar.addTool("ScaleOverlay", {configuration:{minorTickLength: 10, majorTickLength: 25}}, "viewer")
 */
export const addTool = function (
  toolName: string,
  customConfig: Partial<ToolConfig>,
  groupId: string = "default",
  type?: string
) {
  let allToolsList;

  if (type === "3D") {
    allToolsList = DEFAULT_TOOLS_3D;
  } else if (type === "MPR") {
    allToolsList = DEFAULT_TOOLS_MPR;
  } else {
    allToolsList = {
      ...DEFAULT_TOOLS_3D,
      ...DEFAULT_TOOLS_MPR
    };
  }

  // extend defaults with user custom props
  let defaultConfig: ToolConfig | {} = allToolsList[toolName]
    ? allToolsList[toolName]
    : {};
  extend(defaultConfig, customConfig);

  const toolClassName: string | undefined =
    "class" in defaultConfig ? defaultConfig.class : undefined;

  if (!toolClassName) {
    throw new Error(
      `Tool ${toolName} class not found. Please check tools/default or pass a valid tool class name in the configuration object.`
    );
  }

  let customTool;

  if (type === "3D") {
    customTool = dvTools3D[toolClassName];
  } else if (type === "MPR") {
    customTool = dvToolsMPR[toolClassName];
  } else {
    customTool = dvTools3D[toolClassName] || dvToolsMPR[toolClassName];
  }
  const toolClass =
    customTool ||
    cornerstoneTools[toolClassName as keyof typeof cornerstoneTools];

  cornerstoneTools.addTool(toolClass);

  if (groupId) {
    const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(groupId);
    if (!toolGroup) {
      logger.error(
        `Tool group ${groupId} not found. Tool ${toolName} not added.`
      );
      return;
    }
    toolGroup.addTool(toolName, customConfig);
    logger.debug(`Tool ${toolName} added to group:`, groupId);
  }

  logger.debug(`Tool ${toolName} added`);
};

/**
 * @function addDefaultTools
 * @desc Adds default tools to the rendering engine (wwwl, pan, zoom, stackScroll)
 * @param {String[]} elementIds - the ids of the elements where the tools will be added
 * @param {RenderingEngine} renderingEngine - the rendering engine where the tools will be added
 * @param {String} type The type of tool to add (3D or MPR)
 * @param {String} groupId The cornerstone3D Tool GroupID
 */
export const addDefaultTools = function (
  elementIds: string[],
  renderingEngine: RenderingEngine,
  type: string = "3D", // "MPR" or "3D"
  toolGroupId: string = "default"
) {
  elementIds.forEach(elementId => {
    const element = renderingEngine.getViewport(elementId).element;
    try {
      cornerstone.getEnabledElement(element);
    } catch (e) {
      logger.error("addDefaultTools: element not enabled:", elementId);
      return; // TODO handle this case
    }

    element.oncontextmenu = (e: Event) => e.preventDefault();
    const viewport = renderingEngine.getViewport(elementId);
    cornerstoneTools.utilities.stackPrefetch.enable(viewport.element);
  });

  const toolGroup =
    cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId);

  if (!toolGroup) {
    logger.error("addDefaultTools: tool group not created");
    return;
  }

  elementIds.forEach(viewportId => {
    toolGroup.addViewport(viewportId, renderingEngine.id);
  });

  const toolsList = type === "3D" ? DEFAULT_TOOLS_3D : DEFAULT_TOOLS_MPR;

  // for each default tool
  each(toolsList, tool => {
    addTool(tool.name, tool.configuration, toolGroupId, type);
    toolGroup.addTool(tool.name, tool.configuration);
    logger.debug(`Tool ${tool.name} added to group:`, toolGroupId);

    // if sync tool, enable
    if (tool.sync) {
      // TODO manage synchronizers
    }

    // set default tools active
    // TODO handle options (mouseButtonMask, etc) and other modes (eg passive)
    if (tool.defaultActive) {
      console.log("setToolActive", tool.name, tool.options);
      setToolActive(tool.name, tool.options, toolGroupId, true);
      logger.debug(`Tool ${tool.name} set as default active`);
    }
  });
};

/**
 * Set Tool "active" on all elements (ie, rendered and manipulable)
 * @param toolName - The tool name.
 * @param options - The tool options (mouseButtonMask, etc). If not provided, the default options will be used.
 * @param groupId - The tool group id. @default "default"
 * @param doNotSetInStore - Flag to not set the active tool in the store. @default false
 */
export const setToolActive = function (
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
  logger.debug(`Tool ${toolName} set active in group:`, groupId);

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

export const setToolPassive = function (
  toolName: string,
  groupId: string = "default",
  resetCursor = true // TODO manage this
) {
  const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(groupId);
  if (!toolGroup) {
    logger.error("setToolPassive: tool group not found:", groupId);
    return;
  }
  toolGroup.setToolPassive(toolName);
  logger.debug(`Tool ${toolName} set enabled in group:`, groupId);
  if (resetCursor) {
    toolGroup.getViewportIds().forEach(id => {
      const element = document.getElementById(id) as HTMLDivElement;
      if (element) {
        cornerstoneTools.cursors.setCursorForElement(element, "default");
      }
    });
  }
};

export const setToolEnabled = function (
  toolName: string,
  groupId: string = "default",
  resetCursor = true // TODO manage this
) {
  const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(groupId);
  if (!toolGroup) {
    logger.error("setToolEnabled: tool group not found:", groupId);
    return;
  }
  toolGroup.setToolEnabled(toolName);
  logger.debug(`Tool ${toolName} set enabled in group:`, groupId);
  if (resetCursor) {
    toolGroup.getViewportIds().forEach(id => {
      const element = document.getElementById(id) as HTMLDivElement;
      if (element) {
        cornerstoneTools.cursors.setCursorForElement(element, "default");
      }
    });
  }
};

export const setToolDisabled = function (
  toolName: string,
  groupId: string = "default",
  resetCursor = true // TODO manage this
) {
  const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(groupId);
  if (!toolGroup) {
    logger.error("setToolDisabled: tool group not found:", groupId);
    return;
  }
  toolGroup.setToolDisabled(toolName);
  logger.debug(`Tool ${toolName} set enabled in group:`, groupId);
  if (resetCursor) {
    toolGroup.getViewportIds().forEach(id => {
      const element = document.getElementById(id) as HTMLDivElement;
      if (element) {
        cornerstoneTools.cursors.setCursorForElement(element, "default");
      }
    });
  }
};

/**
 * @function syncViewportsCamera
 * @desc  Synchronizes the camera position of two (volume) viewports
 * @param id - unique id for the synchronizer @default "default"
 * @param targetViewportId - the id of the target viewport where the camera will be synced
 * @param sourceViewportId - the id of the source viewport from where the camera position will be taken
 */
export const syncViewportsCamera = function (
  id: string = "default", // unique id for the synchronizer
  targetViewportId: string,
  sourceViewportId: string
) {
  let cameraSync = cornerstoneTools.SynchronizerManager.getSynchronizer(id);
  if (!cameraSync) {
    cameraSync =
      cornerstoneTools.synchronizers.createCameraPositionSynchronizer(id);
  } else if (cameraSync) {
    // cameraSync.getSourceViewports().forEach((viewportId) => {
    //   cameraSync!.removeSource(viewportId);
    // });
    cornerstoneTools.SynchronizerManager.destroySynchronizer(id);
    cameraSync =
      cornerstoneTools.synchronizers.createCameraPositionSynchronizer(id);
  }

  const targetRenderingEngineId =
    cornerstone.getEnabledElementByViewportId(
      targetViewportId
    )?.renderingEngineId;
  const sourceRenderingEngineId =
    cornerstone.getEnabledElementByViewportId(
      sourceViewportId
    )?.renderingEngineId;

  if (!targetRenderingEngineId || !sourceRenderingEngineId) {
    logger.error(
      "syncViewportsCamera: no rendering engine found for one of the viewports"
    );
    return;
  }

  // get plane and position from the source viewport and set to target viewport
  // TODO why the sync does not work first time ?
  const sourceViewport =
    cornerstone.getEnabledElementByViewportId(sourceViewportId)?.viewport;
  if (!sourceViewport) {
    logger.error("syncViewportsCamera: source viewport not found");
    return;
  }
  const sourceViewRef = sourceViewport.getViewReference();

  const targetViewport =
    cornerstone.getEnabledElementByViewportId(targetViewportId)?.viewport;
  if (!targetViewport) {
    logger.error("syncViewportsCamera: target viewport not found");
    return;
  }
  targetViewport.setViewReference(sourceViewRef);

  cameraSync.add({
    renderingEngineId: sourceRenderingEngineId,
    viewportId: sourceViewportId
  });

  cameraSync.add({
    renderingEngineId: targetRenderingEngineId,
    viewportId: targetViewportId
  });

  const targetElement =
    cornerstone.getEnabledElementByViewportId(targetViewportId);
  targetElement.viewport.render();

  const sourceElement =
    cornerstone.getEnabledElementByViewportId(sourceViewportId);
  sourceElement.viewport.render();

  logger.debug(
    `Camera sync added from ${sourceViewportId} to ${targetViewportId}`
  );

  // FIXME: how to force a refresh of the viewport?
};

/**
 * @function syncViewportsVOI
 * @desc  Synchronizes the contrast of two (volume) viewports
 * @param id - unique id for the synchronizer @default "default"
 * @param targetViewportId - the id of the target viewport where the camera will be synced
 * @param sourceViewportId - the id of the source viewport from where the camera position will be taken
 */
export const syncViewportsVOI = function (
  id: string = "default",
  syncedViewportIds: string[]
) {
  if (!syncedViewportIds || syncedViewportIds.length < 2) {
    logger.warn("At least two viewport IDs are required to sync VOI.");
    return;
  }

  const options = {
    syncInvertState: true,
    syncColormap: true
  };

  let voiSync = cornerstoneTools.SynchronizerManager.getSynchronizer(id);
  if (voiSync) {
    cornerstoneTools.SynchronizerManager.destroySynchronizer(id);
  }
  voiSync = cornerstoneTools.synchronizers.createVOISynchronizer(id, options);

  for (const viewportId of syncedViewportIds) {
    const enabledElement =
      cornerstone.getEnabledElementByViewportId(viewportId);
    if (!enabledElement) {
      logger.warn(`Enabled element not found for viewport ${viewportId}`);
      continue;
    }

    const { renderingEngineId } = enabledElement;
    if (!renderingEngineId) {
      logger.warn(`Rendering engine not found for viewport ${viewportId}`);
      continue;
    }

    voiSync.add({
      renderingEngineId,
      viewportId
    });

    logger.debug(`VOI sync added for viewport: ${viewportId}`);
  }

  // Optionally, trigger render on all synced viewports
  for (const viewportId of syncedViewportIds) {
    const element = cornerstone.getEnabledElementByViewportId(viewportId);
    if (element?.viewport) {
      element.viewport.render();
    }
  }
};

/**
 * @function syncViewports
 * @desc  Synchronizes the camera position and contrast of two (volume) viewports
 * @param id - unique id for the synchronizer @default "default"
 * @param targetViewportId - the id of the target viewport where the camera will be synced
 * @param sourceViewportId - the id of the source viewport from where the camera position will be taken
 */
export const syncViewports = function (
  id: string = "default", // unique id for the synchronizer
  targetViewportId: string,
  sourceViewportId: string
) {
  syncViewportsCamera(id, targetViewportId, sourceViewportId);
  syncViewportsVOI(id, [targetViewportId, sourceViewportId]);
};

/**
 * Create a tool group and add the specified viewports and tools to it.
 * @function createToolGroup
 * @param groupId - The id of the tool group to create. @default "default"
 * @param viewports
 * @param tools
 * @param type - MPR or 3D
 * @returns toolGroup - The created tool group.
 */
export const createToolGroup = function (
  groupId: string = "default",
  viewports: string[] = [],
  tools: any[] = [], // TODO type this properly
  type?: string
) {
  const toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(groupId);

  if (!toolGroup) {
    logger.error("createToolGroup: tool group not created");
    return;
  }

  viewports.forEach(vp => {
    const renderingEngineId =
      cornerstone.getEnabledElementByViewportId(vp)?.renderingEngineId;
    if (!renderingEngineId) {
      logger.error(
        `createToolGroup: rendering engine not found for viewport ${vp}`
      );
      return;
    }
    toolGroup.addViewport(vp, renderingEngineId);
  });

  tools.forEach(tool => {
    addTool(tool.name, tool.configuration, groupId, type);
    logger.debug(`Tool ${tool.name} added to group:`, groupId);
  });

  return toolGroup;
};

/**
 * Destroys a tool group and the tools added to it.
 * @function destroyToolGroup
 * @param groupId - The id of the tool group to destroy. @default "default"
 * @returns void
 */
export const destroyToolGroup = function (groupId: string = "default") {
  const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(groupId);

  if (!toolGroup) {
    logger.warn("createToolGroup: tool group does not exist yet");
    return;
  }
  const activeTools = toolGroup.getToolInstances();
  Object.keys(activeTools).forEach(toolName => {
    setToolDisabled(toolName, groupId);
  });

  cornerstoneTools.ToolGroupManager.destroyToolGroup(groupId);
};
/**
 * Set slab thickness and mode for a given viewport
 * @function setSlab
 * @param slabThickness - The thickness of the slab [in mm].
 * @param slabMode - The blend mode to use for the slab.
 * @param viewportId - The id of the viewport where the slab will be set.
 */
export const setSlab = function (
  slabThickness: number,
  slabMode: cornerstone.Enums.BlendModes,
  viewportId: string
) {
  const viewport =
    cornerstone.getEnabledElementByViewportId(viewportId).viewport;
  if (!viewport || viewport instanceof cornerstone.StackViewport) {
    logger.error("setSlab: viewport not found");
    return;
  }

  viewport.setBlendMode(slabMode);
  viewport.setProperties({ slabThickness });
  viewport.render();
};

/**
 * Set the window width and level for a given viewport
 * @param ww - window width
 * @param wl - window level
 * @param viewportId - The id of the viewport where the window width and level will be set.
 */
export const setWWWL = function (ww: number, wl: number, viewportId: string) {
  const viewport =
    cornerstone.getEnabledElementByViewportId(viewportId).viewport;
  if (!viewport || viewport instanceof cornerstone.StackViewport) {
    logger.error("setWWWL: viewport not found");
    return;
  }

  viewport.setProperties({
    voiRange: { lower: wl - ww / 2, upper: wl + ww / 2 }
  });
  viewport.render();
};
