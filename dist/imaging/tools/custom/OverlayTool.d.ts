/**
 *
 * http://dicom.nema.org/dicom/2013/output/chtml/part03/sect_C.9.html
 *
 * @public
 * @class Overlay
 * @memberof Tools
 *
 * @classdesc Tool for displaying a scale overlay on the image.  Uses viewport.overlayColor to set the default colour.
 * @extends Tools.Base.BaseTool
 */
export default class OverlayTool {
    constructor(configuration?: {});
    initialConfiguration: {
        name: string;
        configuration: {};
        mixins: string[];
    };
    enabledCallback(element: any): void;
    disabledCallback(element: any): void;
    forceImageUpdate(element: any): void;
    setupRender(image: any): any;
    setupViewport(viewport: any): true | undefined;
    renderToolData(evt: any): void;
}
