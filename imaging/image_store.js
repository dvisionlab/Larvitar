/** @module imaging/store
 *  @desc This file provides functionalities
 *        for data config store.
 *  @todo Document
 */

// external libraries
import { get as _get } from "lodash";

if (VUEX_STORE) {
  import * as vuex_store from "@/store/index";
}
// internal libraries

// global variables
let VUEX_STORE = false;

const LARVITAR_STORE = {
  viewer: "quadview",
  viewports: ["axial", "coronal", "sagittal"],
  orientation: null,
  leftMouseHandler: "Wwwc",
  series: [],
  seriesId: null,
  axial: {
    ready: false,
    minSliceId: 0,
    maxSliceId: 0,
    sliceId: 0,
    rows: 0,
    cols: 0,
    spacing_x: 0.0,
    spacing_y: 0.0,
    thickness: 0.0,
    minPixelValue: 0,
    maxPixelValue: 0,
    viewport: {
      scale: 0.0,
      translation: {
        x: 0.0,
        y: 0.0
      },
      rotation: 0.0,
      voi: {
        windowCenter: 0.0,
        windowWidth: 0.0
      }
    },
    default: {
      scale: 0.0,
      translation: {
        x: 0.0,
        y: 0.0
      },
      rotation: 0.0,
      voi: {
        windowCenter: 0.0,
        windowWidth: 0.0
      }
    }
  },
  sagittal: {
    ready: false,
    minSliceId: 0,
    maxSliceId: 0,
    sliceId: 0,
    rows: 0,
    cols: 0,
    spacing_x: 0.0,
    spacing_y: 0.0,
    thickness: 0.0,
    minPixelValue: 0,
    maxPixelValue: 0,
    viewport: {
      scale: 1.0,
      translation: {
        x: 0.0,
        y: 0.0
      },
      rotation: 0.0,
      voi: {
        windowCenter: 0.0,
        windowWidth: 0.0
      }
    },
    default: {
      scale: 1.0,
      translation: {
        x: 0.0,
        y: 0.0
      },
      rotation: 0.0,
      voi: {
        windowCenter: 0.0,
        windowWidth: 0.0
      }
    }
  },
  coronal: {
    ready: false,
    minSliceId: 0,
    maxSliceId: 0,
    sliceId: 0,
    rows: 0,
    cols: 0,
    spacing_x: 0.0,
    spacing_y: 0.0,
    thickness: 0.0,
    minPixelValue: 0,
    maxPixelValue: 0,
    viewport: {
      scale: 1.0,
      translation: {
        x: 0.0,
        y: 0.0
      },
      rotation: 0.0,
      voi: {
        windowCenter: 0.0,
        windowWidth: 0.0
      }
    },
    default: {
      scale: 1.0,
      translation: {
        x: 0.0,
        y: 0.0
      },
      rotation: 0.0,
      voi: {
        windowCenter: 0.0,
        windowWidth: 0.0
      }
    }
  }
};

/*
 * This module provides the following functions to be exported:
 * enableVuex(config)
 * set(viewer, field, data)
 * get(...args)
 * storeViewportData(image, elementId, imageIndex, numberOfSlices, rows, cols, spacing_x, spacing_y, thickness, viewport)
 */

// ==========================================
// Configure VUEX Store as default storage ==
// ==========================================
export function enableVuex() {
  VUEX_STORE = true;
}

// =====================================
// Set a variable into internal store ==
// =====================================
export const set = function(viewer, field, data) {
  if (VUEX_STORE) {
    let dispatch = "set" + field[0].toUpperCase() + field.slice(1);
    let route = viewer ? viewer + "/" + dispatch : dispatch;
    vuex_store.dispatch(route, data);
  } else {
    if (field == "scale" || field == "rotation" || field == "translation") {
      LARVITAR_STORE[data[0]]["viewport"][field] = data[1];
    } else if (field == "contrast") {
      LARVITAR_STORE[data[0]]["viewport"]["voi"][field] = data[1];
    } else if (field == "dimensions") {
      LARVITAR_STORE[data[0]]["rows"] = data[1];
      LARVITAR_STORE[data[0]]["cols"] = data[2];
    } else if (field == "spacing") {
      LARVITAR_STORE[data[0]]["spacing_x"] = data[1];
      LARVITAR_STORE[data[0]]["spacing_y"] = data[2];
    } else if (field == "defaultViewport") {
      LARVITAR_STORE[data[0]]["default"]["scale"] = data[1];
      LARVITAR_STORE[data[0]]["default"]["translation"]["x"] = data[2];
      LARVITAR_STORE[data[0]]["default"]["translation"]["y"] = data[3];
      LARVITAR_STORE[data[0]]["default"]["voi"]["windowWidth"] = data[4];
      LARVITAR_STORE[data[0]]["default"]["voi"]["windowCenter"] = data[5];
    } else {
      if (data.length == 0) {
        LARVITAR_STORE[field] = data;
      } else {
        LARVITAR_STORE[data[0]][field] = data[1];
      }
    }
  }
};

// =====================================
// Get a variable from internal store ==
// =====================================
export const get = function(...args) {
  if (VUEX_STORE) {
    return _get(vuex_store.state, args, "error");
  } else {
    return _get(LARVITAR_STORE, args, "error");
  }
};

// ================================================
// Store the viewport data into internal storage ==
// ================================================
export const storeViewportData = function(
  image,
  elementId,
  imageIndex,
  numberOfSlices,
  rows,
  cols,
  spacing_x,
  spacing_y,
  thickness,
  viewport
) {
  let viewer = store.get(viewer);
  store.set(viewer, "dimensions", [elementId, rows, cols]);
  store.set(viewer, "spacing", [elementId, spacing_x, spacing_y]);
  store.set(viewer, "thickness", [elementId, thickness]);
  store.set(viewer, "minPixelValue", [elementId, image.minPixelValue]);
  store.set(viewer, "maxPixelValue", [elementId, image.maxPixelValue]);
  store.set(viewer, "loadingStatus", [elementId, true]);
  store.set(viewer, "minSliceNumber", [elementId, 0]);
  store.set(viewer, "currentSliceNumber", [elementId, imageIndex]);
  store.set(viewer, "maxSliceNumber", [elementId, numberOfSlices]);
  store.set(viewer, "defaultViewport", [
    elementId,
    viewport.scale,
    viewport.translation.x,
    viewport.translation.y,
    viewport.voi.windowWidth,
    viewport.voi.windowCenter
  ]);
  store.set(viewer, "scale", [elementId, viewport.scale]);
  store.set(viewer, "translation", [
    elementId,
    viewport.translation.x,
    viewport.translation.y
  ]);
  store.set(viewer, "contrast", [
    elementId,
    viewport.voi.windowWidth,
    viewport.voi.windowCenter
  ]);
};
