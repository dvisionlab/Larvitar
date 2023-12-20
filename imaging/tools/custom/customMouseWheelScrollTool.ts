/** @module tools/custom/customMouseWheelScrollTool
 *  @desc This file provides functionalities for
 *        custom DICOM Loader
 */

// external libraries
import cornerstoneTools from "cornerstone-tools";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import { Image } from "cornerstone-core";
import cornerstone from "cornerstone-core";
const BaseTool = cornerstoneTools.importInternal("base/BaseTool");
const scrollToIndex = cornerstoneTools.importInternal("util/scrollToIndex");
const getToolState = cornerstoneTools.getToolState;

// internal libraries
import store, { set as setStore } from "../../imageStore";
import {
  getLarvitarImageTracker,
  getSeriesDataFromLarvitarManager
} from "../../loaders/commonLoader";

// global variables
type StackData = {
  currentImageIdIndex: number;
  imageIds: string[];
  pending: any[]; //TODO CHECK THIS
};

type ToolEventDetail = {
  element: HTMLElement;
  image: Image;
  direction: number;
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
      supportedInteractionTypes: ["MouseWheel", "Key"],
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

    // document.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  /*
   * @verify4D
   * @desc Verify if the image is 4D or not
   */
  verify4D() {
    const enabledElement = cornerstone.getEnabledElement(this.element);
    const imageId = enabledElement.image!.imageId;
    let getter = cornerstone.metaData.get("generalSeriesModule", imageId);

    const parsedImageId =
      cornerstoneDICOMImageLoader.wadouri.parseImageId(imageId);
    const rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
    const imageTracker = getLarvitarImageTracker();

    const seriesId: string | undefined = getter
      ? getter.seriesInstanceUID
      : imageTracker[rootImageId];

    if (seriesId === undefined) {
      // multi-layered dicom
      this.configuration.framesNumber = 1;
      this.framesNumber = this.configuration.framesNumber;
      this.is4D = false;
      this.isMultiframe = false;
      console.warn("no access to metadata");
      return false;
    }
    const serie = getSeriesDataFromLarvitarManager(seriesId);
    if (serie) {
      // extract first instance metadata
      const anInstance = serie.instances[serie.imageIds[0]];
      const metadata = anInstance.metadata;
      // check is4D and multiframe
      this.is4D = metadata.is4D ? metadata.is4D : false;
      this.isMultiframe = metadata.isMultiframe ? metadata.isMultiframe : false;

      // extract frames number
      if (this.is4D === true) {
        this.configuration.framesNumber = metadata.x00200105;
      } else if (this.isMultiframe === true) {
        this.configuration.framesNumber = metadata.x00280008;
      } else {
        this.configuration.framesNumber = 1;
      }
      this.framesNumber = this.configuration.framesNumber;
    } else {
      console.warn("Invalid Series ID");
    }
  }

  // TODO
  // avere una funzione esportabile esternamente
  // prende in ingresso la variable currentMode
  // la setta nella configurazione (this.currentMode)
  // fa i suoi controlli e chiama la funzione toggleScrollMode

  // handleKeyDown(event: KeyboardEvent) {
  // // Toggle mode between 'stack' and 'slice' on Tab key press

  //   if (event.key === "b" || event.key === "B") {
  //     this.verify4D();
  //     if (this.is4D === false) {
  //       if (this.isMultiframe === true) {
  //         this.currentMode = "slice";
  //         this.configuration.currentMode = "slice";
  //       } else {
  //         this.currentMode = "stack";
  //         this.configuration.currentMode = "stack";
  //       }

  //       return;
  //     } else if (this.is4D === true) {
  //       this.framesNumber = this.configuration.framesNumber;
  //       const element = this.element; // Get the tool's element
  //       if (element) {
  //         this.toggleScrollMode(element); // Pass the element to toggleScrollMode
  //       }
  //     }
  //   }
  // }

  /*
   * @method toggleScrollMode
   * @param {element} HTMLElement
   * @desc Handle the toggle between 'stack' and 'slice' modes
   */

  toggleScrollMode(element: HTMLElement) {
    if (!element) {
      console.error("Element is undefined");
      return;
    }
    const toolData = getToolState(element, "stack");
    if (!toolData || !toolData.data || !toolData.data.length) {
      console.error("No Tool Data");
      return;
    }
    const stackData = toolData.data[0];
    const currentIndex = stackData.currentImageIdIndex;

    switch (this.currentMode) {
      case "stack":
        if (this.framesNumber === null || this.framesNumber === 0) {
        }
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
    const { direction: images, element } = evt!.detail;

    this.verify4D();

    if (this.is4D === false) {
      // force current modality
      this.currentMode = this.isMultiframe ? "slice" : "stack";
      this.configuration.currentMode = this.isMultiframe ? "slice" : "stack";
    }

    // configure scroll direction
    const direction =
      images *
      (this.configuration.currentMode === "stack"
        ? this.configuration.framesNumber
        : 1);

    const toolData = getToolState(element, "stack");
    if (!toolData || !toolData.data || !toolData.data.length) {
      return;
    }
    const stackData = toolData.data[0];

    if (this.configuration.currentMode === "stack") {
      // Handle 'stack' mode

      // Calculate validIndex for 'stack' mode (no looping) between 0 and (N-1)*framesnumber where N=numberofslices=numberofimageids/numberofframes
      let lastIndex = store.get(["viewports", element.id, "sliceId"]);
      let nextIndex = lastIndex + direction;

      if (lastIndex === -1) {
        nextIndex = 0 + direction;
        lastIndex = 0;
      }

      this.slicesnumber =
        Math.ceil(stackData.imageIds.length / this.framesNumber) - 1;

      // Ensure nextIndex is between 0 and upperBound
      const validIndex =
        nextIndex >= 0 &&
        nextIndex < stackData.imageIds.length - 1 &&
        this.slicesnumber > 0
          ? nextIndex
          : lastIndex;

      // Scroll to the calculated index
      scrollToIndex(element, validIndex);
    } else {
      // Handle 'slice' mode

      // TODO MAYBE THIS CHECK IS USEFUL
      let lastIndex =
        this.isMultiframe === true || this.is4D === true
          ? store.get(["viewports", element.id, "sliceId"])
          : stackData.currentImageIdIndex;

      this.slicesnumber =
        Math.ceil(stackData.imageIds.length / this.framesNumber) - 1;

      const startFrame =
        this.configuration.fixedSlice * this.configuration.framesNumber;
      const endFrame =
        (this.configuration.fixedSlice + 1) * this.configuration.framesNumber -
        1;

      // Calculate the potential new index without considering looping
      let nextIndex = lastIndex + direction;

      // Check if the new index is within the valid range for the current slice
      // Calculate validIndex for looping within the specified range in 'slice' mode

      // Calculate validIndex for looping within the specified range in 'slice' mode
      //want to loop in slice mode through frames, not in stack mode,
      //but i want to consider that the loop starts from fixed frame and loops from it
      //in a range [currentframe,Y*numberofframes-1][(Y-1)*numberofframes,currentframe]
      //knowing that Y is the current slice index=sliceIndex

      if (
        nextIndex < startFrame ||
        nextIndex > endFrame ||
        nextIndex >= stackData.imageIds.length
      ) {
        nextIndex = startFrame;
      }

      // Scroll to the calculated index
      scrollToIndex(element, nextIndex);

      // TODO EVENTUALLY SET IN STORE VARIABLES SUCH AS TIMEID
      if (this.is4D) {
        const viewport = store.get(["viewports", element.id]);
        const timeId = viewport.timeIds[nextIndex];
        const timestamp = viewport.timestamps[nextIndex];
        setStore(["timeId", element.id, timeId]);
        setStore(["timestamp", element.id, timestamp]);
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
