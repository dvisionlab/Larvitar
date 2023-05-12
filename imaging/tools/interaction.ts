/** @module imaging/tools/interaction
 *  @desc  This file provides functionalities for
 *         tools interactions
 */

// external libraries
import { throttle } from "lodash";
import * as keyCodes from "keycode-js";
import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";

// internal libraries
import { DEFAULT_MOUSE_KEYS } from "./default";
import { setToolActive } from "./main";
import { isElement } from "../imageUtils";
import store, { set as setStore } from "../imageStore";
import { updateViewportData } from "../imageRendering";

import { ToolMouseKeys } from "./types";

/**
 * TOOLS INTERACTIONS TODOS:
 * - enable touch controls
 * - rework active tools / ui labels sync (we can get all active tools from cornerstoneTools state, then check the button / input method to update the correct label, or update all props scale, translation and voi)
 * - use config to setup all interactions (mouse left/right, keyboard shortcuts, touch inputs)
 */

/**
 * Global event callbacks
 */
let onKeyDownFn: ((evt: KeyboardEvent) => void) | null = null;
let onKeyUpFn: ((evt: KeyboardEvent) => void) | null = null;

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

export function addMouseKeyHandlers(config: ToolMouseKeys) {
  if (!config) {
    config = DEFAULT_MOUSE_KEYS;
  }

  if (onKeyDownFn) {
    document.removeEventListener("keydown", onKeyDownFn);
  }
  if (onKeyUpFn) {
    document.removeEventListener("keyup", onKeyUpFn);
  }

  // Prevent context menu on right click
  document.addEventListener("contextmenu", evt => {
    evt.preventDefault();
    return false;
  });

  // get all enabled viewports. Then, filter only viewport in which the target tool had been added previously.
  let allViewports = cornerstone.getEnabledElements().map(enel => enel.element);

  // Define behaviour on key down: activate registered tool
  function onKeyDown(evt: KeyboardEvent) {
    // keyboard shortcuts (activate on left mouse button)
    let codes = config.keyboard_shortcuts
      ? Object.keys(config.keyboard_shortcuts).map(
          // @ts-ignore
          key => keyCodes[key]
        )
      : [];

    if (codes.includes(evt.keyCode) && evt.altKey) {
      evt.preventDefault(); // avoid browser menu selections

      let key = Object.keys(config.keyboard_shortcuts)
        // @ts-ignore
        .filter(key => keyCodes[key] == evt.keyCode) // TODO keyCode is deprecated
        .pop();

      if (!key) {
        console.warn("Key not found in config.keyboard_shortcuts");
        return;
      }

      let toolName = config.keyboard_shortcuts[key];

      if (config.debug) console.log("active", toolName);

      const viewports = allViewports.filter(viewport =>
        cornerstoneTools.getToolForElement(viewport, toolName)
      );

      setToolActive(
        toolName,
        { mouseButtonMask: 1 },
        viewports.map(v => v.id)
      );

      document.addEventListener("keydown", onKeyDown, { once: true });
    }
    // right drag + shift
    else if (
      config.mouse_button_right &&
      config.mouse_button_right.shift &&
      evt.keyCode == keyCodes.KEY_SHIFT
    ) {
      if (config.debug) console.log("active", config.mouse_button_right.shift);
      const viewports = allViewports.filter(viewport =>
        cornerstoneTools.getToolForElement(
          viewport,
          config.mouse_button_right.shift
        )
      );

      setToolActive(
        config.mouse_button_right.shift,
        { mouseButtonMask: 2 },
        viewports.map(v => v.id)
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
      const viewports = allViewports.filter(viewport =>
        cornerstoneTools.getToolForElement(
          viewport,
          config.mouse_button_right.ctrl
        )
      );

      setToolActive(
        config.mouse_button_right.ctrl,
        { mouseButtonMask: 2 },
        viewports.map(v => v.id)
      );
      document.addEventListener("keyup", onKeyUp, { once: true });
    }
    // leave default
    else {
      document.addEventListener("keydown", onKeyDown, { once: true });
      return;
    }
  }

  // Define behaviour on key up: restore original tool
  function onKeyUp(e: KeyboardEvent) {
    if (config.debug)
      console.log("active default", config.mouse_button_right.default);
    const viewports = allViewports.filter(viewport =>
      cornerstoneTools.getToolForElement(
        viewport,
        config.mouse_button_right.default
      )
    );
    setToolActive(
      config.mouse_button_right.default,
      { mouseButtonMask: 2 },
      viewports.map(v => v.id)
    );
    document.addEventListener("keydown", onKeyDown, { once: true });
  }

  // activate default on mouse right, if any
  if (config.mouse_button_right && config.mouse_button_right.default) {
    const viewports = allViewports.filter(viewport =>
      cornerstoneTools.getToolForElement(
        viewport,
        config.mouse_button_right.default
      )
    );
    setToolActive(
      config.mouse_button_right.default,
      { mouseButtonMask: 2 },
      viewports.map(v => v.id)
    );
  }

  // activate default on mouse left, if any
  if (config.mouse_button_left && config.mouse_button_left.default) {
    const viewports = allViewports.filter(viewport =>
      cornerstoneTools.getToolForElement(
        viewport,
        config.mouse_button_left.default
      )
    );
    setToolActive(
      config.mouse_button_left.default,
      { mouseButtonMask: 1 },
      viewports.map(v => v.id)
    );
  }

  document.addEventListener("keydown", onKeyDown, { once: true });

  onKeyDownFn = onKeyDown;
  onKeyUpFn = onKeyUp;
}

/**
 *
 */
export function removeMouseKeyHandlers() {
  if (!onKeyDownFn) return;
  document.removeEventListener("keydown", onKeyDownFn);
  onKeyDownFn = null;
  onKeyUpFn = null;
}

/**
 * Add event handlers to mouse move
 * @instance
 * @function toggleMouseHandlers
 * @param {String | HTMLElement} elementId - The html div id used for rendering or its DOM HTMLElement
 * @param {Boolean} disable - If true disable handlers, default is false
 */
export const toggleMouseToolsListeners = function (
  elementId: string | HTMLElement,
  disable: boolean
) {
  let element = isElement(elementId)
    ? (elementId as HTMLElement)
    : document.getElementById(elementId as string);
  if (!element) {
    console.error("invalid html element: " + elementId);
    return;
  }

  // mouse move handler (throttled)
  let mouseMoveHandler = throttle(function (evt) {
    let activeTool =
      evt.detail.buttons == 1
        ? store.get("leftActiveTool")
        : store.get("rightActiveTool");
    updateViewportData(evt.srcElement.id, evt.detail.viewport, activeTool);
  }, 250);

  // mouse wheel handler
  function mouseWheelHandler(evt: any) {
    // TODO-ts fix type (should be a cornerstoneTools event type)
    setStore("sliceId", [evt.target.id, evt.detail.newImageIdIndex]);
    updateViewportData(evt.srcElement.id, evt.detail, "mouseWheel");
  }

  if (disable) {
    element.removeEventListener("cornerstonetoolsmousedrag", mouseMoveHandler);
    element.removeEventListener(
      "cornerstonetoolsstackscroll",
      mouseWheelHandler
    );
    return;
  }

  element.addEventListener("cornerstonetoolsmousedrag", mouseMoveHandler);
  element.addEventListener("cornerstonetoolsstackscroll", mouseWheelHandler);
};
