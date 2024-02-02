import cornerstone from "cornerstone-core";
declare const BaseAnnotationTool: any;
import { HandlePosition } from "../types";
type data = {
    visible: boolean;
    active: boolean;
    color: string;
    invalidated: boolean;
    handles: Handles;
    length: number;
    uuid: string;
};
type Handles = {
    start: HandlePosition;
    end: HandlePosition;
    textBox?: {
        active: boolean;
        hasMoved: boolean;
        movesIndependently: boolean;
        drawnIndependently: boolean;
        allowedOutsideImage: boolean;
        hasBoundingBox: boolean;
    };
};
type ToolMouseEvent = {
    detail: EventData;
    currentTarget: any;
};
type EventData = {
    currentPoints: {
        image: {
            x: number;
            y: number;
        };
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
};
type PlotlyData = {
    x: number[];
    y: number[];
    type: string;
    line: {
        color: string;
    };
};
/**
 * @public
 * @class LengthTool
 * @memberof Tools.Annotation
 * @classdesc Tool for measuring distances.
 * @extends Tools.Base.BaseAnnotationTool
 */
export default class ManualLengthPlotTool extends BaseAnnotationTool {
    name: string;
    eventData?: EventData;
    datahandles?: Handles;
    plotlydata: Array<PlotlyData>;
    measuring: boolean;
    throttledUpdateCachedStats: any;
    lineNumber: number | null;
    greenlineY: number | null;
    newMeasurement: boolean;
    configuration: {
        drawHandles: boolean;
        drawHandlesOnHover: boolean;
        hideHandlesIfMoving: boolean;
        renderDashed: boolean;
        digits: number;
        handleRadius?: number;
    };
    constructor(props?: {});
    getColor(y: number): string;
    handleMouseUp: (event: MouseEvent) => void;
    clearCanvasAndPlot(eventData: EventData): void;
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
        };
    } | undefined;
    /**
     *
     *
     * @param {*} element
     * @param {*} data
     * @param {*} coords
     * @returns {Boolean}
     */
    pointNearTool(element: HTMLElement, data: data, coords: {
        x: number;
        y: number;
    }): boolean;
    updateCachedStats(image: cornerstone.Image, element: HTMLElement, data: data): void;
    renderToolData(evt: ToolMouseEvent): void;
    getPointsAlongLine(startHandle: HandlePosition, endHandle: HandlePosition, colPixelSpacing: number): number[];
    getPixelValuesAlongLine(startHandle: HandlePosition, points: number[], colPixelSpacing: number, eventData: EventData): number[];
    createPlot(points: number[], pixelValues: number[]): void;
}
export {};
