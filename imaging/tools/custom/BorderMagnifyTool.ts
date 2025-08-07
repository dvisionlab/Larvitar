import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import { EventData } from "../types";
const MagnifyTool = cornerstoneTools.MagnifyTool;
const drawTextBox = cornerstoneTools.importInternal("drawing/drawTextBox");
const textStyle = cornerstoneTools.textStyle;
const toolColors = cornerstoneTools.toolColors;

export default class BorderMagnifyTool extends MagnifyTool {
  constructor(
    props: {
      showBorders?: boolean;
      showInfo?: boolean;
      borderColor?: string;
    } = {}
  ) {
    super(props);

    // Additional configuration options
    this.configuration.showBorders = props.showBorders || true; // Default to true
    this.configuration.showInfo = props.showInfo || true; // Default to true
    this.configuration.borderColor = props.borderColor; // Default border color is green
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }
  activeCallback(element: HTMLElement) {
    element.addEventListener("keydown", this.handleKeyDown);
  }
  disabledCallback(element: HTMLElement) {
    element.removeEventListener("keydown", this.handleKeyDown);
  }
  passiveCallback(element: HTMLElement) {
    element.removeEventListener("keydown", this.handleKeyDown);
  }
  /**
   * Event handler for the "keydown" event to toggle the visibility of borders and info on "B" key press.
   * @param {KeyboardEvent} event
   * @returns {void}
   */
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === "M" || event.key === "m") {
      // Toggle the visibility of borders
      this.configuration.showBorders = !this.configuration.showBorders;

      // Toggle the visibility of zoom/ROI info
      this.configuration.showInfo = !this.configuration.showInfo;

      // Redraw the magnification tool
      this._drawMagnificationTool();
    }
  }

  /**
   * Overrides the _drawMagnificationTool method to add configurable borders and display zoom/ROI dimensions.
   * @param {*} evt
   * @returns {void}
   */
  _drawMagnificationTool(evt?: { detail: EventData }) {
    // Call the parent method to draw the magnification tool
    super._drawMagnificationTool(evt);
    // Query for the magnify canvas using the correct class name
    const magnifyCanvas = evt
      ? (evt.detail.element.querySelector(".magnifyTool") as HTMLCanvasElement)
      : null;

    if (magnifyCanvas) {
      const context = magnifyCanvas.getContext("2d");

      // Check if the user wants to show borders
      if (this.configuration.showBorders && context) {
        // Add configurable borders
        context.strokeStyle =
          this.configuration.borderColor ||
          toolColors.getColorIfActive({ active: true });
        context.lineWidth = 4;
        context.strokeRect(0, 0, magnifyCanvas.width, magnifyCanvas.height);
      }

      // Check if the user wants to show info
      if (this.configuration.showInfo) {
        // Get the zoom level
        const viewport = cornerstone.getViewport(evt!.detail.element);
        const zoomLevel = viewport!.scale.toFixed(2); // Adjust the precision as needed

        // Get ROI dimensions
        const roiWidth = magnifyCanvas.width;
        const roiHeight = magnifyCanvas.height;
        const roiArea = (roiWidth * roiHeight).toFixed(2); // Area of the ROI

        // Display the zoom level and ROI dimensions
        //context.fillStyle = this.configuration.borderColor; // Adjust text color as needed
        //context.font = 'bold 14px Arial';
        //context.fillText(`Zoom: x${zoomLevel}`, 10, 20);
        //context.fillText(`ROI Area: ${roiWidth} x ${roiHeight} square pixels`, 10, 40);
        const text = `Zoom: x${zoomLevel}`;
        const str = `ROI: ${roiWidth}px x ${roiHeight}px`;
        const fontHeight = textStyle.getFontSize();
        const color =
          this.configuration.borderColor ||
          toolColors.getColorIfActive({ active: true });
        // Draw text 5px away from cursor
        const textCoords = {
          x: 5,
          y: 2
        };

        drawTextBox(
          context,
          str,
          textCoords.x,
          textCoords.y + fontHeight + 5,
          color
        );
        drawTextBox(context, text, textCoords.x, textCoords.y, color);
      }
    }
  }
}
