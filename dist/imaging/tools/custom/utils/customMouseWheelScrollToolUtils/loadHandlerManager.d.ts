export default loadHandlerManager;
declare namespace loadHandlerManager {
    export { setStartLoadHandler };
    export { getStartLoadHandler };
    export { setEndLoadHandler };
    export { getEndLoadHandler };
    export { setErrorLoadingHandler };
    export { getErrorLoadingHandler };
    export { removeHandlers };
}
declare function setStartLoadHandler(handler: any, element?: undefined): void;
declare function getStartLoadHandler(element: any): any;
declare function setEndLoadHandler(handler: any, element?: undefined): void;
declare function getEndLoadHandler(element: any): any;
declare function setErrorLoadingHandler(handler: any, element?: undefined): void;
declare function getErrorLoadingHandler(element: any): any;
declare function removeHandlers(element: any): void;
