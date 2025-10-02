import { Coords, EventData, MeasurementData, MeasurementMouseEvent } from "../types";
declare const BaseAnnotationTool: any;
/**
 * @public
 * @class WwwcRemoveRegionTool
 * @memberof Tools
 *
 * @classdesc Tool for setting wwwc based on a rectangular region.
 * @extends Tools.Base.BaseTool
 */
export default class WwwcRemoveRegionTool extends BaseAnnotationTool {
    static [x: string]: any;
    constructor(props?: {});
    createNewMeasurement(eventData: EventData): {
        computeMeasurements: any;
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
    _withinHandleBoxes(startCanvas: Coords, endCanvas: Coords): boolean;
    /**
     * Event handler for MOUSE_UP/TOUCH_END during handle drag event loop.
     *
     * @private
     * @method _applyStrategy
     * @param {MeasurementMouseEvent} evt Interaction event emitted by an enabledElement
     * @returns {void}
     */
    _applyStrategy(evt: MeasurementMouseEvent): void;
}
export {};
