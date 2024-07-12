/** @module imaging/tools/custom/livewireSegmentationTool
 *  @desc  This file provides functionalities for
 *         a brush tool with livewire using a
 *         custom cornerstoneTools
 */

// external libraries
import cornerstoneTools from "cornerstone-tools";
import { MeasurementMouseEvent } from "../types";
import { LivewireScissors } from "./utils/livewireUtils/livewireScissors";
import { LivewirePath } from "./utils/livewireUtils/livewirePath";
const external = cornerstoneTools.external;
const BaseBrushTool = cornerstoneTools.importInternal("base/BaseBrushTool");
const segmentationUtils = cornerstoneTools.importInternal(
  "util/segmentationUtils"
);
const drawBrushPixels = segmentationUtils.drawBrushPixels;
const getModule = cornerstoneTools.getModule;
const throttle = cornerstoneTools.importInternal("util/throttle");
// Priority Queue implementation for Dijkstra's algorithm
class MinHeap {
  private heap: any;
  constructor() {
    this.heap = [];
  }

  insert(element: any) {
    this.heap.push(element);
    this.bubbleUp();
  }

  extractMin() {
    if (this.heap.length < 2) {
      return this.heap.pop();
    }
    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown();
    return min;
  }

  bubbleUp() {
    let index = this.heap.length - 1;
    const element = this.heap[index];

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];

      if (element.cost >= parent.cost) break;

      this.heap[index] = parent;
      index = parentIndex;
    }

    this.heap[index] = element;
  }

  bubbleDown() {
    let index = 0;
    const length = this.heap.length;
    const element = this.heap[0];

    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let leftChild, rightChild;
      let swapIndex = null;

      if (leftChildIndex < length) {
        leftChild = this.heap[leftChildIndex];
        if (leftChild.cost < element.cost) {
          swapIndex = leftChildIndex;
        }
      }

      if (rightChildIndex < length) {
        rightChild = this.heap[rightChildIndex];
        if (
          (swapIndex === null && rightChild.cost < element.cost) ||
          (swapIndex !== null && rightChild.cost < leftChild.cost)
        ) {
          swapIndex = rightChildIndex;
        }
      }

      if (swapIndex === null) break;

      this.heap[index] = this.heap[swapIndex];
      index = swapIndex;
    }

    this.heap[index] = element;
  }

  isEmpty() {
    return this.heap.length === 0;
  }
}
export default class LivewireBrushTool extends BaseBrushTool {
  private gradient: number[] | null = null;
  private pixelData: number[] | null = null;
  private lastRenderTimestamp = 0;
  private throttleTime = 100; // Throttle time in milliseconds
  private throttledRenderBrush: (evt: MeasurementMouseEvent) => void;

  constructor(props = {}) {
    const defaultProps = {
      name: "LivewireBrush",
      supportedInteractionTypes: ["Mouse", "Touch"],
      configuration: {}
    };

    super(props, defaultProps);

    this.throttledRenderBrush = throttle(this.renderBrush, 110);
    this.touchDragCallback = this._paint.bind(this);
    this.path = null; // State to store the current Livewire path
  }

  /*livewireIsogradient(image: Image, startX: number, startY: number) {
    const { rows, columns } = image;

    // Initialize gradient and pixel data if not already initialized
    if (!this.pixelData) this.pixelData = image.getPixelData();
    const gradient = this.calculateGradient(image, this.pixelData);
    console.log(gradient);
    // Initialize starting point
    let currentX = startX;
    let currentY = startY;

    // Trace along the isogradient lines
    const pixelArray = [];

    while (
      currentX >= 0 &&
      currentX < columns &&
      currentY >= 0 &&
      currentY < rows
    ) {
      // Determine gradient direction at current pixel
      const gradientIndex =
        Math.floor(currentY) * columns + Math.floor(currentX);
      const gx = gradient[gradientIndex];

      // Since gradient is already computed as the magnitude, we need to find gy using the gradient direction
      // Compute gy (assuming gradient is normalized to 1)
      const gy = Math.sqrt(1 - gx * gx); // Use the Pythagorean theorem

      // Move to the next pixel in the gradient direction
      currentX += gx;
      currentY += gy;

      // Add current pixel to the pixel array
      pixelArray.push([currentX, currentY]);
    }
    console.log(pixelArray);
    return pixelArray;
  }*/

  dijkstra(
    image: number[],
    width: number,
    height: number,
    voiRange: { lower: number; upper: number },
    brushRadius: number,
    startPoint: [number, number],
    scissors: LivewireScissors | null = null,
    path: LivewirePath | null = null
  ): { path: [number, number][]; scissors: LivewireScissors } {
    // Step 1: Create or reuse LivewireScissors instance from raw pixel data
    const livewireScissors =
      scissors ||
      LivewireScissors.createInstanceFromRawPixelData(
        image,
        width,
        height,
        voiRange
      );

    // Step 2: Start the Livewire search from the specified startPoint
    livewireScissors.startSearch(startPoint);

    // Step 3: Define the brush delta based on brush radius
    const delta = Math.ceil(brushRadius / 2);

    // Step 4: Create or reuse LivewirePath instance
    const livewirePath = this.path || new LivewirePath();

    // Step 5: Perform Livewire path finding
    let currentPoint = startPoint;
    livewirePath.addPoint(currentPoint);

    while (true) {
      // Find the minimum cost nearby point
      const nextPoint = livewireScissors.findMinNearby(currentPoint, delta);

      // If the next point is the same as the current point, break the loop
      if (
        nextPoint[0] === currentPoint[0] &&
        nextPoint[1] === currentPoint[1]
      ) {
        break;
      }

      // Add the next point to the LivewirePath
      livewirePath.addPoint(nextPoint);

      // Update the current point
      currentPoint = nextPoint;
    }

    return { path: livewirePath.getPath(), scissors: livewireScissors };
  }

  renderToolData(evt: MeasurementMouseEvent) {
    this.throttledRenderBrush(evt);
  }

  renderBrush(evt: MeasurementMouseEvent) {
    const { cornerstone } = external;
    const { getters, configuration } = getModule("segmentation");
    const eventData = evt.detail;
    const viewport = eventData.viewport;

    const now = Date.now();
    if (now - this.lastRenderTimestamp < this.throttleTime) {
      return; // Skip rendering if within throttle interval
    }
    this.lastRenderTimestamp = now;

    const mousePosition = cornerstoneTools.store.state.mousePositionImage;
    if (!mousePosition) {
      return;
    }

    const pathData = this.dijkstra(
      eventData.image.getPixelData(),
      eventData.image.width,
      eventData.image.height,
      eventData.viewport.voiLUT,
      configuration.radius,
      mousePosition,
      this.scissors,
      this.livewirePath
    );

    const path = pathData.path;
    this.scissors = pathData.scissors;
    this.livewirePath = pathData.path; // Update the LivewirePath instance

    const context = eventData.canvasContext;
    const element = eventData.element;
    const color = getters.brushColor(element, this._drawing);

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.beginPath();
    context.strokeStyle = color;

    if (path.length > 0) {
      path.forEach(([px, py]: [number, number], index: number) => {
        const canvasCoords = cornerstone.pixelToCanvas(element, {
          x: px,
          y: py
        });
        if (index === 0) {
          context.moveTo(canvasCoords.x, canvasCoords.y);
        } else {
          context.lineTo(canvasCoords.x, canvasCoords.y);
        }
      });
      context.stroke();
    } else {
      // Fallback to circle (initial rendering before any path is created)
      const radius = configuration.radius;
      const circleRadius = radius * viewport.scale;
      const mouseCoordsCanvas = cornerstone.pixelToCanvas(
        element,
        mousePosition
      );
      context.ellipse(
        mouseCoordsCanvas.x,
        mouseCoordsCanvas.y,
        circleRadius,
        circleRadius,
        0,
        0,
        2 * Math.PI
      );
      context.stroke();
    }
  }

  _paint(evt: MeasurementMouseEvent) {
    const eventData = evt.detail;
    const { rows, columns } = eventData.image;
    const { x, y } = eventData.currentPoints.image;
    const { lastPoints } = this.paintEventData || {};

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    if (!lastPoints) {
      this.paintEventData = { lastPoints: [{ x, y }] };
      this.path = null; // Clear path when starting a new stroke
      return;
    }

    const path = this.path;

    this.path = path; // Store the current path for rendering

    const { labelmap2D, labelmap3D, shouldErase } = this.paintEventData;

    // Draw / Erase the active color using the path from the Livewire algorithm
    for (const [px, py] of path) {
      const pointerArray = [[px, py]];
      drawBrushPixels(
        pointerArray,
        labelmap2D.pixelData,
        labelmap3D.activeSegmentIndex,
        columns,
        shouldErase
      );
    }

    this.paintEventData.lastPoints = [{ x, y }];
    external.cornerstone.updateImage(eventData.element);
  }
}
