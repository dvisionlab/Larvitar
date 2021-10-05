// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools/dist/cornerstoneTools.js";
// tools
import { setToolActive, setToolDisabled } from "./tools.main";
// utils
import { cloneDeep, extend, values } from "lodash";

const segModule = cornerstoneTools.getModule("segmentation");
const setters = segModule.setters;
const getters = segModule.getters;

/**
 * THIS MODULE IS A WIP
 */

// DEV
window.segModule = segModule;
window.cornerstone = cornerstone;
window.cornerstoneTools = cornerstoneTools;

/**
 * NOTES ON CS TOOLS SEGMENTATION MODULE
 * The value in the mask (binary) define which color will be used from the LUT map
 * The different masks are 'labelmap', while different values in the same mask are 'segments'
 * Segments get the color from the lutmap (up to 2^16 segments) and can be shown/hidden one by one
 * > setters.toggleSegmentVisibility(htmlelement,segmentvalue,labelmapid)
 * > setters.colorForSegmentIndexOfColorLUT(colorLutIndex, segmentValue, colorRGBAarray)
 * Labelmaps are linked to a colormap and can be active / inactive
 * */

// General segmentation cs tools module configuration
const config = {
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

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

export function rgbToHex(c) {
  let r = componentToHex(c[0]);
  let g = componentToHex(c[1]);
  let b = componentToHex(c[2]);
  return "#" + r + g + b;
}

export function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : null;
}

/**
 * Convert color from hsv to rgb
 * @param {Array} color as [h,s,v] 0-1
 * @returns color as [r,g,b] 0-255
 */
function HSVtoRGB([h, s, v]) {
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

function generateLUT(opacity) {
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
function generateUniformLUT(hex_color, opacity) {
  let lut = new Array(segModule.configuration.segmentsPerLabelmap);
  let rgb_color = hexToRgb(hex_color);
  let rgba_color = rgb_color.concat(Math.round(opacity * 255));
  lut.fill(rgba_color);
  return lut;
}

/**
 * A function to group all settings to load before masks
 * TODO add a param to override config
 */
export function initSegmentationModule() {
  // set configuration
  segModule.configuration = cloneDeep(config);
}

/**
 * Add segmentation mask to segmentation module
 * @param {Number} labelId - The label index (must be unique)
 * @param {TypedArray} - The mask data array
 * @returns {Promise} - Return a promise which will resolve when segmentation mask is added
 */
export function addSegmentationMask(props, data, elementId) {
  let promise = new Promise(resolve => {
    let element = document.getElementById(elementId);
    setters.labelmap3DForElement(element, data.buffer, props.labelId);
    // if user set a color property, use that color for all segments on the labelmap
    let lut = props.color
      ? generateUniformLUT(props.color, props.opacity)
      : generateLUT(props.opacity);
    setters.colorLUT(props.labelId, lut);
    // bind labelmap to colorLUT
    let labelmap3d = getters.labelmap3D(element, props.labelId);
    setters.colorLUTIndexForLabelmap3D(labelmap3d, props.labelId);
    resolve();
  });
  return promise;
}

/**
 * Activate a specific labelmap through its labelId
 * @param {Number} labelId - The labelmap id to activate
 * @param {String} elementId - The target html element id
 */
export function setActiveLabelmap(labelId, elementId) {
  let element = document.getElementById(elementId);
  setters.activeLabelmapIndex(element, labelId);
}

/**
 * Activate a specific segment through its index
 * @param {Number} segmentIndex - The segment index to activate
 * @param {String} elementId - The target html element id
 */
export function setActiveSegment(segmentIndex, elementId) {
  let element = document.getElementById(elementId);
  setters.activeSegmentIndex(element, segmentIndex);
}

/**
 * Change opacity for active label
 * @param {Number} opacity - The desired opacity value
 */
export function setActiveLabelOpacity(opacity) {
  segModule.configuration.fillAlpha = opacity;
  forceRender();
}

/**
 * Change opacity for inactive labels
 * @param {Number} opacity - The desired opacity value
 */
export function setInactiveLabelOpacity(opacity) {
  segModule.configuration.fillAlphaInactive = opacity;
  forceRender();
}

/**
 * Toggle between 'contours mode' and 'filled mode'
 * @param {Bool} toggle - Contour mode enabled if true
 */
export function toggleContourMode(toggle) {
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
 * @param {String} tag - The mask tag
 * @param {Integer} mode - [0=filled, 1=contour, 2=hidden]
 * @param {Float} alpha - Opacity value (if mode=0), between 0 and 1
 */
export function setMaskProps(props) {
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
    case 0:
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
    case 1:
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
    case 2:
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
 * @param {Number} dimension - The initial brush radius
 */
export function enableBrushTool(dimension, thresholds) {
  segModule.configuration.radius = dimension;
  segModule.configuration.thresholds = thresholds;
  setToolActive("ThresholdsBrush");
}

/**
 * Disable brushing
 * @param {String} toolToActivate - The name of the tool to activate after removing the brush
 */
export function disableBrushTool(toolToActivate) {
  setToolDisabled("Brush");
  setToolActive(toolToActivate);
}

/**
 * Change the brush props
 * @param {Object} props - The new brush props {radius: number[px], thresholds: array[min,max]}
 */
export function setBrushProps(props) {
  extend(segModule.configuration, props);
  forceRender();
}

/**
 * Retrieve the buffer that represents the current active mask
 */
export function getActiveLabelmapBuffer() {
  let element = document.getElementById("axial");
  let object = segModule.getters.activeLabelmapBuffer(element);
  return object.buffer;
}

/**
 * Undo last brush operation (stroke)
 */
export function undoLastStroke(elementId) {
  let element = document.getElementById(elementId);
  let activeLabelMapIndex = segModule.getters.activeLabelmapIndex(element);
  setters.undo(element, activeLabelMapIndex);
}

/**
 * Redo last brush operation (stroke)
 */
export function redoLastStroke(elementId) {
  let element = document.getElementById(elementId);
  let activeLabelMapIndex = segModule.getters.activeLabelmapIndex(element);
  setters.redo(element, activeLabelMapIndex);
}

/**
 * Delete mask from state
 */
export function deleteMask(labelId) {
  let masks = values(segModule.state.series)[0].labelmaps3D;
  delete masks[labelId];
  forceRender();
}
