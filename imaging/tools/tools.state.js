// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";

import { each } from "lodash";
import { state_example } from "./cstools_state_example.js";

/**
 *
 * @param {*} elementId
 */
const saveToolState = function(elementId) {
  const elementToolStateManager = cornerstoneTools.getElementToolStateManager(
    document.getElementById(elementId)
  );

  const currentState = elementToolStateManager.saveToolState();

  return currentState;
};

/**
 *
 * @param {*} elementId
 * @param {*} allToolState
 */
const restoreToolState = function(elementId, allToolState) {
  const elementToolStateManager = cornerstoneTools.getElementToolStateManager(
    document.getElementById(elementId)
  );

  each(allToolState, (imageState, imageId) => {
    each(imageState, (toolState, toolName) => {
      elementToolStateManager.restoreImageIdToolState(imageId, {
        [toolName]: toolState
      });
    });
  });
};

// EXAMPLE OF CORRECT USE OF TOOL STATE MANAGER

export const example = function() {
  // Declare state manager
  const stateManager = cornerstoneTools.newImageIdSpecificToolStateManager();

  // Get enabled element (cornerstone.getEnabledElement)
  const imageId = "imagefile:0";
  const testElement = cornerstone
    .getEnabledElements()
    .slice()
    .pop();
  testElement.image = { imageId };
  // const testElement = {
  //   image: {
  //     imageId
  //   }
  // };

  // Setup with some initial data
  const toolType = "EllipticalRoi";
  // stateManager.restoreImageIdToolState(imageId, {
  //   [toolType]: { data: ["initialData"] }
  // });
  stateManager.restoreImageIdToolState(imageId, {
    [toolType]: { data: state_example[imageId] }
  });

  // Add more data
  stateManager.add(testElement, toolType, "addedData");

  // Check the results
  const allToolState = stateManager.saveToolState();
  console.log(allToolState);
};

export { saveToolState, restoreToolState };
