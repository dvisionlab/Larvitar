/** @module imaging/postProcessing/applyDSA
 *  @desc This file provides digital subtraction algorithm for XA images
 */
type data = {
    data: {
        imageId: string;
        index: number;
        inputMaskSubPixelShift: number[];
    };
};
declare function initialize(config: any): void;
/**
 * Apply DSA to a multiframe serie
 * @function handler
 * @param {Series} multiframeSerie - multiframe serie to apply DSA
 * @param {number} index - index of the frame to apply DSA
 * @param {number[]} inputMaskSubPixelShift - pixel shift applied to the mask
 * @returns {number[]} - pixel data of the frame after DSA
 */
declare function handler(data: data, doneCallback: Function): never[] | {
    result: {
        pixelData: number[];
    };
    transferList: ArrayBufferLike[];
} | {
    result: {
        pixelData: ArrayBufferLike;
    };
    transferList: ArrayBufferLike[];
};
declare const _default: {
    taskType: string;
    handler: typeof handler;
    initialize: typeof initialize;
};
export default _default;
