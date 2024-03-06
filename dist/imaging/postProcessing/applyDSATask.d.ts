declare namespace _default {
    export let taskType: string;
    export { handler };
    export { initialize };
}
export default _default;
/**
 * Apply DSA to a multiframe serie
 * @function handler
 * @param {Series} multiframeSerie - multiframe serie to apply DSA
 * @param {number} index - index of the frame to apply DSA
 * @param {number[]} inputMaskSubPixelShift - pixel shift applied to the mask
 * @returns {number[]} - pixel data of the frame after DSA
 */
declare function handler(data: any, doneCallback: any): number[];
declare function initialize(config: any): void;
