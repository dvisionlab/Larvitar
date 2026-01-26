/** @module imaging/imageIo
 *  @desc This file provides I/O functionalities on NRRD files and DICOM images
 */
/**
 * Export 3D image rendered in a canvas to base64
 * @function exportImageToBase64
 * @param elementId - Id of the div element containing the canvas
 * @returns {String | null} base64 image (png full quality) or null if canvas does not exist
 */
export declare const export3DImageToBase64: (elementId: string, imageType: "png" | "jpeg") => Promise<string | null>;
