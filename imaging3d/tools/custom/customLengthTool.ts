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
  Annotation
} from "@cornerstonejs/tools/dist/esm/types";
import { IEnabledElement, Point3 } from "@cornerstonejs/core/dist/esm/types";
import { Handles } from "@cornerstonejs/tools/dist/esm/types/AnnotationTypes";
import { annotation } from "@cornerstonejs/tools";
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

const getCalibratedLengthUnitsAndScale =
  cornerstoneTools.utilities.getCalibratedLengthUnitsAndScale;
const throttle = cornerstoneTools.utilities.throttle;

const lineSegment = cornerstoneTools.utilities.math.lineSegment;

const drawHandlesSvg = cornerstoneTools.drawing.drawHandles;
const drawLineSvg = cornerstoneTools.drawing.drawLine;
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

const { transformWorldToIndex } = utilities;

export interface LengthAnnotation extends Annotation {
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
        length: number | null;
        unit: string | null;
      };
    };
  };
}
export type StyleSpecifier = {
  viewportId?: string;
  toolGroupId?: string;
  toolName?: string;
  annotationUID?: string;
};

class CustomLengthTool extends AnnotationTool {
  static toolName: string = "CustomLength";
  public _throttledCalculateCachedStats: Function;
  public editData: {
    annotation: Annotation;
    viewportIdsToRender?: string[];
    newAnnotation?: boolean;
    handleIndex?: number;
    movingTextBox?: boolean;
    hasMoved?: boolean;
  } | null = null;

  public isDrawing: boolean = false;
  public isHandleOutsideImage: boolean = false;

  constructor(
    toolProps: PublicToolProps = {},
    defaultToolProps: ToolProps = {
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        preventHandleOutsideImage: true,
        getTextLines: defaultGetTextLines,
        actions: {
          // TODO - bind globally - but here is actually pretty good as it
          // is almost always active.
          undo: {
            method: "undo",
            bindings: [{ key: "z" }]
          },
          redo: {
            method: "redo",
            bindings: [{ key: "y" }]
          }
        }
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
  onSetToolActive() {
    const measurementIconContent = `
  <path d="m14 4v10h-10v4h10v10h4v-10h10v-4h-10v-10z" fill="{{color}}" />
`;

    cornerstoneTools.cursors.registerCursor(
      CustomLengthTool.name,
      measurementIconContent,
      {
        x: 32,
        y: 32
      }
    );
  }
  static hydrate = (
    viewportId: string,
    points: Types.Point3[],
    options?: {
      annotationUID?: string;
      toolInstance?: CustomLengthTool;
      referencedImageId?: string;
      viewplaneNormal?: Types.Point3;
      viewUp?: Types.Point3;
    }
  ): LengthAnnotation | undefined => {
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
    } = this.hydrateBase<CustomLengthTool>(
      CustomLengthTool,
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
          points
        }
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

  //Helper method to constrain point within image bounds
  _constrainPointToImageBounds = (
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
  /**
   * Based on the current position of the mouse and the current imageId to create
   * a Length Annotation and stores it in the annotationManager
   *
   * @param evt -  EventTypes.NormalizedMouseEventType
   * @returns The annotation object.
   *
   */
  addNewAnnotation = (
    evt: EventTypes.InteractionEventType
  ): LengthAnnotation => {
    const eventDetail = evt.detail;
    const { currentPoints, element } = eventDetail;
    const worldPos = currentPoints.world;
    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement!;

    hideElementCursor(element);
    this.isDrawing = true;

    const {
      viewPlaneNormal,
      viewUp,
      position: cameraPosition
    } = viewport.getCamera();
    const referencedImageId = this.getReferencedImageId(
      viewport,
      worldPos,
      viewPlaneNormal!,
      viewUp
    );

    const annotation = {
      highlighted: true,
      invalidated: true,
      metadata: {
        ...viewport.getViewReference({ points: [worldPos] }),
        toolName: this.getToolName(),
        referencedImageId,
        viewUp,
        cameraPosition
      },
      data: {
        handles: {
          points: [<Types.Point3>[...worldPos], <Types.Point3>[...worldPos]],
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
    annotation: LengthAnnotation,
    canvasCoords: Types.Point2,
    proximity: number
  ): boolean => {
    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement!;
    const { data } = annotation;
    const [point1, point2] = data.handles.points;
    const canvasPoint1 = viewport.worldToCanvas(point1);
    const canvasPoint2 = viewport.worldToCanvas(point2);

    const line = {
      start: {
        x: canvasPoint1[0],
        y: canvasPoint1[1]
      },
      end: {
        x: canvasPoint2[0],
        y: canvasPoint2[1]
      }
    };

    const distanceToPoint = lineSegment.distanceToPoint(
      [line.start.x, line.start.y],
      [line.end.x, line.end.y],
      [canvasCoords[0], canvasCoords[1]]
    );

    if (distanceToPoint <= proximity) {
      return true;
    }

    return false;
  };

  toolSelectedCallback = (
    evt: EventTypes.InteractionEventType,
    annotation: LengthAnnotation
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

    this._activateModify(element);

    hideElementCursor(element);

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);

    evt.preventDefault();
  };

  handleSelectedCallback(
    evt: EventTypes.InteractionEventType,
    annotation: LengthAnnotation,
    handle: ToolHandle
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
      handleIndex = data.handles.points.findIndex((p: any) => p === handle);
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
    this._activateModify(element);

    hideElementCursor(element);

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);

    evt.preventDefault();
  }

  _endCallback = (evt: EventTypes.InteractionEventType): void => {
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

    data.handles!.activeHandleIndex = null;

    this._deactivateModify(element);
    this._deactivateDraw(element);
    resetElementCursor(element);

    if (
      this.isHandleOutsideImage &&
      this.configuration.preventHandleOutsideImage
    ) {
      removeAnnotation(annotation.annotationUID!);
    }

    triggerAnnotationRenderForViewportIds(viewportIdsToRender!);
    this.doneEditMemo();

    if (newAnnotation) {
      triggerAnnotationCompleted(annotation);
    }

    this.editData = null;
    this.isDrawing = false;
  };

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
    const { data } = annotation;
    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement!;

    this.createMemo(element, annotation, { newAnnotation });

    if (movingTextBox) {
      // Drag mode - moving text box
      const { deltaPoints } = eventDetail as EventTypes.MouseDragEventDetail;
      const worldPosDelta = deltaPoints.world;

      const { textBox } = data.handles!;
      const { worldPosition } = textBox!;

      const newTextBoxPos: Point3 = [
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
    } else if (handleIndex === undefined) {
      // Drag mode - moving entire annotation while maintaining shape
      const { deltaPoints } = eventDetail as EventTypes.MouseDragEventDetail;
      const worldPosDelta = deltaPoints.world;

      const points = data.handles!.points;

      const newPositions = points!.map((point: number[]) => [
        point[0] + worldPosDelta[0],
        point[1] + worldPosDelta[1],
        point[2] + worldPosDelta[2]
      ]);

      const constrainedDelta = this._getConstrainedDeltaForAnnotation(
        newPositions,
        viewport,
        data
      );

      points!.forEach((point: number[], index: number) => {
        point[0] += constrainedDelta[0];
        point[1] += constrainedDelta[1];
        point[2] += constrainedDelta[2];
      });

      annotation.invalidated = true;
    } else {
      // Move mode - after double click, and mouse move to draw
      const { currentPoints } = eventDetail;
      const worldPos = currentPoints.world;

      const constrainedPos = this._constrainPointToImageBounds(
        worldPos,
        viewport
      );

      data.handles!.points![handleIndex] = [...constrainedPos];
      annotation.invalidated = true;
    }

    this.editData!.hasMoved = true;

    triggerAnnotationRenderForViewportIds(viewportIdsToRender!);

    if (annotation.invalidated) {
      triggerAnnotationModified(
        annotation,
        element,
        ChangeTypes.HandlesUpdated
      );
    }
  };

  /**
   * Calculate the maximum allowed delta that keeps all points within image bounds
   */
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

      triggerAnnotationRenderForViewportIds(viewportIdsToRender!);

      if (newAnnotation) {
        triggerAnnotationCompleted(annotation);
      }

      this.editData = null;
      return annotation.annotationUID;
    }
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
      Events.TOUCH_END,
      this._endCallback as EventListener
    );
    element.addEventListener(
      Events.TOUCH_DRAG,
      this._dragCallback as EventListener
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
      Events.TOUCH_END,
      this._endCallback as EventListener
    );
    element.removeEventListener(
      Events.TOUCH_DRAG,
      this._dragCallback as EventListener
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
      const annotation = annotations[i] as LengthAnnotation;
      const { annotationUID, data } = annotation;
      const { points, activeHandleIndex } = data.handles;

      styleSpecifier.annotationUID = annotationUID;

      const { color, lineWidth, lineDash, shadow } = this.getAnnotationStyle({
        annotation,
        styleSpecifier
      });

      const canvasCoordinates = points.map((p: any) =>
        viewport.worldToCanvas(p)
      );

      // If cachedStats does not exist, or the unit is missing (as part of import/hydration etc.),
      // force to recalculate the stats from the points
      if (
        targetId &&
        (!data.cachedStats[targetId] || data.cachedStats[targetId].unit == null)
      ) {
        data.cachedStats[targetId] = {
          length: null,
          unit: null
        };

        this._calculateCachedStats(annotation, renderingEngine, enabledElement);
      } else if (annotation.invalidated) {
        this._throttledCalculateCachedStats(
          annotation,
          renderingEngine,
          enabledElement
        );
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

      const dataId = `${annotationUID}-line`;
      const lineUID = "1";
      drawLineSvg(
        svgDrawingHelper,
        annotationUID!,
        lineUID,
        canvasCoordinates[0],
        canvasCoordinates[1],
        {
          color,
          width: lineWidth,
          lineDash,
          shadow
        },
        dataId
      );

      renderStatus = true;

      // If rendering engine has been destroyed while rendering
      if (!viewport.getRenderingEngine()) {
        console.warn("Rendering Engine has been destroyed");
        return renderStatus;
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

      // Need to update to sync with annotation while unlinked/not moved
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

  _calculateLength(pos1: number[], pos2: number[]) {
    const dx = pos1[0] - pos2[0];
    const dy = pos1[1] - pos2[1];
    const dz = pos1[2] - pos2[2];

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  _calculateCachedStats(
    annotation: Annotation,
    renderingEngine: any,
    enabledElement: IEnabledElement
  ) {
    const data = annotation.data;
    const { element } = enabledElement.viewport as any;

    const worldPos1 = data.handles!.points![0];
    const worldPos2 = data.handles!.points![1];
    const { cachedStats } = data;
    const targetIds = Object.keys(cachedStats!);

    // TODO clean up, this doesn't need a length per volume, it has no stats derived from volumes.

    for (let i = 0; i < targetIds.length; i++) {
      const targetId = targetIds[i];

      const image = this.getTargetImageData(targetId);

      // If image does not exists for the targetId, skip. This can be due
      // to various reasons such as if the target was a volumeViewport, and
      // the volumeViewport has been decached in the meantime.
      if (!image) {
        continue;
      }

      const { imageData, dimensions } = image;

      const index1 = transformWorldToIndex(imageData, worldPos1);
      const index2 = transformWorldToIndex(imageData, worldPos2);
      const handles = [index1, index2];
      const { scale, unit } = getCalibratedLengthUnitsAndScale(image, handles);

      const length = this._calculateLength(worldPos1, worldPos2) / scale;

      if (this._isInsideVolume(index1, index2, dimensions)) {
        this.isHandleOutsideImage = false;
      } else {
        this.isHandleOutsideImage = true;
      }

      // TODO -> Do we instead want to clip to the bounds of the volume and only include that portion?
      // Seems like a lot of work for an unrealistic case. At the moment bail out of stat calculation if either
      // corner is off the canvas.

      // todo: add insideVolume calculation, for removing tool if outside
      cachedStats![targetId] = {
        length,
        unit
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

  _isInsideVolume(index1: Point3, index2: Point3, dimensions: Point3) {
    return (
      utilities.indexWithinDimensions(index1, dimensions) &&
      utilities.indexWithinDimensions(index2, dimensions)
    );
  }
}

function defaultGetTextLines(
  data: {
    handles?: Handles;
    [key: string]: unknown;
    cachedStats?: Record<string, unknown>;
    label?: string;
  },
  targetId: string
): string[] | undefined {
  const cachedVolumeStats = data.cachedStats![targetId];
  const { length, unit } = cachedVolumeStats as any;

  // Can be null on load
  if (length === undefined || length === null || isNaN(length)) {
    return;
  }

  const textLines = [`${utilities.roundNumber(length)} ${unit}`];

  return textLines;
}
function getTextBoxCoordsCanvas(
  annotationCanvasPoints: Array<Types.Point2>
): Types.Point2 {
  const corners = _determineCorners(annotationCanvasPoints);
  const centerY = (corners.top[1] + corners.bottom[1]) / 2;
  const textBoxCanvas = <Types.Point2>[corners.right[0], centerY];

  return textBoxCanvas;
}
function _determineCorners(canvasPoints: Array<Types.Point2>) {
  const handlesLeftToRight = [canvasPoints[0], canvasPoints[1]].sort(_compareX);
  const handlesTopToBottom = [canvasPoints[0], canvasPoints[1]].sort(_compareY);
  const right = handlesLeftToRight[handlesLeftToRight.length - 1];
  const top = handlesTopToBottom[0];
  const bottom = handlesTopToBottom[handlesTopToBottom.length - 1];

  return {
    top,
    bottom,
    right
  };

  function _compareX(a: Types.Point2, b: Types.Point2) {
    return a[0] < b[0] ? -1 : 1;
  }
  function _compareY(a: Types.Point2, b: Types.Point2) {
    return a[1] < b[1] ? -1 : 1;
  }
}

CustomLengthTool.toolName = "CustomLength";
export default CustomLengthTool;
