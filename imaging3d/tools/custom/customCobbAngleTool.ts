import * as cornerstoneTools from "@cornerstonejs/tools";
import * as cornerstone from "@cornerstonejs/core";
import type { Types } from "@cornerstonejs/core";
import {
  EventTypes,
  ToolHandle,
  TextBoxHandle,
  PublicToolProps,
  ToolProps,
  SVGDrawingHelper,
  Annotation,
  InteractionTypes
} from "@cornerstonejs/tools/dist/esm/types";
import { annotation } from "@cornerstonejs/tools";
import { StyleSpecifier } from "./customLengthTool";
import {
  IEnabledElement,
  Point2,
  Point3
} from "@cornerstonejs/core/dist/esm/types";
import { vec3 } from "gl-matrix";
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
const drawLineSvg = cornerstoneTools.drawing.drawLine;
const drawTextBoxSvg = cornerstoneTools.drawing.drawTextBox;
const enums = cornerstoneTools.Enums;
const Events = enums.Events;
const ChangeTypes = enums.ChangeTypes;
const lineSegment = cornerstoneTools.utilities.math.lineSegment;
const angleBetweenLines =
  cornerstoneTools.utilities.math.angle.angleBetweenLines;
const throttle = cornerstoneTools.utilities.throttle;

const drawHandlesSvg = cornerstoneTools.drawing.drawHandles;
const drawLinkedTextBoxSvg = cornerstoneTools.drawing.drawLinkedTextBox;

const state = cornerstoneTools.store.state;
const getViewportIdsWithToolToRender =
  cornerstoneTools.utilities.viewportFilters.getViewportIdsWithToolToRender;

const triggerAnnotationRenderForViewportIds =
  cornerstoneTools.utilities.triggerAnnotationRenderForViewportIds;
const resetElementCursor =
  cornerstoneTools.cursors.elementCursor.resetElementCursor;
const hideElementCursor =
  cornerstoneTools.cursors.elementCursor.hideElementCursor;
const getTextBoxCoordsCanvas =
  cornerstoneTools.utilities.drawing.getTextBoxCoordsCanvas;
const { transformWorldToIndex } = cornerstone.utilities;

const midPoint = (
  ...args: (Types.Point2 | Types.Point3)[]
): Types.Point2 | Types.Point3 => {
  const ret =
    args[0].length === 2 ? <Types.Point2>[0, 0] : <Types.Point3>[0, 0, 0];
  const len = args.length;
  for (const arg of args) {
    ret[0] += arg[0] / len;
    ret[1] += arg[1] / len;
    if (ret.length === 3) {
      ret[2] += arg[2]! / len;
    }
  }
  return ret;
};

const midPoint2 = midPoint as (...args: Types.Point2[]) => Types.Point2;

interface CobbAngleAnnotation extends Annotation {
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
    cachedStats: {
      [targetId: string]: {
        angle: number;
        arc1Angle: number;
        arc2Angle: number;
        points: {
          world: {
            arc1Start: Types.Point3;
            arc1End: Types.Point3;
            arc2Start: Types.Point3;
            arc2End: Types.Point3;
            arc1Angle: number;
            arc2Angle: number;
          };
          canvas: {
            arc1Start: Types.Point2;
            arc1End: Types.Point2;
            arc2Start: Types.Point2;
            arc2End: Types.Point2;
            arc1Angle: number;
            arc2Angle: number;
          };
        };
      };
    };
  };
}

class CustomCobbAngleTool extends AnnotationTool {
  static toolName = "CustomCobbAngle";

  angleStartedNotYetCompleted: boolean = false;
  _throttledCalculateCachedStats: Function;
  editData: {
    annotation: Annotation;
    viewportIdsToRender: string[];
    handleIndex?: number;
    movingTextBox?: boolean;
    newAnnotation?: boolean;
    hasMoved?: boolean;
    isNearFirstLine?: boolean;
    isNearSecondLine?: boolean;
  } | null = null;
  isDrawing: boolean = false;
  isHandleOutsideImage: boolean = false;
  isResizing: boolean = false;
  isMoving: boolean = false;
  constructor(
    toolProps: PublicToolProps = {},
    defaultToolProps: ToolProps = {
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        shadow: true,
        preventHandleOutsideImage: false,
        getTextLines: defaultGetTextLines,
        showArcLines: false
      }
    }
  ) {
    super(toolProps, defaultToolProps);

    this._throttledCalculateCachedStats = throttle(
      this._calculateCachedStats,
      25,
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

      const constrainedWorldPos = cornerstone.utilities.transformIndexToWorld(
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
    const constrainedWorld = cornerstone.utilities.transformIndexToWorld(
      imageData,
      constrainedIndex
    );

    return constrainedWorld;
  };

  // Modified _mouseDownCallback method
  _mouseDownCallback = (
    evt: EventTypes.MouseUpEventType | EventTypes.MouseClickEventType
  ) => {
    const { annotation, handleIndex } = this.editData!;
    const eventDetail = evt.detail;
    const { element, currentPoints } = eventDetail;
    const worldPos = currentPoints.world;
    const { data } = annotation;

    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement!;
    const constrainedWorldPos = this._constrainPointToImageBounds(
      worldPos,
      viewport
    );

    if (handleIndex === 1) {
      // This is the mouse down for the second point of the first segment.
      // The mouse up takes care of adding the first point of the second segment.
      data.handles!.points![1] = constrainedWorldPos;
      this.editData!.hasMoved =
        data.handles!.points![1][0] !== data.handles!.points![0][0] ||
        data.handles!.points![1][1] !== data.handles!.points![0][0];
      return;
    }

    if (handleIndex === 3) {
      // This is the mouse down for the second point of the second segment (i.e. the last point)
      data.handles!.points![3] = constrainedWorldPos;
      this.editData!.hasMoved =
        data.handles!.points![3][0] !== data.handles!.points![2][0] ||
        data.handles!.points![3][1] !== data.handles!.points![2][0];

      this.angleStartedNotYetCompleted = false;
      return;
    }

    // This is the first mouse down of the first point of the second line segment.
    // It is as if we have not moved yet because Cobb Angle has two, disjoint sections, each with its own move.
    this.editData!.hasMoved = false;
    hideElementCursor(element);

    // Add the last segment points for the subsequent drag/mouse move.
    data.handles!.points![2] = data.handles!.points![3] = constrainedWorldPos;
    this.editData!.handleIndex = data.handles!.points!.length - 1;
  };

  _getViewportsInfo = () => {
    const viewports = cornerstoneTools.ToolGroupManager.getToolGroup(
      this.toolGroupId
    )?.viewportsInfo;
    return viewports;
  };
  onSetToolEnabled() {
    const elementIds = this._getViewportsInfo()?.map(
      viewport => viewport.viewportId
    );

    elementIds?.forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;

      element.removeEventListener(
        Events.MOUSE_MOVE,
        this._mouseMoveCallback as EventListener
      );
      element.removeEventListener(
        Events.MOUSE_DRAG,
        this._mouseMoveCallback as EventListener
      );
    });
  }
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

      const nearHandle = this.isDrawing
        ? false
        : this.isNearHandle(element, coords);
      const nearMeas = this.isDrawing
        ? false
        : this.isNearMeasurement(element, coords);
      this.setCursor(currentState, element, nearHandle, nearMeas);
    }
  };
  isNearHandle = (element: HTMLDivElement, coords: Types.Point2): boolean => {
    const annotations = getAnnotations(this.getToolName(), element);
    if (!annotations?.length) return false;

    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement!;

    for (const annotation of annotations) {
      const lengthAnnotation = annotation as CobbAngleAnnotation;

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
      const lengthAnnotation = annotation as CobbAngleAnnotation;

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

  // Modified addNewAnnotation method - only the part that creates initial annotation
  addNewAnnotation = (evt: EventTypes.MouseDownActivateEventType): any => {
    if (this.angleStartedNotYetCompleted) {
      return;
    }

    this.angleStartedNotYetCompleted = true;
    const eventDetail = evt.detail;
    const { currentPoints, element } = eventDetail;
    const worldPos = currentPoints.world;
    const enabledElement = getEnabledElement(element);
    const { viewport, renderingEngine } = enabledElement!;

    const constrainedWorldPos = this._constrainPointToImageBounds(
      worldPos,
      viewport
    );

    hideElementCursor(element);
    this.isDrawing = true;

    const camera = viewport.getCamera();
    const { viewPlaneNormal, viewUp } = camera;

    const referencedImageId = this.getReferencedImageId(
      viewport,
      constrainedWorldPos,
      viewPlaneNormal!,
      viewUp
    );

    const FrameOfReferenceUID = viewport.getFrameOfReferenceUID();

    const annotation = {
      highlighted: true,
      invalidated: true,
      metadata: {
        toolName: this.getToolName(),
        viewPlaneNormal: <Types.Point3>[...viewPlaneNormal!],
        viewUp: <Types.Point3>[...viewUp!],
        FrameOfReferenceUID,
        referencedImageId,
        ...viewport.getViewReference({ points: [constrainedWorldPos] })
      },
      data: {
        handles: {
          points: [
            <Types.Point3>[...constrainedWorldPos],
            <Types.Point3>[...constrainedWorldPos]
          ],
          activeHandleIndex: null,
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
        label: "",
        cachedStats: {}
      }
    };

    addAnnotation(annotation, element);

    const viewportIdsToRender = getViewportIdsWithToolToRender(
      element,
      this.getToolName()
    );

    this.editData = {
      annotation,
      viewportIdsToRender,
      handleIndex: 1,
      movingTextBox: false,
      newAnnotation: true,
      hasMoved: false
    };
    this._activateDraw(element);

    evt.preventDefault();

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);

    return annotation;
  };

  /**
   * It returns if the canvas point is near the provided length annotation in the provided
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
    annotation: CobbAngleAnnotation,
    canvasCoords: Types.Point2,
    proximity: number
  ): boolean => {
    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement!;
    const { data } = annotation;

    const { distanceToPoint, distanceToPoint2 } = this.distanceToLines({
      viewport,
      points: data.handles.points,
      canvasCoords,
      proximity
    });

    if (distanceToPoint <= proximity || distanceToPoint2 <= proximity) {
      return true;
    }

    return false;
  };

  toolSelectedCallback = (
    evt: EventTypes.MouseDownEventType,
    annotation: CobbAngleAnnotation,
    interactionType: InteractionTypes,
    canvasCoords: Types.Point2,
    proximity = 6
  ): void => {
    const eventDetail = evt.detail;
    const { element } = eventDetail;

    annotation.highlighted = true;

    const viewportIdsToRender = getViewportIdsWithToolToRender(
      element,
      this.getToolName()
    );

    const enabledElement = getEnabledElement(element);
    const { renderingEngine, viewport } = enabledElement!;

    const { isNearFirstLine, isNearSecondLine } = this.distanceToLines({
      viewport,
      points: annotation.data.handles.points,
      canvasCoords,
      proximity
    });

    this.editData = {
      annotation,
      viewportIdsToRender,
      movingTextBox: false,
      isNearFirstLine,
      isNearSecondLine
    };
    this.isMoving = true;
    this._activateModify(element);

    hideElementCursor(element);

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);

    evt.preventDefault();
  };

  handleSelectedCallback(
    evt: EventTypes.MouseDownEventType,
    annotation: CobbAngleAnnotation,
    handle: ToolHandle,
    interactionType = "mouse"
  ): void {
    const eventDetail = evt.detail;
    const { element } = eventDetail;
    const { data } = annotation;

    annotation.highlighted = true;

    let movingTextBox = false;
    let handleIndex;

    if ((handle as TextBoxHandle).worldPosition) {
      movingTextBox = true;
    } else {
      handleIndex = data.handles.points.findIndex(p => p === handle);
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
  }

  _endCallback = (
    evt: EventTypes.MouseUpEventType | EventTypes.MouseClickEventType
  ) => {
    const eventDetail = evt.detail;
    const { element } = eventDetail;

    const { annotation, viewportIdsToRender, newAnnotation, hasMoved } =
      this.editData!;

    const { data } = annotation;
    if (newAnnotation && !hasMoved) {
      // when user starts the drawing by click, and moving the mouse, instead
      // of click and drag
      return;
    }

    this.doneEditMemo();

    // If preventing new measurement means we are in the middle of an existing measurement
    // we shouldn't deactivate modify or draw
    if (this.angleStartedNotYetCompleted && data.handles!.points!.length < 4) {
      resetElementCursor(element);

      // adds the first point of the second line
      this.editData!.handleIndex = data.handles!.points!.length;
      return;
    }

    this.angleStartedNotYetCompleted = false;
    data.handles!.activeHandleIndex = null;

    this._deactivateModify(element);
    this._deactivateDraw(element);
    resetElementCursor(element);

    const enabledElement = getEnabledElement(element);
    const { renderingEngine } = enabledElement!;

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

    this.editData = null;
    this.isDrawing = false;
    this.isResizing = false;
    this.isMoving = false;
  };

  _dragCallback = (
    evt: EventTypes.MouseDragEventType | EventTypes.MouseMoveEventType
  ) => {
    this.isDrawing = !this.isResizing && !this.isMoving ? true : false;
    const eventDetail = evt.detail;
    const { element } = eventDetail;

    const {
      annotation,
      viewportIdsToRender,
      handleIndex,
      movingTextBox,
      isNearFirstLine,
      isNearSecondLine,
      newAnnotation
    } = this.editData!;
    this.createMemo(element, annotation, { newAnnotation });

    const { data } = annotation;
    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement!;

    if (movingTextBox) {
      // Drag mode - moving text box
      const { deltaPoints } = eventDetail as EventTypes.MouseDragEventDetail;
      const worldPosDelta = deltaPoints.world;

      const { textBox } = data.handles!;
      const { worldPosition } = textBox!;

      const newTextBoxPos: Types.Point3 = [
        worldPosition![0] + worldPosDelta[0],
        worldPosition![1] + worldPosDelta[1],
        worldPosition![2] + worldPosDelta[2]
      ];

      const constrainedTextBoxPos = this._constrainPointToImageBounds(
        newTextBoxPos,
        viewport
      );

      worldPosition![0] = constrainedTextBoxPos[0];
      worldPosition![1] = constrainedTextBoxPos[1];
      worldPosition![2] = constrainedTextBoxPos[2];

      textBox!.hasMoved = true;
    } else if (
      handleIndex === undefined &&
      (isNearFirstLine || isNearSecondLine)
    ) {
      // select tool mode - moving annotation
      const { deltaPoints } = eventDetail as EventTypes.MouseDragEventDetail;
      const worldPosDelta = deltaPoints.world;
      const points = data.handles!.points;

      // separate the logic for moving handles to move them separately
      if (isNearFirstLine) {
        const firstLinePoints = [points![0], points![1]];
        const newPositions = firstLinePoints.map(point => [
          point[0] + worldPosDelta[0],
          point[1] + worldPosDelta[1],
          point[2] + worldPosDelta[2]
        ]);

        const constrainedDelta = this._getConstrainedDeltaForAnnotation(
          newPositions,
          viewport,
          data
        );

        firstLinePoints.forEach(point => {
          point[0] += constrainedDelta[0];
          point[1] += constrainedDelta[1];
          point[2] += constrainedDelta[2];
        });
      } else if (isNearSecondLine) {
        const secondLinePoints = [points![2], points![3]];
        const newPositions = secondLinePoints.map(point => [
          point[0] + worldPosDelta[0],
          point[1] + worldPosDelta[1],
          point[2] + worldPosDelta[2]
        ]);

        const constrainedDelta = this._getConstrainedDeltaForAnnotation(
          newPositions,
          viewport,
          data
        );

        secondLinePoints.forEach(point => {
          point[0] += constrainedDelta[0];
          point[1] += constrainedDelta[1];
          point[2] += constrainedDelta[2];
        });
      }

      annotation.invalidated = true;
    } else {
      // Drag handle mode - after double click, and mouse move to draw
      const { currentPoints } = eventDetail;
      const worldPos = currentPoints.world;

      const constrainedWorldPos = this._constrainPointToImageBounds(
        worldPos,
        viewport
      );
      data.handles!.points![handleIndex!] = [...constrainedWorldPos];
      annotation.invalidated = true;
    }

    this.editData!.hasMoved = true;

    const { renderingEngine } = enabledElement!;

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);

    if (annotation.invalidated) {
      triggerAnnotationModified(
        annotation,
        element,
        ChangeTypes.HandlesUpdated
      );
    }
  };

  cancel = (element: HTMLDivElement) => {
    // If it is mid-draw or mid-modify
    if (!this.isDrawing) {
      return;
    }

    this.isDrawing = false;
    this._deactivateDraw(element);
    this._deactivateModify(element);
    resetElementCursor(element);

    const { annotation, viewportIdsToRender, newAnnotation } = this.editData!;
    const { data } = annotation;

    if (data.handles!.points!.length < 4) {
      // If it is mid-draw
      removeAnnotation(annotation.annotationUID!);
    }

    annotation.highlighted = false;
    data.handles!.activeHandleIndex = null;

    const enabledElement = getEnabledElement(element);
    const { renderingEngine } = enabledElement!;

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);

    if (newAnnotation) {
      triggerAnnotationCompleted(annotation);
    }

    this.editData = null;
    this.angleStartedNotYetCompleted = false;
    return annotation.annotationUID;
  };

  _activateModify = (element: HTMLDivElement) => {
    state.isInteractingWithTool = true;

    element.addEventListener(
      Events.MOUSE_UP,
      this._endCallback as EventListener
    );
    element.addEventListener(
      Events.MOUSE_DRAG,
      this._dragCallback as EventListener
    );
    element.addEventListener(
      Events.MOUSE_CLICK,
      this._endCallback as EventListener
    );
    element.addEventListener(
      Events.TOUCH_END,
      this._endCallback as EventListener
    );
    element.addEventListener(
      Events.TOUCH_DRAG,
      this._dragCallback as EventListener
    );
    element.addEventListener(
      Events.TOUCH_START,
      this._mouseDownCallback as EventListener
    );
    element.addEventListener(
      Events.TOUCH_TAP,
      this._endCallback as EventListener
    );
  };

  _deactivateModify = (element: HTMLDivElement) => {
    state.isInteractingWithTool = false;

    element.removeEventListener(
      Events.MOUSE_UP,
      this._endCallback as EventListener
    );
    element.removeEventListener(
      Events.MOUSE_DRAG,
      this._dragCallback as EventListener
    );
    element.removeEventListener(
      Events.MOUSE_CLICK,
      this._endCallback as EventListener
    );
    element.removeEventListener(
      Events.TOUCH_END,
      this._endCallback as EventListener
    );
    element.removeEventListener(
      Events.TOUCH_DRAG,
      this._dragCallback as EventListener
    );
    element.removeEventListener(
      Events.TOUCH_START,
      this._mouseDownCallback as EventListener
    );
    element.removeEventListener(
      Events.TOUCH_TAP,
      this._endCallback as EventListener
    );
  };

  _activateDraw = (element: HTMLDivElement) => {
    state.isInteractingWithTool = true;

    element.addEventListener(
      Events.MOUSE_UP,
      this._endCallback as EventListener
    );
    element.addEventListener(
      Events.MOUSE_DRAG,
      this._dragCallback as EventListener
    );
    element.addEventListener(
      Events.MOUSE_MOVE,
      this._dragCallback as EventListener
    );
    element.addEventListener(
      Events.MOUSE_CLICK,
      this._endCallback as EventListener
    );
    element.addEventListener(
      Events.MOUSE_DOWN,
      this._mouseDownCallback as EventListener
    );
    element.addEventListener(
      Events.TOUCH_END,
      this._endCallback as EventListener
    );
    element.addEventListener(
      Events.TOUCH_DRAG,
      this._dragCallback as EventListener
    );
    element.addEventListener(
      Events.TOUCH_START,
      this._mouseDownCallback as EventListener
    );
    element.addEventListener(
      Events.TOUCH_TAP,
      this._endCallback as EventListener
    );
  };

  _deactivateDraw = (element: HTMLDivElement) => {
    state.isInteractingWithTool = false;

    element.removeEventListener(
      Events.MOUSE_UP,
      this._endCallback as EventListener
    );
    element.removeEventListener(
      Events.MOUSE_DRAG,
      this._dragCallback as EventListener
    );
    element.removeEventListener(
      Events.MOUSE_MOVE,
      this._dragCallback as EventListener
    );
    element.removeEventListener(
      Events.MOUSE_CLICK,
      this._endCallback as EventListener
    );
    element.removeEventListener(
      Events.MOUSE_DOWN,
      this._mouseDownCallback as EventListener
    );
    element.removeEventListener(
      Events.TOUCH_END,
      this._endCallback as EventListener
    );
    element.removeEventListener(
      Events.TOUCH_DRAG,
      this._dragCallback as EventListener
    );
    element.removeEventListener(
      Events.TOUCH_START,
      this._mouseDownCallback as EventListener
    );
    element.removeEventListener(
      Events.TOUCH_TAP,
      this._endCallback as EventListener
    );
  };

  /**
   * it is used to draw the length annotation in each
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

    // Todo: We don't need this anymore, filtering happens in triggerAnnotationRender
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

    // Draw SVG
    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations[i] as CobbAngleAnnotation;
      const { annotationUID, data } = annotation;
      const { points, activeHandleIndex } = data.handles;

      styleSpecifier.annotationUID = annotationUID;

      const { color, lineWidth, lineDash } = this.getAnnotationStyle({
        annotation,
        styleSpecifier
      });

      const canvasCoordinates = points.map(p => viewport.worldToCanvas(p));

      // WE HAVE TO CACHE STATS BEFORE FETCHING TEXT
      if (
        targetId &&
        (!data.cachedStats[targetId] ||
          data.cachedStats[targetId].angle == null)
      ) {
        data.cachedStats[targetId] = {
          angle: null,
          arc1Angle: null,
          arc2Angle: null,
          points: {
            world: {
              arc1Start: null,
              arc1End: null,
              arc2Start: null,
              arc2End: null,
              arc1Angle: null,
              arc2Angle: null
            },
            canvas: {
              arc1Start: null,
              arc1End: null,
              arc2Start: null,
              arc2End: null,
              arc1Angle: null,
              arc2Angle: null
            }
          }
        } as any;

        this._calculateCachedStats(annotation, renderingEngine, enabledElement);
      } else if (annotation.invalidated) {
        this._throttledCalculateCachedStats(
          annotation,
          renderingEngine,
          enabledElement
        );
      }

      let activeHandleCanvasCoords;

      if (
        !isAnnotationLocked(annotationUID!) &&
        !this.editData &&
        activeHandleIndex !== null
      ) {
        // Not locked or creating and hovering over handle, so render handle.
        activeHandleCanvasCoords = [canvasCoordinates[activeHandleIndex]];
      }

      // If rendering engine has been destroyed while rendering
      if (!viewport.getRenderingEngine()) {
        console.warn("Rendering Engine has been destroyed");
        return renderStatus;
      }

      if (!isAnnotationVisible(annotationUID!)) {
        continue;
      }

      if (canvasCoordinates.length) {
        const handleGroupUID = "0";

        drawHandlesSvg(
          svgDrawingHelper,
          annotationUID!,
          handleGroupUID,
          canvasCoordinates,
          {
            color,
            lineDash,
            lineWidth
          }
        );
      }

      const firstLine = [canvasCoordinates[0], canvasCoordinates[1]] as [
        Types.Point2,
        Types.Point2
      ];
      const secondLine = [canvasCoordinates[2], canvasCoordinates[3]] as [
        Types.Point2,
        Types.Point2
      ];

      let lineUID = "line1";
      drawLineSvg(
        svgDrawingHelper,
        annotationUID!,
        lineUID,
        firstLine[0],
        firstLine[1],
        {
          color,
          width: lineWidth,
          lineDash
        }
      );

      renderStatus = true;

      // Don't add the stats until annotation has 4 anchor points
      if (canvasCoordinates.length < 4) {
        return renderStatus;
      }

      lineUID = "line2";

      drawLineSvg(
        svgDrawingHelper,
        annotationUID!,
        lineUID,
        secondLine[0],
        secondLine[1],
        {
          color,
          width: lineWidth,
          lineDash
        }
      );

      lineUID = "linkLine";
      const mid1 = midPoint2(firstLine[0], firstLine[1]);
      const mid2 = midPoint2(secondLine[0], secondLine[1]);
      drawLineSvg(svgDrawingHelper, annotationUID!, lineUID, mid1, mid2, {
        color,
        lineWidth: "1",
        lineDash: "1,4"
      });

      // Calculating the arcs

      const { arc1Start, arc1End, arc2End, arc2Start } =
        data.cachedStats[targetId!].points.canvas;
      const { arc1Angle, arc2Angle } = data.cachedStats[targetId!];

      if (this.configuration.showArcLines) {
        lineUID = "arc1";

        drawLineSvg(
          svgDrawingHelper,
          annotationUID!,
          lineUID,
          arc1Start as Types.Point2,
          arc1End as Types.Point2,
          {
            color,
            lineWidth: "1"
          }
        );

        lineUID = "arc2";

        drawLineSvg(
          svgDrawingHelper,
          annotationUID!,
          lineUID,
          arc2Start as Types.Point2,
          arc2End as Types.Point2,
          {
            color,
            lineWidth: "1"
          }
        );
      }

      if (!data.cachedStats[targetId!]?.angle) {
        continue;
      }

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

      if (!data.handles.textBox.hasMoved) {
        const canvasTextBoxCoords = getTextBoxCoordsCanvas(canvasCoordinates);

        data.handles.textBox.worldPosition =
          viewport.canvasToWorld(canvasTextBoxCoords);
      }

      const textBoxPosition = viewport.worldToCanvas(
        data.handles.textBox.worldPosition
      );

      const textBoxUID = "cobbAngleText";
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

      if (this.configuration.showArcLines) {
        const arc1TextBoxUID = "arcAngle1";

        const arc1TextLine = [
          `${arc1Angle.toFixed(2)} ${String.fromCharCode(176)}`
        ];

        const arch1TextPosCanvas = midPoint2(arc1Start, arc1End);

        drawTextBoxSvg(
          svgDrawingHelper,
          annotationUID!,
          arc1TextBoxUID,
          arc1TextLine,
          arch1TextPosCanvas,
          {
            ...options,
            padding: 3
          }
        );

        const arc2TextBoxUID = "arcAngle2";

        const arc2TextLine = [
          `${arc2Angle.toFixed(2)} ${String.fromCharCode(176)}`
        ];

        const arch2TextPosCanvas = midPoint2(arc2Start, arc2End);

        drawTextBoxSvg(
          svgDrawingHelper,
          annotationUID!,
          arc2TextBoxUID,
          arc2TextLine,
          arch2TextPosCanvas,
          {
            ...options,
            padding: 3
          }
        );
      }
    }

    return renderStatus;
  };

  _calculateCachedStats(
    annotation: Annotation,
    renderingEngine: any,
    enabledElement: IEnabledElement
  ) {
    const data = annotation.data;

    // Until we have all four anchors bail out
    if (data.handles?.points?.length !== 4) {
      return;
    }

    const seg1: [Types.Point3, Types.Point3] = [null, null] as any;
    const seg2: [Types.Point3, Types.Point3] = [null, null] as any;
    let minDist = Number.MAX_VALUE;

    // Order the endpoints of each line segment such that seg1[1] and seg2[0]
    // are the closest (Euclidean distance-wise) to each other. Thus
    // the angle formed between the vectors seg1[1]->seg1[0] and seg2[0]->seg[1]
    // is calculated.
    // The assumption here is that the Cobb angle line segments are drawn
    // such that the segments intersect nearest the segment endpoints
    // that are closest AND those closest endpoints are the tails of the
    // vectors used to calculate the angle between the vectors/line segments.
    for (let i = 0; i < 2; i += 1) {
      for (let j = 2; j < 4; j += 1) {
        const dist = vec3.distance(
          data.handles.points[i],
          data.handles.points[j]
        );
        if (dist < minDist) {
          minDist = dist;
          seg1[1] = data.handles.points[i];
          seg1[0] = data.handles.points[(i + 1) % 2];
          seg2[0] = data.handles.points[j];
          seg2[1] = data.handles.points[2 + ((j - 1) % 2)];
        }
      }
    }
    const { viewport } = enabledElement;
    const { element } = viewport;

    const canvasPoints = data.handles.points.map(p =>
      viewport.worldToCanvas(p)
    );

    const firstLine = [canvasPoints[0], canvasPoints[1]] as [
      Types.Point2,
      Types.Point2
    ];
    const secondLine = [canvasPoints[2], canvasPoints[3]] as [
      Types.Point2,
      Types.Point2
    ];

    const mid1 = midPoint2(firstLine[0], firstLine[1]);
    const mid2 = midPoint2(secondLine[0], secondLine[1]);

    const { arc1Start, arc1End, arc2End, arc2Start, arc1Angle, arc2Angle } =
      this.getArcsStartEndPoints({
        firstLine,
        secondLine,
        mid1,
        mid2
      });

    const { cachedStats } = data;
    const targetIds = Object.keys(cachedStats!);

    for (let i = 0; i < targetIds.length; i++) {
      const targetId = targetIds[i];

      cachedStats![targetId] = {
        angle: angleBetweenLines(seg1, seg2),
        arc1Angle,
        arc2Angle,
        points: {
          canvas: {
            arc1Start,
            arc1End,
            arc2End,
            arc2Start
          },
          world: {
            arc1Start: viewport.canvasToWorld(arc1Start),
            arc1End: viewport.canvasToWorld(arc1End),
            arc2End: viewport.canvasToWorld(arc2End),
            arc2Start: viewport.canvasToWorld(arc2Start)
          }
        }
      };
    }

    const invalidated = annotation.invalidated;
    annotation.invalidated = false;

    // Dispatching annotation modified only if it was invalidated
    if (invalidated) {
      triggerAnnotationModified(annotation, element, ChangeTypes.StatsUpdated);
    }

    return cachedStats;
  }

  distanceToLines = ({
    viewport,
    points,
    canvasCoords,
    proximity
  }: {
    viewport: cornerstone.VolumeViewport | cornerstone.StackViewport;
    points: Point3[];
    canvasCoords: Point2;
    proximity: number;
  }) => {
    const [point1, point2, point3, point4] = points;
    const canvasPoint1 = viewport.worldToCanvas(point1);
    const canvasPoint2 = viewport.worldToCanvas(point2);
    const canvasPoint3 = viewport.worldToCanvas(point3);
    const canvasPoint4 = viewport.worldToCanvas(point4);

    const line1 = {
      start: {
        x: canvasPoint1[0],
        y: canvasPoint1[1]
      },
      end: {
        x: canvasPoint2[0],
        y: canvasPoint2[1]
      }
    };

    const line2 = {
      start: {
        x: canvasPoint3[0],
        y: canvasPoint3[1]
      },
      end: {
        x: canvasPoint4[0],
        y: canvasPoint4[1]
      }
    };

    const distanceToPoint = lineSegment.distanceToPoint(
      [line1.start.x, line1.start.y],
      [line1.end.x, line1.end.y],
      [canvasCoords[0], canvasCoords[1]]
    );

    const distanceToPoint2 = lineSegment.distanceToPoint(
      [line2.start.x, line2.start.y],
      [line2.end.x, line2.end.y],
      [canvasCoords[0], canvasCoords[1]]
    );

    let isNearFirstLine = false;
    let isNearSecondLine = false;

    if (distanceToPoint <= proximity) {
      isNearFirstLine = true;
    } else if (distanceToPoint2 <= proximity) {
      isNearSecondLine = true;
    }
    return {
      distanceToPoint,
      distanceToPoint2,
      isNearFirstLine,
      isNearSecondLine
    };
  };

  getArcsStartEndPoints = ({
    firstLine,
    secondLine,
    mid1,
    mid2
  }: {
    firstLine: any;
    secondLine: any;
    mid1: Point2;
    mid2: Point2;
  }): {
    arc1Start: Types.Point2;
    arc1End: Types.Point2;
    arc2Start: Types.Point2;
    arc2End: Types.Point2;
    arc1Angle: number;
    arc2Angle: number;
  } => {
    const linkLine = [mid1, mid2] as [Types.Point2, Types.Point2];

    const arc1Angle = angleBetweenLines(firstLine, linkLine);
    const arc2Angle = angleBetweenLines(secondLine, linkLine);

    const arc1Side = arc1Angle > 90 ? 1 : 0;
    const arc2Side = arc2Angle > 90 ? 0 : 1;

    const midLinkLine = midPoint2(linkLine[0], linkLine[1]);

    const linkLineLength = Math.sqrt(
      (linkLine[1][0] - linkLine[0][0]) ** 2 +
        (linkLine[1][1] - linkLine[0][1]) ** 2
    );
    const ratio = 0.1; // 10% of the line length

    const midFirstLine = midPoint2(firstLine[0], firstLine[1]);
    const midSecondLine = midPoint2(secondLine[0], secondLine[1]);

    // For arc1Start
    const directionVectorStartArc1 = [
      firstLine[arc1Side][0] - midFirstLine[0],
      firstLine[arc1Side][1] - midFirstLine[1]
    ];
    const magnitudeStartArc1 = Math.sqrt(
      directionVectorStartArc1[0] ** 2 + directionVectorStartArc1[1] ** 2
    );
    const normalizedDirectionStartArc1 = [
      directionVectorStartArc1[0] / magnitudeStartArc1,
      directionVectorStartArc1[1] / magnitudeStartArc1
    ];
    const arc1Start = [
      midFirstLine[0] +
        normalizedDirectionStartArc1[0] * linkLineLength * ratio,
      midFirstLine[1] + normalizedDirectionStartArc1[1] * linkLineLength * ratio
    ] as Types.Point2;

    // Existing logic for arc1End
    const directionVectorEndArc1 = [
      midLinkLine[0] - mid1[0],
      midLinkLine[1] - mid1[1]
    ];
    const magnitudeEndArc1 = Math.sqrt(
      directionVectorEndArc1[0] ** 2 + directionVectorEndArc1[1] ** 2
    );
    const normalizedDirectionEndArc1 = [
      directionVectorEndArc1[0] / magnitudeEndArc1,
      directionVectorEndArc1[1] / magnitudeEndArc1
    ];
    const arc1End = [
      mid1[0] + normalizedDirectionEndArc1[0] * linkLineLength * ratio,
      mid1[1] + normalizedDirectionEndArc1[1] * linkLineLength * ratio
    ] as Types.Point2;

    // Similar logic for arc2Start
    const directionVectorStartArc2 = [
      secondLine[arc2Side][0] - midSecondLine[0],
      secondLine[arc2Side][1] - midSecondLine[1]
    ];
    const magnitudeStartArc2 = Math.sqrt(
      directionVectorStartArc2[0] ** 2 + directionVectorStartArc2[1] ** 2
    );
    const normalizedDirectionStartArc2 = [
      directionVectorStartArc2[0] / magnitudeStartArc2,
      directionVectorStartArc2[1] / magnitudeStartArc2
    ];
    const arc2Start = [
      midSecondLine[0] +
        normalizedDirectionStartArc2[0] * linkLineLength * ratio,
      midSecondLine[1] +
        normalizedDirectionStartArc2[1] * linkLineLength * ratio
    ] as Types.Point2;

    // Similar logic for arc2End
    const directionVectorEndArc2 = [
      midLinkLine[0] - mid2[0],
      midLinkLine[1] - mid2[1]
    ];
    const magnitudeEndArc2 = Math.sqrt(
      directionVectorEndArc2[0] ** 2 + directionVectorEndArc2[1] ** 2
    );
    const normalizedDirectionEndArc2 = [
      directionVectorEndArc2[0] / magnitudeEndArc2,
      directionVectorEndArc2[1] / magnitudeEndArc2
    ];
    const arc2End = [
      mid2[0] + normalizedDirectionEndArc2[0] * linkLineLength * ratio,
      mid2[1] + normalizedDirectionEndArc2[1] * linkLineLength * ratio
    ] as Types.Point2;

    return {
      arc1Start,
      arc1End,
      arc2Start,
      arc2End,
      arc1Angle: arc1Angle > 90 ? 180 - arc1Angle : arc1Angle,
      arc2Angle: arc2Angle > 90 ? 180 - arc2Angle : arc2Angle
    };
  };
}

function defaultGetTextLines(
  data: any,
  targetId: string
): string[] | undefined {
  const cachedVolumeStats = data.cachedStats[targetId];
  const { angle } = cachedVolumeStats;

  if (angle === undefined) {
    return;
  }

  const textLines = [`${angle.toFixed(2)} ${String.fromCharCode(176)}`];

  return textLines;
}
CustomCobbAngleTool.toolName = "CustomCobbAngle";
export default CustomCobbAngleTool;
