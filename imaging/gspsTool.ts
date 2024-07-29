import * as larvitar from "larvitar";

const cornerstoneTools = larvitar.cornerstoneTools;
const external = cornerstoneTools.external;
const BaseTool = cornerstoneTools.importInternal("base/BaseTool");
const { wwwcCursor } = cornerstoneTools.importInternal("tools/cursors");

/**
 * @public
 * @class WwwcManualTool
 * @memberof Tools
 *
 * @classdesc Tool for setting wwwc by dragging with mouse/touch.
 * @extends Tools.Base.BaseTool
 */
export default class WwwlTool extends BaseTool {
  public name: string;
  public configuration: any = {};

  constructor(props: any = {}) {
    const defaultProps = {
      name: "Wwwl",
      strategies: { basicLevelingStrategy },
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        orientation: 0
      },
      svgCursor: wwwcCursor
    };

    super(props, defaultProps);
    this.configuration = super.configuration;
    this.name = defaultProps.name;
  }

  mouseDragCallback(evt: any) {
    super.applyActiveStrategy(evt);
    external.cornerstone.setViewport(evt.detail.element, evt.detail.viewport);
  }

  touchDragCallback(evt: any) {
    // Prevent CornerstoneToolsTouchStartActive from killing any press events
    evt.stopImmediatePropagation();
    super.applyActiveStrategy(evt);
    external.cornerstone.setViewport(evt.detail.element, evt.detail.viewport);
  }
}

/**
 * Here we normalize the ww/wc adjustments so the same number of on screen pixels
 * adjusts the same percentage of the dynamic range of the image.  This is needed to
 * provide consistency for the ww/wc tool regardless of the dynamic range (e.g. an 8 bit
 * image will feel the same as a 16 bit image would)
 *
 * @param {CustomEvent<EventData>} evt
 * @returns {void}
 */
function basicLevelingStrategy(this: WwwlTool, evt: any) {
  const { orientation } = this.configuration;
  const eventData = evt.detail;
  const viewport = larvitar.cornerstone.getViewport(eventData.element);

  const maxVOI =
    eventData.image.maxPixelValue * eventData.image.slope +
    eventData.image.intercept;
  const minVOI =
    eventData.image.minPixelValue * eventData.image.slope +
    eventData.image.intercept;
  const imageDynamicRange = maxVOI - minVOI;
  const multiplierX = imageDynamicRange / 1024;
  const multiplierY = -imageDynamicRange / 1024;
  const deltaX = eventData.deltaPoints!.page.x * multiplierX;
  const deltaY = eventData.deltaPoints!.page.y * multiplierY;

  if (orientation === 0) {
    eventData.viewport.voi.windowWidth += deltaX;
    eventData.viewport.voi.windowCenter += deltaY;
  } else {
    eventData.viewport.voi.windowWidth += deltaY;
    eventData.viewport.voi.windowCenter += deltaX;
  }

  // Ensure windowWidth is always >= 1
  eventData.viewport.voi.windowWidth = Math.max(
    1.0,
    eventData.viewport.voi.windowWidth
  );

  // Unset any existing VOI LUT
  eventData.viewport.voiLUT = undefined;
}
