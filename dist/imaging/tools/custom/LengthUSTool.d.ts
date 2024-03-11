declare const BaseAnnotationTool: any;
import { MeasurementData, MeasurementMouseEvent, Coords, EventData } from "../types";
export default class LengthTool extends BaseAnnotationTool {
    constructor(props?: {});
    createNewMeasurement(eventData: EventData): {
        visible: boolean;
        active: boolean;
        color: undefined;
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
    pointNearTool(element: Element, data: MeasurementData, coords: Coords): boolean;
    updateCachedStats(image: cornerstone.Image, element: Element, data: MeasurementData): void;
    renderToolData(evt: MeasurementMouseEvent): void;
}
export {};
