/** @module imaging/tools/interaction
 *  @desc  This file provides functionalities for
 *         tools interactions
 */
import { ToolMouseKeys } from "./types";
/**
 * Setup mouse handler modifiers and keyboard shortcuts:
 * register a tool on right button and another one
 * when pressing a modifier (ctrl/shift/alt) + right button
 * The activation take place on all active viewports (we added a check to activate only on viewports
 * in which the tool has been added previously)
 * Improvements could be:
 * - "restore previous active tool" instead of passed "default" tool
 * - manage left button (an idea could be to cycle over object keys for both buttons)
 * - possibility to change modifier keys
 * @param {Object} config - see tools/default
 */
export declare function addMouseKeyHandlers(config: ToolMouseKeys): void;
/**
 *
 */
export declare function removeMouseKeyHandlers(): void;
/**
 * Add event handlers to mouse move
 * @instance
 * @function toggleMouseHandlers
 * @param {String | HTMLElement} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Boolean} disable - If true disable handlers, default is false
 */
export declare const toggleMouseToolsListeners: (elementId: string | HTMLElement, disable: boolean) => void;
