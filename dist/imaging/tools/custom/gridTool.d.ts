import { Image } from "cornerstone-core";
import { MeasurementMouseEvent } from "../types";
export declare const config: {
    dashHeightMM: number;
    dashWidthMM: number;
    colorFractionLight: number;
    colorFractionDark: number;
    maxVal8bit: number;
    maxVal16bit: number;
};
declare const BaseTool: any;
export declare class GridTool extends BaseTool {
    constructor(props?: {});
    activeCallback(element: HTMLElement): Promise<void>;
    renderToolData(evt: MeasurementMouseEvent): void;
    triggerDrawGrid(enabledElement: any): void;
    validatePixelSpacing(spacingX: number, spacingY: number): void;
    drawGridPattern(context: CanvasRenderingContext2D, element: HTMLElement, bitDepth: number, pixelSpacing: any, image: Image): void;
    findImageCoords(element: HTMLElement, image: Image): {
        start: import("cornerstone-core").CanvasCoordinate;
        end: import("cornerstone-core").CanvasCoordinate;
    };
    getGridSizeInPixels(pixelSpacing: any): {
        gridSizeX: number;
        gridSizeY: number;
    };
}
export {};
