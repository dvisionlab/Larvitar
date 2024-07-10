/** @module imaging/tools/custom/livewireSegmentationTool
 *  @desc  This file provides functionalities for
 *         a brush tool with livewire using a
 *         custom cornerstoneTools
 */

// external libraries
import { Image } from "cornerstone-core";
import cornerstoneTools from "cornerstone-tools";
import { MeasurementMouseEvent } from "../types";
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

  // Calculate the gradient magnitude of the image
  calculateGradient(image: Image, pixelData: number[]) {
    const { rows, columns } = image;
    const gradient = new Array(rows * columns);

    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < columns - 1; x++) {
        const gx =
          pixelData[y * columns + (x + 1)] - pixelData[y * columns + (x - 1)];
        const gy =
          pixelData[(y + 1) * columns + x] - pixelData[(y - 1) * columns + x];
        gradient[y * columns + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    return gradient;
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
    image: Image,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) {
    const { rows, columns } = image;
    if (!this.gradient) {
      this.gradient = this.calculateGradient(image, this.pixelData!);
    }
    const costs = new Float32Array(rows * columns).fill(Infinity);
    const prev = new Int32Array(rows * columns).fill(-1);
    const visited = new Uint8Array(rows * columns);

    const queue = new MinHeap();
    const startIdx = startY * columns + startX;
    const endIdx = endY * columns + endX;
    costs[startIdx] = 0;
    queue.insert({ index: startIdx, cost: 0 });

    while (!queue.isEmpty()) {
      const current = queue.extractMin();
      const currentIdx = current.index;
      const currentX = currentIdx % columns;
      const currentY = Math.floor(currentIdx / columns);

      if (currentIdx === endIdx) {
        break;
      }

      visited[currentIdx] = 1;

      const neighbors = [
        [currentX - 1, currentY],
        [currentX + 1, currentY],
        [currentX, currentY - 1],
        [currentX, currentY + 1]
      ];

      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= columns || ny < 0 || ny >= rows) {
          continue;
        }

        const neighborIdx = ny * columns + nx;
        if (visited[neighborIdx]) {
          continue;
        }

        const newCost = costs[currentIdx] + this.gradient[neighborIdx];
        if (newCost < costs[neighborIdx]) {
          costs[neighborIdx] = newCost;
          prev[neighborIdx] = currentIdx;
          queue.insert({ index: neighborIdx, cost: newCost });
        }
      }
    }

    const path = [];
    let idx = endIdx;
    while (idx !== -1) {
      path.push([idx % columns, Math.floor(idx / columns)]);
      idx = prev[idx];
    }

    return path.reverse();
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

    let mousePosition;

    if (this._drawing) {
      mousePosition = this._lastImageCoords;
    } else if (this._mouseUpRender) {
      mousePosition = this._lastImageCoords;
      this._mouseUpRender = false;
    } else {
      mousePosition = cornerstoneTools.store.state.mousePositionImage;
    }

    if (!mousePosition) {
      return;
    }

    const { rows, columns } = eventData.image;

    const { x, y } = eventData.currentPoints.image;

    if (x < 0 || x > columns || y < 0 || y > rows) {
      return;
    }

    if (!this.pixelData) {
      this.pixelData = eventData.image.getPixelData();
    }

    const path = this.dijkstra(
      eventData.image,
      mousePosition.x,
      mousePosition.y,
      x,
      y
    );
    console.log(path);
    this.path = path;

    const context = eventData.canvasContext;
    const element = eventData.element;
    const color = getters.brushColor(element, this._drawing);

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.beginPath();
    context.strokeStyle = color;

    if (this.path) {
      // Draw the Livewire path
      this.path.forEach(([px, py]: [number, number], index: number) => {
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
    }

    context.stroke();
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

    const path =
      this.path ??
      this.dijkstra(eventData.image, lastPoints[0].x, lastPoints[0].y, x, y);

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
