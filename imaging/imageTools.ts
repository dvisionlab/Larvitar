/** @module imaging/imageTools
 *  @desc This file provides functionalities for
 *        interacting with cornerstone tools
 *        DEPRECATION WARNING: these are legacy functions
 *        that will be removed soon. Use the corresponding
 *        functions in /tools/main.js instead.
 *        For this reason, this file will not be translated to TypeScript.
 */

// external libraries
import cornerstone, { EnabledElement } from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import { each, extend, filter, remove, cloneDeep } from "lodash";

// internal libraries
import { logger } from "../logger";
import { DEFAULT_TOOLS } from "./tools/default";
// import { SeedsTool } from "./tools/custom/seedTool";
import { ContoursTool } from "./tools/custom/contourTool";
import { EditMaskTool } from "./tools/custom/editMaskTool";
import { DiameterTool } from "./tools/custom/diameterTool";
import { getImageIdFromSlice } from "./loaders/nrrdLoader";
import { getDataFromImageManager } from "./imageManagers";
import { parseContours } from "./imageContours";
import { isElement } from "./imageUtils";
import { setToolEnabled, setToolPassive } from "./tools/main";
import { CornerstoneElement } from "./types";
import {
  BaseToolStateData,
  DiameterStateData,
  SegmentationConfig,
  ToolState
} from "./tools/types";

/*
 * This module provides the following functions to be exported:
 * clearMeasurements()
 * addContoursTool(rawContours, maskName)
 * addMaskEditingTool(seriesId,mask,setConfig,callback, targetViewport)
 * getCurrentMaskData(viewportId)
 * addStackStateToElement(seriesId, element)
 * addSeedsTool(preLoadSeeds, initViewport)
 * addDiameterTool(targetElementId, diameters, seriesId)
 * getToolState(toolName)
 * updateDiameterTool(diameterId, value, seriesId)
 * addToolStateSingleSlice(element, toolType, data, slice, seriesId)
 * clearToolStateByName(toolName, options)
 * clearCornerstoneElements()
 * syncToolStack(srcSliceNumber, toolName, viewport, seriesId)
 * updateStackToolState(element, imageIndex)
 */

/**
 * Add Diameter tool
 * @function addDiameterTool
 * @param {String} elementId - The target hmtl element id or its DOM HTMLElement
 * @param {Array} diameters - The array of diameter objects.
 * @param {String} seriesId - The id of the target serie.
 */
export const addDiameterTool = function (
  elementId: string,
  diameters: number[],
  seriesId: string
) {
  if (isToolMissing("Diameter")) {
    let element = isElement(elementId)
      ? elementId
      : document.getElementById(elementId);
    cornerstoneTools.addToolForElement(element, DiameterTool, {
      dataArray: diameters,
      seriesId: seriesId
    });
    setToolPassive("Diameter");
  }
};

/**
 * Add Contour tool
 * @function addContoursTool
 * @param {Object} rawContours - The contours object (generated from a segmentation mask).
 * @param {String} maskName - The name tag that identify the mask
 */
/**
 * Add Contour tool
 * @function addContoursTool
 * @param {Object} rawContours - The contours object (generated from a segmentation mask).
 * @param {String} maskName - The name tag that identify the mask
 */
export const addContoursTool = function (
  rawContours: { [key: string]: Uint8Array },
  maskName: string
): void {
  const pointBatchSize = 2;
  console.time("...parsing contours");
  const contoursParsedData = parseContours(
    rawContours,
    pointBatchSize,
    maskName
  );
  console.timeEnd("...parsing contours");
  cornerstoneTools.addTool(ContoursTool, {
    contoursParsedData,
    maskName
  });
};

/**
 * Add mask editing tool
 * @function addMaskEditingTool
 * @param {Array} mask - The mask data.
 * @param {Function} callback - The tool initialization callback
 * @param {String} targetViewport - The target hmtl element id.
 */
export const addMaskEditingTool = function (
  mask: string[],
  callback: () => void,
  targetViewport: string
) {
  const enabledElements = cornerstone.getEnabledElements();

  each(enabledElements, (el: CornerstoneElement) => {
    if (el.element.id === targetViewport) {
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

  const defaultConfig: SegmentationConfig = {
    radius: 5,
    fillAlpha: 0.5
  };

  setSegmentationConfig(defaultConfig);
};

/**
 * Modify configuration for cornerstone tools segmentation module
 * @function setSegmentationConfig
 * @param {Object} config - The custom configuration.
 * @example 
 * Example of custom configuration
 * config = {
      renderOutline: true,
      renderFill: true,
      shouldRenderInactiveLabelmaps: true,
      radius: 10,
      minRadius: 1,
      maxRadius: 50,
      segmentsPerLabelmap: 65535,
      fillAlpha: 0.7,
      fillAlphaInactive: 0.1,
      outlineAlpha: 0.7,
      outlineAlphaInactive: 0.35,
      outlineWidth: 3,
      storeHistory: true
    };
 */
export const setSegmentationConfig = function (
  config: Partial<SegmentationConfig>
) {
  const { configuration } = cornerstoneTools.getModule("segmentation");
  extend(configuration, config);
  const enabledElements = cornerstone.getEnabledElements();
  each(enabledElements, (el: CornerstoneElement) => {
    cornerstone.updateImage(el.element);
  });
};

/**
 * Get mask editing tool current data from state
 * @function getCurrentMaskData
 * @param {String} viewportId - The target hmtl element id.
 * @return {Array} labelmap3D - The mask array
 */
export const getCurrentMaskData = function (viewportId: string): unknown[] {
  const { getters } = cornerstoneTools.getModule("segmentation");
  const enabledElement = cornerstone
    .getEnabledElements()
    .filter((e: CornerstoneElement) => e.element.id === viewportId)
    .pop();

  if (!enabledElement) {
    throw new Error(`Element with id ${viewportId} not found`);
  }

  const { labelmap3D } = getters.labelmap2D(enabledElement.element);
  return labelmap3D;
};

/**
 * Add Stack State to a single hmtl element
 * @function addStackStateToElement
 * @param {String} seriesId - The id of the target serie.
 * @param {HTMLElement} element - The target hmtl element.
 */
export const addStackStateToElement = function (
  seriesId: string,
  element: HTMLElement
): void {
  // Define the Stack object
  const stack = getDataFromImageManager(seriesId);
  // Add the stack tool state to the enabled element
  cornerstoneTools.addStackStateManager(element, ["stack"]);
  cornerstoneTools.addToolState(element, "stack", stack);
};

/**
 * Add seeds tool
 * @function addSeedsTool
 * @param {Array} preLoadSeeds - The array of seeds to load as initialization.
 * @param {String} initViewport - The hmtl element id to be used for tool initialization.
 */
export const addSeedsTool = function (
  preLoadSeeds: string[],
  initViewport: string
): void {
  if (isToolMissing("Seeds")) {
    const enabledElements = cornerstone.getEnabledElements();
    each(enabledElements, (el: CornerstoneElement) => {
      const initialize = el.element.id === initViewport;
      cornerstoneTools.addToolForElement(el.element, "SeedsTool", {
        preLoadSeeds,
        initialize,
        initViewport
      });
    });
    setToolEnabled("Seeds");
  }
};

/**
 * Delete all measurements from tools state, for tools that have the "cleaneable" prop set to true in tools/default.js
 * @function clearMeasurements
 */
export const clearMeasurements = function () {
  let enabledElements = cornerstone.getEnabledElements();
  let clenableTools = filter(DEFAULT_TOOLS, "cleanable");

  each(enabledElements, el => {
    each(clenableTools, function (tool) {
      cornerstoneTools.clearToolState(el.element, tool.name);
    });
  });
  each(enabledElements, el => {
    cornerstone.updateImage(el.element);
  });
};

/**
 * Get tool data for all enabled elements
 * @function getToolState
 * @param {String} toolName - The tool name.
 * @return {Object} - Tool data grouped by element id
 */
export const getToolState = function (toolName: string) {
  let enabledElements = cornerstone.getEnabledElements();
  let toolData: any = {};
  each(enabledElements, el => {
    toolData[el.element.id] = cornerstoneTools.getToolState(
      el.element,
      toolName
    );
  });
  return toolData;
};

/**
 * Clear tool data for a subset of seeds
 * @function clearToolStateByName
 * @param {String} toolName - The tool name.
 * @param {Object} options - Props used to select the data to delete (at the moment only {name : "targetName"} is implemented)
 */
export const clearToolStateByName = function (toolName: string, options: any) {
  let enabledElements = cornerstone.getEnabledElements();
  each(
    enabledElements,

    el => {
      const toolStateManager = (el as any).toolStateManager;
      let imageIds = Object.keys(toolStateManager.toolState);
      each(imageIds, imageId => {
        let toolData = toolStateManager.toolState[imageId];
        if (toolData[toolName]) {
          remove(toolData[toolName].data, (singleData: { name: string }) => {
            return singleData.name == options.name;
          });
        }
      });
    }
  );
  each(enabledElements, el => {
    cornerstone.updateImage(el.element);
  });
};

/**
 * Update diameter tool with new value (removing old one)
 * @function updateDiameterTool
 * @param {String | Number} diameterId - The id that identify the diameter data.
 * @param {Object} value - The object representing the new diameter data.
 * @param {String} seriesId - The target serie id.
 * @param {String} viewportId - The viewport id.
 */
export const updateDiameterTool = function (
  diameterId: string,
  value: { tool: DiameterStateData },
  seriesId: string,
  viewportId: string
) {
  // clear target diameter
  if (!diameterId) {
    logger.warn("no diameterId, return");
    return;
  }

  clearToolStateByName("Diameter", {
    name: diameterId
  });
  // insert new one
  let data: Partial<DiameterStateData> = {
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
        index: undefined,
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
    .filter(el => el.element.id == viewportId)
    .pop();

  // add to master viewport
  addToolStateSingleSlice(
    enabledElement!.element,
    "Diameter",
    data,
    sliceNumber!,
    seriesId
  );
};

/**
 * Add tool data for a single target slice
 * @function addToolStateSingleSlice
 * @param {HTMLElement} element - The target hmtl element.
 * @param {String} toolName - The tool name.
 * @param {Object | Array} data - The tool data to add (tool-specific)
 * @param {Number} slice - The target slice to put the data in.
 * @param {String} seriesId - The target serie id.
 */
export const addToolStateSingleSlice = function (
  element: HTMLElement,
  toolName: string,
  data: Partial<DiameterStateData>,
  slice: number,
  seriesId?: string
) {
  const enabledElement = cornerstone.getEnabledElement(element) as any;

  if (!enabledElement.image) {
    logger.warn("no image");
    return;
  }

  let targetImageId = getImageIdFromSlice(slice, element.id, seriesId!);

  if (enabledElement.toolStateManager === undefined) {
    logger.warn("State Manager undefined");
    return;
  }
  let toolState = enabledElement.toolStateManager.toolState;

  if (toolState.hasOwnProperty(targetImageId) === false) {
    toolState[targetImageId] = {};
  }

  const imageIdToolState = toolState[targetImageId];

  // If we don't have tool state for this type of tool, add an empty object
  if (imageIdToolState.hasOwnProperty(toolName) === false) {
    imageIdToolState[toolName] = {
      data: []
    };
  }

  const toolData = imageIdToolState[toolName];

  // if an array is provided, override data
  // if (Array.isArray(data)) {
  //   toolData.data = data;
  // } else {
  //   toolData.data.push(data);
  // }

  // This implementation works better
  let singledata = typeof data.pop == "function" ? data.pop() : data;
  // remove old data for this id (avoid doubling contours) // TODO generalize
  if (toolName == "ContoursTool") {
    remove(
      toolData.data,
      (entry: { id: string }) => entry && entry.id == singledata.id
    );
  }
  toolData.data.push(singledata);
};

/**
 * Clear tool state and disable all cornerstone elements
 * @function clearCornerstoneElements
 */
export const clearCornerstoneElements = function () {
  const t0 = performance.now();
  var enabledElements = cornerstone.getEnabledElements();
  var inMemElements = cloneDeep(enabledElements); // copy before modifying
  each(inMemElements, el => {
    each(DEFAULT_TOOLS, function (tool) {
      if (tool.cleanable) {
        cornerstoneTools.clearToolState(el.element, tool.name);
      }
    });
    cornerstone.disable(el.element);
  });
  const t1 = performance.now();
  logger.debug(
    "Call to clearCornerstoneElements took " + (t1 - t0) + " milliseconds."
  );
};

/**
 * Sync the cornerstone tools stack given a slice as data source
 * @function syncToolStack
 * @param {Number} srcSliceNumber - The slice to be used as data source.
 * @param {String} toolName - The name of the tool to sync.
 * @param {String} viewport - The target viewport id.
 * @param {String} seriesId - The target serie id.
 */
export const syncToolStack = function (
  srcSliceNumber: number,
  toolName: string,
  viewport: string,
  seriesId: string
) {
  // get the imageIds array
  let seriesData = getDataFromImageManager(seriesId);
  let imageIds = seriesData!.imageIds;

  // get the tool state of source imageId
  let element = document.getElementById(viewport);
  let enabledElement = cornerstone.getEnabledElement(element!) as any;
  let srcImageId = getImageIdFromSlice(srcSliceNumber, viewport, seriesId);
  let srcImageToolState =
    enabledElement.toolStateManager.toolState[srcImageId][toolName];

  each(Object.keys(imageIds), (imageid, sliceNumber) => {
    if (sliceNumber == srcSliceNumber) {
      return;
    }
    each(srcImageToolState, data => {
      addToolStateSingleSlice(element!, toolName, data, sliceNumber, seriesId);
    });
  });
};

/**
 * Update slice index in cornerstone tools stack state
 * @function updateStackToolState
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Number} imageIndex - The new imageIndex value.
 */
export const updateStackToolState = function (
  elementId: string | HTMLElement,
  imageIndex: number
) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId as string);
  if (!element) {
    logger.error("invalid html element: " + elementId);
    return;
  }
  let enabledElement = cornerstone.getEnabledElement(
    element as HTMLElement
  ) as any;
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

/** @inner Internal module functions */

/**
 * Check if a tool has already been added
 * @function isToolMissing
 * @param {String} toolName - The tool name.
 * @param {Array} _viewports - The viewports to check.
 */
const isToolMissing = function (toolName: string, _viewports?: string[]) {
  let isToolMissing = false;

  if (_viewports) {
    each(_viewports, function (viewport) {
      let element = cornerstone.getEnabledElement(
        document.getElementById(viewport)!
      );
      let added = cornerstoneTools.getToolForElement(element, toolName);
      if (added === undefined) {
        isToolMissing = true;
      }
    });
  } else {
    let elements = cornerstone.getEnabledElements();
    each(elements, function (element) {
      let added = cornerstoneTools.getToolForElement(element, toolName);
      if (added === undefined) {
        isToolMissing = true;
      }
    });
  }

  return isToolMissing;
};
