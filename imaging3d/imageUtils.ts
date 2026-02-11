import * as cornerstone from "@cornerstonejs/core";
import { PositionerAngles } from "./types";

/*
 * This module provides the following functions to be exported:
 * getMPRPositionerAngles(viewportId: string, renderingEngineId: string)
 * getRenderingEngineByViewportId(viewportId: string)
 */

/**
 * Get PositionerPrimaryAngle and PositionerSecondaryAngle from an MPR viewport.
 * Values are computed from the current camera orientation and update when the plane is tilted.
 *
 * @instance
 * @function getPositionerAngles
 * @param {string} viewportId
 * @returns {PositionerAngles|undefined} angles - Object containing:
 * PositionerPrimaryAngle and PositionerSecondaryAngle in degrees
 * PositionerPrimaryDirection ("LAO" or "RAO") and PositionerSecondaryDirection ("CRA" or "CAU")
 */
export function getPositionerAngles(
  viewportId: string
): PositionerAngles | undefined {
  const renderingEngine = getRenderingEngineByViewportId(viewportId);

  if (!renderingEngine) {
    return undefined;
  }

  const viewport = renderingEngine.getViewport(viewportId);

  if (!viewport) {
    return undefined;
  }

  const camera = viewport.getCamera();

  if (!camera || !camera.viewPlaneNormal) {
    return undefined;
  }

  const n = camera.viewPlaneNormal;

  const primary = (Math.atan2(n[0], n[2]) * 180) / Math.PI;

  const secondary =
    (Math.atan2(n[1], Math.sqrt(n[0] * n[0] + n[2] * n[2])) * 180) / Math.PI;

  return {
    positionerPrimaryAngle: primary,
    positionerSecondaryAngle: secondary,
    positionerPrimaryDirection: primary >= 0 ? "LAO" : "RAO",
    positionerSecondaryDirection: secondary >= 0 ? "CRA" : "CAU"
  };
}

/**
 * Get the RenderingEngine associated with a given viewportId.
 *
 * @instance
 * @function getRenderingEngineByViewportId
 * @param {string} viewportId
 * @returns {RenderingEngine|undefined} renderingEngine - The RenderingEngine instance or undefined if not found
 */
export function getRenderingEngineByViewportId(
  viewportId: string
): cornerstone.RenderingEngine | undefined {
  const renderingEngines = cornerstone.getRenderingEngines();
  if (!renderingEngines || renderingEngines.length === 0) {
    return undefined;
  }
  for (const renderingEngine of renderingEngines) {
    const viewport = renderingEngine.getViewport(viewportId);

    if (viewport) {
      return renderingEngine;
    }
  }

  return undefined;
}
