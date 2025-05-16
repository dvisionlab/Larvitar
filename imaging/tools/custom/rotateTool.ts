import cornerstoneTools from "cornerstone-tools";
import { Coords, MeasurementMouseEvent } from "../types";
const external = cornerstoneTools.external;
const BaseTool = cornerstoneTools.importInternal("base/BaseTool");
const { rotateCursor } = cornerstoneTools.importInternal("tools/cursors");

/**
 * @public
 * @class RotateTool
 * @memberof Tools
 *
 * @classdesc Tool for rotating the image.
 * @extends Tools.Base.BaseTool
 */
export default class RotateTool extends BaseTool {
  constructor(props = {}) {
    const defaultProps = {
      name: "Rotate",
      strategies: {
        default: defaultStrategy,
        horizontal: horizontalStrategy,
        vertical: verticalStrategy
      },
      defaultStrategy: "default",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {
        roundAngles: false,
        flipHorizontal: false,
        flipVertical: false,
        rotateScale: 1
      },
      svgCursor: rotateCursor
    };

    super(props, defaultProps);
  }

  touchDragCallback(evt: MeasurementMouseEvent) {
    this.dragCallback(evt);
  }

  mouseDragCallback(evt: MeasurementMouseEvent) {
    this.dragCallback(evt);
  }

  postMouseDownCallback(evt: MeasurementMouseEvent) {
    this.initialRotation = evt.detail.viewport.rotation;
  }

  dragCallback(evt: MeasurementMouseEvent) {
    evt.detail.viewport.initialRotation = this.initialRotation;
    this.applyActiveStrategy(evt);
    external.cornerstone.setViewport(evt.detail.element, evt.detail.viewport);
  }
}

function defaultStrategy(this: RotateTool, evt: MeasurementMouseEvent) {
  const { roundAngles, rotateScale } = this.configuration;
  const { element, viewport, startPoints, currentPoints } = evt.detail;

  // Warning: viewport.initialRotation ? is not correct because viewport.initialRotation = 0 results as false
  const initialRotation =
    viewport.initialRotation !== undefined
      ? viewport.initialRotation
      : viewport.rotation;

  // Calculate the center of the image
  const rect = element.getBoundingClientRect();
  const { clientWidth: width, clientHeight: height } = element;

  const { scale, translation } = viewport;
  const centerPoints = {
    x: rect.left + width / 2 + translation!.x * scale,
    y: rect.top + height / 2 + translation!.y * scale
  };

  const angleInfo = angleBetweenPoints(
    centerPoints,
    startPoints.client,
    currentPoints.client
  );

  angleInfo.angle *= rotateScale;

  if (roundAngles) {
    angleInfo.angle = Math.ceil(angleInfo.angle);
  }
  if (angleInfo.direction < 0) {
    angleInfo.angle = -angleInfo.angle;
  }
  viewport.rotation = initialRotation + angleInfo.angle;
}

function horizontalStrategy(this: RotateTool, evt: MeasurementMouseEvent) {
  const { roundAngles, flipHorizontal, rotateScale } = this.configuration;
  const { viewport, startPoints, currentPoints } = evt.detail;
  const initialRotation = viewport.initialRotation;
  const initialPointX = startPoints.client.x;
  const currentPointX = currentPoints.client.x;

  let angle = (currentPointX - initialPointX) * rotateScale;

  if (roundAngles) {
    angle = Math.round(Math.abs(angle)) * (angle > 0 ? 1 : -1);
  }
  if (flipHorizontal) {
    angle = -angle;
  }

  viewport.rotation = initialRotation + angle;
}

function verticalStrategy(this: RotateTool, evt: MeasurementMouseEvent) {
  const { roundAngles, flipVertical, rotateScale } = this.configuration;
  const { viewport, startPoints, currentPoints } = evt.detail;
  const initialRotation = viewport.initialRotation;
  const initialPointY = startPoints.client.y;
  const currentPointY = currentPoints.client.y;

  let angle = (currentPointY - initialPointY) * rotateScale;

  if (roundAngles) {
    angle = Math.round(Math.abs(angle)) * (angle > 0 ? 1 : -1);
  }
  if (flipVertical) {
    angle = -angle;
  }

  viewport.rotation = initialRotation + angle;
}

const angleBetweenPoints = (p0: Coords, p1: Coords, p2: Coords) => {
  const p12 = Math.sqrt(Math.pow(p0.x - p1.x, 2) + Math.pow(p0.y - p1.y, 2));
  const p13 = Math.sqrt(Math.pow(p0.x - p2.x, 2) + Math.pow(p0.y - p2.y, 2));
  const p23 = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  const angle =
    (Math.acos(
      (Math.pow(p12, 2) + Math.pow(p13, 2) - Math.pow(p23, 2)) / (2 * p12 * p13)
    ) *
      180) /
    Math.PI;

  const direction =
    (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);

  return {
    angle,
    direction
  };
};
