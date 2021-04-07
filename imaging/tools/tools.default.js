/** @module tools/default */

/* DEFINE DEFAULT TOOLS
 * example
 *
 * toolName : {
 *      name : toolName (string),
 *      viewports : "all" or [array of target viewports],
 *      configuration : configuration {object},
 *      options : options {object},
 *      class : cornerstone tool library class name (ie "LengthTool" for Length tool),
 *      sync : cornerstone synchronizer name (ie "wwwcSynchronizer" for Wwwc sync tool),
 *      cleanable : if true, this tool will be removed when calling "no tools",
 *      defaultActive : if true, this tool will be activated when calling "addDefaultTools",
 *      shortcut : keyboard shortcut [not implemented],
 *      type : tool category inside Larvitar (one of: "utils", "annotation", "segmentation")
 * }
 *
 */

import { filter, isArray } from "lodash";
import ThresholdsBrushTool from "./thresholdsBrushTool";
import PolylineScissorsTool from "./polylineScissorsTool";

/**
 * These tools are added with `addDefaultTools()`
 */
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
    defaultActive: true,
    class: "WwwcTool",
    sync: "wwwcSynchronizer",
    description: "Change image contrast",
    shortcut: "ctrl-m",
    type: "utils"
  },
  StackScrollMouseWheel: {
    name: "StackScrollMouseWheel",
    viewports: "all",
    configuration: {},
    options: {
      loop: false, // default false
      allowSkipping: false, // default true
      invert: false
    },
    cleanable: false,
    defaultActive: true,
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
    class: "RotateTool",
    description: "Rotate image"
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
  Eraser: {
    name: "Eraser",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    class: "EraserTool"
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
  ThresholdsBrush: {
    name: "ThresholdsBrush",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "ThresholdsBrushTool",
    description: "Brush only values inside thresholds",
    shortcut: "ctrl-t",
    type: "segmentation"
  },
  RectangleScissors: {
    name: "RectangleScissors",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "RectangleScissorsTool",
    description: "A rectangular segmentation tool",
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
    description: "A free-hand segmentation tool",
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
    description: "A circular segmentation tool",
    shortcut: "ctrl-r",
    type: "segmentation"
  },
  CorrectionScissors: {
    name: "CorrectionScissors",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "CorrectionScissorsTool",
    description: "A correction segmentation tool",
    shortcut: "ctrl-p",
    type: "segmentation"
  },
  PolylineScissors: {
    name: "PolylineScissors",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "PolylineScissorsTool",
    description: "A polyline segmentation tool",
    shortcut: "ctrl-s",
    type: "segmentation"
  }
};

/**
 * D/Vision Lab custom tools
 */
const dvTools = {
  ThresholdsBrushTool: ThresholdsBrushTool,
  PolylineScissorsTool: PolylineScissorsTool
};

/**
 * Get available tools by type (useful to populate menus)
 * @param {String} type
 */
const getDefaultToolsByType = function (type) {
  return filter(DEFAULT_TOOLS, ["type", type]);
};

/**
 * Override default tools props
 * @param {Array} newProps - An array of objects as in the DEFAULT_TOOLS list, but with a subset of props
 * NOTE: prop "name" is mandatory
 */
const setDefaultToolsProps = function (newProps) {
  if (isArray(newProps)) {
    newProps.forEach(props => {
      let targetTool = DEFAULT_TOOLS[props.name];
      if (targetTool) {
        DEFAULT_TOOLS[props.name] = Object.assign(targetTool, props);
      } else {
        console.error(`${newProps.name} does not exist`);
      }
    });
  } else {
    console.error("newProps must be an array");
  }
};

export { DEFAULT_TOOLS, dvTools, getDefaultToolsByType, setDefaultToolsProps };
