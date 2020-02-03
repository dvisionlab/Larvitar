// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import cornerstoneMath from "cornerstone-math";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import { each, extend, remove, cloneDeep, toArray, find } from "lodash";

// UNCOMMENT FOR DEBUG ONLY
// window.cornerstone = cornerstone;
// window.cornerstoneTools = cornerstoneTools;

// internal libraries
import { SeedsTool } from "./tools/seedTool";
import { ContoursTool } from "./tools/contourTool";
import { EditMaskTool } from "./tools/editMaskTool";
import { DiameterTool } from "./tools/diameterTool";
import { getImageIdFromSlice, getSeriesData } from "./nrrdLoader";
import { parseContours } from "./image_contours";

/*
 * This module provides the following functions to be exported:
 * initializeCSTools()
 * addLengthTool()
 * addAngleTool()
 * addContoursTool()
 * addSeedsTool()
 * setToolActive(toolName)
 * setToolDisabled(toolName)
 * setToolEnabled(toolName)
 * setToolPassive(toolName)
 * getToolState(toolName)
 * clearToolStateCustom(toolName, options)
 * clearMeasurements()
 * addToolStateCustom(element, toolType, data, slice)
 * clearCornerstoneElements()
 * configureCornerstoneToolsSettings()
 */

// INTERNAL METHODS

// -------------------------------------
// check if tool has already been added
// -------------------------------------
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

// EXPORTED METHODS

// ---------------------------
// initialize cornerstoneTools
// ---------------------------
const initializeCSTools = function() {
  cornerstoneTools.external.cornerstone = cornerstone;
  cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
  cornerstoneTools.init({
    mouseEnabled: true,
    touchEnabled: false,
    showSVGCursors: true
  });
  cornerstoneWADOImageLoader.external.cornerstoneTools = cornerstoneTools;
};

// ---------------
// Add Length tool
// ---------------
const addLengthTool = function() {
  if (isToolMissing("Length")) {
    const LengthTool = cornerstoneTools.LengthTool;
    cornerstoneTools.addTool(LengthTool);
  }
};

// ------------------
// Add Diameter tool
// ------------------
const addDiameterTool = function(targetElementId, diameters, seriesId) {
  if (isToolMissing("Diameter")) {
    let element = document.getElementById(targetElementId);
    cornerstoneTools.addToolForElement(element, DiameterTool, {
      dataArray: diameters,
      seriesId: seriesId
    });
    setToolPassive("Diameter");
  }
};

// ---------------
// Add Angle tool
// ---------------
const addAngleTool = function() {
  if (isToolMissing("Angle")) {
    const AngleTool = cornerstoneTools.AngleTool;
    cornerstoneTools.addTool(AngleTool);
  }
};

// -------------------------------------------------
// Add WWWC tool synchronized on all active elements
// -------------------------------------------------
const addWwwcTool = function() {
  if (isToolMissing("Wwwc")) {
    const WwwcTool = cornerstoneTools.WwwcTool;
    cornerstoneTools.addTool(WwwcTool);

    let elements = cornerstone.getEnabledElements();
    const wwwc_synchronizer = new cornerstoneTools.Synchronizer(
      "cornerstoneimagerendered",
      cornerstoneTools.wwwcSynchronizer
    );
    elements.forEach(element => {
      wwwc_synchronizer.add(element.element);
    });
    wwwc_synchronizer.enabled = true;
  }
};

// ------------
// Add Pan tool
// ------------
const addPanTool = function() {
  if (isToolMissing("Pan")) {
    const panTool = cornerstoneTools.PanTool;
    cornerstoneTools.addTool(panTool);
  }
};

// -------------
// Add Zoom tool
// -------------
const addZoomTool = function() {
  if (isToolMissing("Zoom")) {
    const zoomTool = cornerstoneTools.ZoomTool;
    cornerstoneTools.addTool(zoomTool);
  }
};

// ---------------------------
// Add Stack Scroll Wheel tool
// ---------------------------
const addStackScrollWheelTool = function() {
  // TODO CHECK THIS NOT WORKING
  // cornerstoneTools.addTool(cornerstoneTools.StackScrollMouseWheelTool);
  // cornerstoneTools.setToolActive("StackScrollMouseWheel", {
  //   mouseButtonMask: 4
  // });
};

// ---------------
// Clear measurements
// ---------------
const clearMeasurements = function() {
  let enabledElements = cornerstone.getEnabledElements();
  each(enabledElements, el => {
    const toolStateManager = el.toolStateManager;
    let imageIds = Object.keys(toolStateManager.toolState);

    each(imageIds, imageId => {
      let toolData = toolStateManager.toolState[imageId];
      if (toolData["Length"]) {
        remove(toolData["Length"].data);
      }
      if (toolData["Angle"]) {
        remove(toolData["Angle"].data);
      }
    });
  });
  each(enabledElements, el => {
    cornerstone.updateImage(el.element);
  });
};

// -----------------
// Add Contour tool
// -----------------
const addContoursTool = function(rawContours, maskName) {
  var pointBatchSize = 2;
  console.time("...parsing contours");
  var contoursParsedData = parseContours(rawContours, pointBatchSize, maskName);
  console.timeEnd("...parsing contours");
  cornerstoneTools.addTool(ContoursTool, {
    contoursParsedData,
    maskName
  });
};

// ----------------------
// Add mask editing tool
// ----------------------
const addMaskEditingTool = function(
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

// ------------------------------------
// Add mask editing tool current state
// ------------------------------------
const getCurrentMaskData = function(viewportId) {
  const { getters } = cornerstoneTools.getModule("segmentation");
  let enabledElement = cornerstone
    .getEnabledElements()
    .filter(e => e.element.id == viewportId)
    .pop();

  const { labelmap3D } = getters.labelmap2D(enabledElement.element);
  return labelmap3D;
};

// ------------------------------------
// Add Stack State to a single element
// ------------------------------------
const addStackStateToElement = function(seriesId, element) {
  // Define the Stack object
  const stack = getSeriesData(seriesId)[element.id];
  // Add the stack tool state to the enabled element
  cornerstoneTools.addStackStateManager(element, ["stack"]);
  cornerstoneTools.addToolState(element, "stack", stack);
};

// ---------------
// Add Seed tool
// ---------------
const addSeedsTool = function(preLoadSeeds, _initViewport) {
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

// -----------------------------------------------------------
// Set Tool active on all elements (rendered and manipulable)
// -----------------------------------------------------------
const setToolActive = function(toolName, options, activeViewport, _viewports) {
  let defaultOpt = {
    mouseButtonMask: 1
  };
  let viewports = _viewports ? _viewports : ["axial", "sagittal", "coronal"];
  extend(defaultOpt, options);
  cornerstoneTools.setToolActive(toolName, defaultOpt);
  if (activeViewport == "all") {
    each(viewports, function(elementId) {
      cornerstone.updateImage(document.getElementById(elementId));
    });
  } else {
    cornerstone.updateImage(document.getElementById(activeViewport));
  }
};

// -------------------------------------------------
// Set Tool disabled on all elements (not rendered)
// -------------------------------------------------
const setToolDisabled = function(toolName, activeViewport, _viewports) {
  cornerstoneTools.setToolDisabled(toolName);
  let viewports = _viewports ? _viewports : ["axial", "sagittal", "coronal"];
  if (activeViewport == "all") {
    each(viewports, function(elementId) {
      cornerstone.updateImage(document.getElementById(elementId));
    });
  } else {
    cornerstone.updateImage(document.getElementById(activeViewport));
  }
};

// -----------------------------------------------------------------
// Set Tool enabled on all elements (rendered but not manipulable)
// -----------------------------------------------------------------
const setToolEnabled = function(toolName, activeViewport, _viewports) {
  cornerstoneTools.setToolEnabled(toolName);
  let viewports = _viewports ? _viewports : ["axial", "sagittal", "coronal"];
  if (activeViewport == "all") {
    each(viewports, function(elementId) {
      cornerstone.updateImage(document.getElementById(elementId));
    });
  } else {
    cornerstone.updateImage(document.getElementById(activeViewport));
  }
};

// -------------------------------------------------------------------
// Set Tool passive on all elements (rendered, manipulable passively)
// -------------------------------------------------------------------
const setToolPassive = function(toolName, activeViewport, _viewports) {
  cornerstoneTools.setToolPassive(toolName);
  let viewports = _viewports ? _viewports : ["axial", "sagittal", "coronal"];
  if (activeViewport == "all") {
    each(viewports, function(elementId) {
      cornerstone.updateImage(document.getElementById(elementId));
    });
  } else {
    cornerstone.updateImage(document.getElementById(activeViewport));
  }
};

// ---------------------------------------
// Get tool data for all enabled elements
// ---------------------------------------
const getToolState = function(toolName) {
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

// --------------------------------------
// Clear tool data for a subset of seeds
// --------------------------------------
const clearToolStateCustom = function(toolName, options) {
  let enabledElements = cornerstone.getEnabledElements();
  each(enabledElements, el => {
    // cornerstoneTools.clearToolState(el.element, toolName, options); // this reset all seeds
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

// ------------------------------------
// Update diameter tool with new values
// ------------------------------------
function updateDiameterTool(diameterId, value, seriesId) {
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
}

// ---------------------------------------
// Add tool data for a given target slice
// ---------------------------------------
function addToolStateCustom(element, toolType, data, slice, seriesId) {
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
    // console.info("creating", targetImageId, "for", element.id);
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
}

// ---------------------------------
// Disable all cornerstone elements
// ---------------------------------
const clearCornerstoneElements = function() {
  var enabledElements = cornerstone.getEnabledElements();
  var inMemElements = cloneDeep(enabledElements); // copy before modifying

  each(inMemElements, el => {
    cornerstoneTools.clearToolState(el.element, "Seeds"); // this reset all seeds
    cornerstone.disable(el.element);
  });
};

// --------------
// Sync the stack
// --------------
const stackToolSync = function(srcSliceNumber, toolName, viewport, seriesId) {
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

// ---------------------------------------------------
// Update slice index in cornerstone tools stack state
// ---------------------------------------------------
const updateStackToolState = function(element, imageIndex) {
  let enabledElement = cornerstone.getEnabledElement(element);
  if (!enabledElement.toolStateManager) {
    // console.log("return");
    return;
  }
  let stackState = enabledElement.toolStateManager.toolState["stack"];
  if (!stackState) {
    // console.log("RETURN");
    return;
  }

  // READY for different segmentations data (data[segmentation_label_id])
  stackState.data[0].currentImageIdIndex = imageIndex;
};

// ------------------------------
// cornerstoneTools configuration
// ------------------------------
const configureCornerstoneToolsSettings = function() {
  cornerstoneTools.toolStyle.setToolWidth(1);
  cornerstoneTools.toolColors.setToolColor("#FF0000");
  cornerstoneTools.toolColors.setActiveColor("#00FF00");
  cornerstoneTools.toolColors.setFillColor("#0000FF");
  cornerstoneTools.textStyle.setFont("Noto Sans");
  cornerstoneTools.textStyle.setFontSize(16);
  cornerstoneTools.textStyle.setBackgroundColor("rgba(1, 1, 1, 0.3)");
};

configureCornerstoneToolsSettings();

export {
  initializeCSTools,
  addLengthTool,
  addAngleTool,
  addWwwcTool,
  addPanTool,
  addZoomTool,
  addStackScrollWheelTool,
  clearMeasurements,
  addContoursTool,
  addMaskEditingTool,
  getCurrentMaskData,
  addStackStateToElement,
  addSeedsTool,
  addDiameterTool,
  setToolActive,
  setToolDisabled,
  setToolEnabled,
  setToolPassive,
  getToolState,
  updateDiameterTool,
  addToolStateCustom,
  clearToolStateCustom,
  clearCornerstoneElements,
  stackToolSync,
  updateStackToolState,
  configureCornerstoneToolsSettings
};
