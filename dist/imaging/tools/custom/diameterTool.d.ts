/**
 * @public
 * @class DiameterTool
 * @memberof Tools.Annotation
 * @classdesc Create and position an annotation that measures the
 * length and width of a region.
 * @extends Tools.Base.BaseAnnotationTool
 */
export class DiameterTool {
    constructor(props: any);
    name: string;
    initializeTool(dataArray: any, elementId: any, seriesId: any): void;
    passiveCallback(element: any): void;
    measureOnGoingCallback(event: any): void;
    isBeenModified: boolean | undefined;
    lastData: any;
    measureEndCallback(event: any): void;
}
