import cornerstone from "cornerstone-core";
declare const BaseAnnotationTool: any;
import { HandlePosition } from "../types";
type dataSets = {
    points: number[];
    pixelValues: number[];
    color: string;
}[];
interface data {
    visible: boolean;
    active: boolean;
    color: string;
    invalidated: boolean;
    handles: Handles;
    length: number;
}
interface Handles {
    start: HandlePosition;
    end: HandlePosition;
    offset: number;
    fixedoffset: number;
    color: string;
    textBox?: {
        active: boolean;
        hasMoved: boolean;
        movesIndependently: boolean;
        drawnIndependently: boolean;
        allowedOutsideImage: boolean;
        hasBoundingBox: boolean;
    };
}
interface ToolMouseEvent {
    detail: EventData;
    currentTarget: any;
}
interface Coords {
    x: number;
    y: number;
}
interface EventData {
    currentPoints: {
        image: Coords;
    };
    element: HTMLElement;
    buttons: number;
    shiftKey: boolean;
    event: {
        altKey: boolean;
        shiftKey: boolean;
    };
    image: cornerstone.Image;
    canvasContext: {
        canvas: any;
    };
}
interface PlotlyData {
    x: number[];
    y: number[];
    type: string;
    line: {
        color: string;
    };
}
/**
 * @public
 * @class LengthPlotTool
 * @memberof cornerstoneTools
 * @classdesc Tool for tracing 3 lines with a configurable offset
 * and draw the plot of greyscale values along the lines
 * @extends cornerstoneTools.Base.BaseTool
 */
export default class LengthPlotTool extends BaseAnnotationTool {
    name: string;
    eventData?: EventData;
    datahandles?: Handles | null;
    abovehandles?: Handles | null;
    belowhandles?: Handles | null;
    plotlydata: Array<PlotlyData>;
    measuring: boolean;
    throttledUpdateCachedStats: any;
    configuration: {
        drawHandles: boolean;
        drawHandlesOnHover: boolean;
        hideHandlesIfMoving: boolean;
        renderDashed: boolean;
        digits: number;
        handleRadius?: number;
        offset: number;
    };
    constructor(props?: {});
    /**
     * handles Mouse Up listener (to create the final plot)
     * @method
     * @name handleMouseUp
     * @returns {void}
     */
    handleMouseUp(): void;
    /**
     * allows to change the offset between the three lines
     * @method
     * @name changeOffset
     * @param {WheelEvent} evt
     * @returns {void}
     */
    changeOffset(evt: WheelEvent): void;
    /**
     * Creates new measurement on click
     * @method
     * @name createNewMeasurement
     * @param {EventData} eventData
     * @returns {void}
     */
    createNewMeasurement(eventData: EventData): {
        visible: boolean;
        active: boolean;
        color: string;
        invalidated: boolean;
        handles: {
            start: {
                x: number;
                y: number;
                highlight: boolean;
                active: boolean;
            };
            end: {
                x: number;
                y: number;
                highlight: boolean;
                active: boolean;
            };
            textBox: {
                active: boolean;
                hasMoved: boolean;
                movesIndependently: boolean;
                drawnIndependently: boolean;
                allowedOutsideImage: boolean;
                hasBoundingBox: boolean;
            };
            offset: number;
            fixedoffset: number;
        };
    } | undefined;
    /**
     * Identifies when the cursor is near the tool data
     * @method
     * @name pointNearTool
     * @param {HTMLElement} element
     * @param {data} data
     * @param {Coords} coords
     * @returns {boolean}
     */
    pointNearTool(element: HTMLElement, data: data, coords: Coords): boolean;
    /**
     * Updates stats of line length
     * @method
     * @name updateCachedStats
     * @param {cornerstone.Image} image
     * @param {HTMLElement} element
     * @param {data} data
     * @returns {boolean}
     */
    updateCachedStats(image: cornerstone.Image, element: HTMLElement, data: data): void;
    /**
     * Renders the data (new line/modified line)
     * @method
     * @name updateCachedStats
     * @param {ToolMouseEvent | WheelEvent} evt
     * @returns {void}
     */
    renderToolData(evt: ToolMouseEvent | WheelEvent): void;
    /**
     * Retrieves the points along the line
     * @method
     * @name getPointsAlongLine
     * @param {HandlePosition} startHandle
     * @param {HandlePosition} endHandle
     * @param {number} colPixelSpacing
     * @returns {number[]}
     */
    getPointsAlongLine(startHandle: HandlePosition, endHandle: HandlePosition, colPixelSpacing: number): {
        x: number;
        y: number;
    }[];
    /**
     * Retrieves the pixel greyscale values along the line
     * @method
     * @name getPixelValuesAlongLine
     * @param {HandlePosition} startHandle
     * @param {number[]} points
     * @param {number} colPixelSpacing
     * @param {EventData} eventData
     * @returns {void}
     */
    getPixelValuesAlongLine(startHandle: HandlePosition, points: {
        x: number;
        y: number;
    }[], colPixelSpacing: number, eventData: EventData): number[];
    /**
     * Creates the plot: coords-greyscale value
     * @method
     * @name createPlot
     * @param {dataSets} dataSets
     * @returns {void}
     */
    createPlot(canvasId: string, ...dataSets: dataSets): void;
    clearPlotlyData(plotDiv: HTMLElement): void;
    setupResizeObserver(plotDiv: HTMLElement): void;
    removeResizeObserver(plotDiv: HTMLElement): void;
}
export {};
