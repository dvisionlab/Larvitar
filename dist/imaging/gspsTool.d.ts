import { Image, Viewport } from "cornerstone-core";
import { ViewportComplete } from "./tools/types";
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
    originalPixelData: number[] | null;
    maskedPixelData: number[] | null;
    gspsImageId: string | null;
    instanceUID: string | null;
    constructor(props?: any);
    retrieveLarvitarManager(imageId: string): {
        manager: LarvitarManager;
        seriesId: string;
    };
    handleElement(element: HTMLElement): Promise<any>;
    disabledCallback(element: HTMLElement): Promise<void>;
    activeCallback(element: HTMLElement): Promise<void>;
    applySoftcopyLUT(metadata: MetaData, viewport: Viewport): void;
    applyModalityLUT(metadata: MetaData, image: Image, viewport: Viewport): void;
    applySoftcopyPresentationLUT(metadata: MetaData, viewport: Viewport): void;
    setLUT(voiLut: MetaDataTypes, viewport: Viewport): void;
    applyZoomPan(metadata: MetaData, viewport: ViewportComplete): void;
    applySpatialTransformation(metadata: MetaData, element: HTMLElement, viewport: ViewportComplete): void;
    applyMask(serie: Series, element: HTMLElement): void;
    applyDisplayShutter(metadata: MetaData, element: HTMLElement, image: Image, originalpixelData: number[]): Promise<void>;
    setPixelData(pixelData: number[]): () => number[];
    applyOverlay(metadata: MetaData, image: Image): void;
    renderOverlay(overlay: Overlay, imageWidth: number, imageHeight: number, canvasContext: CanvasRenderingContext2D): void;
    convertCIELabToRGB(lab: [number, number, number]): number[];
}
export {};
