/** @module imaging/tools/io
 *  @desc  This file provides functionalities for
 *         tools input/output
 */
import { ToolState } from "./types";
declare global {
    interface Document {
        documentMode?: any;
    }
    interface Navigator {
        msSaveBlob?: (blob: any, defaultName?: string) => boolean;
    }
}
/**
 * Load annotation from json object
 * @param {Object} jsonData - The previously saved tools state
 */
export declare const loadAnnotations: (jsonData: ToolState) => void;
/**
 * Save annotations from current stack, download as json file if requested
 * @param {bool} download - True to download json
 * @param {string} filename - The json file name, @default state.json
 */
export declare const saveAnnotations: (download: boolean, filename?: string) => any;
/**
 * Save annotation from current stack, download as csv file
 * containing only useful informations for user
 */
export declare const exportAnnotations: (fileManager: any, filename?: string) => void;
/**
 *
 * @param {*} allToolState
 */
export declare function generateCSV(fileManager: any, // TODO-ts what is this object?
allToolState: ToolState): {
    fieldsArr: string[];
    data: Object[];
};