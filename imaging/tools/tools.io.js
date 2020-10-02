import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import { each, map, assign, invert } from "lodash";
import { unparse } from "papaparse";

import { setToolPassive } from "../image_tools";

// DEV
// import { saved_state_2 } from "./cstools_state_example.js";
import { devState } from "./devState.js";

/**
 * Load annotation from json object
 * @param {Object} jsonData - The previously saved tools state
 */
export const loadAnnotations = function(jsonData) {
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
 * @param {bool} download - True to download json
 * @param {string} filename - The json file name, @default state.json
 */
export const saveAnnotations = function(download, filename = "state.json") {
  let currentToolState = cornerstoneTools.globalImageIdSpecificToolStateManager.saveToolState();
  if (download) {
    // Convert JSON Array to string.
    var json_string = JSON.stringify(currentToolState);
    download(json_string, filename);
  }

  return currentToolState;
};

/**
 * Save annotation from current stack, download as csv file
 * containing only useful informations for user
 */
export const exportAnnotations = function(
  fileManager,
  filename = "annotations.csv"
) {
  // let currentToolState = cornerstoneTools.globalImageIdSpecificToolStateManager.saveToolState();
  let currentToolState = devState;

  // TODO for each imageId > get image path
  let csvdata = generateCSV(fileManager, currentToolState);
  let csvstring = unparse(csvdata);
  download(csvstring, filename);
};

/**
 *
 * @param {*} stringContent
 * @param {*} filename
 */
function download(stringContent, filename) {
  // Convert string to BLOB.
  stringContent = [stringContent];
  var blob = new Blob(stringContent, { type: "text/plain;charset=utf-8" });
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

/**
 *
 * @param {*} allToolState
 */
export function generateCSV(fileManager, allToolState) {
  let fields = new Set();
  fields.add("imagePath");
  fields.add("toolName");
  let data = [];
  each(allToolState, (imageToolState, imageId) => {
    // convert imageId to imagePath
    let imagePath = invert(fileManager)[imageId];
    each(imageToolState, (toolState, toolName) => {
      // extract useful information from tool state
      let extractedData = extractToolInfo(toolName, toolState.data);
      each(extractedData, singledata => {
        data.push(assign({ imagePath, toolName }, singledata));
        // add all keys into fields set
        each(Object.keys(singledata), k => fields.add(k));
      });
    });
  });

  fields = Array.from(fields);

  return {
    fields,
    data
  };
}

/**
 *
 * @param {*} toolData
 */
function extractToolInfo(toolName, toolData) {
  let dataArray = [];
  switch (toolName) {
    case "RectangleRoi":
    case "EllipticalRoi":
      // This is an example for "length" tool, needs to be generalised
      dataArray = map(toolData, data => {
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
      break;
    case "FreehandRoi":
      dataArray = map(toolData, data => {
        return {
          color: data.color,
          // TODO how to export arrays ?
          // x: map(data.handles.points, "x"),
          // y: map(data.handles.points, "y"),
          length: data.length,
          unit: data.unit,
          textBox_x: data.textBox ? data.textBox.x : null,
          textBox_y: data.textBox ? data.textBox.y : null,
          polyBoundingBox_h: data.polyBoundingBox.height,
          polyBoundingBox_l: data.polyBoundingBox.left,
          polyBoundingBox_t: data.polyBoundingBox.top,
          polyBoundingBox_w: data.polyBoundingBox.width
        };
      });
      break;
    case "ArrowAnnotate":
      dataArray = map(toolData, data => {
        return {
          color: data.color ? data.color : null,
          text: data.text,
          x1: data.handles.start.x,
          y1: data.handles.start.y,
          x2: data.handles.end.x,
          y2: data.handles.end.y,
          textBox_x: data.textBox ? data.textBox.x : null,
          textBox_y: data.textBox ? data.textBox.y : null,
          boundingBox_w: data.textBox ? data.textBox.boundingBox.width : null,
          boundingBox_h: data.textBox ? data.textBox.boundingBox.height : null,
          boundingBox_l: data.textBox ? data.textBox.boundingBox.left : null,
          boundingBox_t: data.textBox ? data.textBox.boundingBox.top : null
        };
      });
      break;
    default:
  }

  return dataArray;
}
