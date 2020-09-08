import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import { each, map } from "lodash";

import { setToolPassive } from "../image_tools";

// DEV
// import { saved_state_2 } from "./cstools_state_example.js";

/**
 * Load annotation from json object
 * @param {Object} jsonData - The previously saved tools state
 */
export const loadAnnotations = function (jsonData) {
  // DEV
  // if (!jsonData) {
  //   jsonData = saved_state_2;
  // }

  // restore saved tool state
  cornerstoneTools.globalImageIdSpecificToolStateManager.restoreToolState(
    jsonData
  );

  // set all found tools to passive
  let toolsInState = new Set();
  for (let imageId in jsonData) {
    for (let toolName in jsonData[imageId]) {
      toolsInState.add(toolName);
    }
  }

  toolsInState.forEach(toolName => {
    setToolPassive(toolName);
  });

  let enabledElementIds = map(
    cornerstone.getEnabledElements(),
    e => e.element.id
  );

  // FIXME error if called when image is not loaded
  for (let elementId of enabledElementIds) {
    cornerstone.updateImage(document.getElementById(elementId));
  }
};

/**
 * Save annotations from current stack, download as json file if requested
 */
export const saveAnnotations = function (download) {
  let currentToolState = cornerstoneTools.globalImageIdSpecificToolStateManager.saveToolState();
  if (download) {
    // Convert JSON Array to string.
    var json = JSON.stringify(currentToolState);
    // Convert JSON string to BLOB.
    json = [json];
    var blob = new Blob(json, { type: "text/plain;charset=utf-8" });
    let filename = "annotate.vision.state.json";
    //Check the Browser.
    var isIE = false || !!document.documentMode;
    if (isIE) {
      window.navigator.msSaveBlob(blob, filename);
    } else {
      var url = window.URL || window.webkitURL;
      let link = url.createObjectURL(blob);
      var a = document.createElement("a");
      a.download = filename;
      a.href = link;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  return currentToolState;
};

/**
 * Save annotation from current stack, download as csv file
 * containing only useful informations for user
 */
export const exportAnnotations = function () {
  // TODO
  // NOTE : we need to flatten the state object before converting in csv
  // and select a subset of properties as columns
};

/**
 *
 * @param {*} allToolState
 */
export function generateCSV(allToolState) {
  each(allToolState, (imageToolState, imageId) => {
    each(imageToolState, (toolState, toolName) => {
      // extract useful information from tool state
      let data = extractToolInfo(toolState.data);
      console.log(imageId, toolName, data);
    });
  });
}

/**
 *
 * @param {*} toolData
 */
function extractToolInfo(toolData) {
  // This is an example for "length" tool, needs to be generalised
  let dataArray = map(toolData, data => {
    return {
      color: data.color,
      x1: data.handles.start.x,
      y1: data.handles.start.y,
      x2: data.handles.end.x,
      y2: data.handles.end.y,
      length: data.length,
      unit: data.unit,
      textBox_x: data.textBox ? data.textBox.x : null,
      textBox_y: data.textBox ? data.textBox.y : null,
      boundingBox_w: data.textBox ? data.textBox.boundingBox.width : null,
      boundingBox_h: data.textBox ? data.textBox.boundingBox.height : null,
      boundingBox_l: data.textBox ? data.textBox.boundingBox.left : null,
      boundingBox_t: data.textBox ? data.textBox.boundingBox.top : null
    };
  });

  return dataArray;
}
