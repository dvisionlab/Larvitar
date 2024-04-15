declare namespace _default {
    export { _checkIfDrawing as mouseClickCallback };
    export { _resetHandles as initializeMixin };
    export { renderToolData };
    export { _resetHandles };
    export { _addPoint };
    export { _applyStrategy };
}
export default _default;
/**
 * Entry point, manage workflow starting / ending
 * @param {Object} evt
 */
declare function _checkIfDrawing(evt: Object): void;
/**
 * Sets the start and end handle points to empty objects
 *
 * @private
 * @method _resetHandles
 * @returns {undefined}
 */
declare function _resetHandles(): undefined;
declare class _resetHandles {
    handles: {
        points: never[];
    };
    currentHandle: number;
}
/**
 * Override for `freehandSegmentationMixin`'s `renderToolData` method to render a polyline instead
 * of a freehand region with the first and last point connected. Apply after the `freehandSegmentationMixin`.
 *
 * @override
 * @param {Object} evt The cornerstone render event.
 * @returns {null}
 */
declare function renderToolData(evt: Object): null;
/**
 * Adds a point on mouse click in polygon mode.
 *
 * @private
 * @param {Object} evt - data object associated with an event.
 * @returns {void}
 */
declare function _addPoint(evt: Object): void;
/**
 * Event handler for MOUSE_UP/TOUCH_END during handle drag event loop.
 *
 * @private
 * @method _applyStrategy
 * @param {(CornerstoneTools.event#MOUSE_UP|CornerstoneTools.event#TOUCH_END)} evt Interaction event emitted by an enabledElement
 * @returns {void}
 */
declare function _applyStrategy(evt: any): void;
