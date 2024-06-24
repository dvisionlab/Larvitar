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
    optimalWW: number | null;
    optimalWC: number | null;
    element: any;
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
    originalWW: any;
    originalWC: any;
    pointNearTool(element: any, data: any, coords: any, interactionType: any): boolean;
    updateCachedStats(image: any, element: any, data: any): void;
    renderToolData(evt: any): void;
    mode: any;
    _withinHandleBoxes(startCanvas: any, endCanvas: any): boolean;
    /**
     * Event handler for MOUSE_UP/TOUCH_END during handle drag event loop.
     *
     * @private
     * @method _applyStrategy
     * @param {(CornerstoneTools.event#MOUSE_UP|CornerstoneTools.event#TOUCH_END)} evt Interaction event emitted by an enabledElement
     * @returns {void}
     */
    private _applyStrategy;
    /**
   * Calculates the minimum and maximum value in the given pixel array
   * and updates the viewport of the element in the event.
   *
   * @private
   * @method _applyWWWCRegion
   * @param {Object} eventData an obect with the element and the image coming from the event
   * @param {Array} handles array of the objects of image handles
   * @param {Object} config The tool's configuration object
   * @returns {void}
   */
    private _applyWWWCRegion;
}
