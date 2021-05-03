import { DEFAULT_MOUSE_KEYS } from "./tools.default";

const KEY_CODES = {
  shift: 16,
  ctrl: 17,
  a: 65,
  r: 82,
  l: 76
  // ...TODO...
};

/**
 * Setup mouse handler modifiers and keyboard shortcuts
 * NOTE: at the moment only mouse right button is affected
 * Improvements could be:
 * - "restore previous active tool" instead of passed "default" tool
 * - manage left button
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
    // keyboard shortcuts
    let codes = Object.keys(config.keyboard_shortcuts).map(
      key => KEY_CODES[key]
    );
    if (codes.includes(evt.keyCode) && evt.altKey) {
      let key = Object.keys(config.keyboard_shortcuts)
        .filter(key => KEY_CODES[key] == evt.keyCode)
        .pop();
      if (config.debug) console.log("active", config.keyboard_shortcuts[key]);
      larvitar.setToolActive(config.keyboard_shortcuts[key], {}, viewports);
      document.addEventListener("keydown", onKeyDown, { once: true });
    }
    // right drag + shift
    else if (evt.keyCode == KEY_CODES["shift"]) {
      if (config.debug) console.log("active", config.mouse_button_right.shift);
      larvitar.setToolActive(
        config.mouse_button_right.shift,
        { mouseButtonMask: 2 },
        viewports
      );
      document.addEventListener("keyup", onKeyUp, { once: true });
    }
    // right drag + ctrl
    else if (evt.keyCode == KEY_CODES["ctrl"]) {
      if (config.debug) console.log("active", config.mouse_button_right.ctrl);
      larvitar.setToolActive(
        config.mouse_button_right.ctrl,
        { mouseButtonMask: 2 },
        viewports
      );
      document.addEventListener("keyup", onKeyUp, { once: true });
    }
    // restore default
    else {
      document.addEventListener("keydown", onKeyDown, { once: true });
      return;
    }
  }

  function onKeyUp(e) {
    if (config.debug) console.log("active wwwc");
    larvitar.setToolActive(
      config.mouse_button_right.default,
      { mouseButtonMask: 2 },
      viewports
    );
    document.addEventListener("keydown", onKeyDown, { once: true });
  }

  larvitar.setToolActive(
    config.mouse_button_right.default,
    { mouseButtonMask: [1, 2] },
    viewports
  );
  document.addEventListener("keydown", onKeyDown, { once: true });
}
