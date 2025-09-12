/** @module imaging/tools/polygonSegmentationMixin
 *  @desc  This file ovverides `freehandSegmentationMixin`'s
 *         `renderToolData` method
 */
import { MeasurementMouseEvent, WSEventData } from "../types";
import PolylineScissorsTool from "./polylineScissorsTool";
/**
 * Override for `freehandSegmentationMixin`'s `renderToolData` method to render a polyline instead
 * of a freehand region with the first and last point connected. Apply after the `freehandSegmentationMixin`.
 *
 * @override
 * @param {MeasurementMouseEvent} evt The cornerstone render event.
 * @returns {null}
 */
declare function renderToolData(this: PolylineScissorsTool, evt: MeasurementMouseEvent): void;
/**
 * Entry point, manage workflow starting / ending
 * @param {MeasurementMouseEvent} evt
 */
declare function _checkIfDrawing(this: PolylineScissorsTool, evt: MeasurementMouseEvent): void;
/**
 * Event handler for MOUSE_UP/TOUCH_END during handle drag event loop.
 *
 * @private
 * @method _applyStrategy
 * @param {MeasurementMouseEvent} evt Interaction event emitted by an enabledElement
 * @returns {void}
 */
declare function _applyStrategy(this: PolylineScissorsTool, evt: MeasurementMouseEvent): void;
/**
 * Sets the start and end handle points to empty objects
 *
 * @private
 * @method _resetHandles
 * @returns {undefined}
 */
declare function _resetHandles(this: PolylineScissorsTool): void;
/**
 * Adds a point on mouse click in polygon mode.
 *
 * @private
 * @param {WSEventData} evt - data object associated with an event.
 * @returns {void}
 */
declare function _addPoint(this: PolylineScissorsTool, evt: WSEventData): void;
/**
 * @mixin polygonSegmentationMixin - segmentation operations for polyline
 * @memberof Mixins
 */
declare const _default: {
    mouseClickCallback: typeof _checkIfDrawing;
    initializeMixin: typeof _resetHandles;
    renderToolData: typeof renderToolData;
    _resetHandles: typeof _resetHandles;
    _addPoint: typeof _addPoint;
    _applyStrategy: typeof _applyStrategy;
};
export default _default;
