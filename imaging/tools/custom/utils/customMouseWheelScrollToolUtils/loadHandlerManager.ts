// external libraries
import cornerstoneTools from "cornerstone-tools";
import { HandlerFunction, HandlerMap } from "../../../types";

// global variables
const external = cornerstoneTools.external;
const _DEFAULT_LOAD_HANDLER = "DEFAULT";

const defaultStartLoadHandler: HandlerMap = {};
const defaultEndLoadHandler: HandlerMap = {};
const defaultErrorLoadingHandler: HandlerMap = {};

function _getUUIDFromElement(element?: HTMLElement): string {
  if (!element) {
    return _DEFAULT_LOAD_HANDLER;
  }
  const uuid = external.cornerstone.getEnabledElement(element).uuid;

  if (!uuid) {
    throw new Error("Something went wrong when getting uuid from element");
  }

  return uuid;
}

function setStartLoadHandler(
  handler: HandlerFunction,
  element?: HTMLElement
): void {
  if (!handler) {
    throw new Error("The Handler function must be defined");
  }
  const uuid = _getUUIDFromElement(element);

  defaultStartLoadHandler[uuid] = handler;
}

function getStartLoadHandler(element?: HTMLElement): HandlerFunction {
  const uuid = _getUUIDFromElement(element);

  return (
    defaultStartLoadHandler[uuid] ||
    defaultStartLoadHandler[_DEFAULT_LOAD_HANDLER]
  );
}

function setEndLoadHandler(
  handler: HandlerFunction,
  element?: HTMLElement
): void {
  if (!handler) {
    throw new Error("The Handler function must be defined");
  }
  const uuid = _getUUIDFromElement(element);

  defaultEndLoadHandler[uuid] = handler;
}

function getEndLoadHandler(element?: HTMLElement): HandlerFunction {
  const uuid = _getUUIDFromElement(element);

  return (
    defaultEndLoadHandler[uuid] || defaultEndLoadHandler[_DEFAULT_LOAD_HANDLER]
  );
}

function setErrorLoadingHandler(
  handler: HandlerFunction,
  element?: HTMLElement
): void {
  if (!handler) {
    throw new Error("The Handler function must be defined");
  }
  const uuid = _getUUIDFromElement(element);

  defaultErrorLoadingHandler[uuid] = handler;
}

function getErrorLoadingHandler(element?: HTMLElement): HandlerFunction {
  const uuid = _getUUIDFromElement(element);

  return (
    defaultErrorLoadingHandler[uuid] ||
    defaultErrorLoadingHandler[_DEFAULT_LOAD_HANDLER]
  );
}

function removeHandlers(element: HTMLElement): void {
  const uuid = _getUUIDFromElement(element);

  delete defaultStartLoadHandler[uuid];
  delete defaultEndLoadHandler[uuid];
  delete defaultErrorLoadingHandler[uuid];
}

const loadHandlerManager = {
  setStartLoadHandler,
  getStartLoadHandler,
  setEndLoadHandler,
  getEndLoadHandler,
  setErrorLoadingHandler,
  getErrorLoadingHandler,
  removeHandlers
};

export default loadHandlerManager;
