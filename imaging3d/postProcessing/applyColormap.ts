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
        { value: -3024, opacity: 0, color: [0, 0, 0] },
        {
          value: -16.4458,
          opacity: 0.7,
          color: [186, 65, 77]
        },
        {
          value: 641.385,
          opacity: 0.715686,
          color: [231, 208, 141]
        },
        {
          value: 3071,
          opacity: 0.705882,
          color: [255, 255, 255]
        }
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
 * Remap a colormap to fit within a new VOI (window/level)
 * @function remapColormap
 * @param {Colormap} originalColormap - The original colormap
 * @param {VOI} voi - VOI settings (windowWidth, windowCenter)
 * @returns {Colormap} - Remapped colormap
 */
const remapColormap = function (
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
  voi: VOI | null = null
): void {
  const currentVoi = getVOIFromViewport(viewport) ?? voi;

  const volumeActor = viewport.getActors()[0]?.actor;

  if (!volumeActor) {
    throw new Error("Volume actor not found. Cannot apply colormap.");
  }

  let colormapToApply = colormap;

  if (currentVoi) {
    colormapToApply = remapColormap(colormap, currentVoi);
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
  voi: VOI | null = null
): void {
  const colormap = COLORMAP_REGISTRY[colormapName];

  if (!colormap) {
    throw new Error(`Colormap '${colormapName}' not found in registry`);
  }

  applyColormap(viewport, colormap, voi);
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
 * @param {string} elementId - Element ID for the store
 * @returns {void}
 */
export const resetColormapToDefault = function (
  viewport: _cornerstone.VolumeViewport
): void {
  const currentVoi = getVOIFromViewport(viewport);
  applyColormap(viewport, defaultColormap, currentVoi);
};
