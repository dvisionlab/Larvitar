/** @module imaging/tools/main
 *  @desc  This file provides functionalities
 *         for initializing tools and stacks
 */

// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import cornerstoneMath from "cornerstone-math";
import Hammer from "hammerjs";
import { each, extend } from "lodash";

// internal libraries
import { logger } from "../../logger";
import {
  DEFAULT_TOOLS,
  DEFAULT_STYLE,
  DEFAULT_SETTINGS,
  dvTools,
  DEFAULT_TOOLS_3D,
  DEFAULT_TOOLS_MPR,
  dvTools3D,
  dvToolsMPR
} from "./default";
import store, { set as setStore } from "../imageStore";
import type { ToolConfig, ToolSettings, ToolStyle } from "./types";
import { isElement } from "../imageUtils";
//global variable
declare var cv: any; //opencv-js

/**
 * Initialize cornerstone tools with default configuration (extended with custom configuration)
 * @function initializeCSTools
 * @param {ToolSettings} settings - the settings object (see tools/default.js)
 * @param {ToolStyle} style - the style object (see tools/default.js)
 * @example larvitar.initializeCSTools({showSVGCursors:false}, {color: "0000FF"});
 */
const initializeCSTools = function (
  settings?: ToolSettings,
  style?: ToolStyle
) {
  cornerstoneTools.external.cornerstone = cornerstone;
  cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
  cornerstoneTools.external.Hammer = Hammer;
  extend(DEFAULT_SETTINGS, settings);

  // hack to fix warning on init() - but breaks labelmap 0 auto generation
  // see https://github.com/cornerstonejs/cornerstoneTools/issues/1395
  cornerstoneTools.getModule("segmentation").configuration.segmentsPerLabelmap =
    0;

  cornerstoneTools.init(DEFAULT_SETTINGS);
  setToolsStyle(style);
};

/**
 * Update stack object to sync stack tools
 * @function csToolsUpdateStack
 * @param {string | HTMLElement} elementId - The target html element or its id.
 * @param {Object} stack - The stack object.
 */
export function csToolsUpdateStack(
  elementId: string | HTMLElement,
  stack: { imageIds?: string[]; currentImageIdIndex?: number }
) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    logger.error("invalid html element: " + elementId);
    return;
  }
  const id: string = isElement(elementId) ? element.id : (elementId as string);

  try {
    cornerstone.getEnabledElement(element);
  } catch (e) {
    logger.error("csToolsUpdateStack: element not enabled:", id);
    return;
  }

  const stackState = cornerstoneTools.getToolState(element, "stack");
  if (!stackState) {
    logger.debug("csToolsUpdateStack: stack not found, creating it:", id);
    cornerstoneTools.addStackStateManager(element, ["stack"]);
    const newStack = {
      currentImageIdIndex: stack.currentImageIdIndex
        ? stack.currentImageIdIndex
        : 0,
      imageIds: stack.imageIds ? stack.imageIds : []
    };
    cornerstoneTools.addToolState(element, "stack", newStack);
    logger.debug(
      "Stack created for element:",
      id,
      "at currentImageIdIndex:",
      newStack.currentImageIdIndex
    );
  } else {
    if (stackState.data.length === 0) {
      logger.error("csToolsUpdateStack: stack data not found:", id);
      return;
    }
    if (stack.imageIds) {
      // update stack object with new imageIds
      logger.debug("csToolsUpdateStack: stack updated for with new imageIds");
      stackState.data[0].imageIds = stack.imageIds;
    }
    if (stack.currentImageIdIndex) {
      // update stack object with new currentImageIdIndex
      logger.debug(
        "csToolsUpdateStack: stack updated for with new currentImageIdIndex"
      );
      stackState.data[0].currentImageIdIndex = stack.currentImageIdIndex;
    }
  }
}

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
  if (targetElementId) {
    let element = document.getElementById(targetElementId);
    if (!element) {
      logger.warn("isToolMissing: element not found:", targetElementId);
      return false;
    }
    let added = cornerstoneTools.getToolForElement(element, toolName);
    if (added === undefined) {
      return true;
    } else {
      return false;
    }
  }
  let elements = cornerstone.getEnabledElements();
  let isToolMissing = false;
  // TODO check only target viewports
  each(elements, function (el) {
    let added = cornerstoneTools.getToolForElement(el.element, toolName);
    if (added === undefined) {
      isToolMissing = true;
    }
  });

  return isToolMissing;
};

/**
 * Add a cornerstone tool (grab it from original library or dvision custom tools)
 * @param {*} toolName
 * @param {*} targetElementId
 * @example larvitar.addTool("ScaleOverlay", {configuration:{minorTickLength: 10, majorTickLength: 25}}, "viewer")
 */
const addTool = function (
  toolName: string,
  customConfig: Partial<ToolConfig>,
  targetElementId?: string
) {
  // extend defaults with user custom props
  let defaultConfig: ToolConfig | {} = DEFAULT_TOOLS[toolName]
    ? DEFAULT_TOOLS[toolName]
    : {};
  extend(defaultConfig, customConfig);

  if (isToolMissing(toolName, targetElementId)) {
    const toolClassName: string | undefined =
      "class" in defaultConfig ? defaultConfig.class : undefined;

    if (!toolClassName) {
      throw new Error(
        `Tool ${toolName} class not found. Please check tools/default or pass a valid tool class name in the configuration object.`
      );
    }

    const toolClass = dvTools[toolClassName] || cornerstoneTools[toolClassName];

    if (targetElementId) {
      let element = document.getElementById(targetElementId);
      cornerstoneTools.addToolForElement(element, toolClass, defaultConfig);
      logger.debug(`Tool ${toolName} added to element:`, targetElementId);
    } else {
      cornerstoneTools.addTool(toolClass, defaultConfig);
      logger.debug(`Tool ${toolName} added to all elements`);
    }
  }
};

/**
 * Add all default tools, as listed in tools/default.js
 * @function addDefaultTools
 * @param {string | HTMLElement} elementId - The target html element or its id.
 * @param {boolean} wwwcSync - Flag to enable synchronizer for wwwcSynchronizer. @default false
 * @returns {void} - void
 */
export const addDefaultTools = function (
  elementId: string | HTMLElement,
  wwwcSync: boolean = false
): void {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    logger.error("invalid html element: " + elementId);
    return;
  }
  const id: string = isElement(elementId) ? element.id : (elementId as string);

  try {
    cornerstone.getEnabledElement(element);
  } catch (e) {
    logger.error("addDefaultTools: element not enabled:", id);
    return;
  }

  // create the csTools stack object
  const uniqueUID = store.get(["viewports", id, "uniqueUID"]);
  if (!uniqueUID) {
    logger.error("addDefaultTools: uniqueUID not found:", id);
    return;
  }
  const stackImageIds = store.get(["series", uniqueUID, "imageIds"]);
  if (!stackImageIds) {
    logger.error("addDefaultTools: stackImageIds not found:", id);
    return;
  }
  const currentImageIdIndex = store.get(["viewports", id, "sliceId"]) || 0;
  csToolsUpdateStack(element, {
    imageIds: stackImageIds,
    currentImageIdIndex: currentImageIdIndex
  });

  // for each default tool
  each(DEFAULT_TOOLS, tool => {
    addTool(tool.name, tool.configuration, id);

    // if sync tool, enable
    if (tool.sync && wwwcSync === true) {
      let elements = cornerstone.getEnabledElements();
      const synchronizer = new cornerstoneTools.Synchronizer(
        "cornerstoneimagerendered",
        cornerstoneTools[tool.sync]
      );
      elements.forEach(element => {
        synchronizer.add(element.element);
      });

      synchronizer.enabled = true;
    }
    // set default tool active (wwwc, zoom and wheel)
    if (tool.defaultActive) {
      setToolActive(tool.name, tool.options, [], true);
      logger.debug(`Tool ${tool.name} set as default active for element:`, id);
    }
  });
};

/**
 * Try to update image, catching errors if image is not loaded yet
 * @param {HTMLObject} element
 */
function tryUpdateImage(element: HTMLElement) {
  try {
    cornerstone.updateImage(element);
  } catch (err) {
    // logger.warn("updateImage: image has not been loaded yet:", element.id);
  }
}

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
  viewports?: string[],
  doNotSetInStore?: boolean
) {
  if (toolName === "WSToggle") {
    if (typeof cv !== "undefined" && cv !== null) {
      logger.info("OpenCV has been successfully imported.");
      // You can use OpenCV functions here
    } else {
      logger.error(
        'OpenCV has not been imported. Watershed Segmentation Tool will not work. Please import src="https://docs.opencv.org/4.5.4/opencv.js" in your HTML'
      );
    }
  }
  let defaultOpt = { ...DEFAULT_TOOLS[toolName]?.options }; // deep copy obj because otherwise cornerstone tools will modify it

  extend(defaultOpt, options);

  if (viewports && viewports.length > 0) {
    // activate and update only for "viewports"
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
      cornerstoneTools.setToolActiveForElement(el, toolName, defaultOpt);
      if (el) {
        tryUpdateImage(el);
      }
    });
  } else {
    // activate and update all
    cornerstoneTools.setToolActive(toolName, defaultOpt);
    let enabledElements = cornerstone.getEnabledElements();
    each(enabledElements, enel => {
      tryUpdateImage(enel.element);
    });
  }

  // set active tool in larvitar store
  // mouseButtonMask is now an array, thanks to cs tools "setToolActiveForElement",
  // but only if it has a rendered image in the viewport (!)
  // so we must check the type anyway for type coherence

  if (DEFAULT_TOOLS[toolName]?.defaultActive === true) {
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

/**
 * Set Tool "disabled" on all elements (ie, not rendered) & refresh cornerstone elements
 * @function setToolDisabled
 * @param {String} toolName - The tool name.
 * @param {Array} viewports - The hmtl element id to be used for tool initialization.
 * @param {Boolean} resetCursor - Flag to restore native cursor. @default true
 */
const setToolDisabled = function (
  toolName: string,
  viewports?: string[],
  resetCursor = true
) {
  if (viewports && viewports.length > 0) {
    // disable and update only for "viewports"
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
      if (!el) {
        logger.warn("setToolDisabled: element not found:", elementId);
        return;
      }
      cornerstoneTools.setToolDisabledForElement(el, toolName);
      if (resetCursor && el && el.style) {
        // restore native cursor
        el.style.cursor = "initial";
        tryUpdateImage(el);
      }
    });
  } else {
    // disable and update all
    cornerstoneTools.setToolDisabled(toolName);
    let enabledElements = cornerstone.getEnabledElements();
    each(enabledElements, enel => {
      if (resetCursor) {
        // restore native cursor
        enel.element.style.cursor = "initial";
        tryUpdateImage(enel.element);
      }
    });
  }
};

/**
 * Set Tool "enabled" on all elements (ie, rendered but not manipulable) & refresh cornerstone elements
 * @function setToolEnabled
 * @param {String} toolName - The tool name.
 * @param {Array} viewports - The hmtl element id to be used for tool initialization.
 * @param {Boolean} resetCursor - Flag to restore native cursor. @default true
 */
const setToolEnabled = function (
  toolName: string,
  viewports?: string[],
  resetCursor = true
) {
  if (viewports && viewports.length > 0) {
    // enable and update only for "viewports"
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
      if (!el) {
        logger.warn("setToolDisabled: element not found:", elementId);
        return;
      }
      cornerstoneTools.setToolEnabledForElement(el, toolName);
      if (resetCursor && el && el.style) {
        // restore native cursor
        el.style.cursor = "initial";
        tryUpdateImage(el);
      }
    });
  } else {
    // enable and update all
    cornerstoneTools.setToolEnabled(toolName);
    let enabledElements = cornerstone.getEnabledElements();
    each(enabledElements, enel => {
      if (resetCursor) {
        // restore native cursor
        enel.element.style.cursor = "initial";
        tryUpdateImage(enel.element);
      }
    });
  }
};

/**
 * Set Tool "passive" on all elements (ie, rendered and manipulable passively) & refresh cornerstone elements
 * @function setToolPassive
 * @param {String} toolName - The tool name.
 * @param {Array} viewports - The hmtl element id to be used for tool initialization.
 */
const setToolPassive = function (toolName: string, viewports?: string[]) {
  if (viewports && viewports.length > 0) {
    // activate and update only for "viewports"
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
      if (!el) {
        logger.warn("setToolDisabled: element not found:", elementId);
        return;
      }
      cornerstoneTools.setToolPassiveForElement(el, toolName);
      tryUpdateImage(el);
    });
  } else {
    // activate and update all
    cornerstoneTools.setToolPassive(toolName);
    let enabledElements = cornerstone.getEnabledElements();
    each(enabledElements, enel => {
      tryUpdateImage(enel.element);
    });
  }
};

/** @inner Internal module functions */

/**
 * Set cornerstone tools custom configuration (extend default configuration)
 * @function setToolsStyle
 * @param {Object} style - the style object (see tools/defaults.js)
 */
const setToolsStyle = function (style?: ToolStyle) {
  extend(DEFAULT_STYLE, style);

  let fontFamily = DEFAULT_STYLE.fontFamily;
  let fontSize = DEFAULT_STYLE.fontSize;

  cornerstoneTools.toolStyle.setToolWidth(DEFAULT_STYLE.width);
  cornerstoneTools.toolColors.setToolColor(DEFAULT_STYLE.color);
  cornerstoneTools.toolColors.setActiveColor(DEFAULT_STYLE.activeColor);
  cornerstoneTools.toolColors.setFillColor(DEFAULT_STYLE.fillColor); // used only by FreehandRoiTool inside handles
  cornerstoneTools.textStyle.setFont(`${fontSize}px ${fontFamily}`);
  cornerstoneTools.textStyle.setBackgroundColor(DEFAULT_STYLE.backgroundColor);
};

export {
  initializeCSTools,
  setToolsStyle,
  addTool,
  setToolActive,
  setToolEnabled,
  setToolDisabled,
  setToolPassive
};
