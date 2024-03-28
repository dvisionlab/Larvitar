/** @module imaging/tools/default
 *  @desc  This file provides definitions
 *         for default tools
 */

// external libraries

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
 *      type : tool category inside Larvitar (one of: "utils", "annotation", "segmentation", "overlay")
 * }
 *
 */

import { filter, isArray } from "lodash";
import ThresholdsBrushTool from "./custom/thresholdsBrushTool";
import WwwcRemoveRegionTool from "./custom/WwwcRemoveRegionTool";
import PolylineScissorsTool from "./custom/polylineScissorsTool";
import RectangleRoiOverlayTool from "./custom/rectangleRoiOverlayTool";
import EllipticalRoiOverlayTool from "./custom/ellipticalRoiOverlayTool";
import BorderMagnifyTool from "./custom/BorderMagnifyTool";
import CustomMouseWheelScrollTool from "./custom/customMouseWheelScrollTool";
import WSToggleTool from "./custom/watershedSegmentationTool";
import LengthPlotTool from "./custom/LengthPlotTool";
import LengthTool from "./custom/LengthUSTool";
import RectangleRoiTool from "./custom/RectangleRoiUSTool";
import EllipticalRoiTool from "./custom/EllipticalRoiUSTool";
import FreehandRoiTool from "./custom/FreehandRoiUSTool";
import ManualLengthPlotTool from "./custom/ManualLengthPlotTool";
import OverlayTool from "./custom/OverlayTool";
import type {
  ToolConfig,
  ToolMouseKeys,
  ToolSettings,
  ToolStyle
} from "./types";

/**
 * These tools are added with `addDefaultTools()`
 */
const DEFAULT_TOOLS: {
  [key: string]: ToolConfig;
} = {
  ScaleOverlay: {
    name: "ScaleOverlay",
    viewports: "all",
    configuration: {
      minorTickLength: 25,
      majorTickLength: 50
    },
    options: {
      mouseButtonMask: 1
    },
    cleanable: false,
    defaultActive: false,
    class: "ScaleOverlayTool",
    description: "Add scale overlay",
    shortcut: "ctrl-m",
    type: "overlay"
  },
  OrientationMarkers: {
    name: "OrientationMarkers",
    viewports: "all",
    configuration: {},
    options: {
      mouseButtonMask: 1
    },
    cleanable: false,
    defaultActive: false,
    class: "OrientationMarkersTool",
    description: "Add orientation markers",
    shortcut: "ctrl-m",
    type: "overlay"
  },
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
    // sync: "wwwcSynchronizer",
    description: "Change image contrast",
    shortcut: "ctrl-m",
    type: "utils"
  },
  WwwcRegion: {
    name: "WwwcRegion",
    viewports: "all",
    configuration: {},
    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["Mouse", "Touch"]
    },
    cleanable: false,
    defaultActive: false,
    class: "WwwcRegionTool",
    // sync: "wwwcSynchronizer",
    description: "Change image contrast based on selected region",
    shortcut: "ctrl-m",
    type: "utils"
  },
  WwwcRemoveRegionTool: {
    viewports: "all",
    configuration: {},
    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["Mouse", "Touch"]
    },
    cleanable: false,
    defaultActive: false,
    // sync: "wwwcSynchronizer",
    type: "utils",
    name: "WwwcRemoveRegionTool",
    class: "WwwcRemoveRegionTool",
    description: "The dual of wwwcRegionTool"
  },
  StackScroll: {
    name: "StackScroll",
    viewports: "all",
    configuration: {
      loop: false, // default false
      allowSkipping: true // default true
    },
    options: {
      mouseButtonMask: 1,
      deltaY: 0 // default 0
    },
    cleanable: false,
    defaultActive: false,
    class: "StackScrollTool"
  },
  StackScrollMouseWheel: {
    name: "StackScrollMouseWheel",
    viewports: "all",
    configuration: {
      loop: false, // default false
      allowSkipping: true, // default true
      invert: false
    },
    options: {},
    cleanable: false,
    defaultActive: true,
    class: "StackScrollMouseWheelTool"
  },
  CustomMouseWheelScroll: {
    name: "CustomMouseWheelScroll",
    viewports: "all",
    configuration: {
      loop: false,
      allowSkipping: true,
      invert: false,
      fixedFrame: 1,
      fixedSlice: 0,
      currentMode: "stack", // 'stack' or 'slice'
      framesNumber: 1
    },
    options: {
      mouseButtonMask: 0
    },
    cleanable: false,
    defaultActive: true,
    class: "CustomMouseWheelScrollTool",
    description: "scroll images/frames",
    shortcut: "mouse wheel",
    type: "utils"
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
    defaultActive: false,
    class: "PanTool",
    description: "Move image xy",
    shortcut: "ctrl-p",
    type: "utils"
  },
  Zoom: {
    name: "Zoom",
    viewports: "all",
    configuration: {
      invert: false,
      preventZoomOutsideImage: false,
      minScale: 0.01,
      maxScale: 25.0
    },
    options: {
      mouseButtonMask: 2,
      supportedInteractionTypes: ["Mouse", "Touch"],
      defaultStrategy: "default" // can be 'default', 'translate' or 'zoomToCenter'
    },
    cleanable: false,
    class: "ZoomTool",
    defaultActive: true,
    description: "Zoom image at mouse position",
    shortcut: "ctrl-z",
    type: "utils"
  },
  BorderMagnify: {
    name: "BorderMagnify",
    viewports: "all",
    configuration: {},
    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["Mouse", "Touch"]
    },
    cleanable: false,
    class: "BorderMagnifyTool",
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
  LengthPlot: {
    name: "LengthPlot",
    viewports: "all",
    configuration: {
      drawHandles: true,
      drawHandlesOnHover: false,
      hideHandlesIfMoving: false,
      renderDashed: false,
      digits: 2,
      offset: 0
    },

    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["Mouse"]
    },
    cleanable: true,
    class: "LengthPlotTool"
  },

  ManualLengthPlot: {
    name: "ManualLengthPlot",
    viewports: "all",
    configuration: {
      drawHandles: true,
      drawHandlesOnHover: false,
      hideHandlesIfMoving: false,
      renderDashed: false,
      digits: 2,
      offset: 15
    },

    options: {
      mouseButtonMask: 1,
      supportedInteractionTypes: ["Mouse"]
    },
    cleanable: true,
    class: "ManualLengthPlotTool"
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
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    defaultActive: false,
    class: "RectangleRoiTool",
    description: "Draw a rectangle",
    shortcut: "ctrl-a",
    type: "annotation"
  },
  EllipticalRoiOverlay: {
    name: "EllipticalRoiOverlay",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "EllipticalRoiOverlayTool",
    description: "Draw an ellipse",
    shortcut: "ctrl-f",
    type: "annotation"
  },
  RectangleRoiOverlay: {
    name: "RectangleRoiOverlay",
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    cleanable: true,
    defaultActive: false,
    class: "RectangleRoiOverlayTool",
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
    configuration: {},
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
    defaultActive: false
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
    defaultActive: false
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
  },
  WSToggle: {
    name: "WSToggle",
    viewports: "all",
    configuration: {
      multiImage: false,
      startIndex: null,
      endIndex: null,
      masksNumber: 10,
      onload: false
    },
    options: { mouseButtonMask: 1 },
    cleanable: true,
    class: "WSToggleTool",
    description: "Watershed Segmentation Algorithm based on selected area",
    shortcut: "ctrl-t",
    type: "segmentation"
  },
  Overlay: {
    name: "Overlay",
    viewports: "all",
    configuration: {},
    options: {},
    cleanable: true,
    defaultActive: true,
    class: "OverlayTool"
  }
};

/**
 * D/Vision Lab custom tools
 */
const dvTools: {
  [key: string]: any; // TODO-ts tools class type @mronzoni
} = {
  ThresholdsBrushTool: ThresholdsBrushTool,
  PolylineScissorsTool: PolylineScissorsTool,
  WwwcRemoveRegionTool: WwwcRemoveRegionTool,
  WSToggleTool: WSToggleTool,
  RectangleRoiOverlayTool: RectangleRoiOverlayTool,
  EllipticalRoiOverlayTool: EllipticalRoiOverlayTool,
  BorderMagnifyTool: BorderMagnifyTool,
  CustomMouseWheelScrollTool: CustomMouseWheelScrollTool,
  LengthPlotTool: LengthPlotTool,
  LengthTool: LengthTool,
  RectangleRoiTool: RectangleRoiTool,
  EllipticalRoiTool: EllipticalRoiTool,
  FreehandRoiTool: FreehandRoiTool,
  ManualLengthPlotTool: ManualLengthPlotTool,
  OverlayTool: OverlayTool
};

/**
 * Tools default style
 * Available font families :
 * Work Sans, Roboto, OpenSans, HelveticaNeue-Light,
 * Helvetica Neue Light, Helvetica Neue, Helvetica,
 * Arial, Lucida Grande, sans-serif;
 */
const DEFAULT_STYLE: ToolStyle = {
  width: 1,
  color: "#02FAE5",
  activeColor: "#00FF00",
  fillColor: "#0000FF",
  fontFamily: "Roboto",
  fontSize: 18,
  backgroundColor: "rgba(1, 1, 1, 0.7)"
};

/**
 * Tools default settings
 */
const DEFAULT_SETTINGS: ToolSettings = {
  mouseEnabled: true,
  touchEnabled: true,
  showSVGCursors: true,
  globalToolSyncEnabled: false,
  autoResizeViewports: true,
  lineDash: [4, 4]
};

/**
 * Shortcut and mouse bindings defaults
 */
const DEFAULT_MOUSE_KEYS: ToolMouseKeys = {
  debug: true, // log changes
  mouse_button_left: {
    shift: "Zoom",
    ctrl: "Pan",
    default: "Wwwc"
  },
  mouse_button_right: {
    shift: "Zoom",
    ctrl: "Pan",
    default: "Wwwc"
  },
  keyboard_shortcuts: {
    // alt key + letter
    KEY_R: "Rotate",
    KEY_A: "Angle",
    KEY_L: "Length"
  }
};

/**
 * Get available tools by type (useful to populate menus)
 * @param {String} type
 */
const getDefaultToolsByType = function (type: NonNullable<ToolConfig["type"]>) {
  return filter(DEFAULT_TOOLS, ["type", type]);
};

/**
 * Override default tools props
 * @param {Array} newProps - An array of objects as in the DEFAULT_TOOLS list, but with a subset of props
 * NOTE: prop "name" is mandatory
 */
const setDefaultToolsProps = function (newProps: Partial<ToolConfig>[]) {
  if (isArray(newProps)) {
    newProps.forEach(props => {
      if (!props.name) {
        console.error("newProps must have a name property");
        return;
      }

      let targetTool = DEFAULT_TOOLS[props.name];
      if (targetTool) {
        DEFAULT_TOOLS[props.name] = Object.assign(targetTool, props);
      } else {
        console.error(`${props.name} does not exist`);
      }
    });
  } else {
    console.error("newProps must be an array");
  }
};

/**
 * Register a custom tool
 * @param {String} toolName - The name of the tool
 * @param {Object} toolClass - The tool class
 * NOTE: toolName must be unique
 * NOTE: toolClass must be a valid cornerstone tool
 */

const registerExternalTool = function (toolName: string, toolClass: any) {
  if (dvTools[toolName] || DEFAULT_TOOLS[toolName]) {
    console.warn(`${toolName} already exists, it will be replaced`);
  }

  dvTools[toolClass.name] = toolClass;
  DEFAULT_TOOLS[toolName] = {
    name: toolName,
    class: toolClass.name,
    viewports: "all",
    configuration: {},
    options: { mouseButtonMask: 1 },
    defaultActive: false
  };
};

export {
  DEFAULT_TOOLS,
  DEFAULT_STYLE,
  DEFAULT_SETTINGS,
  DEFAULT_MOUSE_KEYS,
  dvTools,
  getDefaultToolsByType,
  setDefaultToolsProps,
  registerExternalTool
};
