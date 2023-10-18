/** @module imaging/tools/state
 *  @desc  This file provides functionalities
 *         for handling tools' state
 */
import type { ToolState } from "./types";
/**
 *
 * @param {*} elementId
 */
declare const saveToolState: (elementId: string) => any;
/**
 *
 * @param {*} elementId
 * @param {*} allToolState
 */
declare const restoreToolState: (elementId: string, allToolState: ToolState) => void;
export { saveToolState, restoreToolState };
