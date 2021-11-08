/** @module imaging/tools/custom/edit_mask_tool
 *  @desc  This file provides functionalities for
 *         a custom mask cornestone tool
 */

// external libraries
import csTools from "cornerstone-tools";
const external = csTools.external;
const BaseBrushTool = csTools.importInternal("base/BaseBrushTool");
const segmentationUtils = csTools.importInternal("util/segmentationUtils");
const getCircle = segmentationUtils.getCircle;
const drawBrushPixels = segmentationUtils.drawBrushPixels;
const getModule = csTools.getModule;
const { configuration, setters } = getModule("segmentation");

/**
 * @public
 * @class BrushTool
 * @memberof Tools.Brush
 * @classdesc Tool for drawing segmentations on an image.
 * @extends Tools.Base.BaseBrushTool
 */
export class EditMaskTool extends BaseBrushTool {
  constructor(props = {}) {
    const defaultProps = {
      name: "EditMask",
      supportedInteractionTypes: ["Mouse"],
      configuration: {},
      mixins: ["renderBrushMixin"]
    };

    super(props, defaultProps);
    this.touchDragCallback = this._paint.bind(this);

    this._initializeTool(props.mask, props.initCallback);
  }

  _initializeTool(mask, callback) {
    let enabledElement = csTools.external.cornerstone
      .getEnabledElements()
      .filter(e => e.element.id == "axial")
      .pop();

    // TODO improve performances!

    console.time("...typedToNormal");
    let pixelsNormalArray = Array.prototype.slice.call(mask.data);
    console.timeEnd("...typedToNormal");

    console.time("...normalToTyped");
    let pixelData = Uint16Array.from(pixelsNormalArray);
    console.timeEnd("...normalToTyped");

    let labelmapIndex = 1;

    let segmentsOnLabelmapArray = new Array(mask.sizes[2]).fill([
      labelmapIndex
    ]);

    setters.labelmap3DForElement(
      enabledElement.element,
      pixelData.buffer,
      labelmapIndex,
      [],
      segmentsOnLabelmapArray,
      0
    );

    csTools.external.cornerstone.updateImage(enabledElement.element);

    if (callback) {
      callback();
    }
    // SIMPLE WAY --- AS FALLBACK :

    // labelmap3D.labelmaps2D = [];

    // for (let f = 0; f < 110; f++) {
    //   let pixels = mask.data.slice(f * 512 * 512, (f + 1) * 512 * 512);
    //   let pixelsNormalArray = Array.prototype.slice.call(pixels);
    //   // let pixelData = new Uint16Array();
    //   let pixelData = Uint16Array.from(pixelsNormalArray);
    //   labelmap3D.labelmaps2D.push({
    //     pixelData: pixelData,
    //     segmentsOnLabelmap: [labelmapIndex]
    //   });
    // }
  }

  activeCallback(element, options) {
    switch (options.force) {
      case "delete":
        this.configuration.alwaysEraseOnClick = true;
        break;
      case "add":
        this.preventCtrl();
        break;
      default:
        this.configuration.alwaysEraseOnClick = false;
    }
  }

  preventCtrl() {
    this.__proto__.__proto__._isCtrlDown = function () {
      return false;
    };
  }

  /**
   * Paints the data to the labelmap.
   *
   * @protected
   * @param  {Object} evt The data object associated with the event.
   * @returns {void}
   */
  _paint(evt) {
    const eventData = evt.detail;
    const { rows, columns } = eventData.image;
    const { x, y } = eventData.currentPoints.image;

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    const radius = configuration.radius;
    const pointerArray = getCircle(radius, rows, columns, x, y);

    const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;

    // Draw / Erase the active color.
    drawBrushPixels(
      pointerArray,
      labelmap2D.pixelData,
      labelmap3D.activeSegmentIndex,
      columns,
      shouldErase
    );

    external.cornerstone.updateImage(evt.detail.element);
  }
}
