// import cornerstoneTools from "cornerstone-tools";
const cornerstoneTools = larvitar.cornerstoneTools;
const external = cornerstoneTools.external;
const BaseTool = cornerstoneTools.importInternal("base/BaseTool");
const textStyle = cornerstoneTools.textStyle;
const toolColors = cornerstoneTools.toolColors;
const getRGBPixels = cornerstoneTools.importInternal("util/getRGBPixels");
const calculateSUV = cornerstoneTools.importInternal("util/calculateSUV");
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const draw = cornerstoneTools.importInternal("drawing/draw");
const setShadow = cornerstoneTools.importInternal("drawing/setShadow");
const drawCircle = cornerstoneTools.importInternal("drawing/drawCircle");
const drawTextBox = cornerstoneTools.importInternal("drawing/drawTextBox");
const textBoxWidth = cornerstoneTools.importInternal("drawing/textBoxWidth");
const { probeCursor } = cornerstoneTools.importInternal("tools/cursors");

/**
 * @public
 * @class DragProbeTool
 * @memberof Tools
 *
 * @classdesc Tool which provides a probe of the image data at the
 * input position on drag.
 * @extends Tools.Base.BaseTool
 */
class PanTool extends BaseTool {
  constructor(props = {}) {
    const defaultProps = {
      name: "Pan",
      supportedInteractionTypes: ["Mouse", "Touch"],
      svgCursor: probeCursor
    };

    super(props, defaultProps);

    this.touchDragCallback = this._movingEventCallback.bind(this);
    this.touchEndCallback = this._endMovingEventCallback.bind(this);

    this.mouseDragCallback = this._movingEventCallback.bind(this);
    this.mouseUpCallback = this._endMovingEventCallback.bind(this);

    this.dragEventData = {};
  }

  _movingEventCallback(evt) {
    const eventData = evt.detail;
    const { element } = eventData;

    this.dragEventData = eventData;
    external.cornerstone.updateImage(element);
  }

  _endMovingEventCallback(evt) {
    const eventData = evt.detail;
    const { element } = eventData;

    this.dragEventData = {};
    external.cornerstone.updateImage(element);
  }

  renderToolData(evt) {
    if (!this.dragEventData.currentPoints) {
      return;
    }

    if (
      evt &&
      evt.detail &&
      Boolean(Object.keys(this.dragEventData.currentPoints).length)
    ) {
      evt.detail.currentPoints = this.dragEventData.currentPoints;
      const config = this.configuration;
      const cornerstone = external.cornerstone;
      const eventData = evt.detail;
      const { element, image, currentPoints, canvasContext } = eventData;

      const context = getNewContext(canvasContext.canvas);

      const color = toolColors.getActiveColor();
      const fontHeight = textStyle.getFontSize();

      const x = Math.round(currentPoints.image.x);
      const y = Math.round(currentPoints.image.y);

      if (x < 0 || y < 0 || x >= image.columns || y >= image.rows) {
        return;
      }

      draw(context, context => {
        setShadow(context, config);

        const text = `${x}, ${y}`;
        let storedPixels;
        let str = "Test Test";

        // Draw text 5px away from cursor
        const textCoords = {
          x: currentPoints.canvas.x + 5,
          y: currentPoints.canvas.y - 5
        };

        drawTextBox(
          context,
          str,
          textCoords.x,
          textCoords.y + fontHeight + 5,
          color
        );
        drawTextBox(context, text, textCoords.x, textCoords.y, color);
      });
    }
  }
}
