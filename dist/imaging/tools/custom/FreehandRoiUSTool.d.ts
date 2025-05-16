declare const BaseAnnotationTool: any;
type Coords = {
    x: number;
    y: number;
    moving?: boolean;
    active?: boolean;
};
type EventData = {
    enabledElement?: Element;
    buttons?: number;
    currentPoints?: Point;
    deltaPoints?: Point;
    element?: HTMLElement | HTMLDivElement;
    event?: MouseEvent;
    canvasContext?: {
        canvas: HTMLCanvasElement;
    };
    image?: Image;
    lastPoints?: Point;
    startPoints?: Point;
    type?: string;
    viewport?: Viewport;
};
type Point = {
    page: Coords;
    image: Coords;
    client: Coords;
    canvas: Coords;
};
export interface Handles {
    visible?: boolean;
    active?: boolean;
    text?: string;
    color?: string;
    handles?: Handles;
    start?: HandlePosition;
    end?: HandlePosition;
    offset?: number;
    middle?: HandlePosition;
    textBox?: HandleTextBox;
    initialRotation?: number;
    points?: HandlePosition[];
    invalidHandlePlacement?: boolean;
    x?: number;
    y?: number;
    hasBoundingBox?: boolean;
    lines?: Handles[];
}
interface MeasurementData {
    text?: string;
    computeMeasurements?: boolean;
    rAngle?: number;
    highlight?: boolean;
    visible: boolean;
    active: boolean;
    uuid: string;
    color?: any;
    handles: Handles;
    polyBoundingBox?: Rectangle;
    meanStdDev?: {
        mean: number;
        stdDev: number;
    };
    meanStdDevSUV?: {
        mean: number;
        stdDev: number;
    };
    area?: number;
    invalidated?: boolean;
    unit?: string;
    canComplete?: boolean;
    length?: number;
    cachedStats?: Stats;
}
export interface MeasurementMouseEvent {
    detail: EventData;
    currentTarget: any;
    type?: string;
    stopImmediatePropagation?: Function;
    stopPropagation?: Function;
    preventDefault?: Function;
}
import type { HandleTextBox } from "../types";
import { Image, Viewport } from "../../types";
import { HandlePosition, Rectangle, Stats } from "../types";
/**
 * @public
 * @class FreehandRoiTool
 * @memberof Tools.Annotation
 * @classdesc Tool for drawing arbitrary polygonal regions of interest, and
 * measuring the statistics of the enclosed pixels.
 * @extends Tools.Base.BaseAnnotationTool
 */
export default class FreehandRoiTool extends BaseAnnotationTool {
    static [x: string]: any;
    private isMultiPartTool;
    private _drawing;
    private _dragging;
    private _modifying;
    private modality;
    private index;
    private pointNear;
    private throttledUpdateCachedStats;
    private finished?;
    private modifying?;
    private modifyingAll?;
    private name;
    private uuid?;
    private dataAll?;
    private distanceLine;
    private distanceHandle;
    private configuration?;
    private svgCursor?;
    private data?;
    private dragged?;
    private originalX?;
    private originalY?;
    private originalYsingle?;
    private originalXsingle?;
    private element?;
    private _activeDrawingToolReference?;
    private _drawingInteractionType?;
    private isEventListenerAdded;
    private pointerCoords?;
    private validXAll;
    private validYAll;
    private validX;
    private validY;
    private isPointerOutside?;
    private toolState?;
    private canComplete?;
    constructor(props?: {});
    handleMouseMove(event: any): void;
    addMouseMoveEventListener(): void;
    removeMouseMoveEventListener(): void;
    createNewMeasurement(eventData: EventData): {
        visible: boolean;
        active: boolean;
        invalidated: boolean;
        color: undefined;
        canComplete: boolean;
        handles: {
            points: never[];
            textBox?: {
                active: boolean;
                hasMoved: boolean;
                movesIndependently: boolean;
                drawnIndependently: boolean;
                allowedOutsideImage: boolean;
                hasBoundingBox: boolean;
            };
        };
    } | undefined;
    /**
     *
     *
     * @param {Element} element element
     * @param {MeasurementData} data data
     * @param {Coords} coords coords
     * @returns {Boolean}
     */
    pointNearTool(element: Element, data: MeasurementData, coords: Coords): boolean;
    _findObjectWithSmallesDistance(measurementArray: {
        data: MeasurementData[];
    }, coords: Coords): number[];
    /**
     *
     *
     * @param {*} element element
     * @param {*} data data
     * @param {*} coords coords
     * @returns {Boolean}
     */
    _pointNearLine(measurementArray: {
        data: MeasurementData[];
    }, coords: Coords): number;
    /**
     * @param {*} element
     * @param {*} data
     * @param {*} coords
     * @returns {number} the distance in px from the provided coordinates to the
     * closest rendered portion of the annotation. -1 if the distance cannot be
     * calculated.
     */
    distanceFromPoint(element: Element, data: MeasurementData, coords: Coords): number;
    /**
     * @param {*} element
     * @param {*} data
     * @param {*} coords
     * @returns {number} the distance in canvas units from the provided coordinates to the
     * closest rendered portion of the annotation. -1 if the distance cannot be
     * calculated.
     */
    distanceFromPointCanvas(element: Element, data: MeasurementData, coords: Coords): number;
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
    updateCachedStats(image: cornerstone.Image, element: Element, toolState: any): void;
    /**
     *
     *
     * @param {*} evt
     * @returns {undefined}
     */
    renderToolData(evt: MeasurementMouseEvent): void;
    addNewMeasurement(evt: MeasurementMouseEvent): void;
    preMouseDownCallback(evt: MeasurementMouseEvent): boolean;
    handleSelectedCallback(evt: MeasurementMouseEvent, toolData: {
        data: MeasurementData;
    }, handle: Handles, interactionType?: string): void;
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
    completeDrawing(element: Element): void;
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
     * Event handler for MOUSE_DRAG during lines drag event loop (Roi translation).
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _editMouseDragAllCallback(evt: MeasurementMouseEvent): void;
    /**
     * Event handler for TOUCH_DRAG during lines drag event loop (Roi translation).
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _editTouchDragAllCallback(evt: MeasurementMouseEvent): void;
    /**
     * Returns the previous handle to the current one.
     * @param {Number} currentHandle - the current handle index
     * @param {Array} points - the handles Array of the freehand data
     * @returns {Number} - The index of the previos handle
     */
    _getPrevHandleIndex(currentHandle: number, points: Handles[]): number;
    /**
     * Event handler for MOUSE_UP during handle drag event loop.
     *
     * @private
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _editMouseUpCallback(evt: MeasurementMouseEvent): void;
    /**
     * Event handler for MOUSE_UP during lines drag event loop.
     *
     * @private
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _editMouseUpAllCallback(evt: MeasurementMouseEvent): void;
    /**
     * Places a handle of the freehand tool if the new location is valid.
     * If the new location is invalid the handle snaps back to its previous position.
     *
     * @private
     * @param {Object} eventData - Data object associated with the event.
     * @param {Object} toolState - The data associated with the freehand tool.
     * @modifies {toolState}
     * @returns {undefined}
     */
    _dropHandle(eventData: EventData, toolState: {
        data: MeasurementData[];
    }): void;
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
     * Event handler for MOUSE_UP during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingMouseUpCallback(evt: MeasurementMouseEvent): void;
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
    _addPointPencilMode(eventData: EventData, points: Handles[]): void;
    /**
     * Ends the active drawing loop and completes the polygon.
     *
     * @private
     * @param {Object} element - The element on which the roi is being drawn.
     * @param {Object} handleNearby - the handle nearest to the mouse cursor.
     * @returns {undefined}
     */
    _endDrawing(element: Element, handleNearby?: number): void;
    /**
     * Returns a handle of a particular tool if it is close to the mouse cursor
     *
     * @private
     * @param {Object} element - The element on which the roi is being drawn.
     * @param {Object} data      Data object associated with the tool.
     * @param {*} coords
     * @returns {Number|Object|Boolean}
     */
    _pointNearHandle(element: Element, data: MeasurementData, coords: Coords): number | HandleTextBox | undefined;
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
    _isDistanceSmallerThanCompleteSpacingCanvas(element: Element, p1: Handles, p2: Handles): boolean;
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
    _isDistanceSmallerThanSpacing(element: Element, p1: Handles, p2: Handles): boolean;
    /**
     * Returns true if two points are farther than this.configuration.spacing.
     *
     * @private
     * @param  {Object} element     The element on which the roi is being drawn.
     * @param  {Object} p1          The first point, in pixel space.
     * @param  {Object} p2          The second point, in pixel space.
     * @returns {boolean}            True if the distance is smaller than the
     *                              allowed canvas spacing.
     */
    _isDistanceLargerThanSpacing(element: Element, p1: Handles, p2: Handles): boolean;
    /**
     * Compares the distance between two points to this.configuration.spacing.
     *
     * @private
     * @param  {Object} element     The element on which the roi is being drawn.
     * @param  {Object} p1          The first point, in pixel space.
     * @param  {Object} p2          The second point, in pixel space.
     * @param  {string} comparison  The comparison to make.
     * @param  {number} spacing     The allowed canvas spacing
     * @returns {boolean}           True if the distance is smaller than the
     *                              allowed canvas spacing.
     */
    _compareDistanceToSpacing(element: Element, p1: Handles, p2: Handles, comparison?: string, spacing?: number | undefined): boolean;
    /**
     * Adds drawing loop event listeners.
     *
     * @private
     * @param {Object} element - The viewport element to add event listeners to.
     * @param {string} interactionType - The interactionType used for the loop.
     * @modifies {element}
     * @returns {undefined}
     */
    _activateDraw(element: Element, interactionType?: string): void;
    /**
     * Removes drawing loop event listeners.
     *
     * @private
     * @param {Object} element - The viewport element to add event listeners to.
     * @modifies {element}
     * @returns {undefined}
     */
    _deactivateDraw(element: Element): void;
    /**
     * Adds modify loop event listeners.
     *
     * @private
     * @param {Object} element - The viewport element to add event listeners to.
     * @modifies {element}
     * @returns {undefined}
     */
    _activateModify(element: Element): void;
    /**
     * Adds modify loop event listeners for Roi translation.
     *
     * @private
     * @param {Object} element - The viewport element to add event listeners to.
     * @modifies {element}
     * @returns {undefined}
     */
    _activateModifyAll(element: Element): void;
    /**
     * Removes modify loop event listeners.
     *
     * @private
     * @param {Object} element - The viewport element to add event listeners to.
     * @modifies {element}
     * @returns {undefined}
     */
    _deactivateModify(element: Element): void;
    /**
     * Removes modify loop event listeners for Roi translation.
     *
     * @private
     * @param {Object} element - The viewport element to add event listeners to.
     * @modifies {element}
     * @returns {undefined}
     */
    _deactivateModifyAll(element: Element): void;
    passiveCallback(element: Element): void;
    enabledCallback(element: Element): void;
    disabledCallback(element: Element): void;
    _closeToolIfDrawing(element: Element): void;
    /**
     * Fire MEASUREMENT_MODIFIED event on provided element
     * @param {any} element which freehand data has been modified
     * @param {any} measurementData the measurment data
     * @returns {void}
     */
    fireModifiedEvent(element: Element, measurementData: MeasurementData): void;
    fireCompletedEvent(element: Element, measurementData: MeasurementData): void;
    get spacing(): number | undefined;
    set spacing(value: number | undefined);
    get activeHandleRadius(): number;
    set activeHandleRadius(value: number);
    get completeHandleRadius(): number;
    set completeHandleRadius(value: number);
    get alwaysShowHandles(): boolean | undefined;
    set alwaysShowHandles(value: boolean | undefined);
    get invalidColor(): boolean | undefined;
    set invalidColor(value: boolean | undefined);
    /**
     * Ends the active drawing loop and removes the polygon.
     *
     * @public
     * @param {Object} element - The element on which the roi is being drawn.
     * @returns {null}
     */
    cancelDrawing(element: Element): void;
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
