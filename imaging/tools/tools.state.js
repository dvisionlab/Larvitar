// external libraries
import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";

import { each } from "lodash";

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

const example = function() {
  // Declare state manager
  const stateManager = newImageIdSpecificToolStateManager();

  // Get enabled element (cornerstone.getEnabledElement)
  const imageId = "abc123";
  const testElement = {
    image: {
      imageId
    }
  };

  // Setup with some initial data
  const toolType = "TestTool";
  stateManager.restoreImageIdToolState(imageId, {
    [toolType]: { data: ["initialData"] }
  });

  // Add more data
  stateManager.add(testElement, toolType, "addedData");

  // Check the results
  const allToolState = stateManager.saveToolState();
};

export { saveToolState, restoreToolState };
