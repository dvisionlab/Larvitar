import { cloneDeep } from "lodash";
import { Colormap, VOI } from "../../imaging/types";
import * as _cornerstone from "@cornerstonejs/core";
import store from "../../imaging/imageStore";

interface ColormapRegistry {
  [name: string]: Colormap;
}
const defaultColormap: Colormap = {
  name: "Default",
  colormapCurves: [
    {
      points: [
        { value: 150, opacity: 0, color: [255, 120, 80] },
        { value: 168, opacity: 0.396, color: [255, 120, 80] },
        { value: 261, opacity: 0.623, color: [255, 150, 70] },
        { value: 323, opacity: 0.782, color: [244, 231, 149] },
        { value: 392, opacity: 1, color: [255, 255, 255] }
      ]
    }
  ]
};

const COLORMAP_REGISTRY: ColormapRegistry = {
  [defaultColormap.name]: defaultColormap
};
/**
 * Add custom colormap to the global registry
 * @function addCustomColormap
 * @param {string} name - Name for the new colormap
 * @param {ColormapConfig} config - Colormap configuration
 * @returns {void}
 */
export const addCustomColormap = function (colormap: Colormap): void {
  if (!colormap.colormapCurves || !Array.isArray(colormap.colormapCurves)) {
    throw new Error("ColormapCurves must be an array");
  }

  COLORMAP_REGISTRY[colormap.name] = {
    name: colormap.name,
    colormapCurves: colormap.colormapCurves
  };
};

/**
 * Get all registered colormaps
 * @function getColormaps
 * @returns {ColormapRegistry} - Copy of COLORMAP_REGISTRY object
 */
export const getColormaps = function (): ColormapRegistry {
  return { ...COLORMAP_REGISTRY };
};

/**
 * Calculates the VOI (Window Width/Center) based on the points defined in a colormap
 */
const getVOIFromColormap = (colormap: Colormap): VOI => {
  let min = Infinity;
  let max = -Infinity;

  colormap.colormapCurves.forEach(curve => {
    curve.points.forEach(point => {
      if (point.value < min) min = point.value;
      if (point.value > max) max = point.value;
    });
  });

  if (min === Infinity) return { windowWidth: 400, windowCenter: 40 };

  return {
    windowWidth: max - min,
    windowCenter: (max + min) / 2
  };
};

/**
 * Remaps the colormap points relative to a VOI.
 * It treats the colormap's original min/max as the 'standard' view
 * and scales it to the new Window/Level.
 */
const remapColormapToVOI = function (
  originalColormap: Colormap,
  voi: VOI
): Colormap {
  const { windowWidth, windowCenter } = voi;
  const lower = windowCenter - windowWidth / 2;

  const remappedColormap: Colormap = cloneDeep(originalColormap);

  let minOriginalValue = Infinity;
  let maxOriginalValue = -Infinity;

  originalColormap.colormapCurves.forEach(curve => {
    curve.points.forEach(point => {
      if (point.value < minOriginalValue) {
        minOriginalValue = point.value;
      }
      if (point.value > maxOriginalValue) {
        maxOriginalValue = point.value;
      }
    });
  });

  const originalRange = maxOriginalValue - minOriginalValue;

  if (originalRange === 0) {
    remappedColormap.colormapCurves.forEach(curve => {
      curve.points.forEach(point => {
        point.value = windowCenter;
      });
    });
    return remappedColormap;
  }

  remappedColormap.colormapCurves.forEach(curve => {
    curve.points.forEach(point => {
      const normalizedValue = (point.value - minOriginalValue) / originalRange;
      point.value = lower + normalizedValue * windowWidth;
    });
  });

  return remappedColormap;
};

/**
 * Apply colormap (LUT and Opacity) to a viewport
 * @function applyColormap
 * @param {any} viewport - Cornerstone3D viewport
 * @param {Colormap} colormap - The colormap to apply
 * @param {VOI | null} voi - Optional VOI settings for remapping
 * @returns {void}
 */
export const applyColormap = function (
  viewport: _cornerstone.VolumeViewport,
  colormap: Colormap,
  forceSnapToPreset: boolean = true // Set TRUE on first click, FALSE on VOI tool drag
): void {
  const volumeActor = viewport.getActors()[0]?.actor;
  if (!volumeActor) return;

  if (forceSnapToPreset) {
    const targetVoi = getVOIFromColormap(colormap);
    viewport.setProperties({
      voiRange: {
        lower: targetVoi.windowCenter - targetVoi.windowWidth / 2,
        upper: targetVoi.windowCenter + targetVoi.windowWidth / 2
      }
    });
  }

  const currentVoi = getVOIFromViewport(viewport);

  let colormapToApply = colormap;

  if (currentVoi) {
    colormapToApply = remapColormapToVOI(colormap, currentVoi);
  }
  const property = volumeActor.getProperty() as any;
  const rgbTransferFunction = property.getRGBTransferFunction(0);

  const opacityTransferFunction = property.getScalarOpacity(0);

  rgbTransferFunction.removeAllPoints();
  opacityTransferFunction.removeAllPoints();

  colormapToApply.colormapCurves.forEach(curve => {
    curve.points.forEach(point => {
      const { value, opacity, color } = point;

      const r = color[0] / 255;
      const g = color[1] / 255;
      const b = color[2] / 255;

      rgbTransferFunction.addRGBPoint(value, r, g, b);
      opacityTransferFunction.addPoint(value, opacity);
    });
  });

  opacityTransferFunction.setClamping(false);

  property.setShade(true);
  property.setAmbient(0.15);
  property.setDiffuse(0.8);
  property.setSpecular(0.4);
  property.setSpecularPower(20);
  viewport.render();
  store.setImageColormap(viewport.element.id, colormap.name);
};

/**
 * Apply colormap by name (LUT and Opacity) to a viewport
 * @function applyColormapByName
 * @param {any} viewport - Cornerstone3D viewport
 * @param {string} colormapName - Name of the colormap to apply
 * @param {VOI | null} voi - Optional VOI settings for remapping
 * @returns {void}
 */
export const applyColormapByName = function (
  viewport: _cornerstone.VolumeViewport,
  colormapName: string,
  forceSnapToPreset: boolean = true
): void {
  const colormap = COLORMAP_REGISTRY[colormapName];

  if (!colormap) {
    throw new Error(`Colormap '${colormapName}' not found in registry`);
  }

  applyColormap(viewport, colormap, forceSnapToPreset);
};

/**
 * Get VOI from viewport
 * @function getVOIFromViewport
 * @param {any} viewport - Cornerstone3D viewport
 * @returns {VOI} - Current VOI settings
 */
export const getVOIFromViewport = function (
  viewport: _cornerstone.VolumeViewport
): VOI {
  const voiRange = viewport.getProperties().voiRange!;
  return {
    windowWidth: voiRange.upper - voiRange.lower,
    windowCenter: (voiRange.upper + voiRange.lower) / 2
  };
};

/**s
 * Reset the colormap to default and clear the store
 * @function resetColormapToDefault
 * @param {_cornerstone.VolumeViewport} viewport - Cornerstone3D viewport
 * @returns {void}
 */
export const resetColormapToDefault = function (
  viewport: _cornerstone.VolumeViewport
): void {
  applyColormap(viewport, defaultColormap);
};
