// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools/dist/cornerstoneTools.js";
import cornerstoneMath from "cornerstone-math";

import { each, extend } from "lodash";

import {
  saveAnnotations,
  loadAnnotations,
  exportAnnotations
} from "./tools.io";
import { DEFAULT_TOOLS, dvTools } from "./tools.default";

/**
 * Initialize cornerstone tools with default configuration
 * @function initializeCSTools
 */
const initializeCSTools = function () {
  cornerstoneTools.external.cornerstone = cornerstone;
  cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
  // cornerstoneTools.external.Hammer = Hammer;
  cornerstoneTools.init({
    mouseEnabled: true,
    touchEnabled: false,
    showSVGCursors: true
  });
  configureCornerstoneToolsSettings();
};

/**
 * Create stack object to sync stack tools
 * @function csToolsCreateStack
 * @param {HTMLElement} element - The target hmtl element.
 * @param {Array} imageIds - Stack image ids.
 * @param {String} currentImageId - The current image id.
 */
const csToolsCreateStack = function (element, imageIds, currentImageIndex) {
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

/**
 * Update currentImageIdIndex in cs tools stack
 * @param {String} elementId - The target html element id
 * @param {String} imageId - The imageId in the form xxxxxx//:imageIndex
 */
export function csToolsUpdateImageIndex(elementId, imageId) {
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
const isToolMissing = function (toolName) {
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
 */
const addTool = function (toolName, customConfig, targetElementId) {
  // extend defaults with user custom props
  let defaultConfig = DEFAULT_TOOLS[toolName];
  extend(defaultConfig, customConfig)

  if (isToolMissing(toolName)) {
    const toolClassName = DEFAULT_TOOLS[toolName].class;
    const toolClass = cornerstoneTools[toolClassName] || dvTools[toolClassName];
    if (targetElementId) {
      let element = document.getElementById(targetElementId);
      cornerstoneTools.addToolForElement(element, toolClass, defaultConfig);
    } else {
      console.log(defaultConfig)
      cornerstoneTools.addTool(toolClass, defaultConfig);
    }
  }
};

/**
 * Add all default tools, as listed in tools.default.js
 * @function addDefaultTools
 */
export const addDefaultTools = function (elementId) {
  let elements = cornerstone.getEnabledElements();

  if (elements.length == 0) {
    let element = document.getElementById(elementId);
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
      console.log(tool.name);
      setToolActive(tool.name, tool.options);
    }
  });
};

/**
 * Try to update image, catching errors if image is not loaded yet
 * @param {HTMLObject} element
 */
function tryUpdateImage(element) {
  try {
    cornerstone.updateImage(element);
  } catch (err) {
    console.warn("updateImage: image has not been loaded yet:", element.id);
  }
}

/**
 * Set Tool "active" on all elements (ie, rendered and manipulable) & refresh cornerstone elements
 * @function setToolActive
 * @param {String} toolName - The tool name.
 * @param {Object} options - The custom options. @default from tools.default.js
 * @param {Array} viewports - The hmtl element id to be used for tool initialization.
 */
const setToolActive = function (toolName, options, viewports) {
  let defaultOpt = DEFAULT_TOOLS[toolName].options;
  extend(defaultOpt, options);

  if (viewports && viewports.length > 0) {
    // activate and update only for "viewports"
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
      cornerstoneTools.setToolActiveForElement(el, toolName, defaultOpt);
      tryUpdateImage(el);
    });
  } else {
    // activate and update all
    cornerstoneTools.setToolActive(toolName, defaultOpt);
    let enabledElements = cornerstone.getEnabledElements();
    each(enabledElements, enel => {
      tryUpdateImage(enel.element);
    });
  }
};

/**
 * Set Tool "disabled" on all elements (ie, not rendered) & refresh cornerstone elements
 * @function setToolDisabled
 * @param {String} toolName - The tool name.
 * @param {Array} viewports - The hmtl element id to be used for tool initialization.
 */
const setToolDisabled = function (toolName, viewports) {
  if (viewports && viewports.length > 0) {
    // activate and update only for "viewports"
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
      cornerstoneTools.setToolDisabledForElement(el, toolName);
      // restore native cursor
      el.style.cursor = "initial"
      tryUpdateImage(el);
    });
  } else {
    // activate and update all
    cornerstoneTools.setToolDisabled(toolName);
    let enabledElements = cornerstone.getEnabledElements();
    each(enabledElements, enel => {
      // restore native cursor
      enel.element.style.cursor = "initial"
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
const setToolEnabled = function (toolName, viewports) {
  if (viewports && viewports.length > 0) {
    // activate and update only for "viewports"
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
      cornerstoneTools.setToolEnabledForElement(el, toolName);
      // restore native cursor
      el.style.cursor = "initial"
      tryUpdateImage(el);
    });
  } else {
    // activate and update all
    cornerstoneTools.setToolEnabled(toolName);
    let enabledElements = cornerstone.getEnabledElements();
    each(enabledElements, enel => {
      // restore native cursor
      enel.element.style.cursor = "initial"
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
const setToolPassive = function (toolName, viewports) {
  if (viewports && viewports.length > 0) {
    // activate and update only for "viewports"
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
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
 * Set cornerstone tools configuration
 * @function configureCornerstoneToolsSettings
 * TODO set as config file
 */
const configureCornerstoneToolsSettings = function () {
  // Font families :
  // Work Sans, Roboto, OpenSans, HelveticaNeue-Light,
  // Helvetica Neue Light, Helvetica Neue, Helvetica,
  // Arial, Lucida Grande, sans-serif;
  let fontFamily = "Roboto";
  let fontSize = 18;

  cornerstoneTools.toolStyle.setToolWidth(1);
  cornerstoneTools.toolColors.setToolColor("#02FAE5");
  cornerstoneTools.toolColors.setActiveColor("#00FF00");
  cornerstoneTools.toolColors.setFillColor("#0000FF"); // used only by FreehandRoiTool indide handles
  cornerstoneTools.textStyle.setFont(`${fontSize}px ${fontFamily}`);
  cornerstoneTools.textStyle.setBackgroundColor("rgba(1, 1, 1, 0.7)");
};

export {
  initializeCSTools,
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
