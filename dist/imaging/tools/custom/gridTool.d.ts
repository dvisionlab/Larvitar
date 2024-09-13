import { EnabledElement, Image } from "cornerstone-core";
declare const BaseTool: any;
import { Coords, MeasurementMouseEvent } from "../types";
export declare const config: {
    dashHeightMM: number;
    dashWidthMM: number;
    colorFractionLight: number;
    colorFractionDark: number;
    maxVal8bit: number;
    maxVal16bit: number;
    gridSizeMM: number;
    minPixelSpacing: number;
};
/**
 * @public
 * @class GridTool
 * @memberof Tools.Base
 * @classdesc Tool for drawing a grid with customizable parameters on image,
 * such as grid dimension and center position
 * @extends Tools.Base
 */
export declare class GridTool extends BaseTool {
    center: Coords | null;
    constructor(props?: {});
    /**
     * function triggered when tool is set to active
     *
     * @private
     * @param {HTMLElement} element - The viewport element to add event listeners to.
     * @modifies {element}
     * @returns {Promise<void>}
     */
    activeCallback(element: HTMLElement): Promise<void>;
    /**
     * function triggered when tool is set to disabled
     *
     * @private
     * @param {HTMLElement} element - The viewport element to add remove listeners to.
     * @modifies {element}
     * @returns {void}
     */
    disabledCallback(element: HTMLElement): void;
    /**
     * function to change center of the grid position on user click
     *
     * @private
     * @param {MeasurementMouseEvent} evt - The click event
     * @returns {void}
     */
    handleMouseClick(evt: MeasurementMouseEvent): void;
    /**
     * @private
     * @param {MeasurementMouseEvent} evt - The click event
     * @returns {void}
     */
    renderToolData(evt: MeasurementMouseEvent): void;
    /**
     * function to trigger the draw grid
     * @private
     * @param {EnabledElement} enabledElement
     * @returns {void}
     */
    triggerDrawGrid(enabledElement: EnabledElement): void;
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
    drawDashedGrid(context: CanvasRenderingContext2D, xCenter: number, yCenter: number, start: Coords, end: Coords, patternWidth: number, patternHeight: number, dashWidth: number, dashHeight: number, lightGray: string, darkGray: string, image: Image, element: HTMLElement): void;
    /**
     * returns grid's pixelArray
     * @private
     * @returns {number[]}
     */
    getGridPixelArray(): any;
}
export {};
