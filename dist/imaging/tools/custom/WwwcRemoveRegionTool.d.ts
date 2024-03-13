/**
 * @public
 * @class WwwcRemoveRegionTool
 * @memberof Tools
 *
 * @classdesc Tool for setting wwwc based on a rectangular region.
 * @extends Tools.Base.BaseTool
 */
export default class WwwcRemoveRegionTool {
    constructor(props?: {});
    dataHandles: any[];
    _drawingMouseUpCallback: (evt: any) => void;
    _editMouseUpCallback: (evt: any) => void;
    throttledUpdateCachedStats: any;
    createNewMeasurement(eventData: any): {
        computeMeasurements: any;
        visible: boolean;
        active: boolean;
        color: undefined;
        invalidated: boolean;
        handles: {
            start: {
                x: any;
                y: any;
                highlight: boolean;
                active: boolean;
            };
            end: {
                x: any;
                y: any;
                highlight: boolean;
                active: boolean;
            };
            initialRotation: any;
            textBox: {
                active: boolean;
                hasMoved: boolean;
                movesIndependently: boolean;
                drawnIndependently: boolean;
                allowedOutsideImage: boolean;
                hasBoundingBox: boolean;
            };
        };
    } | undefined;
    pointNearTool(element: any, data: any, coords: any, interactionType: any): boolean;
    updateCachedStats(image: any, element: any, data: any): void;
    renderToolData(evt: any): void;
    /**
    * Event handler for MOUSE_UP/TOUCH_END during handle drag event loop.
    *
    * @private
    * @method _applyStrategy
    * @param {(CornerstoneTools.event#MOUSE_UP|CornerstoneTools.event#TOUCH_END)} evt Interaction event emitted by an enabledElement
    * @returns {void}
    */
    private _applyStrategy;
}
