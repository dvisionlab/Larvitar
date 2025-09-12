import { EventData } from "../types";
declare const MagnifyTool: any;
export default class BorderMagnifyTool extends MagnifyTool {
    static [x: string]: any;
    constructor(props?: {
        showBorders?: boolean;
        showInfo?: boolean;
        borderColor?: string;
    });
    activeCallback(element: HTMLElement): void;
    disabledCallback(element: HTMLElement): void;
    passiveCallback(element: HTMLElement): void;
    /**
     * Event handler for the "keydown" event to toggle the visibility of borders and info on "B" key press.
     * @param {KeyboardEvent} event
     * @returns {void}
     */
    handleKeyDown(event: KeyboardEvent): void;
    /**
     * Overrides the _drawMagnificationTool method to add configurable borders and display zoom/ROI dimensions.
     * @param {*} evt
     * @returns {void}
     */
    _drawMagnificationTool(evt?: {
        detail: EventData;
    }): void;
}
export {};
