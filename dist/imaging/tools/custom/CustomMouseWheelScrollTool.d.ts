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
};
export default class CustomMouseWheelScrollTool extends BaseTool {
    currentMode: string;
    framesNumber: number;
    slicesnumber: number;
    arraytimestamps: any[];
    imagetime: HTMLElement;
    timestamp: HTMLElement;
    slicenum: HTMLElement;
    is4D: boolean;
    isMultiframe: boolean;
    constructor(props?: {});
    Verify4D(): boolean | undefined;
    handleKeyDown(event: KeyboardEvent): void;
    toggleMode(element: HTMLElement): void;
    mouseWheelCallback(evt: CustomEvent<ToolEventDetail>): void;
    scrollWithoutSkipping(stackData: StackData, pendingEvent: any, element: HTMLElement): void;
}
export {};
