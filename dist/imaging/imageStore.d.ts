/** @module imaging/imageStore
 *  @desc This file provides functionalities
 *        for data config store.
 */
export declare const set: (field: string, payload: any) => void;
declare const _default: {
    initialize: (name: string) => void;
    addViewport: (name: string) => void;
    deleteViewport: (name: string) => void;
    addSeriesIds: (seriesId: string, imageIds: string[]) => void;
    removeSeriesIds: (seriesId: string) => void;
    get: (props: string | string[]) => any;
    watch: (cb: Function, name?: string) => void;
};
export default _default;
