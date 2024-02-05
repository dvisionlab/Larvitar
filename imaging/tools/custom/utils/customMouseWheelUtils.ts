// external libraries
import cornerstoneTools from "cornerstone-tools";
import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";

// internal libraries
import { getLarvitarManager } from "../../../loaders/commonLoader";
import { LarvitarManager, Series } from "../../../types";
import store from "../../../imageStore";
import { getLarvitarImageTracker } from "../../../loaders/commonLoader";
import loadHandlerManager from "./loadHandlerManager";
//const loadHandlerManager = cornerstoneTools.importInternal(
//  "stateManagement/loadHandlerManager"
//);// TODO LAURA CHECK HOW TO IMPORT IT

// global variables
const EVENTS = cornerstoneTools.EVENTS;
const external = cornerstoneTools.external;
const getToolState = cornerstoneTools.getToolState;
const triggerEvent = cornerstoneTools.importInternal("util/triggerEvent");

/**
 * Scrolls through the stack to the image index requested.
 * @export @public @method
 * @name scrollToIndex
 *
 * @param {type} element - The element to scroll through.
 * @param {type} newImageIdIndex - The target image index.
 * @returns{void}
 */
interface StackData {
  currentImageIdIndex: number;
  imageIds: string[];
  data: {
    currentImageIdIndex: number;
    imageIds: string[];
    uuid: string;
    preventCache?: boolean;
  }[];
}

interface StackRendererData {
  currentImageIdIndex: number;
  data: any[];
  render: (element: Element, data: any) => void; // Replace 'any' with the actual type of data
}

interface ImageEventData {
  newImageIdIndex: number;
  direction: number;
}

export default function scrollToIndex(
  element: Element,
  newImageIdIndex: number
): void {
  const toolData: StackData = getToolState(element, "stack");

  if (!toolData || !toolData.data || !toolData.data.length) {
    return;
  }

  const cornerstone = external.cornerstone;
  // If we have more than one stack, check if we have a stack renderer defined
  let stackRenderer: StackRendererData | undefined;

  if (toolData.data.length > 1) {
    const stackRendererData: StackRendererData = getToolState(
      element,
      "stackRenderer"
    );

    if (
      stackRendererData &&
      stackRendererData.data &&
      stackRendererData.data.length
    ) {
      stackRenderer = stackRendererData.data[0];
    }
  }

  const stackData = toolData.data[0];
  const originalImageIdSample: string = toolData.data[0].imageIds[0];
  const parsedImageId: { scheme: string; url: string } =
    cornerstoneDICOMImageLoader.wadouri.parseImageId(originalImageIdSample);

  const rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
  const imageTracker = getLarvitarImageTracker();
  const seriesId: string = imageTracker[rootImageId];
  const manager = getLarvitarManager() as LarvitarManager;

  const multiFrameSerie = manager![seriesId] as Series;
  const id: string = element.id;
  const isDSAEnabled: boolean = store.get(["viewports", id, "isDSAEnabled"]);
  const imageIds: string[] =
    isDSAEnabled === true ? multiFrameSerie.dsa!.imageIds : stackData.imageIds;

  // Allow for negative indexing
  if (newImageIdIndex < 0) {
    newImageIdIndex += imageIds.length;
  }

  const startLoadingHandler = loadHandlerManager.getStartLoadHandler(element);
  const endLoadingHandler = loadHandlerManager.getEndLoadHandler(element);
  const errorLoadingHandler =
    loadHandlerManager.getErrorLoadingHandler(element);

  function doneCallback(image: cornerstone.Image): void {
    if ((stackData.currentImageIdIndex as number) !== newImageIdIndex) {
      return;
    }

    // Check if the element is still enabled in Cornerstone,
    // If an error is thrown, stop here.
    try {
      // TODO: Add 'isElementEnabled' to Cornerstone?
      cornerstone.getEnabledElement(element as HTMLElement);
    } catch (error) {
      return;
    }

    if (stackRenderer) {
      stackRenderer.currentImageIdIndex = newImageIdIndex;
      stackRenderer.render(element, toolData.data);
    } else {
      cornerstone.displayImage(element as HTMLElement, image);
    }

    if (endLoadingHandler) {
      endLoadingHandler(element, image);
    }
  }

  function failCallback(error: string): void {
    const imageId: string = imageIds[newImageIdIndex];

    if (errorLoadingHandler) {
      errorLoadingHandler(element, imageId, error);
    }
  }

  if (newImageIdIndex === stackData.currentImageIdIndex) {
    return;
  }

  if (startLoadingHandler) {
    startLoadingHandler(element);
  }

  const eventData: ImageEventData = {
    newImageIdIndex,
    direction: newImageIdIndex - stackData.currentImageIdIndex
  };

  stackData.currentImageIdIndex = newImageIdIndex;
  const newImageId = imageIds[newImageIdIndex];

  // Retry image loading in cases where previous image promise
  // Was rejected, if the option is set
  /*
  
      Const config = stackScroll.getConfiguration();
  
      TODO: Revisit this. It appears that Core's imageCache is not
      keeping rejected promises anywhere, so we have no way to know
      if something was previously rejected.
  
      if (config && config.retryLoadOnScroll === true) {
      }
    */

  // Convert the preventCache value in stack data to a boolean
  const preventCache: boolean = Boolean(stackData.preventCache);

  let imagePromise: Promise<cornerstone.Image>;

  if (preventCache) {
    imagePromise = cornerstone.loadImage(newImageId);
  } else {
    imagePromise = cornerstone.loadAndCacheImage(newImageId);
  }

  imagePromise.then(doneCallback, failCallback);

  triggerEvent(element, EVENTS.STACK_SCROLL, eventData);
}
