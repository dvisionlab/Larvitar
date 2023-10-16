/** @module imaging/imagePresets
 *  @desc  This file provides functionalities for
 *         image presets for ww and wc
 */

// external libraries
import cornerstone from "cornerstone-core";
import { each, find } from "lodash";

// internal libraries
import { set as setStore } from "./imageStore";

/**
 * Object used to list image presets
 * @object
 */
const IMAGE_PRESETS = [
  { name: "CT: Abdomen", ww: 350, wl: 50 },
  { name: "CT: Bone", ww: 2500, wl: 500 },
  { name: "CT: Cerebrum", ww: 80, wl: 0 },
  { name: "CT: Covid-19", ww: 240, wl: -860 },
  { name: "CT: Liver", ww: 150, wl: 50 },
  { name: "CT: Lung", ww: 1500, wl: -500 },
  { name: "CT: Mediastinum", ww: 300, wl: 50 },
  { name: "CT: Pelvis", ww: 400, wl: 40 }
];

/*
 * This module provides the following functions to be exported:
 * getImagePresets()
 * setImagePreset(name)
 * setImageCustomPreset(viewportNames, customValues)
 */

/**
 * Get Image presets object
 * @instance
 * @function getImagePresets
 */
export const getImagePresets = function () {
  return IMAGE_PRESETS;
};

/**
 * Set Image presets
 * @instance
 * @function setImagePreset
 * @param {Array} viewportNames - List of viewports where to apply preset
 * @param {String | typeof IMAGE_PRESETS[0]} preset - The image preset name or the preset object
 */
export const setImagePreset = function (
  viewportNames: string[],
  preset: string | (typeof IMAGE_PRESETS)[0]
) {
  if (!Array.isArray(viewportNames)) {
    console.error(
      "Invalid parameter, viewportNames has to be an array of viewport names."
    );
    return;
  }
  let image_preset =
    typeof preset === "string" ? find(IMAGE_PRESETS, { name: preset }) : preset;

  if (!image_preset) {
    console.error("Invalid image preset");
    return;
  }

  each(viewportNames, function (viewportName : string) {
    let element = document.getElementById(viewportName);
    let enabledElement;

    if (!element) {
      console.warn("No element with id", viewportName);
      return;
    }

    try {
      enabledElement = cornerstone.getEnabledElement(element);
    } catch {
      console.warn("No enabledElement with id", viewportName);
      return;
    }

    let viewport = cornerstone.getViewport(element);

    if (!viewport) {
      console.warn("No viewport with id", viewportName);
      return;
    }

    viewport.voi.windowWidth = image_preset!.ww;
    viewport.voi.windowCenter = image_preset!.wl;
    cornerstone.setViewport(element, viewport);
    // sync ww and wc values in store
    setStore("contrast", [
      viewportName,
      viewport.voi.windowWidth,
      viewport.voi.windowCenter
    ]);
  });
};

/**
 * Set Image presets
 * @instance
 * @function setImageCustomPreset
 * @param {Array} viewportNames - List of viewports where to apply preset
 * @param {Object} customValues - {wl: value, ww: value}
 */
export const setImageCustomPreset = function (
  viewportNames: string[],
  customValues: { wl: number; ww: number }
) {
  if (!Array.isArray(viewportNames)) {
    console.error(
      "Invalid parameter, viewportNames has to be an array of viewport names."
    );
    return;
  }
  each(viewportNames, function (viewportName : string) {
    let element = document.getElementById(viewportName);
    let enabledElement;

    if (!element) {
      console.warn("No element with id", viewportName);
      return;
    }

    try {
      enabledElement = cornerstone.getEnabledElement(element);
    } catch {
      console.warn("No enabledElement with id", viewportName);
      return;
    }

    let viewport = cornerstone.getViewport(element);

    if (!viewport) {
      console.warn("No viewport with id", viewportName);
      return;
    }

    viewport.voi.windowWidth = customValues.ww;
    viewport.voi.windowCenter = customValues.wl;
    cornerstone.setViewport(element, viewport);
    // sync ww and wc values in store
    setStore("contrast", [
      viewportName,
      viewport.voi.windowWidth,
      viewport.voi.windowCenter
    ]);
  });
};
