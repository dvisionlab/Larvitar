/**
 * Enable audio on a video in a video viewport
 * @instance
 * @function enableAudioOnVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export declare const enableAudioOnVideo: (renderingEngineId: string) => void;
/**
 * Disable audio on a video in a video viewport
 * @instance
 * @function disableAudioOnVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export declare const disableAudioOnVideo: (renderingEngineId: string) => void;
/**
 * Play a video in a video viewport
 * @instance
 * @function playVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export declare const playVideo: (renderingEngineId: string) => void;
/**
 * Set the frame range for a video in a video viewport
 * @instance
 * @function setFrameRange
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number[]} frameRange - An array containing the start and end frame numbers
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export declare const setFrameRange: (renderingEngineId: string, frameRange: number[]) => void;
/**
 * Set the time for a video in a video viewport
 * @instance
 * @function setTime
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number} timeInSeconds - The time in seconds to set for the video
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export declare const setTime: (renderingEngineId: string, timeInSeconds: number) => void;
/**
 * Set the frame number for a video in a video viewport
 * @instance
 * @function setFrameNumber
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number} frame - The frame number to set
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export declare const setFrameNumber: (renderingEngineId: string, frame: number) => void;
/**
 * Set the playback rate for a video in a video viewport
 * @instance
 * @function setPlaybackRate
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number} rate - The playback rate to set (default is 1)
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export declare function setPlaybackRate(renderingEngineId: string, rate: number): void;
/**
 * Scroll a video in a video viewport
 * @instance
 * @function scrollVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @param {number} delta - The number of frames to scroll (positive or negative)
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export declare function scrollVideo(renderingEngineId: string, delta?: number): void;
/**
 * Toggle video playback in a video viewport
 * @instance
 * @function toggleVideoPlayback
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export declare const toggleVideoPlayback: (renderingEngineId: string) => void;
/**
 * Pause a video in a video viewport
 * @instance
 * @function pauseVideo
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {void}
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export declare const pauseVideo: (renderingEngineId: string) => void;
/**
 * Get the current frame number of a video in a video viewport
 * @instance
 * @function getFrameNumber
 * @param {string} renderingEngineId - The unique identifier of the rendering engine containing the video viewport
 * @returns {number | undefined} - The current frame number, or undefined if not found
 * @throws {Error} If the rendering engine or video viewport is not found
 */
export declare const getFrameNumber: (renderingEngineId: string) => number | undefined;
