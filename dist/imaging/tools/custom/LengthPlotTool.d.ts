import cornerstone from "cornerstone-core";
declare const BaseAnnotationTool: any;
import { HandlePosition, dataSets, MeasurementData, Handles, MeasurementMouseEvent, Coords, EventData, PlotlyData } from "../types";
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
    datahandles?: Handles;
    abovehandles?: Handles;
    belowhandles?: Handles;
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
        };
    } | undefined;
    /**
     * Identifies when the cursor is near the tool data
     * @method
     * @name pointNearTool
     * @param {HTMLElement} element
     * @param {MeasurementData} data
     * @param {Coords} coords
     * @returns {boolean}
     */
    pointNearTool(element: HTMLElement, data: MeasurementData, coords: Coords): boolean;
    /**
     * Updates stats of line length
     * @method
     * @name updateCachedStats
     * @param {cornerstone.Image} image
     * @param {HTMLElement} element
     * @param {MeasurementData} data
     * @returns {boolean}
     */
    updateCachedStats(image: cornerstone.Image, element: HTMLElement, data: MeasurementData): void;
    /**
     * Renders the data (new line/modified line)
     * @method
     * @name updateCachedStats
     * @param {MeasurementMouseEvent | WheelEvent} evt
     * @returns {void}
     */
    renderToolData(evt: MeasurementMouseEvent | WheelEvent): void;
    /**
     * Retrieves the points along the line
     * @method
     * @name getPointsAlongLine
     * @param {HandlePosition} startHandle
     * @param {HandlePosition} endHandle
     * @param {number} colPixelSpacing
     * @returns {number[]}
     */
    getPointsAlongLine(startHandle: HandlePosition, endHandle: HandlePosition, colPixelSpacing: number): number[];
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
    getPixelValuesAlongLine(startHandle: HandlePosition, points: number[], colPixelSpacing: number, eventData: EventData): number[];
    /**
     * Creates the plot: coords-greyscale value
     * @method
     * @name createPlot
     * @param {dataSets} dataSets
     * @returns {void}
     */
    createPlot(...dataSets: dataSets): void;
    clearPlotlyData(myPlotDiv: HTMLElement): void;
}
export {};
