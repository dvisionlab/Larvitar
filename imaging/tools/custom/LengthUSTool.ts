// external libraries
import cornerstoneTools from "cornerstone-tools";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
const getToolState = cornerstoneTools.getToolState;
const toolColors = cornerstoneTools.toolColors;
const draw = cornerstoneTools.importInternal("drawing/draw");
const drawLine = cornerstoneTools.importInternal("drawing/drawLine");
const setShadow = cornerstoneTools.importInternal("drawing/setShadow");
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const drawHandles = cornerstoneTools.importInternal("drawing/drawHandles");
const { lengthCursor } = cornerstoneTools.importInternal("tools/cursors");
const throttle = cornerstoneTools.importInternal("util/throttle");
const getModule = cornerstoneTools.getModule;
const getPixelSpacing = cornerstoneTools.importInternal("util/getPixelSpacing");
const lineSegDistance = cornerstoneTools.importInternal("util/lineSegDistance");
const BaseAnnotationTool = cornerstoneTools.importInternal(
  "base/BaseAnnotationTool"
);
const toolStyle = cornerstoneTools.toolStyle;
const drawLinkedTextBox = cornerstoneTools.importInternal(
  "drawing/drawLinkedTextBox"
);

//internal imports
import {
  MeasurementData,
  Handles,
  MeasurementMouseEvent,
  Coords,
  EventData
} from "../types";

import { LarvitarManager, Series, StoreViewport } from "../../types";
import store from "../../imageStore";
import { getLarvitarImageTracker } from "../../loaders/commonLoader";
import { getLarvitarManager } from "../../loaders/commonLoader";
/*
/**
 *
 * @public
 * @class LengthTool
 * @memberof Tools.Annotation
 * @classdesc Tool for measuring distances.
 * @extends Tools.Base.BaseAnnotationTool
 */
export default class LengthTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: "Length",
      supportedInteractionTypes: ["Mouse", "Touch"],
      svgCursor: lengthCursor,
      configuration: {
        drawHandles: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        renderDashed: false,
        digits: 2
      }
    };

    super(props, defaultProps);
    this.modality = null;

    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
  }

  createNewMeasurement(eventData: EventData) {
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;
    const viewport: StoreViewport = store.get(["viewports", this.element.id]);
    if (viewport.modality) {
      this.modality = viewport.modality;
    }

    if (!goodEventData) {
      console.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );

      return;
    }

    const { x, y } = eventData.currentPoints.image;

    return {
      visible: true,
      active: true,
      color: undefined,
      invalidated: true,
      handles: {
        start: {
          x,
          y,
          highlight: true,
          active: false
        },
        end: {
          x,
          y,
          highlight: true,
          active: true
        },
        textBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true
        }
      }
    };
  }

  /**
   *
   *
   * @param {*} element
   * @param {*} data
   * @param {*} coords
   * @returns {Boolean}
   */
  pointNearTool(element: Element, data: MeasurementData, coords: Coords) {
    const hasStartAndEndHandles =
      data && data.handles && data.handles.start && data.handles.end;
    const validParameters = hasStartAndEndHandles;

    if (!validParameters) {
      console.warn(
        `invalid parameters supplied to tool ${this.name}'s pointNearTool`
      );

      return false;
    }

    if (data.visible === false) {
      return false;
    }

    return (
      lineSegDistance(element, data.handles.start, data.handles.end, coords) <
      25
    );
  }

  updateCachedStats(
    image: cornerstone.Image,
    element: Element,
    data: MeasurementData
  ) {
    let { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);
    if (this.modality === "US") {
      colPixelSpacing = image.columnPixelSpacing;
      rowPixelSpacing = image.rowPixelSpacing;
    }
    if (rowPixelSpacing === undefined || colPixelSpacing === undefined) {
      let parsedImageId = cornerstoneDICOMImageLoader.wadouri.parseImageId(
        image.imageId
      );
      let rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
      let imageTracker = getLarvitarImageTracker();
      let seriesId = imageTracker[rootImageId];
      let manager = getLarvitarManager() as LarvitarManager;
      if (manager && seriesId) {
        let series = manager[seriesId] as Series;
        rowPixelSpacing =
          series.instances[image.imageId].metadata.pixelSpacing![0];
        colPixelSpacing =
          series.instances[image.imageId].metadata.pixelSpacing![1];
      }
    }
    // Set rowPixelSpacing and columnPixelSpacing to 1 if they are undefined (or zero)
    const dx =
      (data.handles.end!.x - data.handles.start!.x) * (colPixelSpacing || 1);
    const dy =
      (data.handles.end!.y - data.handles.start!.y) * (rowPixelSpacing || 1);

    // Calculate the length, and create the text variable with the millimeters or pixels suffix
    const length = Math.sqrt(dx * dx + dy * dy);

    // Store the length inside the tool for outside access
    data.length = length;
    data.invalidated = false;
  }

  renderToolData(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    const {
      handleRadius,
      drawHandlesOnHover,
      hideHandlesIfMoving,
      renderDashed,
      digits
    } = this.configuration;
    const toolData = getToolState(evt.currentTarget, this.name);

    if (!toolData) {
      return;
    }

    // We have tool data for this element - iterate over each one and draw it
    const context: CanvasRenderingContext2D = getNewContext(
      eventData.canvasContext.canvas
    );
    const { image, element } = eventData;
    let {
      rowPixelSpacing,
      colPixelSpacing
    }: { rowPixelSpacing: number; colPixelSpacing: number } =
      getPixelSpacing(image);
    if (this.modality === "US") {
      colPixelSpacing = image.columnPixelSpacing;
      rowPixelSpacing = image.rowPixelSpacing;
    }

    if (rowPixelSpacing === undefined || colPixelSpacing === undefined) {
      let parsedImageId = cornerstoneDICOMImageLoader.wadouri.parseImageId(
        eventData.image.imageId
      );
      let rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
      let imageTracker = getLarvitarImageTracker();
      let seriesId = imageTracker[rootImageId];
      let manager = getLarvitarManager() as LarvitarManager;
      if (manager && seriesId) {
        let series = manager[seriesId] as Series;
        rowPixelSpacing =
          series.instances[eventData.image.imageId].metadata.pixelSpacing![0];
        colPixelSpacing =
          series.instances[eventData.image.imageId].metadata.pixelSpacing![1];
      }
    }

    const lineWidth: number = toolStyle.getToolWidth();
    const lineDash: boolean = getModule("globalConfiguration").configuration
      .lineDash;

    for (let i = 0; i < toolData.data.length; i++) {
      const data: MeasurementData = toolData.data[i];

      if (data.visible === false) {
        continue;
      }

      draw(context, (context: CanvasRenderingContext2D) => {
        // Configurable shadow
        setShadow(context, this.configuration);

        const color: string = toolColors.getColorIfActive(data);

        const lineOptions: {
          color: string;
          lineDash?: boolean;
          lineWidth?: number;
        } = { color };

        if (renderDashed) {
          lineOptions.lineDash = lineDash;
        }

        // Draw the measurement line
        drawLine(
          context,
          element,
          data.handles.start,
          data.handles.end,
          lineOptions
        );

        // Draw the handles
        const handleOptions = {
          color,
          handleRadius,
          drawHandlesIfActive: drawHandlesOnHover,
          hideHandlesIfMoving
        };

        if (this.configuration.drawHandles) {
          drawHandles(context, eventData, data.handles, handleOptions);
        }

        if (!data.handles.textBox!.hasMoved) {
          const coords: { x: number; y?: number } = {
            x: Math.max(data.handles.start!.x, data.handles.end!.x)
          };

          // Depending on which handle has the largest x-value,
          // Set the y-value for the text box
          if (coords.x === data.handles.start!.x) {
            coords.y = data.handles.start!.y;
          } else {
            coords.y = data.handles.end!.y;
          }

          data.handles.textBox!.x = coords.x;
          data.handles.textBox!.y = coords.y;
        }

        // Move the textbox slightly to the right and upwards
        // So that it sits beside the length tool handle
        const xOffset = 10;

        // Update textbox stats
        if (data.invalidated === true) {
          if (data.length) {
            this.throttledUpdateCachedStats(image, element, data);
          } else {
            this.updateCachedStats(image, element, data);
          }
        }

        const text = textBoxText(data, rowPixelSpacing, colPixelSpacing);

        drawLinkedTextBox(
          context,
          element,
          data.handles.textBox,
          text,
          data.handles,
          textBoxAnchorPoints,
          color,
          lineWidth,
          xOffset,
          true
        );
      });
    }

    // - SideEffect: Updates annotation 'suffix'
    function textBoxText(
      annotation: MeasurementData,
      rowPixelSpacing: number,
      colPixelSpacing: number
    ) {
      const measuredValue = _sanitizeMeasuredValue(annotation.length!);

      // Measured value is not defined, return empty string
      if (!measuredValue) {
        return "";
      }

      // Set the length text suffix depending on whether or not pixelSpacing is available
      let suffix = "mm";
      if (
        rowPixelSpacing === undefined ||
        rowPixelSpacing === 0 ||
        rowPixelSpacing === 1 ||
        colPixelSpacing === undefined ||
        colPixelSpacing === 0 ||
        colPixelSpacing === 1
      ) {
        suffix = "pixels";
      }

      annotation.unit = suffix;

      return `${measuredValue.toFixed(digits)} ${suffix}`;
    }

    function textBoxAnchorPoints(handles: Handles): Coords[] {
      const midpoint: Coords = {
        x: (handles.start!.x + handles.end!.x) / 2,
        y: (handles.start!.y + handles.end!.y) / 2
      };

      return [handles.start!, midpoint, handles.end!];
    }
  }
}

/**
 * Attempts to sanitize a value by casting as a number; if unable to cast,
 * we return `undefined`
 *
 * @param {*} value
 * @returns a number or undefined
 */
function _sanitizeMeasuredValue(value: number) {
  const parsedValue = Number(value);
  const isNumber = !isNaN(parsedValue);

  return isNumber ? parsedValue : undefined;
}
