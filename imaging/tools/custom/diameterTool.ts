/** @module imaging/tools/custom/diameterTool
 *  @desc  This file provides functionalities for
 *         a custom diameter cornestone tool
 */

// external libraries
import csTools from "cornerstone-tools";
const BidirectionalTool = csTools.BidirectionalTool;
import { each } from "lodash";

// internal libraries
import { addToolStateSingleSlice } from "../../imageTools";
import { DiameterStateData, MeasurementMouseEvent } from "../types";

// Types
interface DiameterToolProps {
  name?: string;
  dataArray?: ToolDataItem[];
  seriesId?: string;
}

interface ToolDataItem {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  x4: number;
  y4: number;
  value_max: number;
  value_min: number;
  slice: number;
}

interface ToolHandle {
  x: number;
  y: number;
  index: number | null;
  drawnIndependently: boolean;
  allowedOutsideImage: boolean;
  highlight: boolean;
  active: boolean;
  locked?: boolean;
  hasMoved?: boolean;
  movesIndependently?: boolean;
  hasBoundingBox?: boolean;
  boundingBox?: {
    width: number;
    height: number;
    left: number;
    top: number;
  };
}

interface ToolData {
  toolType: string;
  name: string;
  isCreating: boolean;
  visible: boolean;
  active: boolean;
  invalidated: boolean;
  handles: {
    start: ToolHandle;
    end: ToolHandle;
    perpendicularStart: ToolHandle;
    perpendicularEnd: ToolHandle;
    textBox: ToolHandle;
  };
  longestDiameter: string;
  shortestDiameter: string;
}

interface MeasurementEvent extends Event {
  detail: {
    measurementData: ToolData;
  };
  element: HTMLElement;
}

/**
 * @public
 * @class DiameterTool
 * @memberof Tools.Annotation
 * @classdesc Create and position an annotation that measures the
 * length and width of a region.
 * @extends Tools.Base.BaseAnnotationTool
 */
export class DiameterTool extends BidirectionalTool {
  name: string;
  isBeenModified: boolean;
  lastData: ToolData | null;

  constructor(props: DiameterToolProps) {
    const defaultProps = {
      name: "Diameter",
      isBeenModified: false,
      lastData: null
    };

    super(props, defaultProps);

    this.name = "Diameter";
    this.isBeenModified = false;
    this.lastData = null;

    if (props.dataArray && props.seriesId) {
      this.initializeTool(props.dataArray, "cmprAxial", props.seriesId);
    }
  }

  initializeTool(
    dataArray: ToolDataItem[],
    elementId: string,
    seriesId: string
  ): void {
    let element = document.getElementById(elementId);

    if (!element) {
      console.error(`Element with ID ${elementId} not found`);
      return;
    }

    each(dataArray, singleData => {
      let data: Partial<DiameterStateData> = {
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
            index: undefined,
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

  passiveCallback(element: HTMLElement) {
    element.addEventListener(
      "cornerstonetoolsmeasurementmodified",
      this.measureOnGoingCallback.bind(this) as EventListener
    );
  }

  measureOnGoingCallback(event: MeasurementEvent) {
    if (!this.isBeenModified) {
      const self = this;
      event.target!.addEventListener(
        "mouseup",
        self.__proto__.measureEndCallback
      );
    }
    this.isBeenModified = true;
    this.lastData = event.detail.measurementData;
  }

  measureEndCallback(event: MeasurementEvent) {
    event.element.removeEventListener(
      "mouseup",
      this.measureEndCallback as EventListener
    );
    this.isBeenModified = false;
    this.lastData = null;
  }
}
