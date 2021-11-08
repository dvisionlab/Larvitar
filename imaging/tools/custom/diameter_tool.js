/** @module imaging/tools/custom/diameter_tool
 *  @desc  This file provides functionalities for
 *         a custom diameter cornestone tool
 */

// external libraries
import csTools from "cornerstone-tools";
const BidirectionalTool = csTools.BidirectionalTool;
import { each } from "lodash";

// internal libraries
import { addToolStateSingleSlice } from "../../image_tools";

/**
 * @public
 * @class DiameterTool
 * @memberof Tools.Annotation
 * @classdesc Create and position an annotation that measures the
 * length and width of a region.
 * @extends Tools.Base.BaseAnnotationTool
 */

export class DiameterTool extends BidirectionalTool {
  constructor(props) {
    const defaultProps = {
      name: "Diameter",
      isBeenModified: false,
      lastData: null
    };

    super(props, defaultProps);

    this.name = "Diameter";

    this.initializeTool(props.dataArray, "cmprAxial", props.seriesId);
  }

  initializeTool(dataArray, elementId, seriesId) {
    let element = document.getElementById(elementId);

    each(dataArray, singleData => {
      let data = {
        toolType: "Diameter",
        name: singleData.id.toString(),
        isCreating: true,
        visible: true,
        active: false,
        invalidated: false,
        handles: {
          start: {
            x: singleData.x1,
            y: singleData.y1,
            index: 0,
            drawnIndependently: false,
            allowedOutsideImage: false,
            highlight: true,
            active: false
          },
          end: {
            x: singleData.x2,
            y: singleData.y2,
            index: 1,
            drawnIndependently: false,
            allowedOutsideImage: false,
            highlight: true,
            active: false
          },
          perpendicularStart: {
            x: singleData.x3,
            y: singleData.y3,
            index: 2,
            drawnIndependently: false,
            allowedOutsideImage: false,
            highlight: true,
            active: false,
            locked: false
          },
          perpendicularEnd: {
            x: singleData.x4,
            y: singleData.y4,
            index: 3,
            drawnIndependently: false,
            allowedOutsideImage: false,
            highlight: true,
            active: false
          },
          textBox: {
            x: singleData.value_max,
            y: singleData.value_min,
            index: null,
            drawnIndependently: true,
            allowedOutsideImage: true,
            highlight: false,
            active: false,
            hasMoved: true,
            movesIndependently: false,
            hasBoundingBox: true,
            boundingBox: {
              width: 59.6484375,
              height: 47,
              left: 165.02487562189057,
              top: 240.53482587064684
            }
          }
        },
        longestDiameter: singleData.value_max.toString(),
        shortestDiameter: singleData.value_min.toString()
      };

      let sliceNumber = singleData.slice;

      // add to master viewport
      addToolStateSingleSlice(element, this.name, data, sliceNumber, seriesId);
    });

    csTools.external.cornerstone.updateImage(element);
  }

  passiveCallback(element) {
    element.addEventListener(
      "cornerstonetoolsmeasurementmodified",
      this.measureOnGoingCallback
    );
  }

  measureOnGoingCallback(event) {
    if (!this.isBeenModified) {
      event.target.addEventListener("mouseup", function (evt) {
        this.__proto__.measureEndCallback(evt);
      });
    }
    this.isBeenModified = true;
    this.lastData = event.detail.measurementData;
  }

  measureEndCallback(event) {
    event.element.removeEventListener("mouseup", this.measureEndCallback);
    this.isBeenModified = false;
    this.lastData = null;
  }
}
