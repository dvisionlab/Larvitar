declare const BorderMagnifyTool_base: any;
export default class BorderMagnifyTool extends BorderMagnifyTool_base {
    [x: string]: any;
    constructor(props?: {});
    /**
     * Event handler for the "keydown" event to toggle the visibility of borders and info on "B" key press.
     * @param {KeyboardEvent} event
     * @returns {void}
     */
    handleKeyDown(event: KeyboardEvent): void;
    activeCallback(element: any): void;
    disabledCallback(element: any): void;
    passiveCallback(element: any): void;
    /**
     * Overrides the _drawMagnificationTool method to add configurable borders and display zoom/ROI dimensions.
     * @param {*} evt
     * @returns {void}
     */
    _drawMagnificationTool(evt: any): void;
}
export {};
