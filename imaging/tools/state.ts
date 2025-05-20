/** @module imaging/tools/state
 *  @desc  This file provides functionalities
 *         for handling tools' state
 */

// external libraries
import cornerstoneTools from "cornerstone-tools";
import { each } from "lodash";

import type { ToolState } from "../../common/types";

/**
 *
 * @param {*} elementId
 */
const saveToolState = function (elementId: string) {
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
const restoreToolState = function (elementId: string, allToolState: ToolState) {
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

/*
  // Declare state manager
  const stateManager = cornerstoneTools.newImageIdSpecificToolStateManager();

  // Get enabled element (cornerstone.getEnabledElement)
  const imageId = "imagefile:0";
  const testElement = cornerstone.getEnabledElements().slice().pop();
  testElement.image = { imageId };
  // const testElement = {
  //   image: {
  //     imageId
  //   }
  // };

  // Setup with some initial data
  const toolType = "EllipticalRoi";
  stateManager.restoreImageIdToolState(imageId, {
    [toolType]: { data: state_to_load[imageId] }
  });

  // Add more data
  stateManager.add(testElement, toolType, "addedData");

  // Check the results
  const allToolState = stateManager.saveToolState();
}
*/
export { saveToolState, restoreToolState };
