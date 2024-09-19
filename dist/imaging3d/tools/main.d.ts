/** @module imaging3d/tools/main
 *  @desc  This file provides functionalities
 *         for initializing tools and stacks
 */
import * as cornerstone from "@cornerstonejs/core";
/**
 * @function addDefaultTools
 * @desc Adds default tools to the rendering engine (wwwl, pan, zoom, stackScroll)
 * @param elementId - the id of the element where the tools will be added
 * @param renderingEngine - the rendering engine where the tools will be added
 */
export declare const addDefaultTools: (elementId: string, renderingEngine: cornerstone.RenderingEngine) => void;
/**
 * @function addDefaultTools3D
 * @desc Adds default tools to the rendering engine (crosshairs)
 * @param elementIds - the ids of the elements where the tools will be added
 * @param renderingEngine - the rendering engine where the tools will be added
 */
export declare const addDefaultTools3D: (elementIds: string[], renderingEngine: cornerstone.RenderingEngine) => void;
