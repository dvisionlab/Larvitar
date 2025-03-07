<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# Logging Module Documentation

## Overview
The logging module in this project uses [**Consola**](https://github.com/unjs/consola) as the primary logging library. Consola provides colorized, structured, and browser-friendly logging while preserving file and line number references.

## Default Log Level
By default, the logging level is set to **"info"**. This means that logs with levels **info, warn, and error** will be recorded, while **debug** logs will be ignored unless explicitly enabled.

## Log Levels Supported
The following log levels are available:

| Level     | Description |
|-----------|-------------|
| `silent`  | Disables all logging |
| `error`   | Logs only errors |
| `warn`    | Logs warnings and errors |
| `info`    | Logs informational messages, warnings, and errors (default) |
| `debug`   | Logs all messages including debug messages |

## Storing Log Level in Local Storage
The log level is **persisted in the browser's local storage**, ensuring that the selected logging level remains the same across page reloads. If no level is set, it defaults to `info`.

## Exposed Functions
The following functions are available for managing logging:

### `logger.info(message: string)`
Logs an informational message.

### `logger.warn(message: string)`
Logs a warning message.

### `logger.error(message: string)`
Logs an error message.

### `logger.debug(message: string)`
Logs a debug message. Only visible when log level is set to `debug`.

### `setLogLevel(level: LogType)`
Changes the logging level dynamically at runtime.
```typescript
import { setLogLevel } from "./logger";
setLogLevel("debug"); // Enables debug logs
```

### `getLogLevel(): LogType`
Returns the current logging level as a string.
```typescript
import { getLogLevel } from "./logger";
console.log(`Current Log Level: ${getLogLevel()}`);
```

## Example Usage
```typescript
import logger, { setLogLevel, getLogLevel } from "./logger";

logger.info("Application started!");
logger.warn("This is a warning!");
logger.error("Something went wrong!");
logger.debug("Debugging details...");

setLogLevel("debug"); // Enable debug logging
console.log(`Current Log Level: ${getLogLevel()}`);
```

## Why Use Consola?
- **Colorized Logs**: Logs are formatted for better readability in the browser console.
- **Correct File & Line References**: Logs preserve debugging context.
- **Runtime Configuration**: Log levels can be changed dynamically.
- **Persistent Settings**: Log level is stored in `localStorage`.

With this logging module, debugging and log management become efficient and flexible. 🚀

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>