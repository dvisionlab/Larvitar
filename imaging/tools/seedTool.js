// external libraries
import csTools from "cornerstone-tools";
import { each, cloneDeep } from "lodash";

// internal libraries
import { remapVoxel } from "../image_utils";
import { addToolStateSingleSlice, setToolEnabled } from "../image_tools";
import { getSliceNumberFromImageId } from "../loaders/nrrdLoader";

// cornerstone tools imports
const BaseAnnotationTool = csTools.importInternal("base/BaseAnnotationTool");
// State
const getToolState = csTools.getToolState;
// Drawing
const getNewContext = csTools.importInternal("drawing/getNewContext");
const draw = csTools.importInternal("drawing/draw");
const drawTextBox = csTools.importInternal("drawing/drawTextBox");
const drawCircle = csTools.importInternal("drawing/drawCircle");
// Utilities
const getRGBPixels = csTools.importInternal("util/getRGBPixels");
const calculateSUV = csTools.importInternal("util/calculateSUV");
const probeCursor = csTools.importInternal("util/probeCursor");
const getLogger = csTools.importInternal("util/getLogger");
const throttle = csTools.importInternal("util/throttle");

const logger = getLogger("tools:annotation:ProbeTool");

// internal constants
const seedLabels = {
  segmentation_01: "Aorta",
  segmentation_02: "Aneurysm",
  segmentation_03: "Carrefour",
  regionGrowing: "regionGrowing"
};

/**
 * @public
 * @class SeedsTool
 * @memberof Tools.Annotation
 * @classdesc Tool which provides cohordinates of the picked poin
 * @extends Tools.Base.BaseAnnotationTool
 */
export class SeedsTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: "Seeds",
      supportedInteractionTypes: ["Mouse"],
      svgCursor: probeCursor
    };

    super(props, defaultProps);

    if (props.initialize) {
      this.initializeTool(props.preLoadSeeds, props.initViewport);
    }

    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
  }

  initializeTool(seeds, elementId) {
    let element = document.getElementById(elementId);

    each(seeds, seed => {
      let change = {
        visible: true,
        active: true,
        invalidated: true,
        color: seed.color,
        name: seed.tag,
        slice: seed.native_k,
        handles: {
          end: {
            x: seed.native_i,
            y: seed.native_j,
            highlight: true,
            active: true
          }
        }
      };

      let sliceNumber = seed.native_k;

      // add to master viewport
      addToolStateSingleSlice(element, this.name, change, sliceNumber);

      // sync remaining viewports
      this.syncViewports(elementId, change, sliceNumber);
    });

    csTools.external.cornerstone.updateImage(element);
  }

  createNewMeasurement(eventData) {
    if (eventData.event.srcElement.localName != "canvas") {
      return;
    }
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;

    if (!goodEventData) {
      logger.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );

      return;
    }

    // check if this unique seed already exist
    // TODO

    var res = {
      visible: true,
      active: true,
      invalidated: true,
      color: this.options.color,
      name: this.options.seed_name,
      slice: getSliceNumberFromImageId(
        eventData.image.imageId,
        eventData.element.id
      ),
      handles: {
        end: {
          x: eventData.currentPoints.image.x,
          y: eventData.currentPoints.image.y,
          highlight: true,
          active: true
        }
      },
      native_i: 0,
      native_j: 0,
      native_k: 0
    };

    let sliceNumber = getSliceNumberFromImageId(
      eventData.image.imageId,
      eventData.element.id
    );

    // store native coordinates
    this.storeNativeCoordinates(res, eventData.element.id, sliceNumber);

    // sync all the viewports
    this.syncViewports(eventData.element.id, res, sliceNumber);

    // optionally set data in store

    // set mode to "enabled"
    setToolEnabled(this.name);

    return res;
  }

  /**
   *
   *
   * @param {*} element
   * @param {*} data
   * @param {*} coords
   * @returns {Boolean}
   */
  pointNearTool(element, data, coords) {
    const hasEndHandle = data && data.handles && data.handles.end;
    const validParameters = hasEndHandle;

    if (!validParameters) {
      logger.warn(
        `invalid parameters supplied to tool ${this.name}'s pointNearTool`
      );
    }

    if (!validParameters || data.visible === false) {
      return false;
    }

    const probeCoords = csTools.external.cornerstone.pixelToCanvas(
      element,
      data.handles.end
    );

    return (
      csTools.external.cornerstoneMath.point.distance(probeCoords, coords) < 5
    );
  }

  updateCachedStats(image, element, data) {
    const x = Math.round(data.handles.end.x);
    const y = Math.round(data.handles.end.y);

    const stats = {};

    if (x >= 0 && y >= 0 && x < image.columns && y < image.rows) {
      stats.x = x;
      stats.y = y;

      if (image.color) {
        stats.storedPixels = getRGBPixels(element, x, y, 1, 1);
      } else {
        stats.storedPixels = csTools.external.cornerstone.getStoredPixels(
          element,
          x,
          y,
          1,
          1
        );
        stats.sp = stats.storedPixels[0];
        stats.mo = stats.sp * image.slope + image.intercept;
        stats.suv = calculateSUV(image, stats.sp);
        stats.color = data.color || this.options.color;
        stats.name = data.name || this.options.seed_name;
      }
    }

    data.cachedStats = stats;
    data.invalidated = false;
  }

  renderToolData(evt) {
    const eventData = evt.detail;
    const toolData = getToolState(evt.currentTarget, this.name);

    if (!toolData) {
      return;
    }

    // We have tool data for this element - iterate over each one and draw it
    const context = getNewContext(eventData.canvasContext.canvas);
    const { image, element } = eventData;

    for (let i = 0; i < toolData.data.length; i++) {
      const data = toolData.data[i];

      if (data.visible === false) {
        continue;
      }

      draw(context, context => {
        const center = data.handles.end;

        // Update textbox stats
        if (data.invalidated === true) {
          if (data.cachedStats) {
            this.throttledUpdateCachedStats(image, element, data);
          } else {
            this.updateCachedStats(image, element, data);
          }
        }

        const { x, y, color, name } = data.cachedStats;

        let text;

        if (x >= 0 && y >= 0 && x < image.columns && y < image.rows) {
          text = this.getLabelText(name);

          // Coords for text
          const coords = {
            // Translate the x/y away from the cursor
            x: data.handles.end.x + 3,
            y: data.handles.end.y - 3
          };
          const textCoords = csTools.external.cornerstone.pixelToCanvas(
            eventData.element,
            coords
          );

          drawTextBox(context, text, textCoords.x, textCoords.y, color);

          drawCircle(context, element, center, this.options.radius || 3, {
            color: color,
            fillStyle: color
          });
        }
      });
    }
  }

  getLabelText(name) {
    // let text = (text = ` ${name}`);
    let text = seedLabels[name];
    return text;
  }

  storeNativeCoordinates(input, inputViewportId, frame) {
    let native = remapVoxel(
      [
        Math.floor(input.handles.end.x),
        Math.floor(input.handles.end.y),
        parseInt(frame)
      ],
      inputViewportId,
      "axial"
    );
    input.native_i = native[0];
    input.native_j = native[1];
    input.native_k = native[2];
  }

  syncViewports(pickingViewportId, change, sliceNumber) {
    let enabledElements = csTools.external.cornerstone.getEnabledElements();
    var from = pickingViewportId;

    each(enabledElements, el => {
      if (el.element.id == pickingViewportId) {
        return;
      }

      let remapped = this.getRemappedChange(
        change,
        sliceNumber,
        from,
        el.element.id
      );

      addToolStateSingleSlice(
        el.element,
        this.name,
        remapped.change,
        remapped.sliceNumber
      );
      csTools.external.cornerstone.updateImage(el.element);
    });
  }

  getRemappedChange(input, frame, fromOrientation, toOrientation) {
    let ijk = remapVoxel(
      [
        Math.floor(input.handles.end.x),
        Math.floor(input.handles.end.y),
        parseInt(frame)
      ],
      fromOrientation,
      toOrientation
    );

    let output = cloneDeep(input);

    output.handles.end.x = ijk[0];
    output.handles.end.y = ijk[1];

    return {
      change: output,
      sliceNumber: ijk[2]
    };
  }
}
