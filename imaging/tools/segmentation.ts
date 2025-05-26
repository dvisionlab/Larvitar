/** @module imaging/tools/segmentation
 *  @desc  This file provides functionalities
 *         for handling masks and luts
 */

// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import { cloneDeep, extend, values, sum } from "lodash";
const segModule = cornerstoneTools.getModule("segmentation");
const { getters, setters } = segModule;

// internal libraries
import { logger } from "../../logger";
import { setToolActive, setToolDisabled } from "./main";
import { isElement } from "../imageUtils";
import store from "../imageStore";
import { updateStackToolState } from "../imageTools";

// custom code
import { setLabelmap3DForElement } from "./custom/setLabelMap3D";
import {
  BrushProperties,
  MaskProperties,
  MaskVisualizations,
  SegmentationConfig
} from "./types";
import type { TypedArray } from "../types";
// override function
setters.labelmap3DForElement = setLabelmap3DForElement;

// General segmentation cs tools module configuration
const config: SegmentationConfig = {
  arrayType: 0,
  renderOutline: false,
  renderFill: true,
  shouldRenderInactiveLabelmaps: true,
  radius: 10,
  minRadius: 1,
  maxRadius: 50,
  segmentsPerLabelmap: 10,
  fillAlpha: 0.9,
  fillAlphaInactive: 0.9,
  outlineAlpha: 1.0,
  outlineAlphaInactive: 1.0,
  outlineWidth: 1,
  storeHistory: true
};

// ====================================================
// utils to convert from hex to rgb and vice-versa ====
// ====================================================

function componentToHex(c: number) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

export function rgbToHex(c: number[]) {
  let r = componentToHex(c[0]);
  let g = componentToHex(c[1]);
  let b = componentToHex(c[2]);
  return "#" + r + g + b;
}

export function hexToRgb(hex: string) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  if (!result) {
    logger.error("Error parsing hex color");
    return [0, 0, 0];
  }

  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
}

/**
 * Convert color from hsv to rgb
 * @param {Array} color as [h,s,v] 0-1
 * @returns color as [r,g,b] 0-255
 */
function HSVtoRGB([h, s, v]: [number, number, number]) {
  var r, g, b, i, f, p, q, t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = v), (b = p);
      break;
    case 2:
      (r = p), (g = v), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = v);
      break;
    case 4:
      (r = t), (g = p), (b = v);
      break;
    case 5:
      (r = v), (g = p), (b = q);
      break;
    default:
      (r = v), (g = t), (b = p);
      logger.error("HSVtoRGB: Input color must be [h,s,v] 0-1");
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Force cs tools refresh on all enabled images
 */
export function forceRender() {
  let enabledElements = cornerstone.getEnabledElements();
  enabledElements.forEach(enEl => {
    cornerstone.updateImage(enEl.element);
  });
}

/**
 * Generate the custom LUT - single volume version
 */

function generateLUT(opacity: number) {
  let lut = new Array(segModule.configuration.segmentsPerLabelmap).fill(0);
  lut = lut.map((e, i) => {
    return HSVtoRGB([i / lut.length, 1, 1]).concat(Math.round(opacity * 255));
  });

  return lut;
}

/**
 * Generate the custom LUT - multiple volume version
 * @param {String} hex_color - color for LUT in the #RRGGBB form
 * @param {NUmber} opacity - number between 0 and 1
 */
function generateUniformLUT(hex_color: string, opacity: number) {
  let lut = new Array(segModule.configuration.segmentsPerLabelmap);
  let rgb_color = hexToRgb(hex_color);
  let rgba_color = rgb_color.concat(Math.round(opacity * 255));
  lut.fill(rgba_color);
  return lut;
}

/**
 * Set color for label
 * @param {Number} labelId
 * @param {String} color in hex format
 */
export function setLabelColor(labelId: string, color: string) {
  let volumeId = 0; // TODO MULTIVOLUME
  let rgb = hexToRgb(color);
  let rgba = [...rgb, 128];
  setters.colorForSegmentIndexOfColorLUT(volumeId, labelId, rgba);
  // force render ? depends on image visualization (render all ?)
}

/**
 * Get color from label
 * @param {Number} labelId
 * @returns {String} Color in hex format
 */
export function getLabelColor(labelId: string) {
  let volumeId = 0; // TODO MULTIVOLUME
  let rgba = getters.colorForSegmentIndexColorLUT(volumeId, labelId);
  return rgbToHex(rgba);
}

/**
 * A function to group all settings to load before masks
 * @param {Object} customConfig - Object containing override values for segmentation module config
 */
export function initSegmentationModule(customConfig: SegmentationConfig) {
  // set configuration
  segModule.configuration = cloneDeep(config);
  extend(segModule.configuration, customConfig);
}

/**
 * Add segmentation mask to segmentation module
 * @param {Object} props - The mask properties (labelId, color and opacity)
 * @param {TypedArray} - The mask data array
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 * @returns {Promise} - Return a promise which will resolve when segmentation mask is added
 */

export function addSegmentationMask(
  props: MaskProperties,
  data: TypedArray,
  elementId: string | HTMLElement
) {
  let promise = new Promise<void>(async resolve => {
    let element = isElement(elementId)
      ? (elementId as HTMLElement)
      : document.getElementById(elementId as string);
    if (!element) {
      logger.error("invalid html element: " + elementId);
      return;
    }

    const res = await setters.labelmap3DForElement(
      element,
      data.buffer,
      props.labelId
    );
    // if user set a color property, use that color for all segments on the labelmap
    let lut = props.color
      ? generateUniformLUT(props.color, props.opacity)
      : generateLUT(props.opacity);
    setters.colorLUT(props.labelId, lut);
    // bind labelmap to colorLUT
    let labelmap3d = getters.labelmap3D(element, props.labelId);
    setters.colorLUTIndexForLabelmap3D(labelmap3d, props.labelId);

    // set current imageIdIndex in tool state
    let currentImageIdIndex = store.get(["viewports", element.id, "sliceId"]);
    if (currentImageIdIndex !== "error" && currentImageIdIndex >= 0) {
      updateStackToolState(element.id, currentImageIdIndex);
    } else {
      logger.error("Cannot get currentImageIdIndex");
    }

    resolve();
  });
  return promise;
}

/**
 * Set a new mask slice into the labelmap buffer
 * @param {string | HTMLElement} elementId - The target html element Id or its DOM HTMLElement
 * @param {Number} sliceIndex - the index of the new mask slice
 * @param {ArrayBuffer} pixelData - the pixelData array
 */
export function loadMaskSlice(
  elementId: string | HTMLElement,
  sliceIndex: number,
  pixelData: TypedArray
) {
  // optimization: if pixelData contains no labels, return
  if (sum(pixelData) === 0) {
    return;
  }

  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    logger.error("invalid html element: " + elementId);
    return;
  }
  let volumeId = 0; // TODO for multivolume
  // get labelmap buffer
  let labelmaps2D = getters.labelmap3D(element, volumeId).labelmaps2D;

  // add if not alresdy present
  if (!labelmaps2D[sliceIndex]) {
    labelmaps2D[sliceIndex] = {};
  }

  labelmaps2D[sliceIndex].pixelData = pixelData;
  setters.updateSegmentsOnLabelmap2D(labelmaps2D[sliceIndex]);
  cornerstone.updateImage(element);
}

/**
 * Activate a specific labelmap through its labelId
 * @param {Number} labelId - The labelmap id to activate
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 */
export function setActiveLabelmap(
  labelId: number,
  elementId: string | HTMLElement
) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    logger.error("invalid html element: " + elementId);
    return;
  }
  setters.activeLabelmapIndex(element, labelId);
}

/**
 * Get active labelmap for target element
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 * @returns {Object} The active labelmap object that contains the buffer
 */
export function getActiveLabelmapBuffer(elementId: string | HTMLElement) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    logger.error("invalid html element: " + elementId);
    return;
  }
  return getters.activeLabelmapBuffer(element);
}

/**
 * Activate a specific segment through its index
 * @param {Number} segmentIndex - The segment index to activate
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 */
export function setActiveSegment(
  segmentIndex: number,
  elementId: string | HTMLElement
) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    logger.error("invalid html element: " + elementId);
    return;
  }
  setters.activeSegmentIndex(element, segmentIndex);
}

/**
 * Change opacity for active label
 * @param {Number} opacity - The desired opacity value
 */
export function setActiveLabelOpacity(opacity: number) {
  segModule.configuration.fillAlpha = opacity;
  forceRender();
}

/**
 * Change opacity for inactive labels
 * @param {Number} opacity - The desired opacity value
 */
export function setInactiveLabelOpacity(opacity: number) {
  segModule.configuration.fillAlphaInactive = opacity;
  forceRender();
}

/**
 * Toggle mask visibility
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 * @param {Number} labelId - The id of the mask label
 */
export function toggleVisibility(
  elementId: string | HTMLElement,
  labelId: number
) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    logger.error("invalid html element: " + elementId);
    return;
  }
  let volumeId = 0; // TODO MULTIVOLUME
  setters.toggleSegmentVisibility(element, labelId, volumeId);
  cornerstone.updateImage(element);
}

/**
 * Toggle between 'contours mode' and 'filled mode'
 * @param {Bool} toggle - Contour mode enabled if true
 */
export function toggleContourMode(toggle: boolean) {
  if (toggle) {
    segModule.configuration.fillAlpha = 0.0;
    segModule.configuration.fillAlphaInactive = 0.0;
    segModule.configuration.outlineAlpha = 1.0;
    segModule.configuration.outlineAlphaInactive = 1.0;
    segModule.configuration.outlineWidth = 3;
  } else {
    segModule.configuration.fillAlpha = config.fillAlpha;
    segModule.configuration.fillAlphaInactive = config.fillAlphaInactive;
    segModule.configuration.outlineAlpha = config.outlineAlpha;
    segModule.configuration.outlineAlphaInactive = config.outlineAlphaInactive;
    segModule.configuration.outlineWidth = config.outlineWidth;
  }
  forceRender();
}

/**
 * Set mask appearance props
 * @param {Object} maskProps - The mask appearance props (labelId, visualization [0=filled, 1=contour, 2=hidden], opacity (if mode=0), between 0 and 1)
 */

export function setMaskProps(props: MaskProperties) {
  // Lut index and segment values are hardcoded because they will depend on design choices:
  // eg single/multiple volumes for segmentations
  let lutIndex = props.labelId;
  let labelIndex = props.labelId;
  // let segmentValue = MAP_VALUES[props.id];
  let segmentValue = 1; // binary mask, segment 1 is the only to be affected by color & opacity
  let currentColor = getters.colorForSegmentIndexColorLUT(
    props.labelId,
    segmentValue
  );
  let htmlelement = document.getElementById("axial");

  let newColor = currentColor;
  switch (props.visualization) {
    // full
    case MaskVisualizations.FILL:
      segModule.configuration.renderOutline = true;
      getters.isSegmentVisible(htmlelement, segmentValue, labelIndex)
        ? null
        : setters.toggleSegmentVisibility(
          htmlelement,
          segmentValue,
          labelIndex
        );
      newColor[3] = Math.round(props.opacity * 255);
      setters.colorForSegmentIndexOfColorLUT(lutIndex, segmentValue, newColor);
      break;
    // contours
    case MaskVisualizations.CONTOUR:
      segModule.configuration.renderOutline = true;
      getters.isSegmentVisible(htmlelement, segmentValue, labelIndex)
        ? null
        : setters.toggleSegmentVisibility(
          htmlelement,
          segmentValue,
          labelIndex
        );
      newColor[3] = 0;
      setters.colorForSegmentIndexOfColorLUT(lutIndex, segmentValue, newColor);
      break;
    // hidden
    case MaskVisualizations.HIDDEN:
      setters.toggleSegmentVisibility(htmlelement, segmentValue, labelIndex);
      break;
  }
  forceRender();
}

/**
 * Clear state for segmentation module
 */
export function clearSegmentationState() {
  segModule.state.series = {};
}

/**
 * Enable brushing
 * NOTE: if options contains `thresholds`, ThresholdsBrush is activated, otherwise BrushTool is activated.
 * Anyway, the activated tool name is returned
 * @param {Object} options - An object containing configuration values (eg radius, thresholds, etc...)
 */
export function enableBrushTool(viewports: string[], options: BrushProperties) {
  setBrushProps(options);
  const brushType = "thresholds" in options ? "ThresholdsBrush" : "Brush";
  setToolActive(brushType, undefined, viewports);
  return brushType;
}

/**
 * Disable brushing
 * This function disables both brush tools, if found active on `viewports`
 * @param {String} toolToActivate - The name of the tool to activate after removing the brush @optional
 */
export function disableBrushTool(viewports: string[], toolToActivate?: string) {
  viewports.forEach((viewport: string) => {
    const el = document.getElementById(viewport);
    if (cornerstoneTools.isToolActiveForElement(el, "ThresholdsBrush")) {
      setToolDisabled("ThresholdsBrush", [viewport]);
    }
    if (cornerstoneTools.isToolActiveForElement(el, "Brush")) {
      setToolDisabled("Brush", [viewport]);
    }
  });

  if (toolToActivate) {
    setToolActive(toolToActivate);
  }
}

/**
 * Change the brush props
 * @param {Object} props - The new brush props {radius: number[px], thresholds: array[min,max]}
 */
export function setBrushProps(props: BrushProperties) {
  extend(segModule.configuration, props);
  forceRender();
}

/**
 * Undo last brush operation (stroke)
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 */
export function undoLastStroke(elementId: string | HTMLElement) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    logger.error("invalid html element: " + elementId);
    return;
  }
  let activeLabelMapIndex = segModule.getters.activeLabelmapIndex(element);
  setters.undo(element, activeLabelMapIndex);
}

/**
 * Redo last brush operation (stroke)
 * @param {String} elementId - The target html element Id or its DOM HTMLElement
 */
export function redoLastStroke(elementId: string | HTMLElement) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    logger.error("invalid html element: " + elementId);
    return;
  }
  let activeLabelMapIndex = segModule.getters.activeLabelmapIndex(element);
  setters.redo(element, activeLabelMapIndex);
}

/**
 * Delete mask from state
 * @param {Number} labelId - The labelmap id to delete
 */
export function deleteMask(labelId: number) {
  let masks = values(segModule.state.series)[0].labelmaps3D;
  delete masks[labelId];
  forceRender();
}
