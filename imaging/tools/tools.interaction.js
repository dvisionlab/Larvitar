import { DEFAULT_MOUSE_KEYS } from "./tools.default";
import { setToolActive } from "./tools.main";
import { larvitar_store } from "../image_store";

import * as keyCodes from "keycode-js";

/**
 * Setup mouse handler modifiers and keyboard shortcuts
 * NOTE: at the moment only mouse right button is affected
 * Improvements could be:
 * - "restore previous active tool" instead of passed "default" tool
 * - manage left button (an idea could be to cycle over object keys for both buttons)
 * - possibility to change modifier keys
 * @param {Object} config - see tools.default
 * @param {Array} viewports - The hmtl element ids to be used for tool activation.
 */

export function addMouseKeyHandlers(config, viewports) {
  if (!config) {
    config = DEFAULT_MOUSE_KEYS;
  }

  // Prevent context menu on right click
  document.addEventListener("contextmenu", evt => {
    evt.preventDefault();
    return false;
  });

  function onKeyDown(evt) {
    // keyboard shortcuts (activate on left mouse button)
    let codes = config.keyboard_shortcuts
      ? Object.keys(config.keyboard_shortcuts).map(key => keyCodes[key])
      : [];

    if (codes.includes(evt.keyCode) && evt.altKey) {
      evt.preventDefault(); // avoid browser menu selections

      let key = Object.keys(config.keyboard_shortcuts)
        .filter(key => keyCodes[key] == evt.keyCode)
        .pop();
      if (config.debug) console.log("active", config.keyboard_shortcuts[key]);
      setToolActive(config.keyboard_shortcuts[key], {}, viewports);
      larvitar_store.set("leftMouseHandler", config.keyboard_shortcuts[key]);
      document.addEventListener("keydown", onKeyDown, { once: true });
    }
    // right drag + shift
    else if (
      config.mouse_button_right &&
      config.mouse_button_right.shift &&
      evt.keyCode == keyCodes.KEY_SHIFT
    ) {
      if (config.debug) console.log("active", config.mouse_button_right.shift);
      setToolActive(
        config.mouse_button_right.shift,
        { mouseButtonMask: 2 },
        viewports
      );
      larvitar_store.set("rightMouseHandler", config.mouse_button_right.shift);
      document.addEventListener("keyup", onKeyUp, { once: true });
    }
    // right drag + ctrl
    else if (
      config.mouse_button_right &&
      config.mouse_button_right.ctrl &&
      evt.keyCode == keyCodes.KEY_CONTROL
    ) {
      if (config.debug) console.log("active", config.mouse_button_right.ctrl);
      setToolActive(
        config.mouse_button_right.ctrl,
        { mouseButtonMask: 2 },
        viewports
      );
      larvitar_store.set("rightMouseHandler", config.mouse_button_right.ctrl);
      document.addEventListener("keyup", onKeyUp, { once: true });
    }
    // leave default
    else {
      document.addEventListener("keydown", onKeyDown, { once: true });
      return;
    }
  }

  function onKeyUp(e) {
    if (config.debug)
      console.log("active default", config.mouse_button_right.default);
    setToolActive(
      config.mouse_button_right.default,
      { mouseButtonMask: 2 },
      viewports
    );
    larvitar_store.set("rightMouseHandler", config.mouse_button_right.default);
    document.addEventListener("keydown", onKeyDown, { once: true });
  }

  // activate default, if any

  if (config.mouse_button_right && config.mouse_button_right.default) {
    setToolActive(
      config.mouse_button_right.default,
      { mouseButtonMask: 2 },
      viewports
    );
    larvitar_store.set("rightMouseHandler", config.mouse_button_right.default);
  }

  if (config.mouse_button_left && config.mouse_button_left.default) {
    setToolActive(
      config.mouse_button_left.default,
      { mouseButtonMask: 1 },
      viewports
    );
    larvitar_store.set("leftMouseHandler", config.mouse_button_left.default);
  }

  document.addEventListener("keydown", onKeyDown, { once: true });
}
