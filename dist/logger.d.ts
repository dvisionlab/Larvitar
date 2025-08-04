import { LogType } from "consola";
export declare const logger: import("consola").ConsolaInstance;
/**
 * Set the log level
 * @function setLogLevel
 * @param {LogType} level - The log level to set
 */
export declare const setLogLevel: (level: LogType) => void;
/**
 * Get the current log level
 * @function getLogLevel
 * @returns {LogType}The current log level
 */
export declare const getLogLevel: () => LogType;
