import { HandlerFunction } from "../../../types";
declare function setStartLoadHandler(handler: HandlerFunction, element?: HTMLElement): void;
declare function getStartLoadHandler(element?: HTMLElement): HandlerFunction;
declare function setEndLoadHandler(handler: HandlerFunction, element?: HTMLElement): void;
declare function getEndLoadHandler(element?: HTMLElement): HandlerFunction;
declare function setErrorLoadingHandler(handler: HandlerFunction, element?: HTMLElement): void;
declare function getErrorLoadingHandler(element?: HTMLElement): HandlerFunction;
declare function removeHandlers(element: HTMLElement): void;
declare const loadHandlerManager: {
    setStartLoadHandler: typeof setStartLoadHandler;
    getStartLoadHandler: typeof getStartLoadHandler;
    setEndLoadHandler: typeof setEndLoadHandler;
    getEndLoadHandler: typeof getEndLoadHandler;
    setErrorLoadingHandler: typeof setErrorLoadingHandler;
    getErrorLoadingHandler: typeof getErrorLoadingHandler;
    removeHandlers: typeof removeHandlers;
};
export default loadHandlerManager;
