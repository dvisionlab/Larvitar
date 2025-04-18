/** @module tools/custom/customMouseWheelScrollTool
 *  @desc This file provides functionalities for
 *        custom DICOM Loader
 */

// external libraries
import { Image } from "cornerstone-core";
import cornerstone from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
const BaseTool = cornerstoneTools.importInternal("base/BaseTool");
const getToolState = cornerstoneTools.getToolState;

// internal libraries
import { logger } from "../../../logger";
import store, { set as setStore } from "../../imageStore";
import { DEFAULT_TOOLS } from "../default";
import { StoreViewport } from "../../types";
import scrollToIndex from "./utils/customMouseWheelScrollToolUtils/customMouseWheelUtils";
import { getImageManager, getImageTracker } from "../../imageManagers";
import { ImageManager, Series } from "../../types";
import { getActiveLayer, setActiveLayer } from "../../imageLayers";

// global variables
type StackData = {
  currentImageIdIndex: number;
  imageIds: string[];
  pending: any[];
};

type ToolEventDetail = {
  element: HTMLElement;
  image: Image;
  direction: number;
  detail: {
    shiftKey: boolean;
    altKey: boolean;
    ctrlKey: boolean;
  };
};

/*
 * @class CustomMouseWheelScrollTool
 * @extends BaseTool
 * @memberof Tools
 *
 * @classdesc Tool for scrolling through images using the mouse wheel
 * @private
 */
export default class CustomMouseWheelScrollTool extends BaseTool {
  currentMode: string;
  framesNumber: number;
  slicesnumber: number;
  is4D: boolean;
  isMultiframe: boolean;
  /*
   * @constructs CustomMouseWheelScrollTool
   * @param {object} props - Any properties passed to the component
   */
  constructor(props = {}) {
    const defaultProps = {
      name: "CustomMouseWheelScroll",
      supportedInteractionTypes: ["MouseWheel"], //"Key"
      configuration: {
        loop: false,
        allowSkipping: true,
        invert: false,
        fixedFrame: 1,
        fixedSlice: 0,
        currentMode: "stack", // 'stack' or 'slice'
        framesNumber: 1
      }
    };

    super(props, defaultProps);
    this.currentMode = "stack";
    this.framesNumber = this.configuration.framesNumber;
    this.slicesnumber = 0;
    this.is4D = false;
    this.isMultiframe = false;
    this.animation = false;
    this.animationId = null;
  }

  /*
   * @verify4D
   * @desc Verify if the image is 4D or not
   */
  verify4D() {
    const viewport: StoreViewport = store.get(["viewports", this.element.id]);

    // check is4D and multiframe
    this.is4D = viewport.isTimeserie;
    this.isMultiframe = viewport.isMultiframe;

    // extract frames number
    if (this.is4D === true) {
      this.configuration.framesNumber = viewport.numberOfTemporalPositions;
    } else if (this.isMultiframe === true) {
      this.configuration.framesNumber = viewport.numberOfFrames;
      this.currentMode = "slice";
      this.configuration.currentMode = "slice";
    } else {
      this.configuration.framesNumber = 1;
    }
    this.framesNumber = this.configuration.framesNumber;
  }

  handleToggle(newcurrentMode: string) {
    // Toggle mode between 'stack' and 'slice' on Tab key press or other events
    this.verify4D();
    if (this.is4D === false) {
      this.currentMode = this.isMultiframe ? "slice" : "stack";
      this.configuration.currentMode = this.isMultiframe ? "slice" : "stack";
    } else if (this.is4D === true) {
      if (this.currentMode != newcurrentMode) {
        this.toggleScrollMode(this.element);
      }
    }
  }

  /*
   * @method toggleScrollMode
   * @param {element} HTMLElement
   * @desc Handle the toggle between 'stack' and 'slice' modes
   * we enter in this function only if this.is4d===true so this.framesNumber!=0
   */

  toggleScrollMode(element: HTMLElement) {
    if (!element) {
      logger.error("Element is undefined");
      return;
    }
    const toolData = getToolState(element, "stack");
    if (!toolData || !toolData.data || !toolData.data.length) {
      logger.error("No Tool Data");
      return;
    }
    const stackData = toolData.data[0];
    const currentIndex = stackData.currentImageIdIndex;
    this.currentIndex = currentIndex;
    switch (this.currentMode) {
      case "stack":
        // Switching from 'stack' to 'slice'
        this.configuration.fixedSlice = Math.floor(
          (currentIndex + 1) / this.framesNumber
        ); // slice = 0,1,2,3 and so on
        this.configuration.currentMode = "slice";
        this.currentMode = "slice";
        break;
      case "slice":
        // Switching from 'slice' to 'stack'
        this.configuration.fixedFrame =
          currentIndex + 1 - this.configuration.fixedSlice * this.framesNumber; // frame is related to the current slice
        this.configuration.currentMode = "stack";
        this.currentMode = "stack";
        break;
      default:
        break;
    }
  }

  mouseWheelCallback(evt?: CustomEvent<ToolEventDetail>) {
    if (
      evt!.detail.detail.ctrlKey != true &&
      evt!.detail.detail.altKey != true &&
      evt!.detail.detail.shiftKey != true
    ) {
      const { direction: invert, element } = evt!.detail;

      this.handleToggle(
        DEFAULT_TOOLS["CustomMouseWheelScroll"].currentMode as string
      );
      // configure scroll direction
      const direction =
        invert *
        (this.configuration.currentMode === "stack"
          ? this.configuration.framesNumber
          : 1);

      const toolData = getToolState(element, "stack");
      if (!toolData || !toolData.data || !toolData.data.length) {
        return;
      }
      const stackData = toolData.data[0];
      const isDSAEnabled: boolean = store.get([
        "viewports",
        element.id,
        "isDSAEnabled"
      ]);
      let imageIds: string[];
      if (isDSAEnabled) {
        const originalImageIdSample: string = toolData.data[0].imageIds[0];
        const parsedImageId: { scheme: string; url: string } =
          cornerstoneDICOMImageLoader.wadouri.parseImageId(
            originalImageIdSample
          );

        const rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
        const imageTracker = getImageTracker();
        const seriesId: string = imageTracker[rootImageId];
        const manager = getImageManager() as ImageManager;

        const multiFrameSerie = manager![seriesId] as Series;

        imageIds = multiFrameSerie.dsa!.imageIds;
      } else {
        imageIds = stackData.imageIds;
      }
      if (this.configuration.currentMode === "stack") {
        // Handle 'stack' mode

        // Calculate validIndex for 'stack' mode (no looping) between 0 and (N-1)*framesnumber where N=numberofslices=numberofimageids/numberofframes
        let lastIndex = store.get(["viewports", element.id, "sliceId"]);
        let nextIndex = lastIndex + direction;

        if (lastIndex === -1) {
          nextIndex = 0 + direction;
          lastIndex = 0;
        }
        this.slicesnumber = Math.ceil(imageIds.length / this.framesNumber) - 1;
        // Ensure nextIndex is between 0 and upperBound
        const validIndex =
          nextIndex >= 0 && nextIndex < imageIds.length && this.slicesnumber > 0
            ? nextIndex
            : lastIndex;
        // Scroll to the calculated index
        scrollToIndex(element, validIndex);
        if (getActiveLayer(element.id)) {
          let activeLayer = getActiveLayer(element.id);
          let layers = cornerstone.getLayers(element);
          let newActiveLayer =
            //@ts-ignore
            activeLayer.layerId == layers[0].layerId ? layers[1] : layers[0];
          //@ts-ignore
          setActiveLayer(element.id, newActiveLayer.layerId);
        }
      } else {
        // Handle 'slice' mode
        let lastIndex =
          this.isMultiframe === true || this.is4D === true
            ? store.get(["viewports", element.id, "sliceId"])
            : stackData.currentImageIdIndex;

        this.slicesnumber = Math.ceil(imageIds.length / this.framesNumber) - 1;

        const startFrame =
          this.configuration.fixedSlice * this.configuration.framesNumber;

        const endFrame =
          (this.configuration.fixedSlice + 1) *
            this.configuration.framesNumber -
          1;

        // Calculate the potential new index without considering looping
        let nextIndex = lastIndex + direction;

        // Check if the new index is within the valid range for the current slice
        if (
          nextIndex < startFrame ||
          nextIndex > endFrame ||
          nextIndex >= imageIds.length
        ) {
          nextIndex = startFrame;
        }
        // Scroll to the calculated index
        scrollToIndex(element, nextIndex);

        if (this.is4D) {
          const viewport = store.get(["viewports", element.id]);
          const timeId = viewport.timeIds[nextIndex];
          const timestamp = viewport.timestamps[nextIndex];
          setStore(["timeId", element.id, timeId]);
          setStore(["timestamp", element.id, timestamp]);
        }
      }
    }
  }

  /*
   * @method scrollWithoutSkipping
   * @param {stackData} stackData
   * @param {pendingEvent} pendingEvent
   * @param {element} element
   * @desc Handles the event of the mouse wheel
   */
  scrollWithoutSkipping(
    stackData: StackData,
    pendingEvent: any,
    element: HTMLElement
  ) {
    const newImageHandler = (event: any) => {
      const index = stackData.imageIds.indexOf(event.detail.image.imageId);

      if (index === pendingEvent.index) {
        stackData.pending = [];
        element.removeEventListener(
          "cornerstoneimagerendered",
          newImageHandler
        );
      }
    };
    element.addEventListener("cornerstoneimagerendered", newImageHandler);
    scrollToIndex(element, pendingEvent.index);
  }
}
