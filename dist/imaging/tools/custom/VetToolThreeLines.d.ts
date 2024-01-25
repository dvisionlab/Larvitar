import { HandlePosition } from "../types";
declare const BaseAnnotationTool: any;
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
interface EventData {
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
}
interface PlotlyData {
    x: number[];
    y: number[];
    type: string;
    line: {
        color: string;
    };
}
export default class LengthPlotTool extends BaseAnnotationTool {
    name: string;
    eventData?: EventData;
    datahandles?: Handles;
    abovehandles?: Handles;
    belowhandles?: Handles;
    plotlydata: Array<PlotlyData>;
    measuring: boolean;
    throttledUpdateCachedStats: any;
    constructor(props?: {});
    getRandomColor(): string;
    handleMouseUp: (event: MouseEvent) => void;
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
    pointNearTool(element: HTMLElement, data: data, coords: {
        x: number;
        y: number;
    }): boolean;
    updateCachedStats(image: cornerstone.Image, element: HTMLElement, data: data): void;
    renderToolData(evt: ToolMouseEvent): void;
    getPointsAlongLine(startHandle: HandlePosition, endHandle: HandlePosition, colPixelSpacing: number): number[];
    getPixelValuesAlongLine(startHandle: HandlePosition, points: number[], colPixelSpacing: number, eventData: EventData): any[];
    createPlot(...dataSets: {
        points: number[];
        pixelValues: number[];
        color: string;
    }[]): void;
    clearPlotlyData(): void;
}
export {};
