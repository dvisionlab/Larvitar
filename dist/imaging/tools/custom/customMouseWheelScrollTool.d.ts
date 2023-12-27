/** @module tools/custom/customMouseWheelScrollTool
 *  @desc This file provides functionalities for
 *        custom DICOM Loader
 */
import { Image } from "cornerstone-core";
declare const BaseTool: any;
type StackData = {
    currentImageIdIndex: number;
    imageIds: string[];
    pending: any[];
};
type ToolEventDetail = {
    element: HTMLElement;
    image: Image;
    direction: number;
    detail: {
        [key: string]: any;
    };
};
export default class CustomMouseWheelScrollTool extends BaseTool {
    currentMode: string;
    framesNumber: number;
    slicesnumber: number;
    is4D: boolean;
    isMultiframe: boolean;
    constructor(props?: {});
    verify4D(): void;
    handleToggle(newcurrentMode: string): void;
    toggleScrollMode(element: HTMLElement): void;
    mouseWheelCallback(evt?: CustomEvent<ToolEventDetail> | KeyboardEvent | WheelEvent): void;
    scrollWithoutSkipping(stackData: StackData, pendingEvent: any, element: HTMLElement): void;
}
export {};
