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
    class: "WwwcTool",
    sync: "wwwcSynchronizer"
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
    class: "PanTool"
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
    class: "ZoomTool"
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
    class: "DragProbeTool"
  },
  Magnify: {
    name: "Magnify",
    viewports: "all",
    configuration: {
      magnifySize: 200
    },
    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["Mouse", "Touch"]
    },
    cleanable: false,
    class: "MagnifyTool"
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
    class: "EllipticalRoiTool"
  },
  RectangleRoi: {
    name: "RectangleRoi",
    viewports: "all",
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "RectangleRoiTool"
  },
  FreehandRoi: {
    name: "FreehandRoi",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "FreehandRoiTool"
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
    class: "ArrowAnnotateTool"
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
  }
};

export { DEFAULT_TOOLS };
