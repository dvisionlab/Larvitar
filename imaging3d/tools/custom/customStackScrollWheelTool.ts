import {
  getEnabledElement,
  BaseVolumeViewport,
  utilities
} from "@cornerstonejs/core";
import { BaseTool } from "@cornerstonejs/tools";
import {
  EventTypes,
  PublicToolProps,
  ToolProps
} from "@cornerstonejs/tools/dist/esm/types";
/**
 * The StackScrollWheelTool allows users to scroll through a stack of images using the mouse wheel
 */
class CustomStackScrollWheelTool extends BaseTool {
  static toolName = "CustomStackScrollWheel";

  constructor(
    toolProps: PublicToolProps = {},
    defaultToolProps: ToolProps = {
      supportedInteractionTypes: ["Mouse"],
      configuration: {
        invert: false,
        debounceIfNotLoaded: true,
        loop: false,
        scrollSlabs: false
      }
    }
  ) {
    super(toolProps, defaultToolProps);
  }

  mouseWheelCallback(evt: EventTypes.MouseWheelEventType) {
    this._scroll(evt);
  }

  /**
   * Handles mouse wheel scrolling through the stack
   */
  _scroll(evt: EventTypes.MouseWheelEventType): void {
    const { wheel, element } = evt.detail;
    const { direction } = wheel;
    const { invert, debounceIfNotLoaded, loop, scrollSlabs } =
      this.configuration;
    const { viewport } = getEnabledElement(element)!;

    const delta = direction * (invert ? -1 : 1);

    utilities.scroll(viewport, {
      delta,
      debounceLoading: debounceIfNotLoaded,
      loop: loop,
      volumeId:
        viewport instanceof BaseVolumeViewport
          ? viewport.getVolumeId()
          : undefined,
      scrollSlabs: scrollSlabs
    });
  }
}

CustomStackScrollWheelTool.toolName = "CustomStackScrollWheel";
export default CustomStackScrollWheelTool;
