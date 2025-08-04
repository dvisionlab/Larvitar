import { BaseTool } from "@cornerstonejs/tools";
import { Viewport } from "@cornerstonejs/core";
import * as EventTypes from "@cornerstonejs/tools/dist/esm/types/EventTypes";
/**
 * WindowLevel tool manipulates the windowLevel applied to a viewport. It
 * provides a way to set the windowCenter and windowWidth of a viewport
 * by dragging mouse over the image.
 *
 */
declare class CustomWWWLTool extends BaseTool {
    static toolName: string;
    constructor(toolProps?: {}, defaultToolProps?: {
        supportedInteractionTypes: string[];
    });
    touchDragCallback(evt: EventTypes.InteractionEventType): void;
    mouseDragCallback(evt: EventTypes.InteractionEventType): void;
    getPTScaledNewRange({ deltaPointsCanvas, lower, upper, clientHeight, viewport, volumeId, isPreScaled }: {
        deltaPointsCanvas: number[];
        lower: number;
        upper: number;
        clientHeight: number;
        viewport: Viewport;
        volumeId?: string;
        isPreScaled: boolean;
    }): {
        lower: number;
        upper: number;
    };
    getNewRange({ viewport, deltaPointsCanvas, volumeId, lower, upper }: {
        viewport: any;
        deltaPointsCanvas: any;
        volumeId: any;
        lower: any;
        upper: any;
    }): {
        lower: number;
        upper: number;
    };
    _getMultiplierFromDynamicRange(viewport: any, volumeId: any): number;
    _getImageDynamicRangeFromViewport(viewport: any): number;
    _getImageDynamicRangeFromMiddleSlice: (scalarData: any, dimensions: any) => number;
    private _getMinMax;
}
export default CustomWWWLTool;
