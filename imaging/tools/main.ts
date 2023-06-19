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
import { saveAnnotations, loadAnnotations, exportAnnotations } from "./io";
import {
  DEFAULT_TOOLS,
  DEFAULT_STYLE,
  DEFAULT_SETTINGS,
  dvTools
} from "./default";
import { set as setStore } from "../imageStore";
import type { ToolConfig, ToolSettings, ToolStyle } from "./types";

/**
 * Initialize cornerstone tools with default configuration (extended with custom configuration)
 * @function initializeCSTools
 * @param {Object} settings - the settings object (see tools/default.js)
 * @param {Object} settings - the style object (see tools/default.js)
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
  cornerstoneTools.getModule(
    "segmentation"
  ).configuration.segmentsPerLabelmap = 0;

  cornerstoneTools.init(DEFAULT_SETTINGS);
  setToolsStyle(style);
};

/**
 * Create stack object to sync stack tools
 * @function csToolsCreateStack
 * @param {HTMLElement} element - The target hmtl element.
 * @param {Array?} imageIds - Stack image ids.
 * @param {String} currentImageId - The current image id.
 */
const csToolsCreateStack = function (
  element: HTMLElement,
  imageIds?: string[],
  currentImageIndex?: number
) {
  let stack;
  if (imageIds) {
    stack = {
      currentImageIdIndex: currentImageIndex,
      imageIds: imageIds
    };
  } else {
    stack = {
      currentImageIdIndex: 0,
      imageIds: "imageLoader://0"
    };
    if (cornerstone.getEnabledElements().length == 0) {
      cornerstone.enable(element);
    }
  }
  cornerstoneTools.addStackStateManager(element, ["stack"]);
  cornerstoneTools.addToolState(element, "stack", stack);
};

export function csToolsUpdateImageIds(
  elementId: string,
  imageIds: string[],
  imageIdIndex: number
) {
  const element = document.getElementById(elementId);
  if (element) {
    const stackState = cornerstoneTools.getToolState(element, "stack");
    const stackData = stackState.data[0];
    stackData.imageIds = imageIds;
    stackData.currentImageIdIndex =
      stackData.currentImageIdIndex < imageIdIndex
        ? stackData.currentImageIdIndex
        : (stackData.currentImageIdIndex += 1);
  }
}

/**
 * Update currentImageIdIndex in cs tools stack
 * @param {String} elementId - The target html element id
 * @param {String} imageId - The imageId in the form xxxxxx//:imageIndex
 */
export function csToolsUpdateImageIndex(elementId: string, imageId: string) {
  let currentImageIdIndex = parseInt(imageId.split(":")[1]);
  const element = document.getElementById(elementId);
  const stackState = cornerstoneTools.getToolState(element, "stack");
  const stackData = stackState.data[0];
  stackData.currentImageIdIndex = currentImageIdIndex;
}

/**
 *
 * @param {*} toolName
 */
const isToolMissing = function (toolName: string) {
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
  let defaultConfig = DEFAULT_TOOLS[toolName] || {};
  extend(defaultConfig, customConfig);

  if (isToolMissing(toolName)) {
    const toolClassName = defaultConfig.class;
    const toolClass = cornerstoneTools[toolClassName] || dvTools[toolClassName];
    if (targetElementId) {
      let element = document.getElementById(targetElementId);
      cornerstoneTools.addToolForElement(element, toolClass, defaultConfig);
    } else {
      cornerstoneTools.addTool(toolClass, defaultConfig);
    }
  }
};

/**
 * Add all default tools, as listed in tools/default.js
 * @function addDefaultTools
 */
export const addDefaultTools = function (elementId: string) {
  let elements = cornerstone.getEnabledElements();

  if (elements.length == 0) {
    let element = document.getElementById(elementId);
    if (!element) {
      throw new Error(
        `Element with id ${elementId} not found. Cannot add default tools.`
      );
    }
    cornerstone.enable(element);
  }

  // for each default tool
  each(DEFAULT_TOOLS, tool => {
    // check if already added
    if (!isToolMissing(tool.name)) {
      return;
    }

    // check target viewports and call add tool with options
    if (tool.viewports == "all") {
      addTool(tool.name, tool.configuration);
    } else {
      // call add tool for element for each element
      each(tool.viewports, targetElementId => {
        addTool(tool.name, tool.configuration, targetElementId);
      });
    }

    // if sync tool, enable
    if (tool.sync) {
      const synchronizer = new cornerstoneTools.Synchronizer(
        "cornerstoneimagerendered",
        cornerstoneTools[tool.sync]
      );
      elements.forEach(element => {
        synchronizer.add(element.element);
      });

      synchronizer.enabled = true;
    }

    if (tool.defaultActive) {
      setToolActive(tool.name, tool.options, [], true);
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
    // console.warn("updateImage: image has not been loaded yet:", element.id);
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
  if (!doNotSetInStore && defaultOpt.mouseButtonMask) {
    if (typeof defaultOpt.mouseButtonMask == "number") {
      defaultOpt.mouseButtonMask = [defaultOpt.mouseButtonMask];
    }
    if (defaultOpt.mouseButtonMask.includes(1)) {
      setStore("leftActiveTool", toolName);
    }
    if (defaultOpt.mouseButtonMask.includes(2)) {
      setStore("rightActiveTool", toolName);
    }
  }
};

/**
 * Set Tool "disabled" on all elements (ie, not rendered) & refresh cornerstone elements
 * @function setToolDisabled
 * @param {String} toolName - The tool name.
 * @param {Array} viewports - The hmtl element id to be used for tool initialization.
 */
const setToolDisabled = function (toolName: string, viewports?: string[]) {
  if (viewports && viewports.length > 0) {
    // disable and update only for "viewports"
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
      if (!el) {
        console.warn("setToolDisabled: element not found:", elementId);
        return;
      }
      cornerstoneTools.setToolDisabledForElement(el, toolName);
      // restore native cursor
      el.style.cursor = "initial";
      tryUpdateImage(el);
    });
  } else {
    // disable and update all
    cornerstoneTools.setToolDisabled(toolName);
    let enabledElements = cornerstone.getEnabledElements();
    each(enabledElements, enel => {
      // restore native cursor
      enel.element.style.cursor = "initial";
      tryUpdateImage(enel.element);
    });
  }
};

/**
 * Set Tool "enabled" on all elements (ie, rendered but not manipulable) & refresh cornerstone elements
 * @function setToolEnabled
 * @param {String} toolName - The tool name.
 * @param {Array} viewports - The hmtl element id to be used for tool initialization.
 */
const setToolEnabled = function (toolName: string, viewports?: string[]) {
  if (viewports && viewports.length > 0) {
    // enable and update only for "viewports"
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
      if (!el) {
        console.warn("setToolDisabled: element not found:", elementId);
        return;
      }
      cornerstoneTools.setToolEnabledForElement(el, toolName);
      // restore native cursor
      el.style.cursor = "initial";
      tryUpdateImage(el);
    });
  } else {
    // enable and update all
    cornerstoneTools.setToolEnabled(toolName);
    let enabledElements = cornerstone.getEnabledElements();
    each(enabledElements, enel => {
      // restore native cursor
      enel.element.style.cursor = "initial";
      tryUpdateImage(enel.element);
    });
  }
};

/**
 * Set Tool "enabled" on all elements (ie, rendered and manipulable passively) & refresh cornerstone elements
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
        console.warn("setToolDisabled: element not found:", elementId);
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
  csToolsCreateStack,
  addTool,
  setToolActive,
  setToolEnabled,
  setToolDisabled,
  setToolPassive,
  saveAnnotations,
  loadAnnotations,
  exportAnnotations
};
