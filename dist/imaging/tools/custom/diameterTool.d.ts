/** @module imaging/tools/custom/diameterTool
 *  @desc  This file provides functionalities for
 *         a custom diameter cornestone tool
 */
declare const BidirectionalTool: any;
interface DiameterToolProps {
    name?: string;
    dataArray?: ToolDataItem[];
    seriesId?: string;
}
interface ToolDataItem {
    id: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    x3: number;
    y3: number;
    x4: number;
    y4: number;
    value_max: number;
    value_min: number;
    slice: number;
}
interface ToolHandle {
    x: number;
    y: number;
    index: number | null;
    drawnIndependently: boolean;
    allowedOutsideImage: boolean;
    highlight: boolean;
    active: boolean;
    locked?: boolean;
    hasMoved?: boolean;
    movesIndependently?: boolean;
    hasBoundingBox?: boolean;
    boundingBox?: {
        width: number;
        height: number;
        left: number;
        top: number;
    };
}
interface ToolData {
    toolType: string;
    name: string;
    isCreating: boolean;
    visible: boolean;
    active: boolean;
    invalidated: boolean;
    handles: {
        start: ToolHandle;
        end: ToolHandle;
        perpendicularStart: ToolHandle;
        perpendicularEnd: ToolHandle;
        textBox: ToolHandle;
    };
    longestDiameter: string;
    shortestDiameter: string;
}
interface MeasurementEvent extends Event {
    detail: {
        measurementData: ToolData;
    };
    element: HTMLElement;
}
/**
 * @public
 * @class DiameterTool
 * @memberof Tools.Annotation
 * @classdesc Create and position an annotation that measures the
 * length and width of a region.
 * @extends Tools.Base.BaseAnnotationTool
 */
export declare class DiameterTool extends BidirectionalTool {
    static [x: string]: any;
    name: string;
    isBeenModified: boolean;
    lastData: ToolData | null;
    constructor(props: DiameterToolProps);
    initializeTool(dataArray: ToolDataItem[], elementId: string, seriesId: string): void;
    passiveCallback(element: HTMLElement): void;
    measureOnGoingCallback(event: MeasurementEvent): void;
    measureEndCallback(event: MeasurementEvent): void;
}
export {};
