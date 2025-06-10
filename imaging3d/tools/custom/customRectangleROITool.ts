import * as cornerstoneTools from "@cornerstonejs/tools";
import * as cornerstone from "@cornerstonejs/core";
import type { Types } from "@cornerstonejs/core";
import { ROICachedStats } from "@cornerstonejs/tools/dist/esm/types/ToolSpecificAnnotationTypes";
import {
  EventTypes,
  ToolHandle,
  TextBoxHandle,
  PublicToolProps,
  ToolProps,
  SVGDrawingHelper,
  Annotation
} from "@cornerstonejs/tools/dist/esm/types";
import { annotation } from "@cornerstonejs/tools";
import { Point2, Point3 } from "@cornerstonejs/core/dist/esm/types";
import { StyleSpecifier } from "./customLengthTool";
import { VolumeViewport } from "@cornerstonejs/core";
const {
  getAnnotations,
  addAnnotation,
  removeAnnotation,
  triggerAnnotationCompleted,
  triggerAnnotationModified
} = annotation.state;
const { isAnnotationVisible } = annotation.visibility;
const { isAnnotationLocked } = annotation.locking;
const AnnotationTool = cornerstoneTools.AnnotationTool;
const getEnabledElement = cornerstone.getEnabledElement;
const getEnabledElementByViewportId = cornerstone.getEnabledElementByViewportId;

const utilities = cornerstone.utilities;
const enums = cornerstoneTools.Enums;
const Events = enums.Events;
const ChangeTypes = enums.ChangeTypes;

const getPixelValueUnits = cornerstoneTools.utilities.getPixelValueUnits;
const isViewportPreScaled =
  cornerstoneTools.utilities.viewport.isViewportPreScaled;
const getCalibratedLengthUnitsAndScale =
  cornerstoneTools.utilities.getCalibratedLengthUnitsAndScale;
const throttle = cornerstoneTools.utilities.throttle;
const rectangle = cornerstoneTools.utilities.math.rectangle;
const getWorldWidthAndHeightFromCorners =
  cornerstoneTools.utilities.planar.getWorldWidthAndHeightFromCorners;

const BasicStatsCalculator =
  cornerstoneTools.utilities.math.BasicStatsCalculator;
const drawHandlesSvg = cornerstoneTools.drawing.drawHandles;
const drawLinkedTextBoxSvg = cornerstoneTools.drawing.drawLinkedTextBox;
const drawRectSvg = cornerstoneTools.drawing.drawRectByCoordinates;
const getTextBoxCoordsCanvas =
  cornerstoneTools.utilities.drawing.getTextBoxCoordsCanvas;
const state = cornerstoneTools.store.state;
const getViewportIdsWithToolToRender =
  cornerstoneTools.utilities.viewportFilters.getViewportIdsWithToolToRender;

const triggerAnnotationRenderForViewportIds =
  cornerstoneTools.utilities.triggerAnnotationRenderForViewportIds;
const resetElementCursor =
  cornerstoneTools.cursors.elementCursor.resetElementCursor;
const hideElementCursor =
  cornerstoneTools.cursors.elementCursor.hideElementCursor;

const { transformWorldToIndex } = utilities;

export interface RectangleROIAnnotation extends Annotation {
  data: {
    handles: {
      points: Types.Point3[];
      activeHandleIndex: number | null;
      textBox: {
        hasMoved: boolean;
        worldPosition: Types.Point3;
        worldBoundingBox: {
          topLeft: Types.Point3;
          topRight: Types.Point3;
          bottomLeft: Types.Point3;
          bottomRight: Types.Point3;
        };
      };
    };
    label: string;
    cachedStats?: ROICachedStats;
  };
}
/**
 * RectangleROIAnnotation let you draw annotations that measures the statistics
 * such as area, max, mean and stdDev of a Rectangular region of interest.
 * You can use RectangleROIAnnotation in all perpendicular views (axial, sagittal, coronal).
 * Note: annotation tools in cornerstone3DTools exists in the exact location
 * in the physical 3d space, as a result, by default, all annotations that are
 * drawing in the same frameOfReference will get shared between viewports that
 * are in the same frameOfReference. RectangleROI tool's text box lines are dynamically
 * generated based on the viewport's underlying Modality. For instance, if
 * the viewport is displaying CT, the text box will shown the statistics in Hounsfield units,
 * and if the viewport is displaying PET, the text box will show the statistics in
 * SUV units.
 *
 * The resulting annotation's data (statistics) and metadata (the
 * state of the viewport while drawing was happening) will get added to the
 * ToolState manager and can be accessed from the ToolState by calling getAnnotations
 * or similar methods.
 *
 * ```js
 * cornerstoneTools.addTool(RectangleROITool)
 *
 * const toolGroup = ToolGroupManager.createToolGroup('toolGroupId')
 *
 * toolGroup.addTool(RectangleROITool.toolName)
 *
 * toolGroup.addViewport('viewportId', 'renderingEngineId')
 *
 * toolGroup.setToolActive(RectangleROITool.toolName, {
 *   bindings: [
 *    {
 *       mouseButton: MouseBindings.Primary, // Left Click
 *     },
 *   ],
 * })
 * ```
 *
 * Read more in the Docs section of the website.
 */

class CustomRectangleROITool extends AnnotationTool {
  static toolName = "CustomRectangleROI";

  _throttledCalculateCachedStats: Function;
  editData: {
    annotation: Annotation;
    viewportIdsToRender: string[];
    handleIndex?: number;
    movingTextBox?: boolean;
    newAnnotation?: boolean;
    hasMoved?: boolean;
  } | null = null;
  isDrawing: boolean = false;
  isHandleOutsideImage: boolean = false;
  public isMoving: boolean = false;
  public isResizing: boolean = false;
  constructor(
    toolProps: PublicToolProps = {},
    defaultToolProps: ToolProps = {
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        // Whether to store point data in the annotation
        storePointData: false,
        shadow: true,
        preventHandleOutsideImage: false,
        calculateStats: true,
        getTextLines: defaultGetTextLines,
        statsCalculator: BasicStatsCalculator
      }
    }
  ) {
    super(toolProps, defaultToolProps);

    this._throttledCalculateCachedStats = throttle(
      this._calculateCachedStats,
      100,
      { trailing: true }
    );
  }

  private _getConstrainedDeltaForAnnotation = (
    newPositions: number[][],
    viewport: any,
    data: any
  ): number[] => {
    const image = this.getTargetImageData(this.getTargetId(viewport)!);
    if (!image) {
      const points = data.handles!.points;
      return newPositions.length > 0
        ? [
            newPositions[0][0] - points![0][0],
            newPositions[0][1] - points![0][1],
            newPositions[0][2] - points![0][2]
          ]
        : [0, 0, 0];
    }

    const { imageData, dimensions } = image;
    const points = data.handles!.points;

    const requestedDelta =
      newPositions.length > 0
        ? [
            newPositions[0][0] - points![0][0],
            newPositions[0][1] - points![0][1],
            newPositions[0][2] - points![0][2]
          ]
        : [0, 0, 0];

    let constrainedDelta = [...requestedDelta];

    for (let i = 0; i < newPositions.length; i++) {
      const currentWorldPos = points![i];
      const newWorldPos = newPositions[i] as Point3;

      const newIndexPos = transformWorldToIndex(imageData, newWorldPos);

      // Constrain the new index position to image bounds
      const constrainedIndexPos: Types.Point3 = [
        Math.max(0, Math.min(dimensions[0] - 1, newIndexPos[0])),
        Math.max(0, Math.min(dimensions[1] - 1, newIndexPos[1])),
        Math.max(0, Math.min(dimensions[2] - 1, newIndexPos[2]))
      ];

      const constrainedWorldPos = utilities.transformIndexToWorld(
        imageData,
        constrainedIndexPos
      );

      // Calculate the actual allowed delta for this point
      const actualDelta = [
        constrainedWorldPos[0] - currentWorldPos[0],
        constrainedWorldPos[1] - currentWorldPos[1],
        constrainedWorldPos[2] - currentWorldPos[2]
      ];

      // Use the most restrictive delta across all points
      for (let axis = 0; axis < 3; axis++) {
        if (Math.abs(actualDelta[axis]) < Math.abs(constrainedDelta[axis])) {
          constrainedDelta[axis] = actualDelta[axis];
        }
      }
    }

    return constrainedDelta;
  };

  private _constrainPointToImageBounds = (
    worldPos: Types.Point3,
    viewport: any
  ): Types.Point3 => {
    const image = this.getTargetImageData(this.getTargetId(viewport)!);
    if (!image) {
      return worldPos;
    }

    const { imageData, dimensions } = image;
    const indexPos = transformWorldToIndex(imageData, worldPos);

    // Constrain to image bounds
    const constrainedIndex: Types.Point3 = [
      Math.max(0, Math.min(dimensions[0] - 1, indexPos[0])),
      Math.max(0, Math.min(dimensions[1] - 1, indexPos[1])),
      Math.max(0, Math.min(dimensions[2] - 1, indexPos[2]))
    ];

    // Convert back to world coordinates
    const constrainedWorld = utilities.transformIndexToWorld(
      imageData,
      constrainedIndex
    );
    return constrainedWorld;
  };

  // Modified _dragCallback method
  _dragCallback = (evt: EventTypes.InteractionEventType): void => {
    this.isDrawing = true;

    const eventDetail = evt.detail;
    const { element } = eventDetail;

    const {
      annotation,
      viewportIdsToRender,
      handleIndex,
      movingTextBox,
      newAnnotation
    } = this.editData!;

    this.createMemo(element, annotation, { newAnnotation });
    const { data } = annotation;
    const enabledElement = getEnabledElement(element);
    const viewport = enabledElement!.viewport;

    if (movingTextBox) {
      // Drag mode - Move the text boxes world position
      const { deltaPoints } = eventDetail as EventTypes.MouseDragEventDetail;
      const worldPosDelta = deltaPoints.world;

      const { textBox } = data.handles!;
      const { worldPosition } = textBox!;

      worldPosition![0] += worldPosDelta[0];
      worldPosition![1] += worldPosDelta[1];
      worldPosition![2] += worldPosDelta[2];

      textBox!.hasMoved = true;
    } else if (handleIndex === undefined) {
      // Drag mode - Moving tool, so move all points by the world points delta
      const { deltaPoints } = eventDetail as EventTypes.MouseDragEventDetail;
      const worldPosDelta = deltaPoints.world;

      const { points } = data.handles!;

      // Calculate new positions for all points
      const newPositions = points!.map((point: Point3) => [
        point[0] + worldPosDelta[0],
        point[1] + worldPosDelta[1],
        point[2] + worldPosDelta[2]
      ]);

      // Get constrained delta
      const constrainedDelta = this._getConstrainedDeltaForAnnotation(
        newPositions,
        viewport,
        data
      );

      // Apply constrained delta to all points
      points!.forEach((point: Point3) => {
        point[0] += constrainedDelta[0];
        point[1] += constrainedDelta[1];
        point[2] += constrainedDelta[2];
      });

      annotation.invalidated = true;
    } else {
      // Moving handle - constrain the handle position
      const { currentPoints } = eventDetail;
      const { worldToCanvas, canvasToWorld } = viewport;
      let worldPos = currentPoints.world;

      // Constrain the handle position to image bounds
      worldPos = this._constrainPointToImageBounds(worldPos, viewport);

      const { points } = data.handles!;

      // Move this handle
      points![handleIndex] = [...worldPos];

      let bottomLeftCanvas;
      let bottomRightCanvas;
      let topLeftCanvas;
      let topRightCanvas;

      let bottomLeftWorld;
      let bottomRightWorld;
      let topLeftWorld;
      let topRightWorld;

      switch (handleIndex) {
        case 0:
        case 3:
          // Moving bottomLeft or topRight
          bottomLeftCanvas = worldToCanvas(points![0]);
          topRightCanvas = worldToCanvas(points![3]);

          bottomRightCanvas = [topRightCanvas[0], bottomLeftCanvas[1]];
          topLeftCanvas = [bottomLeftCanvas[0], topRightCanvas[1]];

          bottomRightWorld = canvasToWorld(bottomRightCanvas as Point2);
          topLeftWorld = canvasToWorld(topLeftCanvas as Point2);

          // Constrain the calculated points
          points![1] = this._constrainPointToImageBounds(
            bottomRightWorld,
            viewport
          );
          points![2] = this._constrainPointToImageBounds(
            topLeftWorld,
            viewport
          );
          break;

        case 1:
        case 2:
          // Moving bottomRight or topLeft
          bottomRightCanvas = worldToCanvas(points![1]);
          topLeftCanvas = worldToCanvas(points![2]);

          bottomLeftCanvas = <Types.Point2>[
            topLeftCanvas[0],
            bottomRightCanvas[1]
          ];
          topRightCanvas = <Types.Point2>[
            bottomRightCanvas[0],
            topLeftCanvas[1]
          ];

          bottomLeftWorld = canvasToWorld(bottomLeftCanvas);
          topRightWorld = canvasToWorld(topRightCanvas);

          // Constrain the calculated points
          points![0] = this._constrainPointToImageBounds(
            bottomLeftWorld,
            viewport
          );
          points![3] = this._constrainPointToImageBounds(
            topRightWorld,
            viewport
          );
          break;
      }
      annotation.invalidated = true;
    }

    this.editData!.hasMoved = true;

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);

    if (annotation.invalidated) {
      triggerAnnotationModified(
        annotation,
        element,
        ChangeTypes.HandlesUpdated
      );
    }
  };

  // Modified addNewAnnotation method
  addNewAnnotation = (
    evt: EventTypes.InteractionEventType
  ): RectangleROIAnnotation => {
    const eventDetail = evt.detail;
    const { currentPoints, element } = eventDetail;
    let worldPos = currentPoints.world;

    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement!;

    // Constrain the initial position to image bounds
    worldPos = this._constrainPointToImageBounds(worldPos, viewport);

    this.isDrawing = true;

    const annotation = (<typeof AnnotationTool>(
      this.constructor
    )).createAnnotationForViewport<RectangleROIAnnotation>(viewport, {
      data: {
        handles: {
          points: [
            <Types.Point3>[...worldPos],
            <Types.Point3>[...worldPos],
            <Types.Point3>[...worldPos],
            <Types.Point3>[...worldPos]
          ],
          textBox: {
            hasMoved: false,
            worldPosition: <Types.Point3>[0, 0, 0],
            worldBoundingBox: {
              topLeft: <Types.Point3>[0, 0, 0],
              topRight: <Types.Point3>[0, 0, 0],
              bottomLeft: <Types.Point3>[0, 0, 0],
              bottomRight: <Types.Point3>[0, 0, 0]
            }
          }
        },
        cachedStats: {}
      }
    });

    addAnnotation(annotation, element);

    const viewportIdsToRender = getViewportIdsWithToolToRender(
      element,
      this.getToolName()
    );

    this.editData = {
      annotation,
      viewportIdsToRender,
      handleIndex: 3,
      movingTextBox: false,
      newAnnotation: true,
      hasMoved: false
    };
    this._activateDraw(element);

    hideElementCursor(element);

    evt.preventDefault();

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);

    return annotation;
  };
  _getViewportsInfo = () => {
    const viewports = cornerstoneTools.ToolGroupManager.getToolGroup(
      this.toolGroupId
    )?.viewportsInfo;
    return viewports;
  };
  onSetToolActive() {
    const elementIds = this._getViewportsInfo()?.map(
      viewport => viewport.viewportId
    );

    elementIds?.forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;

      element.addEventListener(
        Events.MOUSE_MOVE,
        this._mouseMoveCallback as EventListener
      );
      element.addEventListener(
        Events.MOUSE_DRAG,
        this._mouseMoveCallback as EventListener
      );
    });
  }

  _mouseMoveCallback = (evt: EventTypes.InteractionEventType): void => {
    if (evt.detail.currentPoints && evt.detail.element) {
      const coords = evt.detail.currentPoints.canvas;
      const element = evt.detail.element;

      const currentState = this.getCurrentOperationState();

      const nearHandle = this.isNearHandle(element, coords);
      const nearMeas = this.isNearMeasurement(element, coords);
      this.setCursor(currentState, element, nearHandle, nearMeas);
    }
  };
  isNearHandle = (element: HTMLDivElement, coords: Types.Point2): boolean => {
    const annotations = getAnnotations(this.getToolName(), element);
    if (!annotations?.length) return false;

    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement!;

    for (const annotation of annotations) {
      const lengthAnnotation = annotation as RectangleROIAnnotation;

      if (
        !isAnnotationVisible(lengthAnnotation.annotationUID!) ||
        isAnnotationLocked(lengthAnnotation.annotationUID!)
      ) {
        continue;
      }

      const { data } = lengthAnnotation;
      const points = data.handles.points;

      for (let i = 0; i < points.length; i++) {
        const canvasPoint = viewport.worldToCanvas(points[i]);
        const distance = Math.sqrt(
          Math.pow(canvasPoint[0] - coords[0], 2) +
            Math.pow(canvasPoint[1] - coords[1], 2)
        );

        if (distance <= 6) {
          return true;
        }
      }
    }

    return false;
  };
  isNearMeasurement = (
    element: HTMLDivElement,
    coords: Types.Point2
  ): boolean => {
    const annotations = getAnnotations(this.getToolName(), element);
    if (!annotations?.length) return false;

    for (const annotation of annotations) {
      const lengthAnnotation = annotation as RectangleROIAnnotation;

      if (
        !isAnnotationVisible(lengthAnnotation.annotationUID!) ||
        isAnnotationLocked(lengthAnnotation.annotationUID!)
      ) {
        continue;
      }

      if (this.isPointNearTool(element, lengthAnnotation, coords, 6)) {
        return true;
      }
    }

    return false;
  };
  getCurrentOperationState(): "READY" | "DRAWING" | "MODIFYING" | "MOVING" {
    if (this.isDrawing) return "DRAWING";
    if (this.isResizing) return "MODIFYING";
    if (this.isMoving) return "MOVING";
    return "READY";
  }

  setCursor(
    state: "READY" | "DRAWING" | "MODIFYING" | "MOVING",
    element: HTMLDivElement,
    nearHandle: boolean,
    nearMeas: boolean
  ) {
    let cursor: any;
    switch (state) {
      case "READY":
        cursor = this.toolName;
        if (nearMeas) cursor = "move";
        if (nearHandle) cursor = "resize";
        break;

      case "DRAWING":
        cursor = this.toolName;
        break;

      case "MODIFYING":
        cursor = "resize";
        break;

      case "MOVING":
        cursor = "move";
        break;
    }
    cornerstoneTools.cursors.setCursorForElement(element, cursor);
  }

  /**
   * It returns if the canvas point is near the provided annotation in the provided
   * element or not. A proximity is passed to the function to determine the
   * proximity of the point to the annotation in number of pixels.
   *
   * @param element - HTML Element
   * @param annotation - Annotation
   * @param canvasCoords - Canvas coordinates
   * @param proximity - Proximity to tool to consider
   * @returns Boolean, whether the canvas point is near tool
   */
  isPointNearTool = (
    element: HTMLDivElement,
    annotation: RectangleROIAnnotation,
    canvasCoords: Types.Point2,
    proximity: number
  ): boolean => {
    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement!;

    const { data } = annotation;
    const { points } = data.handles;

    const canvasPoint1 = viewport.worldToCanvas(points[0]);
    const canvasPoint2 = viewport.worldToCanvas(points[3]);

    const rect = this._getRectangleImageCoordinates([
      canvasPoint1,
      canvasPoint2
    ]);

    const point = [canvasCoords[0], canvasCoords[1]];
    const { left, top, width, height } = rect;

    const distanceToPoint = rectangle.distanceToPoint(
      [left, top, width, height],
      point as Types.Point2
    );

    if (distanceToPoint <= proximity) {
      return true;
    }

    return false;
  };

  toolSelectedCallback = (
    evt: EventTypes.InteractionEventType,
    annotation: RectangleROIAnnotation
  ): void => {
    const eventDetail = evt.detail;
    const { element } = eventDetail;

    annotation.highlighted = true;

    const viewportIdsToRender = getViewportIdsWithToolToRender(
      element,
      this.getToolName()
    );

    this.editData = {
      annotation,
      viewportIdsToRender,
      movingTextBox: false
    };
    this.isMoving = true;
    this._activateModify(element);

    hideElementCursor(element);

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);

    evt.preventDefault();
  };

  handleSelectedCallback = (
    evt: EventTypes.InteractionEventType,
    annotation: RectangleROIAnnotation,
    handle: ToolHandle
  ): void => {
    const eventDetail = evt.detail;
    const { element } = eventDetail;
    const { data } = annotation;

    annotation.highlighted = true;

    let movingTextBox = false;
    let handleIndex;

    if ((handle as TextBoxHandle).worldPosition) {
      movingTextBox = true;
    } else {
      handleIndex = data.handles.points.findIndex(
        (p: ToolHandle) => p === handle
      );
    }

    // Find viewports to render on drag.
    const viewportIdsToRender = getViewportIdsWithToolToRender(
      element,
      this.getToolName()
    );

    this.editData = {
      annotation,
      viewportIdsToRender,
      handleIndex,
      movingTextBox
    };
    this.isResizing = true;
    this._activateModify(element);

    hideElementCursor(element);

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);

    evt.preventDefault();
  };

  _endCallback = (evt: EventTypes.InteractionEventType): void => {
    const eventDetail = evt.detail;
    const { element } = eventDetail;

    const { annotation, viewportIdsToRender, newAnnotation, hasMoved } =
      this.editData!;
    const { data } = annotation;

    if (newAnnotation && !hasMoved) {
      return;
    }

    data.handles!.activeHandleIndex = null;

    this._deactivateModify(element);
    this._deactivateDraw(element);

    resetElementCursor(element);

    this.doneEditMemo();

    this.editData = null;
    this.isDrawing = false;
    this.isMoving = false;
    this.isResizing = false;

    if (
      this.isHandleOutsideImage &&
      this.configuration.preventHandleOutsideImage
    ) {
      removeAnnotation(annotation.annotationUID!);
    }

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);

    if (newAnnotation) {
      triggerAnnotationCompleted(annotation);
    }
  };

  cancel = (element: HTMLDivElement) => {
    // If it is mid-draw or mid-modify
    if (this.isDrawing) {
      this.isDrawing = false;
      this._deactivateDraw(element);
      this._deactivateModify(element);
      resetElementCursor(element);

      const { annotation, viewportIdsToRender, newAnnotation } = this.editData!;

      const { data } = annotation;

      annotation.highlighted = false;
      data.handles!.activeHandleIndex = null;

      triggerAnnotationRenderForViewportIds(viewportIdsToRender);

      if (newAnnotation) {
        triggerAnnotationCompleted(annotation);
      }

      this.editData = null;
      return annotation.annotationUID;
    }
  };
  /**
   * Add event handlers for the modify event loop, and prevent default event prapogation.
   */
  _activateDraw = (element: any) => {
    state.isInteractingWithTool = true;

    element.addEventListener(Events.MOUSE_UP, this._endCallback);
    element.addEventListener(Events.MOUSE_DRAG, this._dragCallback);
    element.addEventListener(Events.MOUSE_MOVE, this._dragCallback);
    element.addEventListener(Events.MOUSE_CLICK, this._endCallback);

    element.addEventListener(Events.TOUCH_END, this._endCallback);
    element.addEventListener(Events.TOUCH_DRAG, this._dragCallback);
    element.addEventListener(Events.TOUCH_TAP, this._endCallback);
  };

  /**
   * Add event handlers for the modify event loop, and prevent default event prapogation.
   */
  _deactivateDraw = (element: any) => {
    state.isInteractingWithTool = false;

    element.removeEventListener(Events.MOUSE_UP, this._endCallback);
    element.removeEventListener(Events.MOUSE_DRAG, this._dragCallback);
    element.removeEventListener(Events.MOUSE_MOVE, this._dragCallback);
    element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);

    element.removeEventListener(Events.TOUCH_END, this._endCallback);
    element.removeEventListener(Events.TOUCH_DRAG, this._dragCallback);
    element.removeEventListener(Events.TOUCH_TAP, this._endCallback);
  };

  /**
   * Add event handlers for the modify event loop, and prevent default event prapogation.
   */
  _activateModify = (element: any) => {
    state.isInteractingWithTool = true;

    element.addEventListener(Events.MOUSE_UP, this._endCallback);
    element.addEventListener(Events.MOUSE_DRAG, this._dragCallback);
    element.addEventListener(Events.MOUSE_CLICK, this._endCallback);

    element.addEventListener(Events.TOUCH_END, this._endCallback);
    element.addEventListener(Events.TOUCH_DRAG, this._dragCallback);
    element.addEventListener(Events.TOUCH_TAP, this._endCallback);
  };

  /**
   * Remove event handlers for the modify event loop, and enable default event propagation.
   */
  _deactivateModify = (element: any) => {
    state.isInteractingWithTool = false;

    element.removeEventListener(Events.MOUSE_UP, this._endCallback);
    element.removeEventListener(Events.MOUSE_DRAG, this._dragCallback);
    element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);

    element.removeEventListener(Events.TOUCH_END, this._endCallback);
    element.removeEventListener(Events.TOUCH_DRAG, this._dragCallback);
    element.removeEventListener(Events.TOUCH_TAP, this._endCallback);
  };

  /**
   * it is used to draw the rectangleROI annotation in each
   * request animation frame. It calculates the updated cached statistics if
   * data is invalidated and cache it.
   *
   * @param enabledElement - The Cornerstone's enabledElement.
   * @param svgDrawingHelper - The svgDrawingHelper providing the context for drawing.
   */
  renderAnnotation = (
    enabledElement: Types.IEnabledElement,
    svgDrawingHelper: SVGDrawingHelper
  ): boolean => {
    let renderStatus = false;
    const { viewport } = enabledElement;
    const { element } = viewport;

    let annotations = getAnnotations(this.getToolName(), element);

    if (!annotations?.length) {
      return renderStatus;
    }

    annotations = this.filterInteractableAnnotationsForElement(
      element,
      annotations
    );

    if (!annotations?.length) {
      return renderStatus;
    }

    const targetId = this.getTargetId(viewport);
    const renderingEngine = viewport.getRenderingEngine();

    const styleSpecifier: StyleSpecifier = {
      toolGroupId: this.toolGroupId,
      toolName: this.getToolName(),
      viewportId: enabledElement.viewport.id
    };

    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations[i] as RectangleROIAnnotation;
      const { annotationUID, data } = annotation;
      const { points, activeHandleIndex } = data.handles;
      const canvasCoordinates = points.map((p: Point3) =>
        viewport.worldToCanvas(p)
      );

      styleSpecifier.annotationUID = annotationUID;

      const { color, lineWidth, lineDash } = this.getAnnotationStyle({
        annotation,
        styleSpecifier
      });

      const { viewPlaneNormal, viewUp } = viewport.getCamera();

      // If cachedStats does not exist, or the unit is missing (as part of import/hydration etc.),
      // force to recalculate the stats from the points
      if (
        !data.cachedStats![targetId!] ||
        data.cachedStats![targetId!].areaUnit == null
      ) {
        data.cachedStats![targetId!] = {
          Modality: null,
          area: null,
          max: null,
          mean: null,
          stdDev: null,
          areaUnit: null
        } as any;

        this._calculateCachedStats(
          annotation,
          viewPlaneNormal!,
          viewUp!,
          renderingEngine,
          enabledElement
        );
      } else if (annotation.invalidated) {
        this._throttledCalculateCachedStats(
          annotation,
          viewPlaneNormal,
          viewUp,
          renderingEngine,
          enabledElement
        );

        // If the invalidated data is as a result of volumeViewport manipulation
        // of the tools, we need to invalidate the related stackViewports data if
        // they are not at the referencedImageId, so that
        // when scrolling to the related slice in which the tool were manipulated
        // we re-render the correct tool position. This is due to stackViewport
        // which doesn't have the full volume at each time, and we are only working
        // on one slice at a time.
        if (viewport instanceof VolumeViewport) {
          const { referencedImageId } = annotation.metadata;

          // invalidate all the relevant stackViewports if they are not
          // at the referencedImageId
          for (const targetId in data.cachedStats) {
            if (targetId.startsWith("imageId")) {
              const viewports = renderingEngine.getStackViewports();

              const invalidatedStack = viewports.find(vp => {
                // The stack viewport that contains the imageId but is not
                // showing it currently
                const referencedImageURI = utilities.imageIdToURI(
                  referencedImageId!
                );
                const hasImageURI = vp.hasImageURI(referencedImageURI);
                const currentImageURI = utilities.imageIdToURI(
                  vp.getCurrentImageId()
                );
                return hasImageURI && currentImageURI !== referencedImageURI;
              });

              if (invalidatedStack) {
                delete data.cachedStats[targetId];
              }
            }
          }
        }
      }

      // If rendering engine has been destroyed while rendering
      if (!viewport.getRenderingEngine()) {
        console.warn("Rendering Engine has been destroyed");
        return renderStatus;
      }

      let activeHandleCanvasCoords;

      if (!isAnnotationVisible(annotationUID!)) {
        continue;
      }

      if (
        !isAnnotationLocked(annotationUID!) &&
        !this.editData &&
        activeHandleIndex !== null
      ) {
        // Not locked or creating and hovering over handle, so render handle.
        activeHandleCanvasCoords = [canvasCoordinates[activeHandleIndex]];
      }

      if (canvasCoordinates.length) {
        const handleGroupUID = "0";

        drawHandlesSvg(
          svgDrawingHelper,
          annotationUID!,
          handleGroupUID,
          canvasCoordinates,
          {
            color
          }
        );
      }

      const dataId = `${annotationUID}-rect`;
      const rectangleUID = "0";
      drawRectSvg(
        svgDrawingHelper,
        annotationUID!,
        rectangleUID,
        canvasCoordinates,
        {
          color,
          lineDash,
          lineWidth
        },
        dataId
      );

      renderStatus = true;

      const options = this.getLinkedTextBoxStyle(styleSpecifier, annotation);
      if (!options.visibility) {
        data.handles.textBox = {
          hasMoved: false,
          worldPosition: <Types.Point3>[0, 0, 0],
          worldBoundingBox: {
            topLeft: <Types.Point3>[0, 0, 0],
            topRight: <Types.Point3>[0, 0, 0],
            bottomLeft: <Types.Point3>[0, 0, 0],
            bottomRight: <Types.Point3>[0, 0, 0]
          }
        };
        continue;
      }

      const textLines = this.configuration.getTextLines(data, targetId);
      if (!textLines || textLines.length === 0) {
        continue;
      }

      if (!data.handles.textBox.hasMoved) {
        const canvasTextBoxCoords = getTextBoxCoordsCanvas(canvasCoordinates);

        data.handles.textBox.worldPosition =
          viewport.canvasToWorld(canvasTextBoxCoords);
      }

      const textBoxPosition = viewport.worldToCanvas(
        data.handles.textBox.worldPosition
      );

      const textBoxUID = "1";
      const boundingBox = drawLinkedTextBoxSvg(
        svgDrawingHelper,
        annotationUID!,
        textBoxUID,
        textLines,
        textBoxPosition,
        canvasCoordinates,
        {},
        options
      );

      const { x: left, y: top, width, height } = boundingBox;

      data.handles.textBox.worldBoundingBox = {
        topLeft: viewport.canvasToWorld([left, top]),
        topRight: viewport.canvasToWorld([left + width, top]),
        bottomLeft: viewport.canvasToWorld([left, top + height]),
        bottomRight: viewport.canvasToWorld([left + width, top + height])
      };
    }

    return renderStatus;
  };

  _getRectangleImageCoordinates = (
    points: Array<Types.Point2>
  ): {
    left: number;
    top: number;
    width: number;
    height: number;
  } => {
    const [point0, point1] = points;

    return {
      left: Math.min(point0[0], point1[0]),
      top: Math.min(point0[1], point1[1]),
      width: Math.abs(point0[0] - point1[0]),
      height: Math.abs(point0[1] - point1[1])
    };
  };

  /**
   * _calculateCachedStats - For each volume in the frame of reference that a
   * tool instance in particular viewport defines as its target volume, find the
   * volume coordinates (i,j,k) being probed by the two corners. One of i,j or k
   * will be constant across the two points. In the other two directions iterate
   * over the voxels and calculate the first and second-order statistics.
   *
   * @param data - The annotation tool-specific data.
   * @param viewPlaneNormal - The normal vector of the camera.
   * @param viewUp - The viewUp vector of the camera.
   */
  _calculateCachedStats = (
    annotation: Annotation,
    viewPlaneNormal: Point3,
    viewUp: Point3,
    renderingEngine: any,
    enabledElement: any
  ) => {
    if (!this.configuration.calculateStats) {
      return;
    }
    const { data } = annotation;
    const { viewport } = enabledElement;
    const { element } = viewport;

    const worldPos1 = data.handles!.points![0];
    const worldPos2 = data.handles!.points![3];
    const { cachedStats } = data;

    const targetIds = Object.keys(cachedStats!);

    for (let i = 0; i < targetIds.length; i++) {
      const targetId = targetIds[i];

      const image = this.getTargetImageData(targetId);

      // If image does not exists for the targetId, skip. This can be due
      // to various reasons such as if the target was a volumeViewport, and
      // the volumeViewport has been decached in the meantime.
      if (!image) {
        continue;
      }

      const { dimensions, imageData, metadata, voxelManager } = image;

      const pos1Index = transformWorldToIndex(imageData, worldPos1);

      pos1Index[0] = Math.floor(pos1Index[0]);
      pos1Index[1] = Math.floor(pos1Index[1]);
      pos1Index[2] = Math.floor(pos1Index[2]);

      const pos2Index = transformWorldToIndex(imageData, worldPos2);

      pos2Index[0] = Math.floor(pos2Index[0]);
      pos2Index[1] = Math.floor(pos2Index[1]);
      pos2Index[2] = Math.floor(pos2Index[2]);

      // Check if one of the indexes are inside the volume, this then gives us
      // Some area to do stats over.

      if (this._isInsideVolume(pos1Index, pos2Index, dimensions)) {
        this.isHandleOutsideImage = false;

        // Calculate index bounds to iterate over

        const iMin = Math.min(pos1Index[0], pos2Index[0]);
        const iMax = Math.max(pos1Index[0], pos2Index[0]);

        const jMin = Math.min(pos1Index[1], pos2Index[1]);
        const jMax = Math.max(pos1Index[1], pos2Index[1]);

        const kMin = Math.min(pos1Index[2], pos2Index[2]);
        const kMax = Math.max(pos1Index[2], pos2Index[2]);

        const boundsIJK = [
          [iMin, iMax],
          [jMin, jMax],
          [kMin, kMax]
        ] as [Types.Point2, Types.Point2, Types.Point2];

        const { worldWidth, worldHeight } = getWorldWidthAndHeightFromCorners(
          viewPlaneNormal,
          viewUp,
          worldPos1,
          worldPos2
        );

        const handles = [pos1Index, pos2Index];
        const { scale, areaUnit } = getCalibratedLengthUnitsAndScale(
          image,
          handles
        );

        const area = Math.abs(worldWidth * worldHeight) / (scale * scale);

        const pixelUnitsOptions = {
          isPreScaled: isViewportPreScaled(viewport, targetId),

          isSuvScaled: this.isSuvScaled(
            viewport,
            targetId,
            annotation.metadata.referencedImageId
          )
        };

        const modalityUnit = getPixelValueUnits(
          metadata.Modality,
          annotation.metadata.referencedImageId!,
          pixelUnitsOptions
        );

        let pointsInShape;
        if (voxelManager) {
          pointsInShape = voxelManager.forEach(
            this.configuration.statsCalculator.statsCallback,
            {
              boundsIJK,
              imageData,
              returnPoints: this.configuration.storePointData
            }
          );
        }
        const stats =
          this.configuration.statsCalculator.BasicStatsCalculator.getStatistics();
        cachedStats![targetId] = {
          Modality: metadata.Modality,
          area,
          mean: stats.mean?.value,
          stdDev: stats.stdDev?.value,
          max: stats.max?.value,
          min: stats.min?.value,
          statsArray: stats.array,
          pointsInShape: pointsInShape,
          areaUnit,
          modalityUnit
        };
      } else {
        this.isHandleOutsideImage = true;
        cachedStats![targetId] = {
          Modality: metadata.Modality
        };
      }
    }

    const invalidated = annotation.invalidated;
    annotation.invalidated = false;

    // Dispatching annotation modified only if it was invalidated
    if (invalidated) {
      triggerAnnotationModified(annotation, element, ChangeTypes.StatsUpdated);
    }

    return cachedStats;
  };

  _isInsideVolume = (index1: Point3, index2: Point3, dimensions: Point3) => {
    return (
      utilities.indexWithinDimensions(index1, dimensions) &&
      utilities.indexWithinDimensions(index2, dimensions)
    );
  };

  static hydrate = (
    viewportId: string,
    points: Types.Point3[],
    options?: {
      annotationUID?: string;
      toolInstance?: CustomRectangleROITool;
      referencedImageId?: string;
      viewplaneNormal?: Types.Point3;
      viewUp?: Types.Point3;
    }
  ): RectangleROIAnnotation | undefined => {
    const enabledElement = getEnabledElementByViewportId(viewportId);
    if (!enabledElement) {
      return;
    }
    const {
      FrameOfReferenceUID,
      referencedImageId,
      viewPlaneNormal,
      instance,
      viewport
    } = this.hydrateBase<CustomRectangleROITool>(
      CustomRectangleROITool,
      enabledElement,
      points,
      options
    );

    // Exclude toolInstance from the options passed into the metadata
    const { toolInstance, ...serializableOptions } = options || {};

    const annotation = {
      annotationUID: options?.annotationUID || utilities.uuidv4(),
      data: {
        handles: {
          points,
          activeHandleIndex: null
        },
        label: "",
        cachedStats: {}
      },
      highlighted: false,
      autoGenerated: false,
      invalidated: false,
      isLocked: false,
      isVisible: true,
      metadata: {
        toolName: instance.getToolName(),
        viewPlaneNormal,
        FrameOfReferenceUID,
        referencedImageId,
        ...serializableOptions
      }
    };

    addAnnotation(annotation, viewport.element);

    triggerAnnotationRenderForViewportIds([viewport.id]);
  };
}

/**
 * _getTextLines - Returns the Area, mean and std deviation of the area of the
 * target volume enclosed by the rectangle.
 *
 * @param data - The annotation tool-specific data.
 * @param targetId - The volumeId of the volume to display the stats for.
 */
function defaultGetTextLines(
  data: any,
  targetId: string
): string[] | undefined {
  const cachedVolumeStats = data.cachedStats[targetId];
  const { area, mean, max, stdDev, areaUnit, modalityUnit, min } =
    cachedVolumeStats;

  if (mean === undefined || mean === null) {
    return;
  }

  const textLines: string[] = [];

  if (isNumber(area)) {
    textLines.push(`Area: ${utilities.roundNumber(area)} ${areaUnit}`);
  }
  if (isNumber(mean)) {
    textLines.push(`Mean: ${utilities.roundNumber(mean)} ${modalityUnit}`);
  }
  if (isNumber(max)) {
    textLines.push(`Max: ${utilities.roundNumber(max)} ${modalityUnit}`);
  }
  if (isNumber(min)) {
    textLines.push(`Max: ${utilities.roundNumber(min)} ${modalityUnit}`);
  }
  if (isNumber(stdDev)) {
    textLines.push(`Std Dev: ${utilities.roundNumber(stdDev)} ${modalityUnit}`);
  }

  return textLines;
}
function isNumber(n: number[] | number): boolean {
  if (Array.isArray(n)) {
    return isNumber(n[0]);
  }
  return isFinite(n) && !isNaN(n);
}
CustomRectangleROITool.toolName = "CustomRectangleROI";

export default CustomRectangleROITool;
