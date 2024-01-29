import cornerstoneTools from "cornerstone-tools";
const EVENTS = cornerstoneTools.EVENTS;
const external = cornerstoneTools.external;
const getToolState = cornerstoneTools.getToolState;
const triggerEvent = cornerstoneTools.importInternal("util/triggerEvent");
import loadHandlerManager from "./loadHandlerManager";
//const loadHandlerManager = cornerstoneTools.importInternal(
//  "stateManagement/loadHandlerManager"
//);// TODO LAURA CHECK HOW TO IMPORT IT

import { default as cornerstoneDICOMImageLoader } from "cornerstone-wado-image-loader";
import { getLarvitarManager } from "../../loaders/commonLoader";
import { LarvitarManager, Series } from "../../types";
import store from "../../../imaging/imageStore";
import { getLarvitarImageTracker } from "../../loaders/commonLoader";
/**
 * Scrolls through the stack to the image index requested.
 * @export @public @method
 * @name scrollToIndex
 *
 * @param  {type} element         The element to scroll through.
 * @param  {type} newImageIdIndex The target image index.
 * @returns {void}
 */
export default function scrollToIndex(
  element: Element,
  newImageIdIndex: number
) {
  const toolData = getToolState(element, "stack");

  if (!toolData || !toolData.data || !toolData.data.length) {
    return;
  }

  const cornerstone = external.cornerstone;
  // If we have more than one stack, check if we have a stack renderer defined
  let stackRenderer: any;

  if (toolData.data.length > 1) {
    const stackRendererData = getToolState(element, "stackRenderer");

    if (
      stackRendererData &&
      stackRendererData.data &&
      stackRendererData.data.length
    ) {
      stackRenderer = stackRendererData.data[0];
    }
  }

  const stackData = toolData.data[0];
  const originalImageIdSample = toolData.data[0].imageIds[0];
  console.log(originalImageIdSample);
  let parsedImageId = cornerstoneDICOMImageLoader.wadouri.parseImageId(
    originalImageIdSample
  );

  let rootImageId = parsedImageId.scheme + ":" + parsedImageId.url;
  let imageTracker = getLarvitarImageTracker();
  console.log(imageTracker);
  let seriesId = imageTracker[rootImageId];
  let manager = getLarvitarManager() as LarvitarManager;
  console.log(manager);

  let multiFrameSerie = manager![seriesId] as Series;
  console.log(multiFrameSerie);
  console.log(manager);
  const id: string = element.id;
  const isDSAEnabled = store.get(["viewports", id, "isDSAEnabled"]);
  const imageIds: string[] =
    isDSAEnabled === true
      ? multiFrameSerie.dsa!.imageIds
      : multiFrameSerie.imageIds;
  console.log(imageIds);
  // Allow for negative indexing
  if (newImageIdIndex < 0) {
    newImageIdIndex += imageIds.length;
  }

  const startLoadingHandler = loadHandlerManager.getStartLoadHandler(element);
  const endLoadingHandler = loadHandlerManager.getEndLoadHandler(element);
  const errorLoadingHandler =
    loadHandlerManager.getErrorLoadingHandler(element);

  function doneCallback(image: cornerstone.Image) {
    if (stackData.currentImageIdIndex !== newImageIdIndex) {
      return;
    }

    // Check if the element is still enabled in Cornerstone,
    // If an error is thrown, stop here.
    try {
      // TODO: Add 'isElementEnabled' to Cornerstone?
      cornerstone.getEnabledElement(element);
    } catch (error) {
      return;
    }

    if (stackRenderer) {
      stackRenderer.currentImageIdIndex = newImageIdIndex;
      stackRenderer.render(element, toolData.data);
    } else {
      cornerstone.displayImage(element, image);
    }

    if (endLoadingHandler) {
      endLoadingHandler(element, image);
    }
  }

  function failCallback(error: string) {
    const imageId = imageIds[newImageIdIndex];

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

  const eventData = {
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
  const preventCache = Boolean(stackData.preventCache);

  let imagePromise;

  if (preventCache) {
    imagePromise = cornerstone.loadImage(newImageId);
  } else {
    imagePromise = cornerstone.loadAndCacheImage(newImageId);
  }

  imagePromise.then(doneCallback, failCallback);

  triggerEvent(element, EVENTS.STACK_SCROLL, eventData);
}
