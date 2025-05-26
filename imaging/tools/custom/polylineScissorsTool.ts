/** @module imaging/tools/custom/polygonScissorsTool
 *  @desc  This file provides functionalities for
 *         a custom polyline scissors cornestone tool
 */

// external libraries
import cornerstoneTools from "cornerstone-tools";
const BaseTool = cornerstoneTools.importInternal("base/BaseTool");
const { rectangleRoiCursor } = cornerstoneTools.importInternal("tools/cursors");

// internal libraries
import {
  fillInsideFreehand,
  fillOutsideFreehand,
  eraseOutsideFreehand,
  eraseInsideFreehand
} from "../strategies"; // cannot import strategies in other way 🤷
import polygonSegmentationMixin from "./polygonSegmentationMixin";

// Register custom mixin
cornerstoneTools.register(
  "mixin",
  "polygonSegmentationMixin",
  polygonSegmentationMixin
);

/**
 * @public
 * @class PolylineScissorsTool
 * @memberof Tools
 * @classdesc Tool for manipulating labelmap data by drawing a polyline polygon.
 * @extends Tools.Base.BaseTool
 */
export default class PolylineScissorsTool extends BaseTool {
  /** @inheritdoc */
  constructor(props = {}) {
    const defaultProps = {
      name: "PolylineScissors",
      strategies: {
        FILL_INSIDE: fillInsideFreehand,
        FILL_OUTSIDE: fillOutsideFreehand,
        ERASE_OUTSIDE: eraseOutsideFreehand,
        ERASE_INSIDE: eraseInsideFreehand
      },
      cursors: {
        FILL_INSIDE: rectangleRoiCursor,
        FILL_OUTSIDE: rectangleRoiCursor,
        ERASE_OUTSIDE: rectangleRoiCursor,
        ERASE_INSIDE: rectangleRoiCursor
      },
      defaultStrategy: "FILL_INSIDE",
      supportedInteractionTypes: ["Mouse", "Touch"],
      svgCursor: rectangleRoiCursor,
      mixins: ["polygonSegmentationMixin"]
    };

    super(props, defaultProps);
  }
}
