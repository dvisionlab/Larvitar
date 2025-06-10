import {
  utilities,
  VolumeViewport,
  getEnabledElementByIds,
  StackViewport
} from "@cornerstonejs/core";
import { BaseTool } from "@cornerstonejs/tools";
import {
  EventTypes,
  PublicToolProps,
  ToolProps
} from "@cornerstonejs/tools/dist/esm/types";

/**
 * The StackScrollDragTool allows users to scroll through a stack of images by dragging with mouse or touch
 */
class CustomStackScrollDragTool extends BaseTool {
  static toolName = "CustomStackScrollDrag";
  deltaY: number;

  constructor(
    toolProps: PublicToolProps = {},
    defaultToolProps: ToolProps = {
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        invert: false,
        debounceIfNotLoaded: true,
        loop: false
      }
    }
  ) {
    super(toolProps, defaultToolProps);
    this.deltaY = 1;
  }

  mouseDragCallback(evt: EventTypes.InteractionEventType) {
    this._dragCallback(evt);
  }

  touchDragCallback(evt: EventTypes.InteractionEventType) {
    this._dragCallback(evt);
  }

  _dragCallback(evt: EventTypes.InteractionEventType) {
    this._scrollDrag(evt);
  }

  _scrollDrag(evt: EventTypes.InteractionEventType) {
    const { deltaPoints, viewportId, renderingEngineId } = evt.detail;
    const { viewport } = getEnabledElementByIds(viewportId, renderingEngineId);
    const { debounceIfNotLoaded, invert, loop } = this.configuration;

    const deltaPointY = deltaPoints.canvas[1];
    let volumeId;

    if (viewport instanceof VolumeViewport) {
      volumeId = viewport.getVolumeId();
    }

    const pixelsPerImage = this._getPixelPerImage(viewport);
    const deltaY = deltaPointY + this.deltaY;

    if (!pixelsPerImage) {
      return;
    }

    if (Math.abs(deltaY) >= pixelsPerImage) {
      const imageIdIndexOffset = Math.round(deltaY / pixelsPerImage);

      utilities.scroll(viewport, {
        delta: invert ? -imageIdIndexOffset : imageIdIndexOffset,
        volumeId,
        debounceLoading: debounceIfNotLoaded,
        loop: loop
      });

      this.deltaY = deltaY % pixelsPerImage;
    } else {
      this.deltaY = deltaY;
    }
  }

  _getPixelPerImage(viewport: VolumeViewport | StackViewport) {
    const { element } = viewport;
    const numberOfSlices = viewport.getNumberOfSlices();
    // The Math.max here makes it easier to mouseDrag-scroll small or really large image stacks
    return Math.max(2, element.offsetHeight / Math.max(numberOfSlices, 8));
  }
}

CustomStackScrollDragTool.toolName = "CustomStackScrollDrag";
export default CustomStackScrollDragTool;
