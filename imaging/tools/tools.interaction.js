import { DEFAULT_MOUSE_KEYS } from "./tools.default";
import { setToolActive } from "./tools.main";
import { isElement } from "../image_utils";
import { larvitar_store } from "../image_store";
import { updateViewportData } from "../image_rendering";

import { throttle } from "lodash";
import * as keyCodes from "keycode-js";

/**
 * TOOLS INTERACTIONS TODOS:
 * - enable touch controls
 * - rework active tools / ui labels sync (we can get all active tools from cornerstoneTools state, then check the button / input method to update the correct label, or update all props scale, translation and voi)
 * - use config to setup all interactions (mouse left/right, keyboard shortcuts, touch inputs)
 */

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
    document.addEventListener("keydown", onKeyDown, { once: true });
  }

  // activate default, if any

  if (config.mouse_button_right && config.mouse_button_right.default) {
    setToolActive(
      config.mouse_button_right.default,
      { mouseButtonMask: 2 },
      viewports
    );
  }

  if (config.mouse_button_left && config.mouse_button_left.default) {
    setToolActive(
      config.mouse_button_left.default,
      { mouseButtonMask: 1 },
      viewports
    );
  }

  document.addEventListener("keydown", onKeyDown, { once: true });
}

/**
 * Add event handlers to mouse move
 * @instance
 * @function toggleMouseHandlers
 * @param {String} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Boolean} disable - If true disable handlers, default is false
 */
export const toggleMouseToolsListeners = function (elementId, disable) {
  let element = isElement(elementId)
    ? elementId
    : document.getElementById(elementId);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }

  // mouse move handler
  let throttledSave = throttle(function (evt) {
    console.log(evt);
    let activeTool =
      evt.detail.buttons == 1
        ? larvitar_store.get("leftActiveTool")
        : larvitar_store.get("rightActiveTool");
    updateViewportData(evt.srcElement.id, evt.detail.viewport, activeTool);
  }, 2000);
  // function mouseMoveHandler(evt) {
  //   throttledSave(evt);
  // }
  // mouse wheel handler
  function mouseWheelHandler(evt) {
    let enabledElement = cornerstone.getEnabledElement(element);
    let cix =
      enabledElement.toolStateManager.toolState.stack.data[0]
        .currentImageIdIndex;
    larvitar_store.set("sliceId", [evt.target.id, cix + 1]);
  }

  if (disable) {
    element.removeEventListener("cornerstonetoolsmousedrag", mouseMoveHandler);
    element.removeEventListener(
      "cornerstonetoolsmousewheel",
      mouseWheelHandler
    );
    return;
  }

  element.addEventListener("cornerstonetoolsmousedrag", throttledSave);
  element.addEventListener("cornerstonetoolsmousewheel", mouseWheelHandler);
};
