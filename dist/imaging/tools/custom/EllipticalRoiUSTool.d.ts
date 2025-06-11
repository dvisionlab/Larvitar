declare const BaseAnnotationTool: any;
import { Coords, EventData, MeasurementData, MeasurementMouseEvent } from "../types";
/**
 * @public
 * @class EllipticalRoiTool
 * @memberof Tools.Annotation
 * @classdesc Tool for drawing elliptical regions of interest, and measuring
 * the statistics of the enclosed pixels.
 * @extends Tools.Base.BaseAnnotationTool
 */
export default class EllipticalRoiTool extends BaseAnnotationTool {
    static [x: string]: any;
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
            initialRotation: number;
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
    pointNearTool(element: Element, data: MeasurementData, coords: Coords, interactionType: string): boolean;
    updateCachedStats(image: cornerstone.Image, element: Element, data: MeasurementData): void;
    renderToolData(evt: MeasurementMouseEvent): void;
}
export {};
