/** @module imaging3d/tools/main
 *  @desc  This file provides functionalities
 *         for initializing tools and stacks
 */

// external libraries
import * as cornerstone from "@cornerstonejs/core";
import * as cornerstoneTools from "@cornerstonejs/tools";

// internal libraries

// global variables

/**
 * @function addDefaultTools
 * @desc Adds default tools to the rendering engine (wwwl, pan, zoom, stackScroll)
 * @param elementId - the id of the element where the tools will be added
 * @param renderingEngine - the rendering engine where the tools will be added
 */
export const addDefaultTools = function (
  elementId: string,
  renderingEngine: cornerstone.RenderingEngine
) {
  // cursors not showing up is a known issue: https://github.com/cornerstonejs/cornerstone3D/issues/1428
  const element = renderingEngine.getViewport(elementId).element;
  element.oncontextmenu = e => e.preventDefault();
  const viewport = renderingEngine.getViewport(elementId);
  cornerstoneTools.utilities.stackPrefetch.enable(viewport.element);

  cornerstoneTools.addTool(cornerstoneTools.WindowLevelTool);
  cornerstoneTools.addTool(cornerstoneTools.PanTool);
  cornerstoneTools.addTool(cornerstoneTools.StackScrollMouseWheelTool);
  cornerstoneTools.addTool(cornerstoneTools.ZoomTool);

  const toolGroupId = "default";
  const toolGroup =
    cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId);
  if (toolGroup) {
    toolGroup.addViewport(elementId, renderingEngine.id);

    // Add tools to the tool group
    toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName);
    toolGroup.addTool(cornerstoneTools.PanTool.toolName);
    toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
    toolGroup.addTool(cornerstoneTools.StackScrollMouseWheelTool.toolName, {
      loop: false
    });

    toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
      bindings: [
        {
          mouseButton: cornerstoneTools.Enums.MouseBindings.Primary // Left Click
        }
      ]
    });

    toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
      bindings: [
        {
          mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary // Middle Click
        }
      ]
    });

    toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
      bindings: [
        {
          mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary // Right Click
        }
      ]
    });

    toolGroup.setToolActive(
      cornerstoneTools.StackScrollMouseWheelTool.toolName
    );
  } else {
    console.error("Failed to create tool group");
  }
};

/**
 * @function addDefaultTools3D
 * @desc Adds default tools to the rendering engine (crosshairs)
 * @param elementIds - the ids of the elements where the tools will be added
 * @param renderingEngine - the rendering engine where the tools will be added
 */
export const addDefaultTools3D = function (
  elementIds: string[],
  renderingEngine: cornerstone.RenderingEngine
) {
  elementIds.forEach(viewportId => {
    const element = renderingEngine.getViewport(viewportId).element;
    element.oncontextmenu = e => e.preventDefault();
  });

  cornerstoneTools.addTool(cornerstoneTools.CrosshairsTool);

  const toolGroupId = "default3D";
  const toolGroup =
    cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId);
  if (toolGroup) {
    elementIds.forEach(viewportId => {
      toolGroup.addViewport(viewportId, renderingEngine.id);
    });
    toolGroup.addTool(cornerstoneTools.CrosshairsTool.toolName);
    toolGroup.setToolActive(cornerstoneTools.CrosshairsTool.toolName, {
      bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }]
    });
  } else {
    console.error("Failed to create tool group");
  }
};
