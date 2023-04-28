export type ToolConfig = {
  name: string;
  viewports: string | string[];
  configuration: Object;
  options: Object;
  class: string;
  sync?: string;
  cleanable?: boolean;
  defaultActive?: boolean;
  shortcut?: string;
  type?: "utils" | "annotation" | "segmentation" | "overlay";
  description?: string;
};

export type ToolStyle = {
  width: number;
  color: string; // "#00FF00"
  activeColor: string; // "#00FF00"
  fillColor: string; // "#00FF00"
  fontFamily: string; // "Arial"
  fontSize: number;
  backgroundColor: string; // "rgba(1,1,1,0.7)"
};

export type ToolSettings = {
  mouseEnabled: boolean;
  touchEnabled: boolean;
  showSVGCursors: boolean;
  globalToolSyncEnabled: boolean;
  autoResizeViewports: boolean;
  lineDash: [number, number];
};

export type ToolMouseKeys = {
  debug: boolean;
  mouse_button_left: {
    shift: string;
    ctrl: string;
    default: string;
  };
  mouse_button_right: {
    shift: string;
    ctrl: string;
    default: string;
  };
  keyboard_shortcuts: {
    // alt key + letter
    // key in the form "KEY_A"
    [key: string]: string;
  };
};

export type ToolState = {
  [imageId: string]: {
    [toolName: string]: {
      data: any; // TODO-ts define
    };
  };
};
