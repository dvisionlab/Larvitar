/*
 This file provides functionalities for
interacting with cornerstone tools
*/

// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import cornerstoneMath from "cornerstone-math";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import { each, extend, remove, cloneDeep } from "lodash";

// internal libraries
import { DEFAULT_TOOLS } from "./tools/tools.default";
import { SeedsTool } from "./tools/seedTool";
import { ContoursTool } from "./tools/contourTool";
import { EditMaskTool } from "./tools/editMaskTool";
import { DiameterTool } from "./tools/diameterTool";
import { getImageIdFromSlice, getSeriesData } from "./loaders/nrrdLoader";
import { dicomManager } from "./loaders/dicomLoader";
import { parseContours } from "./image_contours";

/*
 * This module provides the following functions to be exported:
 * initializeCSTools()
 * csToolsCreateStack(element)
 * addDefaultTools()
 * clearMeasurements()
 * addContoursTool(rawContours, maskName)
 * addMaskEditingTool(seriesId,mask,setConfig,callback, targetViewport = "axial")
 * getCurrentMaskData(viewportId)
 * addStackStateToElement(seriesId, element)
 * addSeedsTool(preLoadSeeds, initViewport)
 * addDiameterTool(targetElementId, diameters, seriesId)
 * setToolActive(toolName, options, activeViewport, viewports)
 * setToolDisabled(toolName, options, activeViewport, viewports)
 * setToolEnabled(toolName, options, activeViewport, viewports)
 * setToolPassive(toolName, options, activeViewport, viewports)
 * getToolState(toolName)
 * updateDiameterTool(diameterId, value, seriesId)
 * addToolStateCustom(element, toolType, data, slice, seriesId)
 * clearToolStateCustom(toolName, options)
 * clearCornerstoneElements()
 * stackToolSync(srcSliceNumber, toolName, viewport, seriesId)
 * updateStackToolState(element, imageIndex)
 */

// ==============================
// Initialize cornerstoneTools ==
// ==============================
export const initializeCSTools = function() {
  cornerstoneTools.external.cornerstone = cornerstone;
  cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
  cornerstoneTools.init({
    mouseEnabled: true,
    touchEnabled: false,
    showSVGCursors: true
  });
  cornerstoneWADOImageLoader.external.cornerstoneTools = cornerstoneTools;
  configureCornerstoneToolsSettings();
};

// ==========================================
// Create stack object to sync stack tools ==
// ==========================================
export const csToolsCreateStack = function(element) {
  let viewer = store.get("viewer");
  let seriesId = store.get("seriesId");
  let stack = {
    currentImageIdIndex: store.get(viewer, elementId, sliceId),
    imageIds: dicomManager[seriesId]
  };
  cornerstoneTools.addStackStateManager(element, ["stack"]);
  cornerstoneTools.addToolState(element, "stack", stack);
};

// ========================
// Add all default tools ==
// ========================
export const addDefaultTools = function() {
  // for each default tool
  each(DEFAULT_TOOLS, tool => {
    // check if already added
    if (!isToolMissing(tool.name)) {
      return;
    }

    let configuration = tool.configuration;
    let toolClass = cornerstoneTools[tool.class];

    // check target viewports and call add tool with options
    if (tool.viewports == "all") {
      cornerstoneTools.addTool(toolClass, { configuration });
    } else {
      // call add tool for element for each element
      each(tool.viewports, targetElement => {
        cornerstoneTools.addToolForElement(
          targetElement,
          toolClass,
          configuration
        );
      });
    }

    let elements = cornerstone.getEnabledElements();

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

  // set first tool as active if first is not enabled
  setToolActive(store.get("leftMouseHandler"));

  // set wheel scroll active
  setToolActive("StackScrollMouseWheel", {
    loop: false, // default false
    allowSkipping: false, // default true
    invert: false
  });
};

// =====================
// Add Diameter tool ==
// ====================
export const addDiameterTool = function(targetElementId, diameters, seriesId) {
  if (isToolMissing("Diameter")) {
    let element = document.getElementById(targetElementId);
    cornerstoneTools.addToolForElement(element, DiameterTool, {
      dataArray: diameters,
      seriesId: seriesId
    });
    setToolPassive("Diameter");
  }
};

// ===================
// Add Contour tool ==
// ===================
export const addContoursTool = function(rawContours, maskName) {
  var pointBatchSize = 2;
  console.time("...parsing contours");
  var contoursParsedData = parseContours(rawContours, pointBatchSize, maskName);
  console.timeEnd("...parsing contours");
  cornerstoneTools.addTool(ContoursTool, {
    contoursParsedData,
    maskName
  });
};

// ========================
// Add mask editing tool ==
// ========================
export const addMaskEditingTool = function(
  seriesId,
  mask,
  setConfig,
  callback,
  targetViewport = "axial"
) {
  let enabledElements = cornerstone.getEnabledElements();

  each(enabledElements, el => {
    if (el.element.id == targetViewport) {
      cornerstoneTools.addToolForElement(el.element, EditMaskTool, {
        mask: mask,
        initCallback: callback,
        configuration: { alwaysEraseOnClick: false }
      });
      cornerstoneTools.setToolEnabledForElement(el.element, "EditMask", {
        mouseButtonMask: 1
      });
    }
  });

  let defaultConfig = {
    radius: 5,
    fillAlpha: 0.5
  };

  setConfig(defaultConfig);
};

// ======================================
// Add mask editing tool current state ==
// ======================================
export const getCurrentMaskData = function(viewportId) {
  const { getters } = cornerstoneTools.getModule("segmentation");
  let enabledElement = cornerstone
    .getEnabledElements()
    .filter(e => e.element.id == viewportId)
    .pop();

  const { labelmap3D } = getters.labelmap2D(enabledElement.element);
  return labelmap3D;
};

// ======================================
// Add Stack State to a single element ==
// ======================================
export const addStackStateToElement = function(seriesId, element) {
  // Define the Stack object
  const stack = getSeriesData(seriesId)[element.id];
  // Add the stack tool state to the enabled element
  cornerstoneTools.addStackStateManager(element, ["stack"]);
  cornerstoneTools.addToolState(element, "stack", stack);
};

// ================
// Add Seed tool ==
// ================
export const addSeedsTool = function(preLoadSeeds, _initViewport) {
  if (isToolMissing("Seeds")) {
    let enabledElements = cornerstone.getEnabledElements();
    each(enabledElements, el => {
      let initViewport = _initViewport ? _initViewport : "axial";
      let initialize = el.element.id == "axial";
      cornerstoneTools.addToolForElement(el.element, SeedsTool, {
        preLoadSeeds,
        initialize,
        initViewport
      });
    });
    setToolEnabled("Seeds");
  }
};

// =====================
// Clear measurements ==
// =====================
export const clearMeasurements = function() {
  let enabledElements = cornerstone.getEnabledElements();
  let tools = [
    "Length",
    "Angle",
    "Bidirectional",
    "EllipticalRoi",
    "RectangleRoi",
    "FreehandRoi",
    "Probe",
    "ArrowAnnotate",
    "TextMarker"
  ];
  each(enabledElements, el => {
    each(tools, function(toolType) {
      cornerstoneTools.clearToolState(el.element, toolType);
    });
  });
  each(enabledElements, el => {
    cornerstone.updateImage(el.element);
  });
};

// =============================================================
// Set Tool active on all elements (rendered and manipulable) ==
// =============================================================
export const setToolActive = function(
  toolName,
  options,
  activeViewport,
  _viewports
) {
  let viewports = _viewports ? _viewports : ["axial", "sagittal", "coronal"];
  let defaultOpt = DEFAULT_TOOLS[toolName].options;
  extend(defaultOpt, options);
  cornerstoneTools.setToolActive(toolName, defaultOpt);
  if (activeViewport == "all") {
    each(viewports, function(elementId) {
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

// ===================================================
// Set Tool disabled on all elements (not rendered) ==
// ===================================================
export const setToolDisabled = function(toolName, activeViewport, _viewports) {
  cornerstoneTools.setToolDisabled(toolName);
  let viewports = _viewports ? _viewports : ["axial", "sagittal", "coronal"];
  if (activeViewport == "all") {
    each(viewports, function(elementId) {
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

// ==================================================================
// Set Tool enabled on all elements (rendered but not manipulable) ==
// ==================================================================
export const setToolEnabled = function(toolName, activeViewport, _viewports) {
  cornerstoneTools.setToolEnabled(toolName);
  let viewports = _viewports ? _viewports : ["axial", "sagittal", "coronal"];
  if (activeViewport == "all") {
    each(viewports, function(elementId) {
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

// =====================================================================
// Set Tool passive on all elements (rendered, manipulable passively) ==
// =====================================================================
export const setToolPassive = function(toolName, activeViewport, _viewports) {
  cornerstoneTools.setToolPassive(toolName);
  let viewports = _viewports ? _viewports : ["axial", "sagittal", "coronal"];
  if (activeViewport == "all") {
    each(viewports, function(elementId) {
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

// =========================================
// Get tool data for all enabled elements ==
// =========================================
export const getToolState = function(toolName) {
  let enabledElements = cornerstone.getEnabledElements();
  let toolData = {};
  each(enabledElements, el => {
    toolData[el.element.id] = cornerstoneTools.getToolState(
      el.element,
      toolName
    );
  });
  return toolData;
};

// ========================================
// Clear tool data for a subset of seeds ==
// ========================================
export const clearToolStateCustom = function(toolName, options) {
  let enabledElements = cornerstone.getEnabledElements();
  each(enabledElements, el => {
    const toolStateManager = el.toolStateManager;
    let imageIds = Object.keys(toolStateManager.toolState);
    each(imageIds, imageId => {
      let toolData = toolStateManager.toolState[imageId];
      if (toolData[toolName]) {
        remove(toolData[toolName].data, seed => {
          return seed.name == options.name;
        });
      }
    });
  });
  each(enabledElements, el => {
    cornerstone.updateImage(el.element);
  });
};

// =======================================
// Update diameter tool with new values ==
// =======================================
export const updateDiameterTool = function(diameterId, value, seriesId) {
  // clear target diameter
  if (!diameterId) {
    console.warn("no diameterId, return");
    return;
  }

  clearToolStateCustom("Diameter", {
    name: diameterId
  });
  // insert new one
  let data = {
    toolType: "Diameter",
    name: diameterId,
    isCreating: true,
    visible: true,
    active: false,
    invalidated: false,
    handles: {
      start: {
        x: value.tool.x1,
        y: value.tool.y1,
        index: 0,
        drawnIndependently: false,
        allowedOutsideImage: false,
        highlight: true,
        active: false
      },
      end: {
        x: value.tool.x2,
        y: value.tool.y2,
        index: 1,
        drawnIndependently: false,
        allowedOutsideImage: false,
        highlight: true,
        active: false
      },
      perpendicularStart: {
        x: value.tool.x3,
        y: value.tool.y3,
        index: 2,
        drawnIndependently: false,
        allowedOutsideImage: false,
        highlight: true,
        active: false,
        locked: false
      },
      perpendicularEnd: {
        x: value.tool.x4,
        y: value.tool.y4,
        index: 3,
        drawnIndependently: false,
        allowedOutsideImage: false,
        highlight: true,
        active: false
      },
      textBox: {
        x: value.tool.value_max,
        y: value.tool.value_min,
        index: null,
        drawnIndependently: true,
        allowedOutsideImage: true,
        highlight: false,
        active: false,
        hasMoved: true,
        movesIndependently: false,
        hasBoundingBox: true,
        boundingBox: {
          width: 59.6484375,
          height: 47,
          left: 165.02487562189057,
          top: 240.53482587064684
        }
      }
    },
    longestDiameter: value.tool.value_max.toString(),
    shortestDiameter: value.tool.value_min.toString()
  };

  let sliceNumber = value.tool.slice;
  let enabledElement = cornerstone
    .getEnabledElements()
    .filter(el => el.element.id == "cmprAxial")
    .pop();

  // add to master viewport
  addToolStateCustom(
    enabledElement.element,
    "Diameter",
    data,
    sliceNumber,
    seriesId
  );
};

// =========================================
// Add tool data for a given target slice ==
// =========================================
export const addToolStateCustom = function(
  element,
  toolType,
  data,
  slice,
  seriesId
) {
  const enabledElement = cornerstone.getEnabledElement(element);

  if (!enabledElement.image) {
    console.warn("no image");
    return;
  }

  let targetImageId = getImageIdFromSlice(slice, element.id, seriesId);

  if (enabledElement.toolStateManager === undefined) {
    console.warn("State Manager undefined");
    return;
  }
  let toolState = enabledElement.toolStateManager.toolState;

  if (toolState.hasOwnProperty(targetImageId) === false) {
    toolState[targetImageId] = {};
  }

  const imageIdToolState = toolState[targetImageId];

  // If we don't have tool state for this type of tool, add an empty object
  if (imageIdToolState.hasOwnProperty(toolType) === false) {
    imageIdToolState[toolType] = {
      data: []
    };
  }

  const toolData = imageIdToolState[toolType];

  // if an array is provided, override data
  if (Array.isArray(data)) {
    toolData.data = data;
  } else {
    toolData.data.push(data);
  }
};

// ===================================
// Disable all cornerstone elements ==
// ===================================
export const clearCornerstoneElements = function() {
  var enabledElements = cornerstone.getEnabledElements();
  var inMemElements = cloneDeep(enabledElements); // copy before modifying
  each(inMemElements, el => {
    cornerstoneTools.clearToolState(el.element, "Seeds"); // this reset all seeds
    each(DEFAULT_TOOLS, function(tool) {
      if (tool.cleanable) {
        cornerstoneTools.clearToolState(el.element, tool.name);
      }
    });
    cornerstone.disable(el.element);
  });
};

// =================
// Sync the stack ==
// =================
export const stackToolSync = function(
  srcSliceNumber,
  toolName,
  viewport,
  seriesId
) {
  let seriesData = getSeriesData(seriesId);
  let stack = seriesData[viewport];

  let element = document.getElementById(viewport);
  let enabledElement = cornerstone.getEnabledElement(element);
  let srcImageId = getImageIdFromSlice(srcSliceNumber, viewport, seriesId);

  let srcImageToolState =
    enabledElement.toolStateManager.toolState[srcImageId][toolName];

  each(Object.keys(stack.imageIds), sliceNumber => {
    if (sliceNumber == srcSliceNumber) {
      return;
    }
    each(srcImageToolState, data => {
      addToolStateCustom(element, toolName, data, sliceNumber, seriesId);
    });
  });
};

// ======================================================
// Update slice index in cornerstone tools stack state ==
// ======================================================
export const updateStackToolState = function(element, imageIndex) {
  let enabledElement = cornerstone.getEnabledElement(element);
  if (!enabledElement.toolStateManager) {
    return;
  }
  let stackState = enabledElement.toolStateManager.toolState["stack"];
  if (!stackState) {
    return;
  }
  // READY for different segmentations data (data[segmentation_label_id])
  stackState.data[0].currentImageIdIndex = imageIndex;
};

/* Internal module functions */

// =================================
// CornerstoneTools configuration ==
// =================================
const configureCornerstoneToolsSettings = function() {
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

// =======================================
// check if tool has already been added ==
// =======================================
const isToolMissing = function(toolName) {
  let elements = cornerstone.getEnabledElements();
  let isToolMissing = false;
  // TODO check only target viewports
  each(elements, function(element) {
    let added = cornerstoneTools.getToolForElement(element, toolName);
    if (added === undefined) {
      isToolMissing = true;
    }
  });
  return isToolMissing;
};
