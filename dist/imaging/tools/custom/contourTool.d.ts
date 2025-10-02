/** @module imaging/tools/custom/contourTool
 *  @desc  This file provides functionalities for
 *         rendering segmentation contours with a
 *         custom cornestone tool
 */
import { Image } from "cornerstone-core";
import { ContourData, Coords, EventData, HandlePosition, HandleTextBox, MeasurementData, MeasurementMouseEvent } from "../types";
declare const BaseAnnotationTool: any;
/**
 * @public
 * @class ContoursTool
 * @memberof Tools.Annotation
 * @classdesc Tool for drawing a set of contours
 * @extends Tools.Base.BaseAnnotationTool
 */
export declare class ContoursTool extends BaseAnnotationTool {
    static [x: string]: any;
    constructor(props?: {
        contoursParsedData?: ContourData;
        segmentationName?: string;
    });
    initializeContours(contourData: ContourData, segmentationName: string): void;
    createNewMeasurement(eventData: EventData): MeasurementData | undefined;
    /**
     *
     *
     * @param {*} element element
     * @param {*} data data
     * @param {*} coords coords
     * @returns {Boolean}
     */
    pointNearTool(element: HTMLElement, data: MeasurementData, coords: Coords): boolean;
    /**
     * @param {*} element
     * @param {*} data
     * @param {*} coords
     * @returns {number} the distance in px from the provided coordinates to the
     * closest rendered portion of the annotation. -1 if the distance cannot be
     * calculated.
     */
    distanceFromPoint(element: HTMLElement, data: MeasurementData, coords: Coords): number;
    /**
     * @param {*} element
     * @param {*} data
     * @param {*} coords
     * @returns {number} the distance in canvas units from the provided coordinates to the
     * closest rendered portion of the annotation. -1 if the distance cannot be
     * calculated.
     */
    distanceFromPointCanvas(element: HTMLElement, data: MeasurementData, coords: Coords): number;
    /**
     *
     *
     *
     * @param {Object} image image
     * @param {Object} element element
     * @param {Object} data data
     *
     * @returns {void}  void
     */
    updateCachedStats(image: Image, element: HTMLElement, data: MeasurementData): void;
    /**
     *
     *
     * @param {*} evt
     * @returns {undefined}
     */
    renderToolData(evt: MeasurementMouseEvent): void;
    addNewMeasurement(evt: MeasurementMouseEvent): void;
    preMouseDownCallback(evt: MeasurementMouseEvent): boolean;
    handleSelectedCallback(evt: MeasurementMouseEvent, toolData: any, handle: HandlePosition, interactionType?: string): void;
    /**
     * Event handler for MOUSE_MOVE during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingMouseMoveCallback(evt: MeasurementMouseEvent): void;
    /**
     * Event handler for MOUSE_DRAG during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingMouseDragCallback(evt: MeasurementMouseEvent): void;
    /**
     * Event handler for TOUCH_DRAG during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingTouchDragCallback(evt: MeasurementMouseEvent): void;
    _drawingDrag(evt: MeasurementMouseEvent): void;
    /**
     * Event handler for MOUSE_UP during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingMouseUpCallback(evt: MeasurementMouseEvent): void;
    /**
     * Event handler for MOUSE_DOWN during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingMouseDownCallback(evt: MeasurementMouseEvent): void;
    /**
     * Event handler for TOUCH_START during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingTouchStartCallback(evt: MeasurementMouseEvent): void;
    /** Ends the active drawing loop and completes the polygon.
     *
     * @public
     * @param {Object} element - The element on which the roi is being drawn.
     * @returns {null}
     */
    completeDrawing(element: HTMLElement): void;
    /**
     * Event handler for MOUSE_DOUBLE_CLICK during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingMouseDoubleClickCallback(evt: MeasurementMouseEvent): void;
    /**
     * Event handler for DOUBLE_TAP during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingDoubleTapClickCallback(evt: MeasurementMouseEvent): void;
    /**
     * Event handler for MOUSE_DRAG during handle drag event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _editMouseDragCallback(evt: MeasurementMouseEvent): void;
    /**
     * Event handler for TOUCH_DRAG during handle drag event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {void}
     */
    _editTouchDragCallback(evt: MeasurementMouseEvent): void;
    /**
     * Returns the previous handle to the current one.
     * @param {Number} currentHandle - the current handle index
     * @param {Array} points - the handles Array of the freehand data
     * @returns {Number} - The index of the previos handle
     */
    _getPrevHandleIndex(currentHandle: number, points: HandlePosition[]): number;
    /**
     * Event handler for MOUSE_UP during handle drag event loop.
     *
     * @private
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _editMouseUpCallback(evt: MeasurementMouseEvent): void;
    /**
     * Places a handle of the freehand tool if the new location is valid.
     * If the new location is invalid the handle snaps back to its previous position.
     *
     * @private
     * @param {EventData} eventData - Data object associated with the event.
     * @param {any} toolState - The data associated with the freehand tool.
     * @modifies {toolState}
     * @returns {undefined}
     */
    _dropHandle(eventData: EventData, toolState: any): void;
    /**
     * Begining of drawing loop when tool is active and a click event happens far
     * from existing handles.
     *
     * @private
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _startDrawing(evt: MeasurementMouseEvent): void;
    /**
     * Adds a point on mouse click in polygon mode.
     *
     * @private
     * @param {Object} eventData - data object associated with an event.
     * @returns {undefined}
     */
    _addPoint(eventData: EventData): void;
    /**
     * If in pencilMode, check the mouse position is farther than the minimum
     * distance between points, then add a point.
     *
     * @private
     * @param {Object} eventData - Data object associated with an event.
     * @param {Object} points - Data object associated with the tool.
     * @returns {undefined}
     */
    _addPointPencilMode(eventData: EventData, points: HandlePosition[]): void;
    /**
     * Ends the active drawing loop and completes the polygon.
     *
     * @private
     * @param {Object} element - The element on which the roi is being drawn.
     * @param {Object} handleNearby - the handle nearest to the mouse cursor.
     * @returns {undefined}
     */
    _endDrawing(element: HTMLElement, handleNearby?: boolean): void;
    /**
     * Returns a handle of a particular tool if it is close to the mouse cursor
     *
     * @private
     * @param {Object} element - The element on which the roi is being drawn.
     * @param {Object} data      Data object associated with the tool.
     * @param {*} coords
     * @returns {Number|Object|Boolean}
     */
    _pointNearHandle(element: HTMLElement, data: MeasurementData, coords: Coords): number | HandleTextBox | undefined;
    /**
     * Returns a handle if it is close to the mouse cursor (all tools)
     *
     * @private
     * @param {Object} eventData - data object associated with an event.
     * @returns {Object}
     */
    _pointNearHandleAllTools(eventData: EventData): {
        handleNearby: number | HandleTextBox;
        toolIndex: number;
    } | undefined;
    /**
     * Gets the current mouse location and stores it in the configuration object.
     *
     * @private
     * @param {Object} eventData The data assoicated with the event.
     * @returns {undefined}
     */
    _getMouseLocation(eventData: EventData): void;
    /**
     * Returns true if the proposed location of a new handle is invalid.
     *
     * @private
     * @param {Object} data      Data object associated with the tool.
     * @param {Object} eventData The data assoicated with the event.
     * @returns {Boolean}
     */
    _checkInvalidHandleLocation(data: MeasurementData, eventData: EventData): true | undefined;
    /**
     * Returns true if the proposed location of a new handle is invalid (in polygon mode).
     *
     * @private
     *
     * @param {Object} data - data object associated with the tool.
     * @param {Object} eventData The data assoicated with the event.
     * @returns {Boolean}
     */
    _checkHandlesPolygonMode(data: MeasurementData, eventData: EventData): boolean;
    /**
     * Returns true if the proposed location of a new handle is invalid (in pencilMode).
     *
     * @private
     * @param {Object} data - data object associated with the tool.
     * @param {Object} eventData The data associated with the event.
     * @returns {Boolean}
     */
    _checkHandlesPencilMode(data: MeasurementData, eventData: EventData): any;
    /**
     * Returns true if the mouse position is far enough from previous points (in pencilMode).
     *
     * @private
     * @param {Object} data - data object associated with the tool.
     * @param {Object} eventData The data associated with the event.
     * @returns {Boolean}
     */
    _invalidHandlePencilMode(data: MeasurementData, eventData: EventData): boolean;
    /**
     * Returns true if two points are closer than this.configuration.spacing.
     *
     * @private
     * @param  {Object} element     The element on which the roi is being drawn.
     * @param  {Object} p1          The first point, in pixel space.
     * @param  {Object} p2          The second point, in pixel space.
     * @returns {boolean}            True if the distance is smaller than the
     *                              allowed canvas spacing.
     */
    _isDistanceSmallerThanCompleteSpacingCanvas(element: HTMLElement, p1: Coords, p2: Coords): boolean;
    /**
     * Returns true if two points are closer than this.configuration.spacing.
     *
     * @private
     * @param  {HTMLElement} element     The element on which the roi is being drawn.
     * @param  {Coords} p1          The first point, in pixel space.
     * @param  {Coords} p2          The second point, in pixel space.
     * @returns {boolean}            True if the distance is smaller than the
     *                              allowed canvas spacing.
     */
    _isDistanceSmallerThanSpacing(element: HTMLElement, p1: Coords, p2: Coords): boolean;
    /**
     * Returns true if two points are farther than this.configuration.spacing.
     *
     * @private
     * @param  {HTMLElement} element     The element on which the roi is being drawn.
     * @param  {Coords} p1          The first point, in pixel space.
     * @param  {Coords} p2          The second point, in pixel space.
     * @returns {boolean}           True if the distance is larger than the
     *                              allowed canvas spacing.
     */
    _isDistanceLargerThanSpacing(element: HTMLElement, p1: Coords, p2: Coords): boolean;
    /**
     * Compares the distance between two points to this.configuration.spacing.
     *
     * @private
     * @param  {HTMLElement} element     The element on which the roi is being drawn.
     * @param  {Coords} p1          The first point, in pixel space.
     * @param  {Coords} p2          The second point, in pixel space.
     * @param  {string} comparison  The comparison to make.
     * @param  {number} spacing     The allowed canvas spacing
     * @returns {boolean}           True if the distance is smaller than the
     *                              allowed canvas spacing.
     */
    _compareDistanceToSpacing(element: HTMLElement, p1: Coords, p2: Coords, comparison?: string, spacing?: any): boolean;
    /**
     * Adds drawing loop event listeners.
     *
     * @private
     * @param {Object} element - The viewport element to add event listeners to.
     * @param {string} interactionType - The interactionType used for the loop.
     * @modifies {element}
     * @returns {undefined}
     */
    _activateDraw(element: HTMLElement, interactionType?: string): void;
    /**
     * Removes drawing loop event listeners.
     *
     * @private
     * @param {Object} element - The viewport element to add event listeners to.
     * @modifies {element}
     * @returns {undefined}
     */
    _deactivateDraw(element: HTMLElement): void;
    /**
     * Adds modify loop event listeners.
     *
     * @private
     * @param {HTMLElement} element - The viewport element to add event listeners to.
     * @modifies {element}
     * @returns {undefined}
     */
    _activateModify(element: HTMLElement): void;
    /**
     * Removes modify loop event listeners.
     *
     * @private
     * @param {HTMLElement} element - The viewport element to add event listeners to.
     * @modifies {element}
     * @returns {undefined}
     */
    _deactivateModify(element: HTMLElement): void;
    passiveCallback(element: HTMLElement): void;
    enabledCallback(element: HTMLElement): void;
    disabledCallback(element: HTMLElement): void;
    _closeToolIfDrawing(element: HTMLElement): void;
    /**
     * Fire MEASUREMENT_MODIFIED event on provided element
     * @param {HTMLElement} element which freehand data has been modified
     * @param {MeasurementData} measurementData the measurment data
     * @returns {void}
     */
    fireModifiedEvent(element: HTMLElement, measurementData: MeasurementData): void;
    fireCompletedEvent(element: HTMLElement, measurementData: MeasurementData): void;
    get spacing(): any;
    set spacing(value: any);
    get activeHandleRadius(): any;
    set activeHandleRadius(value: any);
    get completeHandleRadius(): any;
    set completeHandleRadius(value: any);
    get alwaysShowHandles(): any;
    set alwaysShowHandles(value: any);
    get invalidColor(): any;
    set invalidColor(value: any);
    /**
     * Ends the active drawing loop and removes the polygon.
     *
     * @public
     * @param {Object} element - The element on which the roi is being drawn.
     * @returns {null}
     */
    cancelDrawing(element: HTMLElement): void;
    /**
     * New image event handler.
     *
     * @public
     * @param  {Object} evt The event.
     * @returns {null}
     */
    newImageCallback(evt: MeasurementMouseEvent): void;
}
export {};
