/** @module tools/default */

/* DEFINE DEFAULT TOOLS
 * example
 *
 * toolName : {
 *      name : toolName (string),
 *      viewports : "all" or [array of target viewports],
 *      configuration : configuration {object},
 *      options : options {object},
 *      class : cornerstone tool library class name (ie "LengthTool" for Length tool)
 *      sync : cornerstone synchronizer name (ie "wwwcSynchronizer" for Wwwc sync tool)
 * }
 *
 */

import { filter } from "lodash";

const DEFAULT_TOOLS = {
  Wwwc: {
    name: "Wwwc",
    viewports: "all",
    configuration: {},
    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["Mouse", "Touch"]
    },
    cleanable: false,
    defaultActive: false,
    class: "WwwcTool",
    sync: "wwwcSynchronizer",
    description: "Change ww / wl",
    shortcut: "ctrl-m",
    type: "utils"
  },
  StackScrollMouseWheel: {
    name: "StackScrollMouseWheel",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: false,
    class: "StackScrollMouseWheelTool"
  },
  Pan: {
    name: "Pan",
    viewports: "all",
    configuration: {},
    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["Mouse", "Touch"]
    },
    cleanable: false,
    class: "PanTool",
    description: "Move image xy",
    shortcut: "ctrl-p",
    type: "utils"
  },
  Zoom: {
    name: "Zoom",
    viewports: "all",
    configuration: {},
    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["Mouse", "Touch"]
    },
    cleanable: false,
    class: "ZoomTool",
    defaultActive: false,
    description: "Zoom image at mouse position",
    shortcut: "ctrl-z",
    type: "utils"
  },
  Magnify: {
    name: "Magnify",
    viewports: "all",
    configuration: {},
    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["Mouse", "Touch"]
    },
    cleanable: false,
    class: "MagnifyTool",
    defaultActive: false,
    description: "Magnify image at mouse position",
    shortcut: "ctrl-m",
    type: "utils"
  },
  DragProbe: {
    name: "DragProbe",
    viewports: "all",
    configuration: {},
    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["Mouse", "Touch"]
    },
    cleanable: false,
    class: "DragProbeTool",
    description: "Probe image at mouse position",
    shortcut: "ctrl-p",
    type: "utils"
  },
  Rotate: {
    name: "Rotate",
    viewports: "all",
    configuration: {},
    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["Mouse", "Touch"]
    },
    cleanable: false,
    class: "RotateTool"
  },
  Length: {
    name: "Length",
    viewports: "all",
    configuration: {},
    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["Mouse", "Touch"]
    },
    cleanable: true,
    class: "LengthTool"
  },
  Angle: {
    name: "Angle",
    viewports: "all",
    configuration: {},
    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["Mouse", "Touch"]
    },
    cleanable: true,
    class: "AngleTool"
  },
  Bidirectional: {
    name: "Bidirectional",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "BidirectionalTool"
  },
  EllipticalRoi: {
    name: "EllipticalRoi",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "EllipticalRoiTool",
    description: "Draw an ellipse",
    shortcut: "ctrl-f",
    type: "annotation"
  },
  RectangleRoi: {
    name: "RectangleRoi",
    viewports: "all",
    options: { mouseButtonMask: 1 },
    cleanable: true,
    defaultActive: false,
    class: "RectangleRoiTool",
    description: "Draw a rectangle",
    shortcut: "ctrl-a",
    type: "annotation"
  },
  FreehandRoi: {
    name: "FreehandRoi",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "FreehandRoiTool",
    description: "Draw a polyline / freehand form",
    shortcut: "ctrl-s",
    type: "annotation"
  },
  Probe: {
    name: "Probe",
    viewports: "all",
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "ProbeTool"
  },
  ArrowAnnotate: {
    name: "ArrowAnnotate",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "ArrowAnnotateTool",
    description: "Draw an arrow",
    shortcut: "ctrl-d",
    type: "annotation"
  },
  TextMarker: {
    name: "TextMarker",
    viewports: "all",
    configuration: {
      markers: Object.keys(new Array(100).fill(0)),
      current: "0",
      ascending: true,
      loop: true
    },
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "TextMarkerTool"
  },
  ZoomTouchPinch: {
    name: "ZoomTouchPinch",
    viewports: "all",
    configuration: {},
    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["TouchPinch"]
    },
    cleanable: false,
    class: "ZoomTouchPinchTool",
    defaultActive: true
  },
  PanMultiTouch: {
    name: "PanMultiTouch",
    viewports: "all",
    configuration: {
      touchPointers: 2
    },
    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["MultiTouch"]
    },
    cleanable: false,
    class: "PanMultiTouchTool",
    defaultActive: true
  },
  Brush: {
    name: "Brush",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "BrushTool",
    description: "A simple brush",
    shortcut: "ctrl-q",
    type: "segmentation"
  },
  RectangleScissors: {
    name: "RectangleScissors",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "RectangleScissorsTool",
    description: "A simple brush",
    shortcut: "ctrl-w",
    type: "segmentation"
  },
  FreehandScissors: {
    name: "FreehandScissors",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "FreehandScissorsTool",
    description: "A simple brush",
    shortcut: "ctrl-e",
    type: "segmentation"
  },
  CircleScissors: {
    name: "CircleScissors",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "CircleScissorsTool",
    description: "A simple brush",
    shortcut: "ctrl-r",
    type: "segmentation"
  }
};

const getDefaultToolsByType = function(type) {
  return filter(DEFAULT_TOOLS, ["type", type]);
};

export { DEFAULT_TOOLS, getDefaultToolsByType };
