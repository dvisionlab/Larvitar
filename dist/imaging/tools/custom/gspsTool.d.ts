import { ImageManager, MetaData } from "../../types";
import { EnabledElement } from "cornerstone-core";
import { MeasurementMouseEvent } from "../types";
import { ToolAnnotations } from "./gspsUtils/types";
declare const BaseTool: any;
/**
 * @public
 * @class GspsTool
 * @memberof Tools
 *
 * @classdesc Tool for visualizing presentation states over displayed image
 * @extends Tools.Base.BaseTool
 */
export default class GspsTool extends BaseTool {
    static [x: string]: any;
    name: string;
    toolAnnotations: ToolAnnotations;
    showAnnotations: boolean;
    canvas?: Element;
    gspsMetadata?: MetaData;
    constructor(props?: any);
    enabledCallback(element: HTMLElement): Promise<void>;
    passiveCallback(element: HTMLElement): Promise<void>;
    activePassiveCallback(element: HTMLElement): Promise<void>;
    renderToolData(evt: MeasurementMouseEvent): void;
    disabledCallback(element: HTMLElement): Promise<void>;
    resetViewportToDefault(element: HTMLElement): void;
    handleElement(element: HTMLElement): Promise<EnabledElement | undefined>;
    retrieveLarvitarManager(imageId: string): {
        manager: ImageManager;
        uniqueUID: string;
    };
}
export {};
