const cornerstone = larvitar.cornerstone;
const cornerstoneTools = larvitar.cornerstoneTools;
const MagnifyTool = cornerstoneTools.MagnifyTool;

class MyMagnifyTool extends MagnifyTool {
  constructor(props = {}) {
    super(props);

    // Additional configuration options
    this.configuration.showBorders = props.showBorders !== undefined ? props.showBorders : true; // Default to true
    this.configuration.showInfo = props.showInfo !== undefined ? props.showInfo : true; // Default to true
    this.configuration.borderColor = props.borderColor || 'green'; // Default border color is green


    // Add global keydown event listener
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Event handler for the "keydown" event to toggle the visibility of borders and info on "B" key press.
   * @param {KeyboardEvent} event
   * @returns {void}
   */
  handleKeyDown(event) {
    if (event.key === 'B' || event.key === 'b') {
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
  _drawMagnificationTool(evt) {
    // Call the parent method to draw the magnification tool
    super._drawMagnificationTool(evt);

    // Query for the magnify canvas using the correct class name
    const magnifyCanvas = evt ? evt.detail.element.querySelector('.magnifyTool') : null;

    if (magnifyCanvas) {
      const context = magnifyCanvas.getContext('2d');

      // Check if the user wants to show borders
      if (this.configuration.showBorders) {
        // Add configurable borders
        context.strokeStyle = this.configuration.borderColor;
        context.lineWidth = 4;
        context.strokeRect(0, 0, magnifyCanvas.width, magnifyCanvas.height);
      }

      // Check if the user wants to show info
      if (this.configuration.showInfo) {
        // Get the zoom level
        const viewport = cornerstone.getViewport(evt.detail.element);
        const zoomLevel = viewport.scale.toFixed(2); // Adjust the precision as needed

        // Get ROI dimensions
        const roiWidth = magnifyCanvas.width;
        const roiHeight = magnifyCanvas.height;
        const roiArea = (roiWidth * roiHeight).toFixed(2); // Area of the ROI

        // Display the zoom level and ROI dimensions
        context.fillStyle = this.configuration.borderColor; // Adjust text color as needed
        context.font = '14px Arial';
        context.fillText(`Zoom: x${zoomLevel}`, 10, 20);
        context.fillText(`ROI Area: ${roiWidth} x ${roiHeight} square pixels`, 10, 40);
      }
    }
  }
}