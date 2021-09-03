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
import {
  DEFAULT_TOOLS,
  DEFAULT_STYLE,
  DEFAULT_SETTINGS,
  dvTools
} from "./tools.default";
import { larvitar_store } from "../image_store";

/**
 * Initialize cornerstone tools with default configuration (extended with custom configuration)
 * @function initializeCSTools
 * @param {Object} settings - the settings object (see tools.default.js)
 * @param {Object} settings - the style object (see tools.default.js)
 * @example larvitar.initializeCSTools({showSVGCursors:false}, {color: "0000FF"});
 */
const initializeCSTools = function (settings, style) {
  cornerstoneTools.external.cornerstone = cornerstone;
  cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
  // cornerstoneTools.external.Hammer = Hammer;
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

export function csToolsUpdateImageIds(elementId, imageIds) {
  const element = document.getElementById(elementId);
  const stackState = cornerstoneTools.getToolState(element, "stack");
  const stackData = stackState.data[0];
  stackData.imageIds = imageIds;
}

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
 * @example larvitar.addTool("ScaleOverlay", {configuration:{minorTickLength: 10, majorTickLength: 25}}, "viewer")
 */
const addTool = function (toolName, customConfig, targetElementId) {
  // extend defaults with user custom props
  let defaultConfig = DEFAULT_TOOLS[toolName];
  extend(defaultConfig, customConfig);

  if (isToolMissing(toolName)) {
    const toolClassName = DEFAULT_TOOLS[toolName].class;
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
      setToolActive(tool.name, tool.options, [], true);
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
    // console.warn("updateImage: image has not been loaded yet:", element.id);
  }
}

/**
 * Set Tool "active" on all elements (ie, rendered and manipulable) & refresh cornerstone elements
 * @function setToolActive
 * @param {String} toolName - The tool name.
 * @param {Object} options - The custom options. @default from tools.default.js
 * @param {Array} viewports - The hmtl element id to be used for tool initialization.
 * @param {Boolean} doNotSetInStore - Flag to avoid setting in store (useful on tools initialization eg in addDefaultTools). NOTE: This is just a hack, we must rework tools/ui sync.
 */
const setToolActive = function (toolName, options, viewports, doNotSetInStore) {
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

  // set active tool in larvitar store
  if (!doNotSetInStore) {
    defaultOpt.mouseButtonMask && defaultOpt.mouseButtonMask == 1
      ? larvitar_store.set("leftActiveTool", toolName)
      : larvitar_store.set("rightActiveTool", toolName);
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
      el.style.cursor = "initial";
      tryUpdateImage(el);
    });
  } else {
    // activate and update all
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
const setToolEnabled = function (toolName, viewports) {
  if (viewports && viewports.length > 0) {
    // activate and update only for "viewports"
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
      cornerstoneTools.setToolEnabledForElement(el, toolName);
      // restore native cursor
      el.style.cursor = "initial";
      tryUpdateImage(el);
    });
  } else {
    // activate and update all
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
 * Set cornerstone tools custom configuration (extend default configuration)
 * @function setToolsStyle
 * @param {Object} style - the style object (see tools.defaults.js)
 */
const setToolsStyle = function (style) {
  extend(DEFAULT_STYLE, style);

  let fontFamily = DEFAULT_STYLE.fontFamily;
  let fontSize = DEFAULT_STYLE.fontSize;

  cornerstoneTools.toolStyle.setToolWidth(DEFAULT_STYLE.width);
  cornerstoneTools.toolColors.setToolColor(DEFAULT_STYLE.color);
  cornerstoneTools.toolColors.setActiveColor(DEFAULT_STYLE.activeColor);
  cornerstoneTools.toolColors.setFillColor(DEFAULT_STYLE.fillColor); // used only by FreehandRoiTool indide handles
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
