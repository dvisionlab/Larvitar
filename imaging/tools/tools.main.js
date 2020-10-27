// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import cornerstoneMath from "cornerstone-math";

import { each, extend } from "lodash";

import {
  saveAnnotations,
  loadAnnotations,
  exportAnnotations
} from "./tools.io";
import { DEFAULT_TOOLS, dvTools } from "./tools.default";
import { getLarvitarManager } from "../loaders/commonLoader";

import { default as larvitar_store } from "../image_store";
let store = larvitar_store.state ? larvitar_store : new larvitar_store();

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
 */
const csToolsCreateStack = function (element) {
  let viewer = store.get("viewer");
  let seriesId = store.get("seriesId");
  let manager = getLarvitarManager();
  let stack;
  if (seriesId && seriesId != "error") {
    stack = {
      currentImageIdIndex: store.get(viewer, element.id, "sliceId"),
      imageIds: manager[seriesId][element.id].imageIds
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
const addTool = function (toolName, configuration, targetElementId) {
  if (isToolMissing(toolName)) {
    const toolClassName = DEFAULT_TOOLS[toolName].class;
    const toolClass = cornerstoneTools[toolClassName] || dvTools[toolClassName];
    if (targetElementId) {
      let element = document.getElementById(targetElementId);
      cornerstoneTools.addToolForElement(element, toolClass, configuration);
    } else {
      cornerstoneTools.addTool(toolClass, configuration);
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
      setToolActive(tool.name, tool.options);
    }
  });

  setToolActive("StackScrollMouseWheel", {
    loop: false, // default false
    allowSkipping: false, // default true
    invert: false
  });
};

/**
 * Set Tool "active" on all elements (ie, rendered and manipulable) & refresh cornerstone elements
 * @function setToolActive
 * @param {String} toolName - The tool name.
 * @param {Object} options - The custom options. @default from tools.default.js
 * @param {String} activeViewport - The active viewport (if "all", viewports array will be used)
 * @param {Array} viewports - The hmtl element id to be used for tool initialization. TODO default viewports ?
 */
const setToolActive = function (toolName, options, activeViewport, viewports) {
  let defaultOpt = DEFAULT_TOOLS[toolName].options;
  extend(defaultOpt, options);
  cornerstoneTools.setToolActive(toolName, defaultOpt);
  if (activeViewport == "all") {
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
      if (el) {
        cornerstone.updateImage(el);
      }
    });
  } else {
    let el = document.getElementById(activeViewport);
    if (el) {
      cornerstone.updateImage(el);
    }
  }
};

/**
 * Set Tool "disabled" on all elements (ie, not rendered) & refresh cornerstone elements
 * @function setToolActive
 * @param {String} toolName - The tool name.
 * @param {String} activeViewport - The active viewport (if "all", viewports array will be used)
 * @param {Array} _viewports - The hmtl element id to be used for tool initialization. @default ["axial","sagittal","coronal"]
 */
const setToolDisabled = function (
  toolName,
  activeViewport,
  viewports = ["axial", "sagittal", "coronal"]
) {
  cornerstoneTools.setToolDisabled(toolName);
  if (activeViewport == "all") {
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
      if (el) {
        cornerstone.updateImage(el);
      }
    });
  } else {
    let el = document.getElementById(activeViewport);
    if (el) {
      cornerstone.updateImage(el);
    }
  }
};

/**
 * Set Tool "enabled" on all elements (ie, rendered but not manipulable) & refresh cornerstone elements
 * @function setToolEnabled
 * @param {String} toolName - The tool name.
 * @param {String} activeViewport - The active viewport (if "all", viewports array will be used)
 * @param {Array} viewports - The hmtl element id to be used for tool initialization. @default ["axial","sagittal","coronal"]
 */
const setToolEnabled = function (
  toolName,
  activeViewport,
  viewports = ["axial", "sagittal", "coronal"]
) {
  cornerstoneTools.setToolEnabled(toolName);
  if (activeViewport == "all") {
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
      if (el) {
        cornerstone.updateImage(el);
      }
    });
  } else {
    let el = document.getElementById(activeViewport);
    if (el) {
      cornerstone.updateImage(el);
    }
  }
};

/**
 * Set Tool "enabled" on all elements (ie, rendered and manipulable passively) & refresh cornerstone elements
 * @function setToolPassive
 * @param {String} toolName - The tool name.
 * @param {String} activeViewport - The active viewport (if "all", viewports array will be used)
 * @param {Array} viewports - The hmtl element id to be used for tool initialization. @default ["axial","sagittal","coronal"]
 */
const setToolPassive = function (
  toolName,
  activeViewport,
  viewports = ["axial", "sagittal", "coronal"]
) {
  cornerstoneTools.setToolPassive(toolName);
  if (activeViewport == "all") {
    each(viewports, function (elementId) {
      let el = document.getElementById(elementId);
      if (el) {
        cornerstone.updateImage(el);
      }
    });
  } else {
    let el = document.getElementById(activeViewport);
    if (el) {
      cornerstone.updateImage(el);
    }
  }
};

/** @inner Internal module functions */

/**
 * Set cornerstone tools configuration
 * @function configureCornerstoneToolsSettings
 */
const configureCornerstoneToolsSettings = function () {
  // Font families :
  // Work Sans, Roboto, OpenSans, HelveticaNeue-Light,
  // Helvetica Neue Light, Helvetica Neue, Helvetica,
  // Arial, Lucida Grande, sans-serif;
  let fontFamily = "Roboto";
  let fontSize = 18;

  cornerstoneTools.toolStyle.setToolWidth(1);
  cornerstoneTools.toolColors.setToolColor("#FF0000");
  cornerstoneTools.toolColors.setActiveColor("#00FF00");
  cornerstoneTools.toolColors.setFillColor("#0000FF");
  cornerstoneTools.textStyle.setFont(`${fontSize}px ${fontFamily}`);
  cornerstoneTools.textStyle.setBackgroundColor("rgba(1, 1, 1, 0.0)");
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
