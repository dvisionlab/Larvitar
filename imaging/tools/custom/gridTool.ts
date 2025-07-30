//external imports
import cornerstoneTools from "cornerstone-tools";
import {
  EnabledElement,
  Image,
  PixelCoordinate,
  pixelToCanvas,
  updateImage
} from "cornerstone-core";
const getNewContext = cornerstoneTools.importInternal("drawing/getNewContext");
const EVENTS = cornerstoneTools.EVENTS;
const BaseTool = cornerstoneTools.importInternal("base/BaseTool");
//internal imports
import {
  convertDimensionsToCanvas,
  drawHorizontalLines,
  drawVerticalLines,
  findImageCoords,
  getColors,
  mmToPixels,
  validatePixelSpacing
} from "./utils/gridToolUtils/gridToolUtils";
import { handleElement } from "./utils/gridToolUtils/gridToolUtils";
import { Coords, GridConfig, MeasurementMouseEvent } from "../types";
import { DEFAULT_TOOLS } from "../default";
import { getImageDataFromLarvitarManager } from "../../loaders/commonLoader";

/**
 * @public
 * @class GridTool
 * @memberof Tools.Base
 * @classdesc Tool for drawing a grid with customizable parameters on image,
 * such as grid dimension and center position
 * @extends Tools.Base
 */
export class GridTool extends BaseTool {
  public center: Coords | null = null;
  constructor(props = {}) {
    super({
      name: "GridTool",
      configuration: {
        setup:
          (DEFAULT_TOOLS["Grid"]?.configuration as GridConfig)?.setup || {},
        gridPixelArray: []
      },
      ...props
    });
    this.handleMouseClick = this.handleMouseClick.bind(this);
    this.triggerInputGridDimensionChange =
      this.triggerInputGridDimensionChange.bind(this);
  }

  /**
   * function triggered when tool is set to active
   *
   * @private
   * @param {HTMLElement} element - The viewport element to add event listeners to.
   * @modifies {element}
   * @returns {Promise<void>}
   */
  async activeCallback(element: HTMLElement) {
    const enabledElement = await handleElement(element);
    element.addEventListener(EVENTS.MOUSE_CLICK, this.handleMouseClick);

    const newSetup = (DEFAULT_TOOLS["Grid"]?.configuration as GridConfig)
      ?.setup;
    if (!newSetup) {
      console.error("GridTool: Setup configuration is undefined or null");
      return;
    }

    this.configuration.setup = newSetup;
    if (
      enabledElement &&
      enabledElement.image.rows >= this.configuration.setup.minRows &&
      enabledElement.image.columns >= this.configuration.setup.minColumns
    ) {
      this.enabledElement = enabledElement;
      this.triggerDrawGrid(enabledElement);
    }
    const buttonGridDimension = document.getElementById("patternDimension");
    buttonGridDimension?.addEventListener(
      "input",
      this.triggerInputGridDimensionChange
    );
  }

  triggerInputGridDimensionChange(event: any) {
    const defaultConfig = DEFAULT_TOOLS["Grid"]?.configuration as GridConfig;
    if (!defaultConfig?.setup) {
      console.error("GridTool: Setup configuration is undefined or null");
      return;
    }

    const value = event?.target?.value;
    if (value === undefined || value === null || value === "") {
      console.warn(
        "GridTool: Grid dimension input value is undefined, null or empty"
      );
      return;
    }

    defaultConfig.setup.gridDimensionMM = value;
    updateImage(this.enabledElement.element);
  }

  /**
   * function triggered when tool is set to disabled
   *
   * @private
   * @param {HTMLElement} element - The viewport element to add remove listeners to.
   * @modifies {element}
   * @returns {void}
   */
  disabledCallback(element: HTMLElement) {
    element.removeEventListener(EVENTS.MOUSE_CLICK, this.handleMouseClick);
    const buttonGridDimension = document.getElementById("gridDimension");
    buttonGridDimension?.removeEventListener(
      "input",
      this.triggerInputGridDimensionChange
    );
  }

  /**
   * function triggered when tool is set to passive
   *
   * @private
   * @param {HTMLElement} element - The viewport element to add remove listeners to.
   * @modifies {element}
   * @returns {void}
   */
  passiveCallback(element: HTMLElement) {
    element.removeEventListener(EVENTS.MOUSE_CLICK, this.handleMouseClick);
  }
  /**
   * function to change center of the grid position on user click
   *
   * @private
   * @param {MeasurementMouseEvent} evt - The click event
   * @returns {void}
   */
  handleMouseClick(evt: MeasurementMouseEvent) {
    const center = evt.detail.currentPoints.image;

    if (center?.x && center.y) {
      this.center = center;
    }
    updateImage(this.enabledElement.element);
  }

  /**
   * @private
   * @param {MeasurementMouseEvent} evt - The click event
   * @returns {void}
   */
  renderToolData(evt: MeasurementMouseEvent) {
    if (this.enabledElement) {
      this.triggerDrawGrid(this.enabledElement);
    }
  }

  /**
   * function to trigger the draw grid
   * @private
   * @param {EnabledElement} enabledElement
   * @returns {void}
   */
  triggerDrawGrid(enabledElement: EnabledElement) {
    this.configuration.gridPixelArray = [];
    const newSetup = (DEFAULT_TOOLS["Grid"]?.configuration as GridConfig)
      ?.setup;
    if (!newSetup) {
      console.error("GridTool: Setup configuration is undefined or null");
      return;
    }

    this.configuration.setup = newSetup;

    const image = enabledElement.image as Image;
    const imageMetadata = getImageDataFromLarvitarManager(image.imageId);
    const pixelSpacing = imageMetadata!.pixelSpacing!;
    try {
      validatePixelSpacing(
        pixelSpacing[0],
        pixelSpacing[1],
        this.configuration.setup.minPixelSpacing
      );
    } catch (error: any) {
      console.error(error.message);
      return;
    }

    const context: CanvasRenderingContext2D = getNewContext(
      enabledElement.canvas
    );
    const element = enabledElement.element;

    //grid pattern color
    const bitDepth = (image as any).bitsAllocated;
    const { lightGray, darkGray } = getColors(
      bitDepth,
      this.configuration.setup.colorFractionLight,
      this.configuration.setup.colorFractionDark
    );

    // Validate grid dimension
    if (
      !this.configuration.setup.gridDimensionMM ||
      this.configuration.setup.gridDimensionMM === undefined ||
      this.configuration.setup.gridDimensionMM === null
    ) {
      console.error("GridTool: Grid dimension is undefined, null or empty");
      return;
    }

    let patternHeight = mmToPixels(
      this.configuration.setup.gridDimensionMM,
      pixelSpacing[1]
    );
    let patternWidth = mmToPixels(
      this.configuration.setup.gridDimensionMM,
      pixelSpacing[0]
    );

    const patternCanvasDimensions = convertDimensionsToCanvas(
      element,
      patternWidth,
      patternHeight
    );

    //dash dimension validation
    if (
      !this.configuration.setup.dashHeightMM ||
      this.configuration.setup.dashHeightMM === undefined ||
      this.configuration.setup.dashHeightMM === null
    ) {
      console.error("GridTool: Dash height is undefined, null or empty");
      return;
    }

    if (
      !this.configuration.setup.dashWidthMM ||
      this.configuration.setup.dashWidthMM === undefined ||
      this.configuration.setup.dashWidthMM === null
    ) {
      console.error("GridTool: Dash width is undefined, null or empty");
      return;
    }

    let dashHeight = mmToPixels(
      this.configuration.setup.dashHeightMM,
      pixelSpacing[1]
    );
    let dashWidth = mmToPixels(
      this.configuration.setup.dashWidthMM,
      pixelSpacing[0]
    );
    const dashCanvasDimensions = convertDimensionsToCanvas(
      element,
      dashWidth,
      dashHeight
    );

    //grid center coordinates
    const { start, end } = findImageCoords(element, image);
    let center = { x: (end.x + start.x) / 2, y: (end.y + start.y) / 2 };
    if (this.center) {
      center = pixelToCanvas(element, this.center as PixelCoordinate);
    }

    this.drawDashedGrid(
      context,
      center.x,
      center.y,
      start,
      end,
      patternCanvasDimensions.width,
      patternCanvasDimensions.height,
      dashCanvasDimensions.width,
      dashCanvasDimensions.height,
      dashHeight,
      dashWidth,
      lightGray,
      darkGray,
      image,
      element
    );
  }

  /**
   * function to draw the grid
   * @private
   * @param {CanvasRenderingContext2D} context
   * @param {number} xCenter
   * @param {number} yCenter
   * @param {Coords} start
   * @param {Coords} end
   * @param {number} patternWidth
   * @param {number} patternHeight
   * @param {number} dashWidth
   * @param {number} dashHeight
   * @param {string} lightGray
   * @param {string} darkGray
   * @returns {void}
   */
  drawDashedGrid(
    context: CanvasRenderingContext2D,
    xCenter: number,
    yCenter: number,
    start: Coords,
    end: Coords,
    patternWidth: number,
    patternHeight: number,
    dashWidth: number,
    dashHeight: number,
    imageDashHeight: number,
    imageDashWidth: number,
    lightGray: string,
    darkGray: string,
    image: Image,
    element: HTMLElement
  ) {
    // Create the 1D array to represent the pixel map
    this.configuration.gridPixelArray = new Array(
      image.width * image.height
    ).fill(0);
    drawVerticalLines(
      context,
      xCenter,
      start,
      end,
      patternWidth,
      dashWidth,
      dashHeight,
      imageDashHeight,
      imageDashWidth,
      lightGray,
      darkGray,
      this.configuration.gridPixelArray,
      image,
      element
    );
    drawHorizontalLines(
      context,
      yCenter,
      start,
      end,
      patternHeight,
      dashWidth,
      dashHeight,
      imageDashHeight,
      imageDashWidth,
      lightGray,
      darkGray,
      this.configuration.gridPixelArray,
      image,
      element
    );
    (DEFAULT_TOOLS["Grid"].configuration as GridConfig).gridPixelArray =
      this.configuration.gridPixelArray;
    //TEST PIXEL ARRAY
    // image.getPixelData = () => this.configuration.gridPixelArray;
    // updateImage(element);
  }

  /**
   * returns grid's pixelArray
   * @private
   * @returns {number[]}
   */
  getGridPixelArray() {
    return this.configuration.gridPixelArray;
  }
}
