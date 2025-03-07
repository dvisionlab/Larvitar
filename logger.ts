import consola, { LogLevels, LogType } from "consola";

const STORAGE_KEY = "larvitar_log_level"; // Store log level persistently

// Default log level ("info")
const DEFAULT_LEVEL: LogType = "info";

// Get stored log level or default to "info"
const storedLevel =
  (localStorage.getItem(STORAGE_KEY) as LogType) || DEFAULT_LEVEL;

// Create Consola logger with custom formatting
export const logger = consola.create({
  level: LogLevels[storedLevel], // Convert string to Consola's numeric level
  defaults: {
    tag: "larvitar" // Automatically prefixes logs with [larvitar]
  },
  formatOptions: {
    colors: true, // Enable colors
    compact: false // Keep formatting readable
  }
});

/**
 * Set the log level
 * @function setLogLevel
 * @param {LogType} level - The log level to set
 */
export const setLogLevel = (level: LogType) => {
  logger.level = LogLevels[level]; // Convert string to numeric log level
  localStorage.setItem(STORAGE_KEY, level); // Store string level
  logger.info(`Logging level set to: ${level}`);
};

/**
 * Get the current log level
 * @function getLogLevel
 * @returns {LogType}The current log level
 */
export const getLogLevel = (): LogType => {
  return Object.keys(LogLevels).find(
    key => LogLevels[key as LogType] === logger.level
  ) as LogType;
};
