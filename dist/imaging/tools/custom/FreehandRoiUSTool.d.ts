/**
 * @public
 * @class FreehandRoiTool
 * @memberof Tools.Annotation
 * @classdesc Tool for drawing arbitrary polygonal regions of interest, and
 * measuring the statistics of the enclosed pixels.
 * @extends Tools.Base.BaseAnnotationTool
 */
export default class FreehandRoiTool {
    constructor(props?: {});
    isMultiPartTool: boolean;
    _drawing: boolean;
    _dragging: boolean;
    _modifying: boolean;
    modality: any;
    /**
     * Event handler for MOUSE_DOWN during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingMouseDownCallback(evt: Object): undefined;
    /**
     * Event handler for MOUSE_MOVE during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingMouseMoveCallback(evt: Object): undefined;
    /**
     * Event handler for MOUSE_DRAG during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingMouseDragCallback(evt: Object): undefined;
    /**
     * Event handler for MOUSE_UP during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingMouseUpCallback(evt: Object): undefined;
    /**
     * Event handler for MOUSE_DOUBLE_CLICK during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingMouseDoubleClickCallback(evt: Object): undefined;
    /**
     * Event handler for MOUSE_UP during handle drag event loop.
     *
     * @private
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    private _editMouseUpCallback;
    /**
     * Event handler for MOUSE_DRAG during handle drag event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _editMouseDragCallback(evt: Object): undefined;
    /**
     * Event handler for TOUCH_START during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingTouchStartCallback(evt: Object): undefined;
    /**
     * Event handler for TOUCH_DRAG during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingTouchDragCallback(evt: Object): undefined;
    /**
     * Event handler for DOUBLE_TAP during drawing event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _drawingDoubleTapClickCallback(evt: Object): undefined;
    /**
     * Event handler for TOUCH_DRAG during handle drag event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {void}
     */
    _editTouchDragCallback(evt: Object): void;
    throttledUpdateCachedStats: any;
    createNewMeasurement(eventData: any): {
        visible: boolean;
        active: boolean;
        invalidated: boolean;
        color: undefined;
        handles: {
            points: never[];
        };
    } | undefined;
    finished: boolean | undefined;
    /**
     *
     *
     * @param {*} element element
     * @param {*} data data
     * @param {*} coords coords
     * @returns {Boolean}
     */
    pointNearTool(element: any, data: any, coords: any): boolean;
    _pointNearLine(element: any, data: any, coords: any): boolean;
    _isPointNearLine(element: any, coords: any, data: any): boolean;
    /**
     * @param {*} element
     * @param {*} data
     * @param {*} coords
     * @returns {number} the distance in px from the provided coordinates to the
     * closest rendered portion of the annotation. -1 if the distance cannot be
     * calculated.
     */
    distanceFromPoint(element: any, data: any, coords: any): number;
    /**
     * @param {*} element
     * @param {*} data
     * @param {*} coords
     * @returns {number} the distance in canvas units from the provided coordinates to the
     * closest rendered portion of the annotation. -1 if the distance cannot be
     * calculated.
     */
    distanceFromPointCanvas(element: any, data: any, coords: any): number;
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
    updateCachedStats(image: Object, element: Object, data: Object): void;
    /**
     *
     *
     * @param {*} evt
     * @returns {undefined}
     */
    renderToolData(evt: any): undefined;
    data: any;
    addNewMeasurement(evt: any): void;
    preMouseDownCallback(evt: any): boolean;
    handleSelectedCallback(evt: any, toolData: any, handle: any, interactionType?: string): void;
    _drawingDrag(evt: any): void;
    /** Ends the active drawing loop and completes the polygon.
     *
     * @public
     * @param {Object} element - The element on which the roi is being drawn.
     * @returns {null}
     */
    public completeDrawing(element: Object): null;
    currentTool: any;
    dragged: boolean | undefined;
    modifying: any;
    attention: string | undefined;
    /**
     * Event handler for MOUSE_DRAG during handle drag event loop.
     *
     * @event
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    _editMouseDragAllCallback(evt: Object): undefined;
    /**
     * Returns the previous handle to the current one.
     * @param {Number} currentHandle - the current handle index
     * @param {Array} points - the handles Array of the freehand data
     * @returns {Number} - The index of the previos handle
     */
    _getPrevHandleIndex(currentHandle: number, points: any[]): number;
    element: any;
    _editMouseUpAllCallback(evt: any): void;
    modifyingAll: any;
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
    private _dropHandle;
    /**
     * Begining of drawing loop when tool is active and a click event happens far
     * from existing handles.
     *
     * @private
     * @param {Object} evt - The event.
     * @returns {undefined}
     */
    private _startDrawing;
    _activeDrawingToolReference: any;
    /**
     * Adds a point on mouse click in polygon mode.
     *
     * @private
     * @param {Object} eventData - data object associated with an event.
     * @returns {undefined}
     */
    private _addPoint;
    /**
     * If in pencilMode, check the mouse position is farther than the minimum
     * distance between points, then add a point.
     *
     * @private
     * @param {Object} eventData - Data object associated with an event.
     * @param {Object} points - Data object associated with the tool.
     * @returns {undefined}
     */
    private _addPointPencilMode;
    /**
     * Ends the active drawing loop and completes the polygon.
     *
     * @private
     * @param {Object} element - The element on which the roi is being drawn.
     * @param {Object} handleNearby - the handle nearest to the mouse cursor.
     * @returns {undefined}
     */
    private _endDrawing;
    /**
     * Returns a handle of a particular tool if it is close to the mouse cursor
     *
     * @private
     * @param {Object} element - The element on which the roi is being drawn.
     * @param {Object} data      Data object associated with the tool.
     * @param {*} coords
     * @returns {Number|Object|Boolean}
     */
    private _pointNearHandle;
    /**
     * Returns a handle if it is close to the mouse cursor (all tools)
     *
     * @private
     * @param {Object} eventData - data object associated with an event.
     * @returns {Object}
     */
    private _pointNearHandleAllTools;
    /**
     * Gets the current mouse location and stores it in the configuration object.
     *
     * @private
     * @param {Object} eventData The data assoicated with the event.
     * @returns {undefined}
     */
    private _getMouseLocation;
    /**
     * Returns true if the proposed location of a new handle is invalid.
     *
     * @private
     * @param {Object} data      Data object associated with the tool.
     * @param {Object} eventData The data assoicated with the event.
     * @returns {Boolean}
     */
    private _checkInvalidHandleLocation;
    /**
     * Returns true if the proposed location of a new handle is invalid (in polygon mode).
     *
     * @private
     *
     * @param {Object} data - data object associated with the tool.
     * @param {Object} eventData The data assoicated with the event.
     * @returns {Boolean}
     */
    private _checkHandlesPolygonMode;
    /**
     * Returns true if the proposed location of a new handle is invalid (in pencilMode).
     *
     * @private
     * @param {Object} data - data object associated with the tool.
     * @param {Object} eventData The data associated with the event.
     * @returns {Boolean}
     */
    private _checkHandlesPencilMode;
    /**
     * Returns true if the mouse position is far enough from previous points (in pencilMode).
     *
     * @private
     * @param {Object} data - data object associated with the tool.
     * @param {Object} eventData The data associated with the event.
     * @returns {Boolean}
     */
    private _invalidHandlePencilMode;
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
    private _isDistanceSmallerThanCompleteSpacingCanvas;
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
    private _isDistanceSmallerThanSpacing;
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
    private _isDistanceLargerThanSpacing;
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
    private _compareDistanceToSpacing;
    /**
     * Adds drawing loop event listeners.
     *
     * @private
     * @param {Object} element - The viewport element to add event listeners to.
     * @param {string} interactionType - The interactionType used for the loop.
     * @modifies {element}
     * @returns {undefined}
     */
    private _activateDraw;
    _drawingInteractionType: string | null | undefined;
    /**
     * Removes drawing loop event listeners.
     *
     * @private
     * @param {Object} element - The viewport element to add event listeners to.
     * @modifies {element}
     * @returns {undefined}
     */
    private _deactivateDraw;
    /**
     * Adds modify loop event listeners.
     *
     * @private
     * @param {Object} element - The viewport element to add event listeners to.
     * @modifies {element}
     * @returns {undefined}
     */
    private _activateModify;
    _activateModifyAll(element: any): void;
    /**
     * Removes modify loop event listeners.
     *
     * @private
     * @param {Object} element - The viewport element to add event listeners to.
     * @modifies {element}
     * @returns {undefined}
     */
    private _deactivateModify;
    _deactivateModifyAll(element: any): void;
    passiveCallback(element: any): void;
    enabledCallback(element: any): void;
    disabledCallback(element: any): void;
    _closeToolIfDrawing(element: any): void;
    /**
     * Fire MEASUREMENT_MODIFIED event on provided element
     * @param {any} element which freehand data has been modified
     * @param {any} measurementData the measurment data
     * @returns {void}
     */
    fireModifiedEvent(element: any, measurementData: any): void;
    fireCompletedEvent(element: any, measurementData: any): void;
    set spacing(value: any);
    get spacing(): any;
    set activeHandleRadius(value: any);
    get activeHandleRadius(): any;
    set completeHandleRadius(value: any);
    get completeHandleRadius(): any;
    set alwaysShowHandles(value: any);
    get alwaysShowHandles(): any;
    set invalidColor(value: any);
    get invalidColor(): any;
    /**
     * Ends the active drawing loop and removes the polygon.
     *
     * @public
     * @param {Object} element - The element on which the roi is being drawn.
     * @returns {null}
     */
    public cancelDrawing(element: Object): null;
    /**
     * New image event handler.
     *
     * @public
     * @param  {Object} evt The event.
     * @returns {null}
     */
    public newImageCallback(evt: Object): null;
}
