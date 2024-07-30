import { Image, Viewport } from "cornerstone-core";
import { LarvitarManager, MetaData, Overlay, Series } from "./types";
import { MetaDataTypes } from "./MetaDataTypes";
declare const BaseTool: any;
/**
 * @public
 * @class WwwcManualTool
 * @memberof Tools
 *
 * @classdesc Tool for setting wwwc by dragging with mouse/touch.
 * @extends Tools.Base.BaseTool
 */
export default class GspsTool extends BaseTool {
    name: string;
    configuration: any;
    pixelData?: number[];
    constructor(props?: any);
    retrieveLarvitarManager(imageId: string): {
        manager: LarvitarManager;
        seriesId: string;
    };
    handleElement(element: HTMLElement): Promise<any>;
    disabledCallback(element: HTMLElement): Promise<void>;
    activeCallback(element: HTMLElement): Promise<void>;
    applySoftcopyLUT(metadata: MetaData, element: HTMLElement): void;
    applyModalityLUT(metadata: MetaData, element: HTMLElement, image: Image): void;
    applySoftcopyPresentationLUT(metadata: MetaData, element: HTMLElement): void;
    setLUT(voiLut: MetaDataTypes, viewport: Viewport): void;
    applyZoomPan(metadata: MetaData, viewport: Viewport, image: Image): void;
    applySpatialTransformation(metadata: MetaData, viewport: Viewport, image: Image): void;
    applyMask(serie: Series, element: HTMLElement): void;
    applyDisplayShutter(metadata: MetaData, element: HTMLElement, image: Image, pixelData: number[]): void;
    setPixelData(pixelData: number[]): () => number[];
    applyOverlay(metadata: MetaData, image: Image): void;
    renderOverlay(overlay: Overlay, imageWidth: number, imageHeight: number, canvasContext: CanvasRenderingContext2D): void;
}
export {};
