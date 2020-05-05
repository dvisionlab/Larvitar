// TODO import / export

import { each } from "lodash";
import { parse, unparse } from "papaparse";

// NOTE : we need to flatten the state object before converting in csv
// and select a subset of properties as columns

/**
 *
 * @param {*} allToolState
 */
const generateCSV = function(allToolState) {
  each(allToolState, (imageToolState, imageId) => {
    each(imageToolState, (toolState, toolName));
    // extract useful information from tool state
    let data = extractToolInfo(toolState.data);
    console.log(data);
  });
};

/**
 *
 * @param {*} toolData
 */
const extractToolInfo = function(toolData) {
  // This is an example for "length" tool, needs to be generalised
  let dataArray = map(toolData, (data) => {
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
};
