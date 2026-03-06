import * as cornerstone from "@cornerstonejs/core";
import { MprViewport, PositionerAngles } from "./types";

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

export function setOrientation(
  viewport: cornerstone.VolumeViewport,
  orientation: MprViewport["orientation"],
  immediate = true
): void {
  const orientationConfig = getMprCameraValues(orientation);

  if (!orientationConfig) {
    return;
  }

  const { viewPlaneNormal, viewUp } = orientationConfig;

  const volumeBounds = viewport.getBounds();
  const center = [
    (volumeBounds[0] + volumeBounds[1]) / 2,
    (volumeBounds[2] + volumeBounds[3]) / 2,
    (volumeBounds[4] + volumeBounds[5]) / 2
  ];

  // Calculate appropriate camera distance based on volume size
  const maxDim = Math.max(
    volumeBounds[1] - volumeBounds[0],
    volumeBounds[3] - volumeBounds[2],
    volumeBounds[5] - volumeBounds[4]
  );

  const distance = Math.max(maxDim * 1.5, 100);

  // Calculate camera position by moving along the view plane normal
  const position = [
    center[0] + viewPlaneNormal[0] * distance,
    center[1] + viewPlaneNormal[1] * distance,
    center[2] + viewPlaneNormal[2] * distance
  ];

  if (
    position[0] === center[0] &&
    position[1] === center[1] &&
    position[2] === center[2]
  ) {
    position[2] += distance || 100;
  }

  viewport.setCamera({
    position: position as [number, number, number],
    focalPoint: center as [number, number, number],
    viewUp: viewUp as [number, number, number],
    viewPlaneNormal: viewPlaneNormal as [number, number, number],
    flipHorizontal: false,
    flipVertical: false
  });

  // viewport.setProperties({ orientation })

  if (immediate) {
    viewport.render();
  }
}

export function getMprCameraValues(orientation: MprViewport["orientation"]) {
  switch (orientation) {
    case cornerstone.Enums.OrientationAxis.AXIAL:
      return {
        viewPlaneNormal: [0, 0, -1],
        viewUp: [0, -1, 0],
        viewRight: [1, 0, 0]
      };

    case cornerstone.Enums.OrientationAxis.SAGITTAL:
      return {
        viewPlaneNormal: [1, 0, 0],
        viewUp: [0, 0, 1],
        viewRight: [0, 1, 0]
      };

    case cornerstone.Enums.OrientationAxis.CORONAL:
      return {
        viewPlaneNormal: [0, -1, 0],
        viewUp: [0, 0, 1],
        viewRight: [1, 0, 0]
      };
  }
}
