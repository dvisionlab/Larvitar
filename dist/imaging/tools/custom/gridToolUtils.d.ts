import { Image, CanvasCoordinate } from "cornerstone-core";
import { Coords } from "../types";
export type GridData = {
    from: Coords;
    to: Coords;
    color: string;
};
export declare function handleElement(element: HTMLElement): Promise<any>;
export declare function validatePixelSpacing(spacingX: number, spacingY: number): void;
export declare function mmToPixels(mm: number, pixelSpacing: any): number;
export declare function findImageCoords(element: HTMLElement, image: Image): {
    start: CanvasCoordinate;
    end: CanvasCoordinate;
};
export declare function convertDimensionsToCanvas(element: HTMLElement, width: number, height: number): {
    width: number;
    height: number;
};
export declare function getColors(bitDepth: number): {
    lightGray: string;
    darkGray: string;
};
export declare function drawDashedLine(context: CanvasRenderingContext2D, from: Coords, to: Coords, color: string): void;
export declare function drawVerticalLines(context: CanvasRenderingContext2D, xCenter: number, start: Coords, end: Coords, patternWidth: number, dashWidth: number, dashHeight: number, lightGray: string, darkGray: string, gridPixelArray: number[], image: Image, element: HTMLElement): void;
export declare function drawHorizontalLines(context: CanvasRenderingContext2D, yCenter: number, start: Coords, end: Coords, patternHeight: number, dashWidth: number, dashHeight: number, lightGray: string, darkGray: string, gridPixelArray: number[], image: Image, element: HTMLElement): void;
