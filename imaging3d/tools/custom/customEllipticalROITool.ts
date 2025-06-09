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
  CanvasCoordinates
} from "@cornerstonejs/tools/dist/esm/types";
import { annotation } from "@cornerstonejs/tools";
import { Point2, Point3 } from "@cornerstonejs/core/dist/esm/types";
import { StyleSpecifier } from "./customLengthTool";

import { vec2 } from "gl-matrix";
import { ROICachedStats } from "@cornerstonejs/tools/dist/esm/types/ToolSpecificAnnotationTypes";

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
const getWorldWidthAndHeightFromTwoPoints =
  cornerstoneTools.utilities.planar.getWorldWidthAndHeightFromTwoPoints;
const isViewportPreScaled =
  cornerstoneTools.utilities.viewport.isViewportPreScaled;
const getCalibratedLengthUnitsAndScale =
  cornerstoneTools.utilities.getCalibratedLengthUnitsAndScale;
const throttle = cornerstoneTools.utilities.throttle;
const { getCanvasEllipseCorners, pointInEllipse } =
  cornerstoneTools.utilities.math.ellipse;
const BasicStatsCalculator =
  cornerstoneTools.utilities.math.BasicStatsCalculator;
const drawHandlesSvg = cornerstoneTools.drawing.drawHandles;
const drawLinkedTextBoxSvg = cornerstoneTools.drawing.drawLinkedTextBox;
const drawCircle = cornerstoneTools.drawing.drawCircle;
const drawEllipseByCoordinates =
  cornerstoneTools.drawing.drawEllipseByCoordinates;
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

interface EllipticalROIAnnotation extends Annotation {
  data: {
    handles: {
      points: [Types.Point3, Types.Point3, Types.Point3, Types.Point3]; // [bottom, top, left, right]
      activeHandleIndex: number | null;
      textBox?: {
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
    initialRotation: number;
  };
}
/**
 * EllipticalROITool let you draw annotations that measures the statistics
 * such as area, max, mean and stdDev of an elliptical region of interest.
 * You can use EllipticalROITool in all perpendicular views (axial, sagittal, coronal).
 * Note: annotation tools in cornerstone3DTools exists in the exact location
 * in the physical 3d space, as a result, by default, all annotations that are
 * drawing in the same frameOfReference will get shared between viewports that
 * are in the same frameOfReference. Elliptical tool's text box lines are dynamically
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
 * Changing tool configuration (see below) you can make the tool to draw the center
 * point circle with a given radius.
 *
 * ```js
 * cornerstoneTools.addTool(EllipticalROITool)
 *
 * const toolGroup = ToolGroupManager.createToolGroup('toolGroupId')
 *
 * toolGroup.addTool(EllipticalROITool.toolName)
 *
 * toolGroup.addViewport('viewportId', 'renderingEngineId')
 *
 * toolGroup.setToolActive(EllipticalROITool.toolName, {
 *   bindings: [
 *    {
 *       mouseButton: MouseBindings.Primary, // Left Click
 *     },
 *   ],
 * })
 *
 * // draw a circle at the center point with 4px radius.
 * toolGroup.setToolConfiguration(EllipticalROITool.toolName, {
 *   centerPointRadius: 4,
 * });
 * ```
 *
 * Read more in the Docs section of the website.
 */

class CustomEllipticalROITool extends AnnotationTool {
  static toolName = "CustomEllipticalROI";

  _throttledCalculateCachedStats: Function;
  editData: {
    annotation: Annotation;
    viewportIdsToRender: Array<string>;
    handleIndex?: number;
    movingTextBox?: boolean;
    centerWorld?: Array<number>;
    canvasWidth?: number;
    canvasHeight?: number;
    originalHandleCanvas?: Array<number>;
    newAnnotation?: boolean;
    hasMoved?: boolean;
  } | null = null;
  isDrawing: boolean = false;
  isHandleOutsideImage = false;

  constructor(
    toolProps: PublicToolProps = {},
    defaultToolProps: ToolProps = {
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        shadow: true,
        preventHandleOutsideImage: false,
        // Whether to store point data in the annotation
        storePointData: false,
        // Radius of the circle to draw  at the center point of the ellipse.
        // Set this zero(0) in order not to draw the circle.
        centerPointRadius: 0,
        calculateStats: true,
        getTextLines: defaultGetTextLines,
        statsCalculator: BasicStatsCalculator
      }
    }
  ) {
    super(toolProps, defaultToolProps);
    this._mouseMoveCallback = this._mouseMoveCallback.bind(this);
    this._throttledCalculateCachedStats = throttle(
      this._calculateCachedStats,
      100,
      { trailing: true }
    );
  }
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
      const lengthAnnotation = annotation as cornerstoneTools.Types.Annotation;

      if (
        !isAnnotationVisible(lengthAnnotation.annotationUID!) ||
        isAnnotationLocked(lengthAnnotation.annotationUID!)
      ) {
        continue;
      }

      const { data } = lengthAnnotation;
      const points = data.handles!.points;

      for (let i = 0; i < points!.length; i++) {
        const canvasPoint = viewport.worldToCanvas(points![i]);
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
      const lengthAnnotation = annotation as EllipticalROIAnnotation;

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
    const modifying = this.editData?.handleIndex;
    if (modifying) return "MODIFYING";
    const moving = this.editData;
    if (moving) return "MOVING";
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
  static hydrate = (
    viewportId: string,
    points: Types.Point3[],
    options?: {
      annotationUID?: string;
      toolInstance?: CustomEllipticalROITool;
      referencedImageId?: string;
      viewplaneNormal?: Types.Point3;
      viewUp?: Types.Point3;
    }
  ): EllipticalROIAnnotation | undefined => {
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
    } = this.hydrateBase<CustomEllipticalROITool>(
      CustomEllipticalROITool,
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

  /**
   * Based on the current position of the mouse and the current imageId to create
   * a EllipticalROI Annotation and stores it in the annotationManager
   *
   * @param evt -  EventTypes.NormalizedMouseEventType
   * @returns The annotation object.
   *
   */
  addNewAnnotation = (
    evt: EventTypes.InteractionEventType
  ): EllipticalROIAnnotation => {
    const eventDetail = evt.detail;
    const { currentPoints, element } = eventDetail;
    const worldPos = currentPoints.world;
    const canvasPos = currentPoints.canvas;

    const enabledElement = getEnabledElement(element);
    const { viewport, renderingEngine } = enabledElement!;

    this.isDrawing = true;

    const camera = viewport.getCamera();
    const { viewPlaneNormal, viewUp } = camera;

    const referencedImageId = this.getReferencedImageId(
      viewport,
      worldPos,
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
        ...viewport.getViewReference({ points: [worldPos] })
      },
      data: {
        label: "",
        handles: {
          textBox: {
            hasMoved: false,
            worldPosition: <Types.Point3>[0, 0, 0],
            worldBoundingBox: {
              topLeft: <Types.Point3>[0, 0, 0],
              topRight: <Types.Point3>[0, 0, 0],
              bottomLeft: <Types.Point3>[0, 0, 0],
              bottomRight: <Types.Point3>[0, 0, 0]
            }
          },
          points: [
            [...worldPos],
            [...worldPos],
            [...worldPos],
            [...worldPos]
          ] as [Types.Point3, Types.Point3, Types.Point3, Types.Point3],
          activeHandleIndex: null
        },
        cachedStats: {},
        initialRotation: viewport.getRotation()
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
      centerWorld: worldPos,
      newAnnotation: true,
      hasMoved: false
    };
    this._activateDraw(element);

    hideElementCursor(element);

    evt.preventDefault();

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);

    return annotation;
  };

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
    annotation: EllipticalROIAnnotation,
    canvasCoords: Types.Point2,
    proximity: number
  ): boolean => {
    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement!;
    const { data } = annotation;
    const { points } = data.handles;

    const canvasCoordinates = points.map(p => viewport.worldToCanvas(p)) as [
      Types.Point2,
      Types.Point2,
      Types.Point2,
      Types.Point2
    ];

    const [bottom, top, left, right] = canvasCoordinates;

    // Check if near corner handles
    const topLeft = <Types.Point2>[left[0], top[1]];
    const bottomRight = <Types.Point2>[right[0], bottom[1]];

    const distToTopLeft = Math.sqrt(
      Math.pow(canvasCoords[0] - topLeft[0], 2) +
        Math.pow(canvasCoords[1] - topLeft[1], 2)
    );

    const distToBottomRight = Math.sqrt(
      Math.pow(canvasCoords[0] - bottomRight[0], 2) +
        Math.pow(canvasCoords[1] - bottomRight[1], 2)
    );

    if (distToTopLeft <= proximity || distToBottomRight <= proximity) {
      return true;
    }

    // Check if near ellipse edge (existing ellipse logic)
    const w = Math.hypot(left[0] - right[0], left[1] - right[1]);
    const h = Math.hypot(top[0] - bottom[0], top[1] - bottom[1]);
    const angle = Math.atan2(left[1] - right[1], left[0] - right[0]);
    const center = [(left[0] + right[0]) / 2, (top[1] + bottom[1]) / 2];

    const minorEllipse = {
      center,
      xRadius: (w - proximity) / 2,
      yRadius: (h - proximity) / 2,
      angle
    };

    const majorEllipse = {
      center,
      xRadius: (w + proximity) / 2,
      yRadius: (h + proximity) / 2,
      angle
    };

    const pointInMinorEllipse = this._pointInEllipseCanvas(
      minorEllipse,
      canvasCoords
    );
    const pointInMajorEllipse = this._pointInEllipseCanvas(
      majorEllipse,
      canvasCoords
    );

    return pointInMajorEllipse && !pointInMinorEllipse;
  };

  toolSelectedCallback = (
    evt: EventTypes.InteractionEventType,
    annotation: EllipticalROIAnnotation
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

    hideElementCursor(element);

    this._activateModify(element);

    const enabledElement = getEnabledElement(element);
    const { renderingEngine } = enabledElement!;

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);

    evt.preventDefault();
  };
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

  handleSelectedCallback = (
    evt: EventTypes.InteractionEventType,
    annotation: EllipticalROIAnnotation,
    handle: ToolHandle
  ): void => {
    const eventDetail = evt.detail;
    const { element } = eventDetail;
    const { data } = annotation;

    annotation.highlighted = true;

    let movingTextBox = false;
    let handleIndex;

    let centerCanvas;
    let centerWorld;
    let canvasWidth;
    let canvasHeight;
    let originalHandleCanvas;

    if ((handle as TextBoxHandle).worldPosition) {
      movingTextBox = true;
    } else {
      const { points } = data.handles;
      const { viewport } = getEnabledElement(element)!;
      const { worldToCanvas, canvasToWorld } = viewport;

      handleIndex = points.findIndex(p => p === handle);

      const pointsCanvas = points.map(worldToCanvas);

      originalHandleCanvas = pointsCanvas[handleIndex];

      canvasWidth = Math.abs(pointsCanvas[2][0] - pointsCanvas[3][0]);
      canvasHeight = Math.abs(pointsCanvas[0][1] - pointsCanvas[1][1]);

      centerCanvas = [
        (pointsCanvas[2][0] + pointsCanvas[3][0]) / 2,
        (pointsCanvas[0][1] + pointsCanvas[1][1]) / 2
      ];

      centerWorld = canvasToWorld(centerCanvas as Point2);
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
      canvasWidth,
      canvasHeight,
      centerWorld,
      originalHandleCanvas,
      movingTextBox
    };
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

    this.doneEditMemo();

    // Elliptical ROI tool should reset its highlight to false on mouse up (as opposed
    // to other tools that keep it highlighted until the user moves. The reason
    // is that we use top-left and bottom-right handles to define the ellipse,
    // and they are by definition not in the ellipse on mouse up.
    annotation.highlighted = false;
    data.handles!.activeHandleIndex = null;

    this._deactivateModify(element);
    this._deactivateDraw(element);

    resetElementCursor(element);

    this.editData = null;
    this.isDrawing = false;

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

  _dragDrawCallback = (evt: EventTypes.InteractionEventType): void => {
    this.isDrawing = true;
    const eventDetail = evt.detail;
    const { element } = eventDetail;
    const { currentPoints } = eventDetail;
    const currentCanvasPoints = currentPoints.canvas;
    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement!;
    const { canvasToWorld } = viewport;

    const { annotation, viewportIdsToRender, centerWorld, newAnnotation } =
      this.editData!;
    this.createMemo(element, annotation, { newAnnotation });

    const centerCanvas = viewport.worldToCanvas(centerWorld as Types.Point3);
    const { data } = annotation;

    const topLeftCanvas: Types.Point2 = [
      Math.min(centerCanvas[0], currentCanvasPoints[0]),
      Math.min(centerCanvas[1], currentCanvasPoints[1])
    ];

    const bottomRightCanvas: Types.Point2 = [
      Math.max(centerCanvas[0], currentCanvasPoints[0]),
      Math.max(centerCanvas[1], currentCanvasPoints[1])
    ];

    const newCenterCanvas: Types.Point2 = [
      (topLeftCanvas[0] + bottomRightCanvas[0]) / 2,
      (topLeftCanvas[1] + bottomRightCanvas[1]) / 2
    ];

    const dX = Math.abs(bottomRightCanvas[0] - topLeftCanvas[0]) / 2;
    const dY = Math.abs(bottomRightCanvas[1] - topLeftCanvas[1]) / 2;

    const bottomCanvas: Types.Point2 = [
      newCenterCanvas[0],
      newCenterCanvas[1] + dY
    ];
    const topCanvas: Types.Point2 = [
      newCenterCanvas[0],
      newCenterCanvas[1] - dY
    ];
    const leftCanvas: Types.Point2 = [
      newCenterCanvas[0] - dX,
      newCenterCanvas[1]
    ];
    const rightCanvas: Types.Point2 = [
      newCenterCanvas[0] + dX,
      newCenterCanvas[1]
    ];

    // Convert to world coordinates
    let bottomWorld = canvasToWorld(bottomCanvas);
    let topWorld = canvasToWorld(topCanvas);
    let leftWorld = canvasToWorld(leftCanvas);
    let rightWorld = canvasToWorld(rightCanvas);

    // Constrain to image bounds
    const constrainedBottom = this._constrainPointToImageBounds(
      bottomWorld,
      viewport
    );
    const constrainedTop = this._constrainPointToImageBounds(
      topWorld,
      viewport
    );
    const constrainedLeft = this._constrainPointToImageBounds(
      leftWorld,
      viewport
    );
    const constrainedRight = this._constrainPointToImageBounds(
      rightWorld,
      viewport
    );

    data.handles!.points = [
      constrainedBottom,
      constrainedTop,
      constrainedLeft,
      constrainedRight
    ];

    annotation.invalidated = true;
    this.editData!.hasMoved = true;

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);
    triggerAnnotationModified(annotation, element, ChangeTypes.HandlesUpdated);
  };

  _dragModifyCallback = (evt: EventTypes.InteractionEventType): void => {
    console.log("_dragModifyCallback");
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
    const { viewport } = enabledElement!;

    if (movingTextBox) {
      // Move textbox and constrain it individually
      const { deltaPoints } = eventDetail;
      const worldPosDelta = deltaPoints.world;

      const { textBox } = data.handles!;
      const worldPosition = textBox!.worldPosition as Types.Point3;

      // Apply movement
      const movedPosition: Types.Point3 = [
        worldPosition[0] + worldPosDelta[0],
        worldPosition[1] + worldPosDelta[1],
        worldPosition[2] + worldPosDelta[2]
      ];

      // Constrain inside image bounds
      textBox!.worldPosition = this._constrainPointToImageBounds(
        movedPosition,
        viewport
      );
      textBox!.hasMoved = true;
    } else if (handleIndex === undefined) {
      // Moving the entire annotation
      const { deltaPoints } = eventDetail;
      const worldPosDelta = deltaPoints.world;

      const points = data.handles!.points;

      // Apply movement to get new proposed positions
      const newPositions = points!.map(point => [
        point[0] + worldPosDelta[0],
        point[1] + worldPosDelta[1],
        point[2] + worldPosDelta[2]
      ]) as Types.Point3[];

      // Use shape-preserving constraint logic
      const constrainedDelta = this._getConstrainedDeltaForAnnotation(
        newPositions,
        viewport,
        data
      );

      // Apply constrained delta to all points
      points!.forEach(point => {
        point[0] += constrainedDelta[0];
        point[1] += constrainedDelta[1];
        point[2] += constrainedDelta[2];
      });

      annotation.invalidated = true;
    } else {
      // Moving a single handle
      this._dragHandle(evt);

      // Constrain the moved handle to image bounds
      const handle = data.handles!.points![handleIndex];
      data.handles!.points![handleIndex] = this._constrainPointToImageBounds(
        handle,
        viewport
      );

      annotation.invalidated = true;
    }

    triggerAnnotationRenderForViewportIds(viewportIdsToRender);

    if (annotation.invalidated) {
      triggerAnnotationModified(
        annotation,
        element,
        ChangeTypes.HandlesUpdated
      );
    }
  };

  _dragHandle = (evt: EventTypes.InteractionEventType): void => {
    const eventDetail = evt.detail;
    const { element } = eventDetail;
    const { viewport } = getEnabledElement(element)!;
    const { canvasToWorld, worldToCanvas } = viewport;

    const {
      annotation,
      canvasWidth,
      canvasHeight,
      handleIndex,
      centerWorld,
      originalHandleCanvas
    } = this.editData!;
    const centerCanvas = viewport.worldToCanvas(centerWorld as Types.Point3);
    const { data } = annotation;
    const { points } = data.handles!;

    // Move current point in that direction.
    // Move other points in opposite direction.

    const { currentPoints } = eventDetail;
    const currentCanvasPoints = currentPoints.canvas;

    if (handleIndex === 0 || handleIndex === 1) {
      // Dragging top or bottom point
      const dYCanvas = Math.abs(currentCanvasPoints[1] - centerCanvas[1]);
      const canvasBottom = <Types.Point2>[
        centerCanvas[0],
        centerCanvas[1] - dYCanvas
      ];
      const canvasTop = <Types.Point2>[
        centerCanvas[0],
        centerCanvas[1] + dYCanvas
      ];

      points![0] = canvasToWorld(canvasBottom);
      points![1] = canvasToWorld(canvasTop);

      const dXCanvas = currentCanvasPoints[0] - originalHandleCanvas![0];
      const newHalfCanvasWidth = canvasWidth! / 2 + dXCanvas;
      const canvasLeft = <Types.Point2>[
        centerCanvas[0] - newHalfCanvasWidth,
        centerCanvas[1]
      ];
      const canvasRight = <Types.Point2>[
        centerCanvas[0] + newHalfCanvasWidth,
        centerCanvas[1]
      ];

      points![2] = canvasToWorld(canvasLeft);
      points![3] = canvasToWorld(canvasRight);
    } else {
      // Dragging left or right point
      const dXCanvas = Math.abs(currentCanvasPoints[0] - centerCanvas[0]);
      const canvasLeft = <Types.Point2>[
        centerCanvas[0] - dXCanvas,
        centerCanvas[1]
      ];
      const canvasRight = <Types.Point2>[
        centerCanvas[0] + dXCanvas,
        centerCanvas[1]
      ];

      points![2] = canvasToWorld(canvasLeft);
      points![3] = canvasToWorld(canvasRight);

      const dYCanvas = currentCanvasPoints[1] - originalHandleCanvas![1];
      const newHalfCanvasHeight = canvasHeight! / 2 + dYCanvas;
      const canvasBottom = <Types.Point2>[
        centerCanvas[0],
        centerCanvas[1] - newHalfCanvasHeight
      ];
      const canvasTop = <Types.Point2>[
        centerCanvas[0],
        centerCanvas[1] + newHalfCanvasHeight
      ];

      points![0] = canvasToWorld(canvasBottom);
      points![1] = canvasToWorld(canvasTop);
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

  _activateModify = (element: any) => {
    state.isInteractingWithTool = true;

    element.addEventListener(Events.MOUSE_UP, this._endCallback);
    element.addEventListener(Events.MOUSE_DRAG, this._dragModifyCallback);
    element.addEventListener(Events.MOUSE_CLICK, this._endCallback);

    element.addEventListener(Events.TOUCH_END, this._endCallback);
    element.addEventListener(Events.TOUCH_DRAG, this._dragModifyCallback);
    element.addEventListener(Events.TOUCH_TAP, this._endCallback);
  };

  _deactivateModify = (element: any) => {
    state.isInteractingWithTool = false;

    element.removeEventListener(Events.MOUSE_UP, this._endCallback);
    element.removeEventListener(Events.MOUSE_DRAG, this._dragModifyCallback);
    element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);

    element.removeEventListener(Events.TOUCH_END, this._endCallback);
    element.removeEventListener(Events.TOUCH_DRAG, this._dragModifyCallback);
    element.removeEventListener(Events.TOUCH_TAP, this._endCallback);
  };

  _activateDraw = (element: any) => {
    state.isInteractingWithTool = true;

    element.addEventListener(Events.MOUSE_UP, this._endCallback);
    element.addEventListener(Events.MOUSE_DRAG, this._dragDrawCallback);
    element.addEventListener(Events.MOUSE_MOVE, this._dragDrawCallback);
    element.addEventListener(Events.MOUSE_CLICK, this._endCallback);

    element.addEventListener(Events.TOUCH_END, this._endCallback);
    element.addEventListener(Events.TOUCH_DRAG, this._dragDrawCallback);
    element.addEventListener(Events.TOUCH_TAP, this._endCallback);
  };

  _deactivateDraw = (element: any) => {
    state.isInteractingWithTool = false;

    element.removeEventListener(Events.MOUSE_UP, this._endCallback);
    element.removeEventListener(Events.MOUSE_DRAG, this._dragDrawCallback);
    element.removeEventListener(Events.MOUSE_MOVE, this._dragDrawCallback);
    element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);

    element.removeEventListener(Events.TOUCH_END, this._endCallback);
    element.removeEventListener(Events.TOUCH_DRAG, this._dragDrawCallback);
    element.removeEventListener(Events.TOUCH_TAP, this._endCallback);
  };

  /**
   * it is used to draw the ellipticalROI annotation in each
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
      const annotation = annotations[i] as EllipticalROIAnnotation;
      const { annotationUID, data } = annotation;
      const { handles } = data;
      const { points, activeHandleIndex } = handles;

      styleSpecifier.annotationUID = annotationUID;

      const { color, lineWidth, lineDash } = this.getAnnotationStyle({
        annotation,
        styleSpecifier
      });

      const canvasCoordinates = points.map(p => viewport.worldToCanvas(p)) as [
        Types.Point2,
        Types.Point2,
        Types.Point2,
        Types.Point2
      ];

      const canvasCorners = <Array<Types.Point2>>(
        getCanvasEllipseCorners(canvasCoordinates)
      );

      const { centerPointRadius } = this.configuration;

      // Handle stats calculation (existing code...)
      if (
        data.cachedStats &&
        targetId &&
        (!data.cachedStats[targetId] ||
          data.cachedStats[targetId].areaUnit == null)
      ) {
        data.cachedStats[targetId] = {
          Modality: null,
          area: null,
          max: null,
          mean: null,
          stdDev: null,
          areaUnit: null
        } as any;

        this._calculateCachedStats(
          annotation,
          viewport as cornerstone.StackViewport,
          renderingEngine
        );
      } else if (annotation.invalidated) {
        this._throttledCalculateCachedStats(
          annotation,
          viewport,
          renderingEngine,
          enabledElement
        );
      }

      if (!viewport.getRenderingEngine()) {
        console.warn("Rendering Engine has been destroyed");
        return renderStatus;
      }

      if (!isAnnotationVisible(annotationUID!)) {
        continue;
      }

      // ALWAYS SHOW HANDLES - Modified section
      let handleCanvasCoords: Types.Point2[] = [];

      if (!isAnnotationLocked(annotationUID!)) {
        // Calculate top-left and bottom-right handle positions
        const [bottom, top, left, right] = canvasCoordinates;
        const topLeft = <Types.Point2>[left[0], top[1]];
        const bottomRight = <Types.Point2>[right[0], bottom[1]];

        handleCanvasCoords = [topLeft, bottomRight];

        // Highlight the active handle if there is one
        if (activeHandleIndex !== null && this.editData) {
          const activeHandle =
            activeHandleIndex < 2
              ? activeHandleIndex === 0
                ? topLeft
                : bottomRight
              : canvasCoordinates[activeHandleIndex];
          handleCanvasCoords = [activeHandle];
        }
      }

      // Draw handles
      if (handleCanvasCoords.length > 0) {
        const handleGroupUID = "0";
        drawHandlesSvg(
          svgDrawingHelper,
          annotationUID!,
          handleGroupUID,
          handleCanvasCoords,
          {
            color
          }
        );
      }

      // Draw ellipse
      const dataId = `${annotationUID}-ellipse`;
      const ellipseUID = "0";
      drawEllipseByCoordinates(
        svgDrawingHelper,
        annotationUID!,
        ellipseUID,
        canvasCoordinates,
        {
          color,
          lineDash,
          lineWidth
        },
        dataId
      );

      // Draw center point if configured
      if (centerPointRadius > 0) {
        const minRadius = Math.min(
          Math.abs(canvasCorners[0][0] - canvasCorners[1][0]) / 2,
          Math.abs(canvasCorners[0][1] - canvasCorners[1][1]) / 2
        );
        if (minRadius > 3 * centerPointRadius) {
          const centerPoint = this._getCanvasEllipseCenter(canvasCoordinates);
          drawCircle(
            svgDrawingHelper,
            annotationUID!,
            `${ellipseUID}-center`,
            centerPoint,
            centerPointRadius,
            {
              color,
              lineDash,
              lineWidth
            }
          );
        }
      }

      renderStatus = true;

      // Text box rendering (existing code continues...)
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

      let canvasTextBoxCoords;
      if (!data.handles.textBox?.hasMoved) {
        canvasTextBoxCoords = getTextBoxCoordsCanvas(canvasCorners);
        data.handles.textBox!.worldPosition =
          viewport.canvasToWorld(canvasTextBoxCoords);
      }

      const textBoxPosition = viewport.worldToCanvas(
        data.handles.textBox!.worldPosition
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
      data.handles.textBox!.worldBoundingBox = {
        topLeft: viewport.canvasToWorld([left, top]),
        topRight: viewport.canvasToWorld([left + width, top]),
        bottomLeft: viewport.canvasToWorld([left, top + height]),
        bottomRight: viewport.canvasToWorld([left + width, top + height])
      };
    }

    return renderStatus;
  };

  _calculateCachedStats = (
    annotation: Annotation,
    viewport: cornerstone.StackViewport,
    renderingEngine: any
  ) => {
    if (!this.configuration.calculateStats) {
      return;
    }
    const data = annotation.data;
    const { element } = viewport;

    const { points } = data.handles!;

    const canvasCoordinates = points!.map(p => viewport.worldToCanvas(p));
    const { viewPlaneNormal, viewUp } = viewport.getCamera();

    const [topLeftCanvas, bottomRightCanvas] = <Array<Types.Point2>>(
      getCanvasEllipseCorners(canvasCoordinates as CanvasCoordinates)
    );

    const topLeftWorld = viewport.canvasToWorld(topLeftCanvas);
    const bottomRightWorld = viewport.canvasToWorld(bottomRightCanvas);
    const { cachedStats } = data;

    const targetIds = Object.keys(cachedStats!);
    const worldPos1 = topLeftWorld;
    const worldPos2 = bottomRightWorld;

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

      const post2Index = transformWorldToIndex(imageData, worldPos2);

      post2Index[0] = Math.floor(post2Index[0]);
      post2Index[1] = Math.floor(post2Index[1]);
      post2Index[2] = Math.floor(post2Index[2]);

      // Check if one of the indexes are inside the volume, this then gives us
      // Some area to do stats over.

      this.isHandleOutsideImage = !this._isInsideVolume(
        pos1Index,
        post2Index,
        dimensions
      );

      const iMin = Math.min(pos1Index[0], post2Index[0]);
      const iMax = Math.max(pos1Index[0], post2Index[0]);

      const jMin = Math.min(pos1Index[1], post2Index[1]);
      const jMax = Math.max(pos1Index[1], post2Index[1]);

      const kMin = Math.min(pos1Index[2], post2Index[2]);
      const kMax = Math.max(pos1Index[2], post2Index[2]);

      const boundsIJK = [
        [iMin, iMax],
        [jMin, jMax],
        [kMin, kMax]
      ] as [Types.Point2, Types.Point2, Types.Point2];

      const center = [
        (topLeftWorld[0] + bottomRightWorld[0]) / 2,
        (topLeftWorld[1] + bottomRightWorld[1]) / 2,
        (topLeftWorld[2] + bottomRightWorld[2]) / 2
      ] as Types.Point3;

      const ellipseObj = {
        center,
        xRadius: Math.abs(topLeftWorld[0] - bottomRightWorld[0]) / 2,
        yRadius: Math.abs(topLeftWorld[1] - bottomRightWorld[1]) / 2,
        zRadius: Math.abs(topLeftWorld[2] - bottomRightWorld[2]) / 2
      };

      const { worldWidth, worldHeight } = getWorldWidthAndHeightFromTwoPoints(
        viewPlaneNormal!,
        viewUp!,
        worldPos1,
        worldPos2
      );
      const isEmptyArea = worldWidth === 0 && worldHeight === 0;

      const handles = [pos1Index, post2Index];
      const { scale, areaUnit } = getCalibratedLengthUnitsAndScale(
        image,
        handles
      );

      const area =
        Math.abs(Math.PI * (worldWidth / 2) * (worldHeight / 2)) /
        scale /
        scale;

      const pixelUnitsOptions = {
        isPreScaled: isViewportPreScaled(viewport!, targetId),

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
        const pointsInShape = voxelManager.forEach(
          this.configuration.statsCalculator.statsCallback,
          {
            boundsIJK,
            imageData,
            isInObject: pointLPS =>
              pointInEllipse(ellipseObj, pointLPS, { fast: true }),
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
        max: stats.max?.value,
        min: stats.min?.value,
        stdDev: stats.stdDev?.value,
        statsArray: stats.array,
        pointsInShape,
        isEmptyArea,
        areaUnit,
        modalityUnit
      };
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

  /**
   * This is a temporary function to use the old ellipse's canvas-based
   * calculation for isPointNearTool, we should move the the world-based
   * calculation to the tool's isPointNearTool function.
   *
   * @param ellipse - The ellipse object
   * @param location - The location to check
   * @returns True if the point is inside the ellipse
   */
  _pointInEllipseCanvas(ellipse: any, location: Types.Point2): boolean {
    const { xRadius, yRadius, center, angle } = ellipse;

    const rotLocation = vec2.rotate(vec2.create(), location, center, -angle);

    if (xRadius <= 0.0 || yRadius <= 0.0) {
      return false;
    }

    const normalized = [rotLocation[0] - center[0], rotLocation[1] - center[1]];

    const inEllipse =
      (normalized[0] * normalized[0]) / (xRadius * xRadius) +
        (normalized[1] * normalized[1]) / (yRadius * yRadius) <=
      1.0;

    return inEllipse;
  }

  /**
   * It takes the canvas coordinates of the ellipse corners and returns the center point of it
   *
   * @param ellipseCanvasPoints - The coordinates of the ellipse in the canvas.
   * @returns center point.
   */
  _getCanvasEllipseCenter(ellipseCanvasPoints: Types.Point2[]): Types.Point2 {
    const [bottom, top, left, right] = ellipseCanvasPoints;
    const topLeft = [left[0], top[1]];
    const bottomRight = [right[0], bottom[1]];
    return [
      (topLeft[0] + bottomRight[0]) / 2,
      (topLeft[1] + bottomRight[1]) / 2
    ] as Types.Point2;
  }
}

function defaultGetTextLines(data: any, targetId: string): string[] {
  const cachedVolumeStats = data.cachedStats[targetId];
  const { area, mean, stdDev, max, isEmptyArea, areaUnit, modalityUnit, min } =
    cachedVolumeStats;

  const textLines: string[] = [];

  if (isNumber(area)) {
    const areaLine = isEmptyArea
      ? `Area: Oblique not supported`
      : `Area: ${utilities.roundNumber(area)} ${areaUnit}`;
    textLines.push(areaLine);
  }

  if (isNumber(mean)) {
    textLines.push(`Mean: ${utilities.roundNumber(mean)} ${modalityUnit}`);
  }

  if (isNumber(max)) {
    textLines.push(`Max: ${utilities.roundNumber(max)} ${modalityUnit}`);
  }
  if (isNumber(min)) {
    textLines.push(`Min: ${utilities.roundNumber(min)} ${modalityUnit}`);
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

CustomEllipticalROITool.toolName = "CustomEllipticalROI";
export default CustomEllipticalROITool;
