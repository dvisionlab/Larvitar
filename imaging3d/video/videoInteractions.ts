// external libraries
import * as cornerstone from "@cornerstonejs/core";

// internal libraries
import { logger } from "../../logger";

/**
 * Enable audio on a video in a video viewport
 * @instance
 * @function enableAudioOnVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const enableAudioOnVideo = function (renderingEngineId: string): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  // Set the muted property to false to enable audio
  videoViewport.setProperties({ muted: false });
  logger.debug(
    `Audio enabled for video viewport in rendering engine ${renderingEngineId}.`
  );
};

/**
 * Disable audio on a video in a video viewport
 * @instance
 * @function disableAudioOnVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const disableAudioOnVideo = function (renderingEngineId: string): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  videoViewport.setProperties({ muted: true });
  logger.debug(
    `Audio enabled for video viewport in rendering engine ${renderingEngineId}.`
  );
};

/**
 * Play a video in a video viewport
 * @instance
 * @function playVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const playVideo = function (renderingEngineId: string): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  setTimeout(() => {
    videoViewport.play();
    logger.debug(
      `Video playback started for rendering engine ${renderingEngineId}.`
    );
  }, 500); // Delay to ensure the video is ready to play
};

/**
 * Set the frame range for a video in a video viewport
 * @instance
 * @function setFrameRange
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number[]} frameRange - An array containing the start and end frame numbers
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const setFrameRange = function (
  renderingEngineId: string,
  frameRange: number[]
): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  videoViewport.setFrameRange(frameRange);
  logger.debug(
    `Frame range set to ${frameRange} for rendering engine ${renderingEngineId}.`
  );
};

/**
 * Set the time for a video in a video viewport
 * @instance
 * @function setTime
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number} timeInSeconds - The time in seconds to set for the video
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const setTime = function (
  renderingEngineId: string,
  timeInSeconds: number
): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  videoViewport.setTime(timeInSeconds);
  logger.debug(
    `Video time set to ${timeInSeconds} seconds for rendering engine ${renderingEngineId}.`
  );
};

/**
 * Set the frame number for a video in a video viewport
 * @instance
 * @function setFrameNumber
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number} frame - The frame number to set
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const setFrameNumber = function (
  renderingEngineId: string,
  frame: number
): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  videoViewport.setFrameNumber(frame);
  logger.debug(
    `Frame number set to ${frame} for rendering engine ${renderingEngineId}.`
  );
};

/**
 * Set the playback rate for a video in a video viewport
 * @instance
 * @function setPlaybackRate
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number} rate - The playback rate to set (default is 1)
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export function setPlaybackRate(renderingEngineId: string, rate: number): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  videoViewport.setPlaybackRate(rate);
  logger.debug(
    `Playback rate set to ${rate} for rendering engine ${renderingEngineId}.`
  );
}

/**
 * Scroll a video in a video viewport
 * @instance
 * @function scrollVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number} delta - The number of frames to scroll (positive or negative)
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export function scrollVideo(
  renderingEngineId: string,
  delta: number = 1
): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  videoViewport.scroll(delta);
  logger.debug(
    `Video scrolled by ${delta} frames for rendering engine ${renderingEngineId}.`
  );
}

/**
 * Toggle video playback in a video viewport
 * @instance
 * @function toggleVideoPlayback
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const toggleVideoPlayback = function (renderingEngineId: string): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first  `
    );
    return;
  }
  videoViewport.togglePlayPause();
};

/**
 * Pause a video in a video viewport
 * @instance
 * @function pauseVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const pauseVideo = function (renderingEngineId: string): void {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  videoViewport.pause();
  logger.debug(
    `Video playback paused for rendering engine ${renderingEngineId}.`
  );
};

/**
 * Get the current frame number of a video in a video viewport
 * @instance
 * @function getFrameNumber
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {number | undefined} - The current frame number, or undefined if not found
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export const getFrameNumber = function (
  renderingEngineId: string
): number | undefined {
  const renderingEngine = cornerstone.getRenderingEngine(renderingEngineId);
  if (!renderingEngine) {
    logger.error(
      `Rendering engine with id ${renderingEngineId} not found. Please initialize it first.`
    );
    return;
  }
  const viewports = renderingEngine.getViewports();
  const videoViewport = viewports.find(
    viewport => viewport.type === cornerstone.Enums.ViewportType.VIDEO
  ) as cornerstone.VideoViewport | undefined;
  if (!videoViewport) {
    logger.error(
      `No video viewport found for rendering engine ${renderingEngineId}. Please initialize it first.`
    );
    return;
  }
  return videoViewport.getFrameNumber();
};
