/** @module imaging/imageColormaps
 *  @desc  This file provides functionalities for
 *         handling colormaps
 */

import cornerstone from "cornerstone-core";
import { EnabledElementLayer } from "cornerstone-core";
import { each } from "lodash";

/*
 * This module provides the following functions to be exported:
 * getColormapsList()
 * addColorMap(colormapId, colormapName, colors)
 * fillPixelData(canvas, colormapId)
 * applyColorMap(colormapId)
 * HSVToRGB(hue, sat, val)
 */

/**
 * Fill a canvas with pixelData representing the colormap
 * @instance
 * @function getColormapsList
 * @returns {Array} A list of cornerstone colormaps
 */
export function getColormapsList() {
  return cornerstone.colors.getColormapsList();
}

/**
 * Add a custom color map to cornerstone list
 * @instance
 * @function addColorMap
 * @param {String} colormapId - the new colormap id
 * @param {String} colormapName - the new colormap name
 * @param {Array} colors - array containing 255 rgb colors (ie [[r,g,b], [r,g,b], ...])
 */
export function addColorMap(
  colormapId: string,
  colormapName: string,
  colors: Array<Array<number>>
) {
  const colormap = cornerstone.colors.getColormap(colormapId, {});
  colormap.setColorSchemeName(colormapName);
  let noc = colors.length;
  colormap.setNumberOfColors(noc);

  for (let i = 0; i < noc; i++) {
    let rgb = colors[i];
    colormap.insertColor(i, rgb);
  }

  return colormap;
}

/**
 * Fill a canvas with pixelData representing the colormap
 * @instance
 * @function fillPixelData
 * @param {HTMLCanvasElement} canvas - target canvas
 * @param {String} colormapId - the colormap name
 */
export function fillPixelData(canvas: HTMLCanvasElement, colormapId: string) {
  const ctx = canvas.getContext("2d");
  const height = canvas.height;
  const width = canvas.width;
  if (ctx) {
    const colorbar = ctx.createImageData(width, height);
    const colormap = cornerstone.colors.getColormap(colormapId, {});
    const lookupTable = colormap.createLookupTable();

    // Set the min and max values then the lookup table
    // will be able to return the right color for this range
    lookupTable.setTableRange(0, width);

    // Update the colorbar pixel by pixel
    for (let col = 0; col < width; col++) {
      const color = lookupTable.mapValue(col);

      for (let row = 0; row < height; row++) {
        const pixel = (col + row * width) * 4;
        colorbar.data[pixel] = color[0];
        colorbar.data[pixel + 1] = color[1];
        colorbar.data[pixel + 2] = color[2];
        colorbar.data[pixel + 3] = color[3];
      }
    }
    ctx.putImageData(colorbar, 0, 0);
  } else {
    console.error("No context found for canvas", canvas);
  }
}

/**
 * Apply a color map on a viewport
 * @instance
 * @function applyColorMap
 * @param {String} colormapId - the colormap name
 * @param {Array} viewportNames - List of viewports where to apply preset
 */
export function applyColorMap(
  colormapId: string,
  viewportNames: Array<string>
) {
  // for retro-compatibility
  if (!viewportNames) {
    viewportNames = cornerstone.getEnabledElements().map(e => e.element.id);
  }
  let colormap = cornerstone.colors.getColormap(colormapId, {});

  each(viewportNames, viewportName => {
    let element = document.getElementById(viewportName);

    if (!element) {
      console.error("No element with id:", viewportName);
      return;
    }

    let enabledElement: EnabledElementLayer;

    try {
      enabledElement = cornerstone.getEnabledElement(element);
    } catch {
      console.error("No enabledElement with id", viewportName);
      return;
    }

    enabledElement.options = {}; // HACK to bypass cornerstone bug

    if (!enabledElement) {
    }

    const viewport = cornerstone.getViewport(element);
    if (viewport) {
      viewport.colormap = colormap;
      cornerstone.setViewport(element, viewport);
      cornerstone.updateImage(element, true);
    }
  });

  return colormap;
}

/**
 * Converts an HSV  (Hue, Saturation, Value) color to RGB (Red, Green, Blue) color value
 * @param {Number} hue A number representing the hue color value
 * @param {Number} sat A number representing the saturation color value
 * @param {Number} val A number representing the value color value
 * @returns {Number[]} An RGB color array
 */
export function HSVToRGB(hue: number, sat: number, val: number) {
  if (hue > 1) {
    throw new Error("HSVToRGB expects hue < 1");
  }

  const rgb = [];

  if (sat === 0) {
    rgb[0] = val;
    rgb[1] = val;
    rgb[2] = val;

    return rgb;
  }

  const hueCase = Math.floor(hue * 6);
  const frac = 6 * hue - hueCase;
  const lx = val * (1 - sat);
  const ly = val * (1 - sat * frac);
  const lz = val * (1 - sat * (1 - frac));

  switch (hueCase) {
    /* 0<hue<1/6 */
    case 0:
    case 6:
      rgb[0] = val;
      rgb[1] = lz;
      rgb[2] = lx;
      break;

    /* 1/6<hue<2/6 */
    case 1:
      rgb[0] = ly;
      rgb[1] = val;
      rgb[2] = lx;
      break;

    /* 2/6<hue<3/6 */
    case 2:
      rgb[0] = lx;
      rgb[1] = val;
      rgb[2] = lz;
      break;

    /* 3/6<hue/4/6 */
    case 3:
      rgb[0] = lx;
      rgb[1] = ly;
      rgb[2] = val;
      break;

    /* 4/6<hue<5/6 */
    case 4:
      rgb[0] = lz;
      rgb[1] = lx;
      rgb[2] = val;
      break;

    /* 5/6<hue<1 */
    case 5:
      rgb[0] = val;
      rgb[1] = lx;
      rgb[2] = ly;
      break;
  }

  return rgb;
}
